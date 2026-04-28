/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file AiChatTab.tsx
 * @description 最大展开模式 — AI 对话 Tab（OpenAI 兼容 API + 流式输出）
 * @author 鸡哥
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import {
  resolveMihtnelisLocalToolResult,
  resolveMihtnelisWebAccess,
  streamMihtnelisAgent,
} from '../../../../api/ai/mihtnelisAgentStream';
import {
  fetchWebsiteTitle,
  getWebsiteAuthorizationPolicy,
  getWebsiteFaviconUrl,
  getWebsiteHostname,
  setWebsiteAuthorizationPolicy,
  type SiteAuthorizationPolicy,
} from '../../../../api/site/siteMetaApi';
import { SvgIcon } from '../../../../utils/SvgIcon';
import useIslandStore from '../../../../store/slices';
import type { AiChatMessage, AiToolCall } from '../../../../store/types';
import { readLocalToken } from '../../../../utils/userAccount';

interface ThinkEventPayload {
  text?: unknown;
  index?: unknown;
  done?: unknown;
}

interface MetaEventPayload {
  thinkingEnabled?: unknown;
  reasoningEffort?: unknown;
}

interface ToolEventPayload {
  turn?: unknown;
  tool?: unknown;
  arguments?: unknown;
  success?: unknown;
  error?: unknown;
  result?: unknown;
}

interface ToolCallRequestPayload {
  turn?: unknown;
  requestId?: unknown;
  tool?: unknown;
  arguments?: unknown;
  riskLevel?: unknown;
}

interface ToolCallResultPayload {
  turn?: unknown;
  requestId?: unknown;
  tool?: unknown;
  success?: unknown;
  error?: unknown;
  result?: unknown;
  durationMs?: unknown;
}

let activeAiAbortController: AbortController | null = null;
const MAX_MIHTNELIS_CONTEXT_CHARS = 1_000_000;

function buildMihtnelisContext(messages: AiChatMessage[]): string {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '';
  }
  const lines = messages
    .map((msg) => {
      const role = msg?.role === 'assistant' ? 'assistant' : 'user';
      const content = typeof msg?.content === 'string' ? msg.content.trim() : '';
      if (!content) {
        return '';
      }
      return `${role}: ${content}`;
    })
    .filter(Boolean);
  if (lines.length === 0) {
    return '';
  }
  const fullContext = lines.join('\n\n');
  if (fullContext.length <= MAX_MIHTNELIS_CONTEXT_CHARS) {
    return fullContext;
  }
  return fullContext.slice(fullContext.length - MAX_MIHTNELIS_CONTEXT_CHARS);
}

