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

import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { resolveMihtnelisWebAccess, streamMihtnelisAgent } from '../../../../api/ai/mihtnelisAgentStream';
import useIslandStore from '../../../../store/slices';
import type { AiChatMessage, AiToolCall } from '../../../../store/types';
import { readLocalToken } from '../../../../utils/userAccount';

interface ThinkEventPayload {
  text?: unknown;
  index?: unknown;
  done?: unknown;
}

interface ToolEventPayload {
  turn?: unknown;
  tool?: unknown;
  arguments?: unknown;
  success?: unknown;
  error?: unknown;
  result?: unknown;
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
  const { t } = useTranslation();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolvingWebAccessDecision, setResolvingWebAccessDecision] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const {
    aiConfig,
    aiChatMessages,
    setAiChatMessages,
    clearAiChatMessages,
    aiWebAccessPrompt,
    setAiWebAccessPrompt,
    aiWebAccessResolveError,
    setAiWebAccessResolveError,
  } = useIslandStore();

  /** 始终从 store 读最新消息再更新，避免流式 chunk 之间的闭包过期 */
  const updateMessages = useCallback((updater: (prev: AiChatMessage[]) => AiChatMessage[]) => {
    const latest = useIslandStore.getState().aiChatMessages;
    useIslandStore.getState().setAiChatMessages(updater(latest));
  }, []);

  /** 滚动到最新消息 */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatMessages]);

  /** 取消正在进行的请求 */
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  /** 发送消息并调用 API */
  const handleSend = useCallback(async (): Promise<void> => {
    const text = input.trim();
    if (!text || loading) return;

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
    setLoading(true);
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
    abortRef.current = controller;

    try {
      if (canUseMihtnelis) {
        let receivedMihtnelisChunk = false;
        let mihtnelisErrorMessage: string | null = null;
        await streamMihtnelisAgent({
          token: localToken!,
          sessionId: 'max-expand-ai-chat',
          message: text,
          provider: aiConfig.model,
          signal: controller.signal,
          onEvent: (event) => {
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

            if (event.type === 'web_access_request') {
              const payload = event.payload as { requestId?: unknown; url?: unknown; message?: unknown };
              const requestId = typeof payload?.requestId === 'string' ? payload.requestId.trim() : '';
              const url = typeof payload?.url === 'string' ? payload.url.trim() : '';
              if (!requestId || !url) {
                return;
              }
              setAiWebAccessPrompt({
                requestId,
                url,
                message: typeof payload?.message === 'string' ? payload.message : '',
              });
              setAiWebAccessResolveError('');
              return;
            }

            if (event.type === 'web_access_resolved') {
              setAiWebAccessPrompt(null);
              setAiWebAccessResolveError('');
              return;
            }

            if (event.type === 'think') {
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
          aiConfig.model,
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
      abortRef.current = null;
      setLoading(false);
      setResolvingWebAccessDecision(false);
    }
  }, [
    input,
    loading,
    aiChatMessages,
    aiConfig,
    setAiChatMessages,
    updateMessages,
    t,
    setAiWebAccessPrompt,
    setAiWebAccessResolveError,
  ]);

  /** 回车发送 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** 停止生成 */
  const handleStop = (): void => {
    abortRef.current?.abort();
  };

  /** 清空对话 */
  const handleClear = (): void => {
    abortRef.current?.abort();
    clearAiChatMessages();
    setLoading(false);
    setResolvingWebAccessDecision(false);
    setAiWebAccessPrompt(null);
    setAiWebAccessResolveError('');
  };

  const handleResolveWebAccess = useCallback(async (allow: boolean): Promise<void> => {
    const localToken = readLocalToken();
    if (!localToken || !aiWebAccessPrompt?.requestId) {
      return;
    }
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
      setAiWebAccessResolveError(errMsg);
    } finally {
      setResolvingWebAccessDecision(false);
    }
  }, [t, aiWebAccessPrompt, setAiWebAccessPrompt, setAiWebAccessResolveError]);

  return (
    <div className="max-expand-chat">
      {/* 标题 */}
      <div className="max-expand-chat-header">
        <span className="max-expand-chat-header-title">{t('aiChat.title', { defaultValue: 'AI 对话' })}</span>
        <div className="max-expand-chat-header-actions">
          <span className="max-expand-chat-header-model">{readLocalToken() ? 'mihtnelis agent' : (aiConfig.model || t('aiChat.notConfigured', { defaultValue: '未配置' }))}</span>
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
                {Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0 && (
                  <div className="max-expand-chat-tool-list">
                    {msg.toolCalls.map((toolCall, toolIndex) => (
                      <details key={`${toolCall.tool}-${toolCall.turn}-${toolIndex}`} className="max-expand-chat-tool-card">
                        <summary className="max-expand-chat-tool-card-head">
                          <span className="max-expand-chat-tool-left">
                            <span className="max-expand-chat-tool-name">{toolCall.tool}</span>
                            <span className="max-expand-chat-tool-turn">#{toolCall.turn || toolIndex + 1}</span>
                          </span>
                          <span className={`max-expand-chat-tool-status ${toolCall.success ? 'success' : 'failed'}`}>
                            {toolCall.success ? '完成' : '失败'}
                          </span>
                        </summary>
                        <div className="max-expand-chat-tool-result">
                          <div className="max-expand-chat-tool-result-title">工具返回结果</div>
                          <pre>{toPrettyJson(toolCall.result)}</pre>
                        </div>
                      </details>
                    ))}
                  </div>
                )}

                {Array.isArray(msg.thinkBlocks) && msg.thinkBlocks.length > 0 && (
                  <div className="max-expand-chat-think-list">
                    {msg.thinkBlocks.map((thinkText, thinkIndex) => (
                      <details key={`${thinkIndex}-${thinkText.slice(0, 16)}`} className="max-expand-chat-think-card" open={thinkIndex === msg.thinkBlocks!.length - 1 && loading && i === aiChatMessages.length - 1}>
                        <summary>思考过程 #{thinkIndex + 1}</summary>
                        <div className="max-expand-chat-think-content">{thinkText}</div>
                      </details>
                    ))}
                  </div>
                )}

                {msg.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  loading && i === aiChatMessages.length - 1 ? '...' : ''
                )}
              </>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      {aiWebAccessPrompt && (
        <div className="max-expand-chat-web-access-panel">
          <div className="max-expand-chat-web-access-card">
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
            </div>
            {aiWebAccessResolveError && (
              <div className="max-expand-chat-web-access-error">{aiWebAccessResolveError}</div>
            )}
          </div>
        </div>
      )}
      {/* 输入栏 */}
      <div className="max-expand-chat-input-bar">
        <input
          className="max-expand-chat-input"
          type="text"
          placeholder={loading
            ? t('aiChat.input.generatingPlaceholder', { defaultValue: '生成中...' })
            : t('aiChat.input.placeholder', { defaultValue: '输入消息...' })}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        {loading ? (
          <button className="max-expand-chat-send" onClick={handleStop}>
            {t('aiChat.actions.stop', { defaultValue: '停止' })}
          </button>
        ) : (
          <button className="max-expand-chat-send" onClick={handleSend}>
            {t('aiChat.actions.send', { defaultValue: '发送' })}
          </button>
        )}
      </div>
    </div>
  );
}