function toPrettyJson(value: unknown): string {
  if (value == null) {
    return '{}';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * 调用 OpenAI 兼容 Chat Completions API（流式）
 */
async function streamChatCompletion(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const url = `${endpoint.replace(/\/+$/, '')}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API 请求失败 (${res.status}): ${body || res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('无法读取响应流');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) onChunk(delta);
      } catch { /* skip malformed chunks */ }
    }
  }
}

/**
 * AI 对话 Tab
 * @description 包含消息列表和输入栏的聊天界面，调用 OpenAI 兼容 API
 */
export function AiChatTab(): React.ReactElement {
  const availableModels = ['deepseek-v4-flash'] as const;
  const { t } = useTranslation();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState('');
  const [showModelCard, setShowModelCard] = useState(false);
  const [resolvingWebAccessDecision, setResolvingWebAccessDecision] = useState(false);
  const {
    aiConfig,
    setAiConfig,
    aiChatMessages,
    aiChatStreaming,
    setAiChatStreaming,
    setAiChatMessages,
    clearAiChatMessages,
    aiWebAccessPrompt,
    setAiWebAccessPrompt,
    aiWebAccessResolveError,
    setAiWebAccessResolveError,
  } = useIslandStore();
  const selectedModel = availableModels.includes(aiConfig.model as (typeof availableModels)[number])
    ? aiConfig.model
    : 'deepseek-v4-flash';
  const showDeepseekIconOnModelToggle = selectedModel.toLowerCase().includes('deepseek');
  const mihtnelisContext = useMemo(() => buildMihtnelisContext(aiChatMessages), [aiChatMessages]);
  const contextUsageChars = mihtnelisContext.length;
  const contextUsagePercent = Math.min(100, (contextUsageChars / MAX_MIHTNELIS_CONTEXT_CHARS) * 100);
  const contextUsagePercentText = `${contextUsagePercent.toFixed(1)}%`;
  const contextUsageLevelClass = contextUsagePercent >= 90
    ? 'danger'
    : (contextUsagePercent >= 70 ? 'warn' : 'normal');
  const contextUsageInlineText = t('aiChat.contextUsage.inline', {
    defaultValue: '{{used}} / {{max}} · {{percent}}',
    used: contextUsageChars.toLocaleString(),
    max: MAX_MIHTNELIS_CONTEXT_CHARS.toLocaleString(),
    percent: contextUsagePercentText,
  });

  /** 始终从 store 读最新消息再更新，避免流式 chunk 之间的闭包过期 */
  const updateMessages = useCallback((updater: (prev: AiChatMessage[]) => AiChatMessage[]) => {
    const latest = useIslandStore.getState().aiChatMessages;
    useIslandStore.getState().setAiChatMessages(updater(latest));
  }, []);

  /** 滚动到最新消息 */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatMessages]);

  const syncInputHeight = useCallback((): void => {
    const el = inputRef.current;
    if (!el) {
      return;
    }
    const maxHeight = 128;
    el.style.height = 'auto';
    const nextHeight = Math.min(maxHeight, Math.max(34, el.scrollHeight));
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    syncInputHeight();
  }, [input, syncInputHeight]);

  /** 发送消息并调用 API */
  const handleSend = useCallback(async (): Promise<void> => {
    const text = input.trim();
    if (!text || aiChatStreaming) return;

    const localToken = readLocalToken();
    const canUseMihtnelis = Boolean(localToken && localToken.trim().length > 0);

    if (!canUseMihtnelis && !aiConfig.apiKey) {
      updateMessages(prev => ([
        ...prev,
        { role: 'user', content: text },
        {
          role: 'assistant',
          content: t('aiChat.messages.missingApiKeyWarn', {
            defaultValue: '⚠️ 请先在「设置 → AI配置」中填写 API Key。',
          }),
        },
      ]));
      setInput('');
      return;
    }

    const userMsg: AiChatMessage = { role: 'user', content: text };
    const nextMessages = [...aiChatMessages, userMsg];
    setAiChatMessages(nextMessages);
    setInput('');
    setAiChatStreaming(true);
    setAiWebAccessPrompt(null);
    setAiWebAccessResolveError('');

    // 构建 API 请求消息（含 system prompt）
    const apiMessages: { role: string; content: string }[] = [];
    if (aiConfig.systemPrompt) {
      apiMessages.push({ role: 'system', content: aiConfig.systemPrompt });
    }
    nextMessages.forEach((m) => {
      apiMessages.push({ role: m.role, content: m.content });
    });

    // 添加占位 AI 消息
    updateMessages(prev => ([...prev, { role: 'assistant', content: '', thinkBlocks: [], toolCalls: [] }]));

    const controller = new AbortController();
    activeAiAbortController = controller;

    try {
      if (canUseMihtnelis) {
        let receivedMihtnelisChunk = false;
        let mihtnelisErrorMessage: string | null = null;
        let streamThinkingEnabled = Boolean(aiConfig.deepseekThinking);
        const context = mihtnelisContext;
        await streamMihtnelisAgent({
          token: localToken!,
          sessionId: 'max-expand-ai-chat',
          message: text,
          provider: selectedModel,
          context,
          thinking: aiConfig.deepseekThinking,
          reasoningEffort: aiConfig.deepseekReasoningEffort,
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === 'meta') {
              const payload = event.payload as MetaEventPayload;
              if (typeof payload?.thinkingEnabled === 'boolean') {
                streamThinkingEnabled = payload.thinkingEnabled;
              }
              return;
            }

            if (event.type === 'chunk') {
              const payload = event.payload as { text?: unknown };
              const chunk = typeof payload?.text === 'string' ? payload.text : '';
              if (!chunk) return;
              receivedMihtnelisChunk = true;
              updateMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === 'assistant') {
                  copy[copy.length - 1] = { ...last, content: last.content + chunk };
                }
                return copy;
              });
              return;
            }

            if (event.type === 'tool_call_result') {
              const payload = event.payload as ToolCallResultPayload;
              const turn = typeof payload?.turn === 'number' ? payload.turn : 0;
              const requestId = typeof payload?.requestId === 'string' ? payload.requestId.trim() : '';
              const tool = typeof payload?.tool === 'string' ? payload.tool.trim() : 'unknown';
              const success = Boolean(payload?.success);
              const error = typeof payload?.error === 'string' ? payload.error : '';
              const durationMs = typeof payload?.durationMs === 'number' ? payload.durationMs : 0;
              const result = payload?.result;

              updateMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') {
                  return copy;
                }
                const oldCalls = Array.isArray(last.toolCalls) ? [...last.toolCalls] : [];
                let matched = false;
                for (let i = oldCalls.length - 1; i >= 0; i--) {
                  const current = oldCalls[i];
                  if (!current) {
                    continue;
                  }
                  const requestMatched = Boolean(requestId) && current.requestId === requestId;
                  const turnMatched = !requestId && turn > 0 && current.turn === turn && current.tool === tool;
                  const pendingMatched = !requestId && turn <= 0 && current.pending && current.tool === tool;
                  if (requestMatched || turnMatched || pendingMatched) {
                    oldCalls[i] = {
                      ...current,
                      tool,
                      pending: false,
                      success,
                      error,
                      result,
                      durationMs,
                    };
                    matched = true;
                    break;
                  }
                }
                if (!matched) {
                  oldCalls.push({
                    turn,
                    requestId,
                    tool,
                    pending: false,
                    success,
                    error,
                    result,
                    durationMs,
                  });
                }
                copy[copy.length - 1] = { ...last, toolCalls: oldCalls };
                return copy;
              });
              return;
            }

            if (event.type === 'web_access_request') {
              const payload = event.payload as { requestId?: unknown; url?: unknown; message?: unknown };
              const requestId = typeof payload?.requestId === 'string' ? payload.requestId.trim() : '';
              const url = typeof payload?.url === 'string' ? payload.url.trim() : '';
              if (!requestId || !url) {
                return;
              }
              const hostname = getWebsiteHostname(url);
              const siteName = hostname || url;
              const iconUrl = getWebsiteFaviconUrl(url);
              const domainPolicy = getWebsiteAuthorizationPolicy(url);

              if (domainPolicy === 'allow' || domainPolicy === 'deny') {
                void resolveMihtnelisWebAccess({
                  token: localToken!,
                  requestId,
                  allow: domainPolicy === 'allow',
                }).catch((error: unknown) => {
                  const errMsg = error instanceof Error
                    ? error.message
                    : t('aiChat.messages.unknownError', { defaultValue: '未知错误' });
                  setAiWebAccessPrompt({
                    requestId,
                    url,
                    message: typeof payload?.message === 'string' ? payload.message : '',
                    hostname,
                    siteName,
                    iconUrl,
                    domainPolicy: 'ask',
                  });
                  setAiWebAccessResolveError(errMsg);
                });
                return;
              }

              setAiWebAccessPrompt({
                requestId,
                url,
                message: typeof payload?.message === 'string' ? payload.message : '',
                hostname,
                siteName,
                iconUrl,
                domainPolicy,
              });
              setAiWebAccessResolveError('');

              void fetchWebsiteTitle(url, 4500).then((title) => {
                const trimmedTitle = title.trim();
                if (!trimmedTitle) {
                  return;
                }
                const latestPrompt = useIslandStore.getState().aiWebAccessPrompt;
                if (!latestPrompt || latestPrompt.requestId !== requestId) {
                  return;
                }
                useIslandStore.getState().setAiWebAccessPrompt({
                  ...latestPrompt,
                  siteName: trimmedTitle,
                });
              }).catch(() => undefined);
              return;
            }

            if (event.type === 'tool_call_request') {
              const payload = event.payload as ToolCallRequestPayload;
              const turn = typeof payload?.turn === 'number' ? payload.turn : 0;
              const requestId = typeof payload?.requestId === 'string' ? payload.requestId.trim() : '';
              const tool = typeof payload?.tool === 'string' ? payload.tool.trim() : '';
              const riskLevel = typeof payload?.riskLevel === 'string' ? payload.riskLevel : '';
              const argumentsPayload = typeof payload?.arguments === 'object' && payload?.arguments != null
                ? payload.arguments as Record<string, unknown>
                : {};
              if (!tool) {
                return;
              }

              updateMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') {
                  return copy;
                }
                const oldCalls = Array.isArray(last.toolCalls) ? [...last.toolCalls] : [];
                const call: AiToolCall = {
                  turn,
                  requestId,
                  tool,
                  arguments: argumentsPayload,
                  riskLevel,
                  pending: true,
                  success: undefined,
                  error: '',
                  result: {},
                };
                oldCalls.push(call);
                copy[copy.length - 1] = { ...last, toolCalls: oldCalls };
                return copy;
              });

              const isClientLocalTool = tool.startsWith('file.') || tool.startsWith('cmd.');
              if (!isClientLocalTool || !requestId) {
                return;
              }

              const executor = window.api?.executeAgentLocalTool;
              if (typeof executor !== 'function') {
                void resolveMihtnelisLocalToolResult({
                  token: localToken!,
                  requestId,
                  success: false,
                  result: {},
                  error: 'LOCAL_RUNTIME_UNAVAILABLE',
                  durationMs: 0,
                }).catch(() => undefined);
                return;
              }

              void executor({ tool, arguments: argumentsPayload })
                .then((execution) => {
                  return resolveMihtnelisLocalToolResult({
                    token: localToken!,
                    requestId,
                    success: Boolean(execution?.success),
                    result: execution?.result,
                    error: typeof execution?.error === 'string' ? execution.error : '',
                    durationMs: typeof execution?.durationMs === 'number' ? execution.durationMs : 0,
                  });
                })
                .catch((error: unknown) => {
                  const message = error instanceof Error ? error.message : 'local tool execute failed';
                  return resolveMihtnelisLocalToolResult({
                    token: localToken!,
                    requestId,
                    success: false,
                    result: {},
                    error: message,
                    durationMs: 0,
                  });
                })
                .catch((submitError: unknown) => {
                  const message = submitError instanceof Error ? submitError.message : 'local tool result submit failed';
                  mihtnelisErrorMessage = message;
                });
              return;
            }

            if (event.type === 'web_access_resolved') {
              setAiWebAccessPrompt(null);
              setAiWebAccessResolveError('');
              return;
            }

            if (event.type === 'think') {
              if (!streamThinkingEnabled || !aiConfig.deepseekThinking) {
                return;
              }
              const payload = event.payload as ThinkEventPayload;
              const thinkText = typeof payload?.text === 'string' ? payload.text : '';
              const thinkIndex = typeof payload?.index === 'number' ? payload.index : 0;
              if (!thinkText) return;
              updateMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === 'assistant') {
                  const oldBlocks = Array.isArray(last.thinkBlocks) ? [...last.thinkBlocks] : [];
                  const current = typeof oldBlocks[thinkIndex] === 'string' ? oldBlocks[thinkIndex] : '';
                  oldBlocks[thinkIndex] = current + thinkText;
                  copy[copy.length - 1] = { ...last, thinkBlocks: oldBlocks };
                }
                return copy;
              });
              return;
            }

            if (event.type === 'tool') {
              const payload = event.payload as ToolEventPayload;
              const toolCall: AiToolCall = {
                turn: typeof payload?.turn === 'number' ? payload.turn : 0,
                tool: typeof payload?.tool === 'string' ? payload.tool : 'unknown',
                arguments: typeof payload?.arguments === 'object' && payload?.arguments != null
                  ? payload.arguments as Record<string, unknown>
                  : {},
                pending: false,
                success: Boolean(payload?.success),
                error: typeof payload?.error === 'string' ? payload.error : '',
                result: payload?.result,
              };
              updateMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === 'assistant') {
                  const oldCalls = Array.isArray(last.toolCalls) ? last.toolCalls : [];
                  copy[copy.length - 1] = { ...last, toolCalls: [...oldCalls, toolCall] };
                }
                return copy;
              });
              return;
            }

            if (event.type === 'error') {
              const payload = event.payload as { message?: unknown };
              const message = typeof payload?.message === 'string'
                ? payload.message
                : 'mihtnelis agent 返回错误';
              mihtnelisErrorMessage = message;
            }
          },
        });

        if (!receivedMihtnelisChunk) {
          const fallbackMessage = mihtnelisErrorMessage
            ? `❌ ${mihtnelisErrorMessage}`
            : '⚠️ 未收到模型输出，请检查 DeepSeek 配置与服务端日志。';
          updateMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.role === 'assistant' && !last.content) {
              copy[copy.length - 1] = { ...last, content: fallbackMessage };
            }
            return copy;
          });
        }
      } else {
        await streamChatCompletion(
          aiConfig.endpoint,
          aiConfig.apiKey,
          selectedModel,
          apiMessages,
          (chunk) => {
            updateMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: last.content + chunk };
              }
              return copy;
            });
          },
          controller.signal,
        );
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const errMsg = err instanceof Error
        ? err.message
        : t('aiChat.messages.unknownError', { defaultValue: '未知错误' });
      updateMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant' && !last.content) {
          copy[copy.length - 1] = { ...last, content: `❌ ${errMsg}` };
        } else {
          copy.push({ role: 'assistant', content: `❌ ${errMsg}` });
        }
        return copy;
      });
    } finally {
      activeAiAbortController = null;
      setAiChatStreaming(false);
      setResolvingWebAccessDecision(false);
    }
  }, [
    input,
    aiChatStreaming,
    aiChatMessages,
    aiConfig,
    mihtnelisContext,
    setAiChatStreaming,
    setAiChatMessages,
    updateMessages,
    t,
    setAiWebAccessPrompt,
    setAiWebAccessResolveError,
  ]);

  /** 回车发送 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** 停止生成 */
  const handleStop = (): void => {
    activeAiAbortController?.abort();
    setAiChatStreaming(false);
  };

  /** 清空对话 */
  const handleClear = (): void => {
    activeAiAbortController?.abort();
    activeAiAbortController = null;
    clearAiChatMessages();
    setAiChatStreaming(false);
    setResolvingWebAccessDecision(false);
    setAiWebAccessPrompt(null);
    setAiWebAccessResolveError('');
  };

  const handleResolveWebAccess = useCallback(async (allow: boolean): Promise<void> => {
    const localToken = readLocalToken();
    if (!localToken || !aiWebAccessPrompt?.requestId) {
      return;
    }
    const policy: SiteAuthorizationPolicy = aiWebAccessPrompt.domainPolicy === 'allow' || aiWebAccessPrompt.domainPolicy === 'deny'
      ? aiWebAccessPrompt.domainPolicy
      : 'ask';
    setWebsiteAuthorizationPolicy(aiWebAccessPrompt.url, policy);
    setResolvingWebAccessDecision(true);
    setAiWebAccessResolveError('');
    try {
      await resolveMihtnelisWebAccess({
        token: localToken,
        requestId: aiWebAccessPrompt.requestId,
        allow,
      });
      if (!allow) {
        setAiWebAccessPrompt(null);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : t('aiChat.messages.unknownError', { defaultValue: '未知错误' });
      if (errMsg.toLowerCase().includes('pending request not found')) {
        setAiWebAccessPrompt(null);
        updateMessages(prev => ([
          ...prev,
          {
            role: 'assistant',
            content: t('aiChat.webAccess.expiredHint', {
              defaultValue: '网页授权请求已失效，请重新发起请求后再授权。',
            }),
          },
        ]));
        return;
      }
      setAiWebAccessResolveError(errMsg);
    } finally {
      setResolvingWebAccessDecision(false);
    }
  }, [t, aiWebAccessPrompt, setAiWebAccessPrompt, setAiWebAccessResolveError, updateMessages]);

  const handleDomainPolicyChange = useCallback((policy: SiteAuthorizationPolicy): void => {
    if (!aiWebAccessPrompt) {
      return;
    }
    setAiWebAccessPrompt({
      ...aiWebAccessPrompt,
      domainPolicy: policy,
    });
    setAiWebAccessResolveError('');
  }, [aiWebAccessPrompt, setAiWebAccessPrompt, setAiWebAccessResolveError]);

  return (
    <div className="max-expand-chat">
      {/* 标题 */}
      <div className="max-expand-chat-header">
        <span className="max-expand-chat-header-title">{t('aiChat.title', { defaultValue: 'AI 对话' })}</span>
        <div className="max-expand-chat-header-actions">
          <span className="max-expand-chat-header-model">{readLocalToken() ? selectedModel : (selectedModel || t('aiChat.notConfigured', { defaultValue: '未配置' }))}</span>
          {aiChatMessages.length > 0 && (
            <button className="max-expand-chat-clear" onClick={handleClear} type="button">
              {t('aiChat.actions.clear', { defaultValue: '清空' })}
            </button>
          )}
        </div>
      </div>
      {/* 消息列表 */}
      <div className="max-expand-chat-messages">
        {aiChatMessages.length === 0 && (
          <div className="max-expand-chat-empty">
            {aiConfig.apiKey
              ? t('aiChat.messages.emptyWithApiKey', { defaultValue: '有什么可以帮你的？' })
              : t('aiChat.messages.emptyWithoutApiKey', { defaultValue: '请先在「设置 → AI配置」中填写 API Key' })}
          </div>
        )}
        {aiChatMessages.map((msg, i) => (
          <div key={i} className={`max-expand-chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
            {msg.role === 'user' ? (
              msg.content
            ) : (
              <>
                {(() => {
                  const thinkBlocks = aiConfig.deepseekThinking && Array.isArray(msg.thinkBlocks)
                    ? msg.thinkBlocks
                    : [];
                  const sortedToolCalls = Array.isArray(msg.toolCalls)
                    ? [...msg.toolCalls].sort((a, b) => {
                      const aTurn = Number.isFinite(a.turn) && (a.turn ?? 0) > 0 ? Number(a.turn) : Number.MAX_SAFE_INTEGER;
                      const bTurn = Number.isFinite(b.turn) && (b.turn ?? 0) > 0 ? Number(b.turn) : Number.MAX_SAFE_INTEGER;
                      return aTurn - bTurn;
                    })
                    : [];

                  const maxToolTurn = sortedToolCalls.reduce((acc, toolCall) => {
                    const turn = Number.isFinite(toolCall.turn) && (toolCall.turn ?? 0) > 0
                      ? Number(toolCall.turn)
                      : 0;
                    return Math.max(acc, turn);
                  }, 0);
                  const maxTurn = Math.max(thinkBlocks.length, maxToolTurn);
                  const isLatestAssistantMsg = i === aiChatMessages.length - 1;
                  const showThinkingFooter = aiConfig.deepseekThinking && aiChatStreaming && isLatestAssistantMsg;
                  const timelineNodes: React.ReactElement[] = [];

                  for (let turn = 1; turn <= maxTurn; turn++) {
                    const thinkText = thinkBlocks[turn - 1] || '';
                    if (thinkText) {
                      timelineNodes.push(
                        <details
                          key={`think-${turn}`}
                          className="max-expand-chat-think-card"
                          open={aiChatStreaming && turn === thinkBlocks.length && isLatestAssistantMsg}
                        >
                          <summary>
                            <span className="max-expand-chat-think-title">
                              <img className="max-expand-chat-think-title-icon" src={SvgIcon.DEEPSEEK} alt="" />
                              <span>思考过程 #{turn}</span>
                            </span>
                          </summary>
                          <div className="max-expand-chat-think-content">{thinkText}</div>
                        </details>,
                      );
                    }

                    const turnToolCalls = sortedToolCalls.filter((toolCall) => {
                      return Number.isFinite(toolCall.turn)
                        && (toolCall.turn ?? 0) > 0
                        && Number(toolCall.turn) === turn;
                    });
                    for (let toolIndex = 0; toolIndex < turnToolCalls.length; toolIndex++) {
                      const toolCall = turnToolCalls[toolIndex];
                      timelineNodes.push(
                        <details key={`tool-${turn}-${toolCall.tool}-${toolIndex}`} className="max-expand-chat-tool-card">
                          <summary className="max-expand-chat-tool-card-head">
                            <span className="max-expand-chat-tool-left">
                              <span className="max-expand-chat-tool-name">{toolCall.tool}</span>
                              <span className="max-expand-chat-tool-turn">#{toolCall.turn || toolIndex + 1}</span>
                            </span>
                            <span className={`max-expand-chat-tool-status ${toolCall.pending ? '' : (toolCall.success ? 'success' : 'failed')}`}>
                              {toolCall.pending && <span className="max-expand-chat-tool-status-dot" />}
                              {toolCall.pending ? '执行中' : (toolCall.success ? '完成' : '失败')}
                            </span>
                          </summary>
                          <div className="max-expand-chat-tool-result">
                            <div className="max-expand-chat-tool-result-title">工具返回结果</div>
                            <pre>{toPrettyJson(toolCall.result)}</pre>
                          </div>
                        </details>,
                      );
                    }
                  }

                  const trailingToolCalls = sortedToolCalls.filter((toolCall) => {
                    return !(Number.isFinite(toolCall.turn) && (toolCall.turn ?? 0) > 0);
                  });
                  for (let toolIndex = 0; toolIndex < trailingToolCalls.length; toolIndex++) {
                    const toolCall = trailingToolCalls[toolIndex];
                    timelineNodes.push(
                      <details key={`tool-tail-${toolCall.tool}-${toolIndex}`} className="max-expand-chat-tool-card">
                        <summary className="max-expand-chat-tool-card-head">
                          <span className="max-expand-chat-tool-left">
                            <span className="max-expand-chat-tool-name">{toolCall.tool}</span>
                            <span className="max-expand-chat-tool-turn">#{toolIndex + 1}</span>
                          </span>
                          <span className={`max-expand-chat-tool-status ${toolCall.pending ? '' : (toolCall.success ? 'success' : 'failed')}`}>
                            {toolCall.pending && <span className="max-expand-chat-tool-status-dot" />}
                            {toolCall.pending ? '执行中' : (toolCall.success ? '完成' : '失败')}
                          </span>
                        </summary>
                        <div className="max-expand-chat-tool-result">
                          <div className="max-expand-chat-tool-result-title">工具返回结果</div>
                          <pre>{toPrettyJson(toolCall.result)}</pre>
                        </div>
                      </details>,
                    );
                  }

                  return (
                    <>
                      {timelineNodes.length > 0 && (
                        <div className="max-expand-chat-tool-list">
                          {timelineNodes}
                        </div>
                      )}

                      {msg.content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        aiChatStreaming && isLatestAssistantMsg && !showThinkingFooter ? <span className="max-expand-chat-generating-dots"><i /><i /><i /></span> : ''
                      )}

                      {showThinkingFooter && (
                        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
                          <span className="max-expand-chat-think-live-dots">
                            <i />
                            <i />
                            <i />
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      {aiWebAccessPrompt && (
        <div className="max-expand-chat-web-access-panel">
          <div className="max-expand-chat-web-access-card">
            <div className="max-expand-chat-web-access-site">
              {aiWebAccessPrompt.iconUrl ? (
                <img
                  className="max-expand-chat-web-access-site-icon"
                  src={aiWebAccessPrompt.iconUrl}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="max-expand-chat-web-access-site-fallback">
                  {(aiWebAccessPrompt.siteName || aiWebAccessPrompt.hostname || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="max-expand-chat-web-access-site-meta">
                <div className="max-expand-chat-web-access-site-name">
                  {aiWebAccessPrompt.siteName || aiWebAccessPrompt.hostname || aiWebAccessPrompt.url}
                </div>
                {aiWebAccessPrompt.hostname && (
                  <div className="max-expand-chat-web-access-site-host">{aiWebAccessPrompt.hostname}</div>
                )}
              </div>
            </div>
            <div className="max-expand-chat-web-access-title">
              {t('aiChat.webAccess.title', { defaultValue: '网页访问授权' })}
            </div>
            <div className="max-expand-chat-web-access-desc">
              {aiWebAccessPrompt.message || t('aiChat.webAccess.requestHint', { defaultValue: 'Agent 需要访问以下 URL，是否允许？' })}
            </div>
            <div className="max-expand-chat-web-access-url">{aiWebAccessPrompt.url}</div>
            <div className="max-expand-chat-web-access-actions">
              <button
                type="button"
                className="max-expand-chat-web-access-btn deny"
                onClick={() => { handleResolveWebAccess(false); }}
                disabled={resolvingWebAccessDecision}
              >
                {t('aiChat.webAccess.deny', { defaultValue: '拒绝访问' })}
              </button>
              <button
                type="button"
                className="max-expand-chat-web-access-btn allow"
                onClick={() => { handleResolveWebAccess(true); }}
                disabled={resolvingWebAccessDecision}
              >
                {t('aiChat.webAccess.allow', { defaultValue: '允许访问' })}
              </button>
              <select
                className="max-expand-chat-web-access-policy-select"
                value={aiWebAccessPrompt.domainPolicy || 'ask'}
                onChange={(event) => {
                  handleDomainPolicyChange(event.target.value as SiteAuthorizationPolicy);
                }}
                disabled={resolvingWebAccessDecision}
                title={t('aiChat.webAccess.policyLabel', { defaultValue: '此域名授权策略' })}
                aria-label={t('aiChat.webAccess.policyLabel', { defaultValue: '此域名授权策略' })}
              >
                <option value="ask">
                  {t('aiChat.webAccess.policy.ask', { defaultValue: '每次都询问' })}
                </option>
                <option value="allow">
                  {t('aiChat.webAccess.policy.allow', { defaultValue: '始终批准' })}
                </option>
                <option value="deny">
                  {t('aiChat.webAccess.policy.deny', { defaultValue: '始终禁止' })}
                </option>
              </select>
            </div>
            {aiWebAccessResolveError && (
              <div className="max-expand-chat-web-access-error">{aiWebAccessResolveError}</div>
            )}
          </div>
        </div>
      )}
      {/* 输入栏 */}
      <div>
        {showModelCard && (
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.72 }}>
                {t('aiChat.modelCard.title', { defaultValue: '模型选择卡片' })}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>{t('settings.ai.model', { defaultValue: '模型' })}</span>
                  <div className="max-expand-chat-model-select-shell">
                    <select
                      className="max-expand-chat-web-access-policy-select max-expand-chat-model-select"
                      value={selectedModel}
                      onChange={(event) => {
                        setAiConfig({ model: event.target.value });
                      }}
                      title={t('settings.ai.model', { defaultValue: '模型' })}
                      aria-label={t('settings.ai.model', { defaultValue: '模型' })}
                    >
                      <option value="deepseek-v4-flash">deepseek-v4-flash</option>
                    </select>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>{t('settings.ai.deepseekReasoningEffort', { defaultValue: 'DeepSeek 推理强度' })}</span>
                  <select
                    className="max-expand-chat-web-access-policy-select"
                    value={aiConfig.deepseekReasoningEffort}
                    onChange={(event) => {
                      const value = event.target.value;
                      setAiConfig({
                        deepseekReasoningEffort: value === 'low' || value === 'high' ? value : 'medium',
                      });
                    }}
                    title={t('settings.ai.deepseekReasoningEffort', { defaultValue: 'DeepSeek 推理强度' })}
                    aria-label={t('settings.ai.deepseekReasoningEffort', { defaultValue: 'DeepSeek 推理强度' })}
                  >
                    <option value="low">{t('settings.ai.deepseekReasoningEffortOptions.low', { defaultValue: '低 (low)' })}</option>
                    <option value="medium">{t('settings.ai.deepseekReasoningEffortOptions.medium', { defaultValue: '中 (medium)' })}</option>
                    <option value="high">{t('settings.ai.deepseekReasoningEffortOptions.high', { defaultValue: '高 (high)' })}</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>{t('aiChat.modelCard.focusMode', { defaultValue: '专注模式' })}</span>
                  <select
                    className="max-expand-chat-web-access-policy-select"
                    value={aiConfig.deepseekThinking ? 'on' : 'off'}
                    onChange={(event) => {
                      setAiConfig({ deepseekThinking: event.target.value === 'on' });
                    }}
                    title={t('aiChat.modelCard.focusMode', { defaultValue: '专注模式' })}
                    aria-label={t('aiChat.modelCard.focusMode', { defaultValue: '专注模式' })}
                  >
                    <option value="off">{t('settings.ai.deepseekThinkingOptions.off', { defaultValue: '关闭' })}</option>
                    <option value="on">{t('settings.ai.deepseekThinkingOptions.on', { defaultValue: '开启' })}</option>
                  </select>
                </div>
              </div>
              <div
                className={`max-expand-chat-context-usage in-card ${contextUsageLevelClass}`}
                role="img"
                aria-label={t('aiChat.contextUsage.aria', {
                  defaultValue: '上下文使用情况：{{used}} / {{max}}（{{percent}}）',
                  used: contextUsageChars.toLocaleString(),
                  max: MAX_MIHTNELIS_CONTEXT_CHARS.toLocaleString(),
                  percent: contextUsagePercentText,
                })}
              >
                <div className="max-expand-chat-context-usage-title-row">
                  <div className="max-expand-chat-context-usage-title">
                    {t('aiChat.contextUsage.title', { defaultValue: '上下文使用量' })}
                  </div>
                  <div className="max-expand-chat-context-usage-summary">{contextUsageInlineText}</div>
                </div>
                <div className="max-expand-chat-context-usage-track">
                  <div
                    className="max-expand-chat-context-usage-fill"
                    style={{ width: `${contextUsagePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="max-expand-chat-input-bar">
          <textarea
            ref={inputRef}
            className="max-expand-chat-input"
            placeholder={aiChatStreaming
              ? t('aiChat.input.generatingPlaceholder', { defaultValue: '生成中...' })
              : t('aiChat.input.placeholder', { defaultValue: '输入消息...' })}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={aiChatStreaming}
            rows={1}
          />
          {aiChatStreaming ? (
            <button className="max-expand-chat-send" onClick={handleStop}>
              {t('aiChat.actions.stop', { defaultValue: '停止' })}
            </button>
          ) : (
            <button className="max-expand-chat-send" onClick={handleSend}>
              {t('aiChat.actions.send', { defaultValue: '发送' })}
            </button>
          )}
          <button
            className="max-expand-chat-send"
            type="button"
            onClick={() => {
              setShowModelCard((prev) => !prev);
            }}
            title={t('aiChat.modelCard.title', { defaultValue: '模型选择卡片' })}
          >
            {showDeepseekIconOnModelToggle ? (
              <span className="max-expand-chat-model-toggle-with-icon">
                <img className="max-expand-chat-model-toggle-icon" src={SvgIcon.DEEPSEEK} alt="" />
                <span>{selectedModel}</span>
              </span>
            ) : selectedModel}
          </button>
        </div>
      </div>
    </div>
  );
}
