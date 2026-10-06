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
 * @file useChatSend.ts
 * @description AI 对话消息发送 Hook：处理流式 API 调用、本地工具执行、网页授权及 SSE 事件分发。
 * @author 鸡哥
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  resolveMihtnelisLocalToolAccess,
  resolveMihtnelisLocalToolResult,
  resolveMihtnelisWebAccess,
  streamMihtnelisAgent,
} from '../../../../../../api/ai/mihtnelisAgentStream';
import { streamOllamaLocalAgent } from '../../../../../../api/ai/ollamaLocalAgent';
import { streamCustomDirectAgent } from '../../../../../../api/ai/customDirectAgent';
import {
  fetchWebsiteTitle,
  getWebsiteAuthorizationPolicy,
  getWebsiteFaviconUrl,
  getWebsiteHostname,
  setWebsiteAuthorizationPolicy,
  type SiteAuthorizationPolicy,
} from '../../../../../../api/site/siteMetaApi';
import useIslandStore from '../../../../../../store/slices';
import type { AiChatAttachment, AiChatMessage, AiToolCall, AiTodoItem, AiTodoSnapshot } from '../../../../../../store/types';
import { readLocalToken } from '../../../../../../utils/userAccount';
import { loadLocationFromStorage } from '../../../../../../store/utils/storage';
import {
  buildMihtnelisContext,
  streamChatCompletion,
  unwrapJsonEnvelope,
} from '../utils/chatUtils';
import {
  type FinalEventPayload,
  type MetaEventPayload,
  type ThinkEventPayload,
  type ToolCallRequestPayload,
  type ToolCallResultPayload,
  type ToolEventPayload,
} from '../types/chatTypes';
import {
  ATTACHMENT_MAX_COUNT,
  ATTACHMENT_MAX_SIZE_BYTES,
} from '../config/chatConstants';
import {
  isAcceptedAttachmentFile,
  isClientLocalToolName,
  isHighRiskLocalToolName,
} from '../utils/chatHelpers';
import {
  SESSION_ABORT_CONTROLLERS,
  SESSION_STREAMING_IDS,
  type ChatState,
} from './useChatState';

/** useChatSend Hook Props — 从 useChatState 解构出需要的状态与方法 */
interface UseChatSendParams {
  state: ChatState;
}

/** useChatSend Hook 返回类型 */
interface UseChatSendResult {
  handleSend: () => Promise<void>;
  executeAndSubmitLocalToolResult: (params: {
    token: string;
    requestId: string;
    tool: string;
    argumentsPayload: Record<string, unknown>;
  }) => Promise<void>;
  handleResolveWebAccess: (allow: boolean) => Promise<void>;
  handleResolveLocalToolAccess: (allow: boolean) => Promise<void>;
  handleDomainPolicyChange: (policy: SiteAuthorizationPolicy) => void;
  handleAttachFiles: (files: FileList | File[]) => void;
  handleAttachmentDrop: (files: FileList | File[]) => void;
  handleAttachmentDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  handleAttachmentDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleAttachmentDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleAttachmentDropEvent: (e: React.DragEvent<HTMLDivElement>) => void;
  markAttachmentDropInvalid: () => void;
  handleReportIssueFromFinalAnswer: (traceId: string, finalAnswer: string) => void;
  navigateToSettingsTab: (intent: string) => void;
}

/** AI 对话消息发送 Hook */
export function useChatSend({ state }: UseChatSendParams): UseChatSendResult {
  const { t } = useTranslation();

  const {
    input, setInput,
    setVisibleWindowStart,
    agentMode,
    pendingAttachments, setPendingAttachments,
    attachmentDragDepthRef, attachmentInvalidTimerRef,
    pendingMessageFlushRafRef,
    setResolvingWebAccessDecision,
    aiLocalToolAccessPrompt, setAiLocalToolAccessPrompt,
    setAiLocalToolAccessResolveError,
    setResolvingLocalToolAccessDecision,
    setPendingQuote,
    aiChatMessages, aiChatSessions, activeAiChatSessionId,
    aiChatStreaming,
    setAiChatStreaming, setAiChatSessionMessages,
    markAiChatSessionReplyFinished, setAiChatMessages,
    aiWebAccessPrompt, setAiWebAccessPrompt,
    setAiWebAccessResolveError,
    setMaxExpandTab,
    aiConfig,
    updateMessages, flushPendingAssistantUpdates,
    scheduleAssistantUpdateFlush, refreshActiveSessionStreaming,
    selectedModel, isOllamaModel, isCustomApiModel,
    selectedProvider, hasCustomApiCredentials,
    contextUsageTokens, selectedContextLimit,
    setAttachmentDragOver, setAttachmentDropInvalid,
  } = state;

  /** 执行本地工具并提交结果 */
  const executeAndSubmitLocalToolResult = useCallback(async (params: {
    token: string;
    requestId: string;
    tool: string;
    argumentsPayload: Record<string, unknown>;
  }): Promise<void> => {
    const executor = window.api?.executeAgentLocalTool;
    if (typeof executor !== 'function') {
      await resolveMihtnelisLocalToolResult({
        token: params.token,
        requestId: params.requestId,
        success: false,
        result: {},
        error: 'LOCAL_RUNTIME_UNAVAILABLE',
        durationMs: 0,
      });
      return;
    }
    let execution: {
      success?: boolean;
      result?: unknown;
      error?: string;
      durationMs?: number;
    } = {};
    try {
      execution = await executor({
        tool: params.tool,
        arguments: params.argumentsPayload,
        workspaces: aiConfig.workspaces,
      });
    } catch (error: unknown) {
      execution = {
        success: false,
        result: {},
        error: error instanceof Error
          ? error.message
          : t('aiChat.messages.localToolExecuteFailed', { defaultValue: '本地工具执行失败' }),
        durationMs: 0,
      };
    }
    await resolveMihtnelisLocalToolResult({
      token: params.token,
      requestId: params.requestId,
      success: Boolean(execution?.success),
      result: execution?.result,
      error: typeof execution?.error === 'string' ? execution.error : '',
      durationMs: typeof execution?.durationMs === 'number' ? execution.durationMs : 0,
    });
  }, [aiConfig.workspaces, t]);

  /** 发送消息并调用 API */
  const handleSend = useCallback(async (): Promise<void> => {
    const text = input.trim();
    const targetSessionId = activeAiChatSessionId;
    if (!text) return;
    if (SESSION_STREAMING_IDS.has(targetSessionId)) {
      if (agentMode !== 'r1pxc') return;
      const prevController = SESSION_ABORT_CONTROLLERS.get(targetSessionId);
      prevController?.abort();
      SESSION_ABORT_CONTROLLERS.delete(targetSessionId);
      SESSION_STREAMING_IDS.delete(targetSessionId);
      if (pendingMessageFlushRafRef.current !== null && pendingMessageFlushRafRef.current !== undefined) {
        window.cancelAnimationFrame(pendingMessageFlushRafRef.current);
        pendingMessageFlushRafRef.current = null;
      }
      flushPendingAssistantUpdates();
    }
    const updateTargetMessages = (updater: (prev: AiChatMessage[]) => AiChatMessage[]): void => {
      const storeState = useIslandStore.getState();
      const session = storeState.aiChatSessions.find((item) => item.id === targetSessionId);
      const prevMessages = session?.messages ?? [];
      storeState.setAiChatSessionMessages(targetSessionId, updater(prevMessages));
    };

    const localToken = readLocalToken();
    const canUseMihtnelis = Boolean(localToken && localToken.trim().length > 0);

    if (!isOllamaModel && !canUseMihtnelis && !aiConfig.apiKey) {
      updateTargetMessages(prev => ([
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

    if (contextUsageTokens >= selectedContextLimit) {
      updateTargetMessages(prev => ([
        ...prev,
        { role: 'user', content: text },
        {
          role: 'assistant',
          content: t('aiChat.messages.contextLimitExceeded', {
            defaultValue: '⚠️ 当前会话已累计使用 {{used}} tokens，超出上下文限制（{{max}} tokens）。请新建会话继续对话。',
            used: contextUsageTokens.toLocaleString(),
            max: selectedContextLimit.toLocaleString(),
          }),
        },
      ]));
      setInput('');
      return;
    }

    const attachmentMeta: AiChatAttachment[] = pendingAttachments.map((a) => ({ name: a.name, size: a.size }));
    const attachmentPrefix = pendingAttachments.length > 0
      ? pendingAttachments.map((a) => `<attachment name="${a.name}">\n${a.content}\n</attachment>`).join('\n\n') + '\n\n'
      : '';
    const quotePrefix = state.pendingQuote && agentMode === 'r1pxc' ? `> 引用: ${state.pendingQuote}\n\n` : '';
    const fullContent = attachmentPrefix + quotePrefix + text;
    const userMsg: AiChatMessage = {
      role: 'user',
      content: fullContent,
      ...(attachmentMeta.length > 0 ? { attachments: attachmentMeta } : {}),
      ...(state.pendingQuote && agentMode === 'r1pxc' ? { quote: state.pendingQuote } : {}),
    };
    updateTargetMessages(prev => [...prev, userMsg]);
    const latestSession = useIslandStore.getState().aiChatSessions.find((s) => s.id === targetSessionId);
    const nextMessages: AiChatMessage[] = latestSession?.messages ?? [...aiChatMessages, userMsg];
    setVisibleWindowStart(0);
    setInput('');
    setPendingAttachments([]);
    setPendingQuote(null);
    setAiChatStreaming(true);
    setAiWebAccessPrompt(null);
    setAiWebAccessResolveError('');
    setAiLocalToolAccessPrompt(null);
    setAiLocalToolAccessResolveError('');

    // 构建 API 请求消息（含 system prompt）
    const apiMessages: { role: string; content: string }[] = [];
    if (aiConfig.systemPrompt) {
      apiMessages.push({ role: 'system', content: aiConfig.systemPrompt });
    }
    nextMessages.forEach((m) => {
      apiMessages.push({ role: m.role, content: m.content });
    });

    // 添加占位 AI 消息
    updateTargetMessages(prev => ([...prev, { role: 'assistant', content: '', model: selectedModel, finalized: false, thinkBlocks: [], toolCalls: [] }]));

    const controller = new AbortController();
    SESSION_ABORT_CONTROLLERS.set(targetSessionId, controller);
    SESSION_STREAMING_IDS.add(targetSessionId);
    refreshActiveSessionStreaming();

    try {
      if (isOllamaModel) {
        let receivedOllamaChunk = false;
        let ollamaErrorMessage: string | null = null;
        const ollamaContext = buildMihtnelisContext(nextMessages);
        const ollamaEnabledSkills = Array.isArray(aiConfig.skills) ? aiConfig.skills.filter((s) => s.enabled && s.filePath) : [];
        let ollamaResolvedSkills: Array<{ name: string; content: string }> | undefined;
        if (ollamaEnabledSkills.length > 0) {
          const ollamaSkillResults = await Promise.all(
            ollamaEnabledSkills.map(async (s) => {
              const content = await window.api.readTextFile(s.filePath);
              return content ? { name: s.name, content } : null;
            }),
          );
          const ollamaValidSkills = ollamaSkillResults.filter((r): r is { name: string; content: string } => r !== null && r.content.trim().length > 0);
          if (ollamaValidSkills.length > 0) ollamaResolvedSkills = ollamaValidSkills;
        }
        const ollamaModelName = aiConfig.ollamaModel || 'qwen3:8b';
        const ollamaTemperature = aiConfig.deepseekReasoningEffort === 'low' ? 0.3 : aiConfig.deepseekReasoningEffort === 'high' ? 1.0 : 0.6;
        let ollamaThinkingEnabled = false;
        await streamOllamaLocalAgent({
          token: localToken || '',
          message: text,
          model: ollamaModelName,
          agentMode,
          context: ollamaContext,
          workspaces: aiConfig.workspaces,
          skills: ollamaResolvedSkills,
          baseUrl: aiConfig.ollamaBaseUrl || undefined,
          temperature: ollamaTemperature,
          signal: controller.signal,
          onEvent: (event) => {
            if (SESSION_ABORT_CONTROLLERS.get(targetSessionId) !== controller) return;
            if (event.type === 'meta') {
              const payload = event.payload as { thinkingEnabled?: unknown };
              ollamaThinkingEnabled = Boolean(payload?.thinkingEnabled);
              return;
            }
            if (event.type === 'think') {
              if (!ollamaThinkingEnabled || !aiConfig.deepseekThinking) return;
              const payload = event.payload as { text?: unknown; index?: unknown };
              const thinkText = typeof payload?.text === 'string' ? payload.text : '';
              const thinkIndex = typeof payload?.index === 'number' ? payload.index : 0;
              if (!thinkText) return;
              receivedOllamaChunk = true;
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                const nextThinkBlocks = Array.isArray(last.thinkBlocks) ? [...last.thinkBlocks] : [];
                const oldText = typeof nextThinkBlocks[thinkIndex] === 'string' ? nextThinkBlocks[thinkIndex] : '';
                nextThinkBlocks[thinkIndex] = `${oldText}${thinkText}`;
                copy[copy.length - 1] = { ...last, thinkBlocks: nextThinkBlocks };
                return copy;
              });
              return;
            }
            if ((event.type as string) === 'stream_rollback') {
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                copy[copy.length - 1] = { ...last, content: '' };
                return copy;
              });
              return;
            }
            if (event.type === 'chunk') {
              const payload = event.payload as { text?: unknown };
              const chunk = typeof payload?.text === 'string' ? payload.text : '';
              if (!chunk) return;
              receivedOllamaChunk = true;
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                copy[copy.length - 1] = { ...last, content: `${last.content}${chunk}` };
                return copy;
              });
              return;
            }
            if (event.type === 'tool_call_request') {
              const payload = event.payload as ToolCallRequestPayload;
              const turn = typeof payload?.turn === 'number' ? payload.turn : 0;
              const tool = typeof payload?.tool === 'string' ? payload.tool.trim() : '';
              const purpose = typeof payload?.purpose === 'string' ? payload.purpose.trim() : '';
              const riskLevel = typeof payload?.riskLevel === 'string' ? payload.riskLevel : 'local';
              const argumentsPayload = typeof payload?.arguments === 'object' && payload?.arguments !== null
                ? payload.arguments as Record<string, unknown>
                : {};
              if (!tool) return;
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                const oldCalls = Array.isArray(last.toolCalls) ? [...last.toolCalls] : [];
                oldCalls.push({ turn, tool, purpose, arguments: argumentsPayload, riskLevel, pending: true, success: undefined, error: '' });
                copy[copy.length - 1] = { ...last, toolCalls: oldCalls };
                return copy;
              });
              return;
            }
            if (event.type === 'tool_call_result') {
              const payload = event.payload as ToolCallResultPayload;
              const turn = typeof payload?.turn === 'number' ? payload.turn : 0;
              const tool = typeof payload?.tool === 'string' ? payload.tool.trim() : 'unknown';
              const success = Boolean(payload?.success);
              const error = typeof payload?.error === 'string' ? payload.error : '';
              const durationMs = typeof payload?.durationMs === 'number' ? payload.durationMs : 0;
              const result = payload?.result;
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                const oldCalls = Array.isArray(last.toolCalls) ? [...last.toolCalls] : [];
                let matched = false;
                for (let i = oldCalls.length - 1; i >= 0; i--) {
                  const current = oldCalls[i];
                  if (!current) continue;
                  if ((turn > 0 && current.turn === turn && current.tool === tool) || (current.pending && current.tool === tool)) {
                    oldCalls[i] = { ...current, pending: false, success, error, result, durationMs };
                    matched = true;
                    break;
                  }
                }
                if (!matched) {
                  oldCalls.push({ turn, tool, pending: false, success, error, result, durationMs });
                }
                copy[copy.length - 1] = { ...last, toolCalls: oldCalls };
                return copy;
              });
              return;
            }
            if (event.type === 'error') {
              const payload = event.payload as { message?: unknown };
              ollamaErrorMessage = typeof payload?.message === 'string'
                ? payload.message
                : t('aiChat.messages.agentError', { defaultValue: 'Ollama 本地 Agent 返回错误' });
              return;
            }
            if (event.type === 'final') {
              const payload = event.payload as FinalEventPayload;
              const billedInput = typeof payload?.billedInputTokens === 'number' ? payload.billedInputTokens : 0;
              const billedOutput = typeof payload?.billedOutputTokens === 'number' ? payload.billedOutputTokens : 0;
              const billedTotal = typeof payload?.billedTokenTotal === 'number' ? payload.billedTokenTotal : (billedInput + billedOutput);
              const tokenSource = typeof payload?.tokenSource === 'string' ? payload.tokenSource : 'local';
              const tokenUsage = (billedInput > 0 || billedOutput > 0)
                ? { inputTokens: billedInput, outputTokens: billedOutput, reasoningTokens: 0, totalTokens: billedTotal, source: tokenSource }
                : undefined;
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                copy[copy.length - 1] = { ...last, finalized: true, ...(tokenUsage ? { tokenUsage } : {}) };
                return copy;
              });
              return;
            }
          },
        });
        if (!receivedOllamaChunk) {
          const fallbackMessage = ollamaErrorMessage
            ? `❌ ${ollamaErrorMessage}`
            : t('aiChat.messages.noModelOutputOllama', { defaultValue: '⚠️ 未收到模型输出，请检查 Ollama 服务是否运行中。' });
          updateTargetMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.role === 'assistant' && !last.content) {
              copy[copy.length - 1] = { ...last, content: fallbackMessage };
            }
            return copy;
          });
        }
      } else if (isCustomApiModel && aiConfig.customApiMode === 'direct' && hasCustomApiCredentials) {
        let receivedDirectChunk = false;
        let directErrorMessage: string | null = null;
        let directThinkingEnabled = true;
        const directContext = buildMihtnelisContext(nextMessages);
        const directEnabledSkills = Array.isArray(aiConfig.skills) ? aiConfig.skills.filter((s) => s.enabled && s.filePath) : [];
        let directResolvedSkills: Array<{ name: string; content: string }> | undefined;
        if (directEnabledSkills.length > 0) {
          const directSkillResults = await Promise.all(
            directEnabledSkills.map(async (s) => {
              const content = await window.api.readTextFile(s.filePath);
              return content ? { name: s.name, content } : null;
            }),
          );
          const directValidSkills = directSkillResults.filter((r): r is { name: string; content: string } => r !== null && r.content.trim().length > 0);
          if (directValidSkills.length > 0) directResolvedSkills = directValidSkills;
        }
        const directModelName = aiConfig.customApiModel || 'gpt-4o-mini';
        const directTemperature = aiConfig.deepseekReasoningEffort === 'low' ? 0.3 : aiConfig.deepseekReasoningEffort === 'high' ? 1.0 : 0.6;
        await streamCustomDirectAgent({
          token: localToken || '',
          message: text,
          model: directModelName,
          agentMode,
          context: directContext,
          workspaces: aiConfig.workspaces,
          skills: directResolvedSkills,
          baseUrl: aiConfig.endpoint,
          apiKey: aiConfig.apiKey,
          temperature: directTemperature,
          signal: controller.signal,
          onEvent: (event) => {
            if (SESSION_ABORT_CONTROLLERS.get(targetSessionId) !== controller) return;
            if (event.type === 'meta') {
              const payload = event.payload as { thinkingEnabled?: unknown };
              directThinkingEnabled = Boolean(payload?.thinkingEnabled);
              return;
            }
            if (event.type === 'think') {
              if (!directThinkingEnabled || !aiConfig.deepseekThinking) return;
              const payload = event.payload as { text?: unknown; index?: unknown };
              const thinkText = typeof payload?.text === 'string' ? payload.text : '';
              const thinkIndex = typeof payload?.index === 'number' ? payload.index : 0;
              if (!thinkText) return;
              receivedDirectChunk = true;
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                const blocks = Array.isArray(last.thinkBlocks) ? [...last.thinkBlocks] : [];
                while (blocks.length <= thinkIndex) blocks.push('');
                blocks[thinkIndex] = (blocks[thinkIndex] || '') + thinkText;
                copy[copy.length - 1] = { ...last, thinkBlocks: blocks };
                return copy;
              });
              return;
            }
            if ((event.type as string) === 'stream_rollback') {
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                copy[copy.length - 1] = { ...last, content: '' };
                return copy;
              });
              return;
            }
            if (event.type === 'chunk') {
              const payload = event.payload as { text?: unknown };
              const chunk = typeof payload?.text === 'string' ? payload.text : '';
              if (!chunk) return;
              receivedDirectChunk = true;
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                copy[copy.length - 1] = { ...last, content: `${last.content}${chunk}` };
                return copy;
              });
              return;
            }
            if (event.type === 'tool_call_request') {
              const payload = event.payload as { turn?: number; tool?: string; purpose?: string; arguments?: Record<string, unknown>; riskLevel?: string };
              receivedDirectChunk = true;
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                const toolCalls = Array.isArray(last.toolCalls) ? [...last.toolCalls] : [];
                toolCalls.push({ turn: payload.turn || 0, tool: payload.tool || '', purpose: payload.purpose || '', riskLevel: payload.riskLevel || '', pending: true, arguments: payload.arguments });
                copy[copy.length - 1] = { ...last, toolCalls };
                return copy;
              });
              return;
            }
            if (event.type === 'tool_call_result') {
              const payload = event.payload as { turn?: number; tool?: string; success?: boolean; error?: string; result?: unknown; durationMs?: number };
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                const toolCalls = Array.isArray(last.toolCalls) ? [...last.toolCalls] : [];
                const idx = toolCalls.findIndex((tc) => tc && tc.turn === payload.turn && tc.tool === payload.tool && tc.pending);
                if (idx >= 0) {
                  toolCalls[idx] = { ...toolCalls[idx], pending: false, success: payload.success, error: payload.error || '', result: payload.result, durationMs: payload.durationMs || 0 };
                }
                copy[copy.length - 1] = { ...last, toolCalls };
                return copy;
              });
              return;
            }
            if (event.type === 'final') {
              const payload = event.payload as { billedInputTokens?: number; billedOutputTokens?: number; billedTokenTotal?: number; tokenSource?: string };
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                copy[copy.length - 1] = {
                  ...last,
                  finalized: true,
                  model: 'custom-api',
                  tokenUsage: {
                    inputTokens: payload.billedInputTokens || 0,
                    outputTokens: payload.billedOutputTokens || 0,
                    reasoningTokens: 0,
                    totalTokens: payload.billedTokenTotal || 0,
                    source: payload.tokenSource || 'estimate',
                  },
                };
                return copy;
              });
              return;
            }
            if (event.type === 'error') {
              const payload = event.payload as { message?: unknown };
              directErrorMessage = typeof payload?.message === 'string'
                ? payload.message
                : t('aiChat.messages.agentError', { defaultValue: '直连 Agent 返回错误' });
              return;
            }
          },
        });
        if (!receivedDirectChunk) {
          const fallbackMessage = directErrorMessage
            ? `❌ ${directErrorMessage}`
            : t('aiChat.messages.noModelOutputCustomDirect', { defaultValue: '⚠️ 未收到模型输出，请检查自定义 API 端点和密钥是否正确。' });
          updateTargetMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.role === 'assistant' && !last.content) {
              copy[copy.length - 1] = { ...last, content: fallbackMessage };
            }
            return copy;
          });
        }
      } else if (canUseMihtnelis) {
        let receivedMihtnelisChunk = false;
        let mihtnelisErrorMessage: string | null = null;
        let streamThinkingEnabled = Boolean(aiConfig.deepseekThinking);
        const context = buildMihtnelisContext(nextMessages);
        const enabledSkills = Array.isArray(aiConfig.skills) ? aiConfig.skills.filter((s) => s.enabled && s.filePath) : [];
        let resolvedSkills: Array<{ name: string; content: string }> | undefined;
        if (enabledSkills.length > 0) {
          const results = await Promise.all(
            enabledSkills.map(async (s) => {
              const content = await window.api.readTextFile(s.filePath);
              return content ? { name: s.name, content } : null;
            }),
          );
          const valid = results.filter((r): r is { name: string; content: string } => r !== null && r.content.trim().length > 0);
          if (valid.length > 0) resolvedSkills = valid;
        }
        await streamMihtnelisAgent({
          token: localToken!,
          sessionId: 'max-expand-ai-chat',
          message: text,
          provider: selectedProvider,
          model: isCustomApiModel ? (aiConfig.customApiModel || 'gpt-4o-mini') : selectedModel,
          agentMode,
          context,
          workspaces: aiConfig.workspaces,
          skills: resolvedSkills,
          thinking: aiConfig.deepseekThinking,
          reasoningEffort: aiConfig.deepseekReasoningEffort,
          customApiKey: isCustomApiModel ? aiConfig.apiKey : undefined,
          customEndpoint: isCustomApiModel ? aiConfig.endpoint : undefined,
          timestamp: (() => { const d = new Date(); const off = -d.getTimezoneOffset(); const sign = off >= 0 ? '+' : '-'; const pad = (n: number) => String(Math.abs(n)).padStart(2, '0'); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + sign + pad(Math.floor(Math.abs(off) / 60)) + ':' + pad(Math.abs(off) % 60); })(),
          location: (() => { const loc = loadLocationFromStorage(); if (!loc) return undefined; const parts = [loc.city, loc.regionName, loc.country].filter(Boolean); return parts.length > 0 ? parts.join(', ') : undefined; })(),
          signal: controller.signal,
          onEvent: (event) => {
            if (SESSION_ABORT_CONTROLLERS.get(targetSessionId) !== controller) return;
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
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                copy[copy.length - 1] = { ...last, content: `${last.content}${chunk}` };
                return copy;
              });
              return;
            }
            if (event.type === 'chunk_reset') {
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                copy[copy.length - 1] = { ...last, content: '' };
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
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                const oldCalls = Array.isArray(last.toolCalls) ? [...last.toolCalls] : [];
                let matched = false;
                for (let i = oldCalls.length - 1; i >= 0; i--) {
                  const current = oldCalls[i];
                  if (!current) continue;
                  const requestMatched = Boolean(requestId) && Boolean(current.requestId) && current.requestId === requestId;
                  const turnMatched = turn > 0 && current.turn === turn && current.tool === tool;
                  const pendingMatched = current.pending && current.tool === tool;
                  if (requestMatched || turnMatched || pendingMatched) {
                    oldCalls[i] = { ...current, tool, pending: false, success, error, result, durationMs };
                    matched = true;
                    break;
                  }
                }
                if (!matched) {
                  oldCalls.push({ turn, requestId, tool, pending: false, success, error, result, durationMs });
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
              if (!requestId || !url) return;
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
                    sessionId: targetSessionId,
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
                sessionId: targetSessionId,
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
                if (!trimmedTitle) return;
                const latestPrompt = useIslandStore.getState().aiWebAccessPrompt;
                if (!latestPrompt || latestPrompt.requestId !== requestId) return;
                useIslandStore.getState().setAiWebAccessPrompt({ ...latestPrompt, siteName: trimmedTitle });
              }).catch(() => undefined);
              return;
            }
            if (event.type === 'tool_call_request') {
              const payload = event.payload as ToolCallRequestPayload;
              const turn = typeof payload?.turn === 'number' ? payload.turn : 0;
              const requestId = typeof payload?.requestId === 'string' ? payload.requestId.trim() : '';
              const tool = typeof payload?.tool === 'string' ? payload.tool.trim() : '';
              const purpose = typeof payload?.purpose === 'string' ? payload.purpose.trim() : '';
              const riskLevel = typeof payload?.riskLevel === 'string' ? payload.riskLevel : '';
              const authorizationRequired = Boolean(payload?.authorizationRequired);
              const authorizationMessage = typeof payload?.message === 'string' ? payload.message : '';
              const argumentsPayload = typeof payload?.arguments === 'object' && payload?.arguments !== null && payload?.arguments !== undefined
                ? payload.arguments as Record<string, unknown>
                : {};
              if (!tool) return;
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                const oldCalls = Array.isArray(last.toolCalls) ? [...last.toolCalls] : [];
                const alreadyExists = oldCalls.some((c) => {
                  if (!c) return false;
                  if (requestId && c.requestId === requestId) return true;
                  if (turn > 0 && c.turn === turn && c.tool === tool) return true;
                  return false;
                });
                if (alreadyExists) return copy;
                const call: AiToolCall = {
                  turn, requestId, tool, purpose,
                  arguments: argumentsPayload, riskLevel,
                  pending: true, success: undefined, error: '', result: {},
                };
                oldCalls.push(call);
                copy[copy.length - 1] = { ...last, toolCalls: oldCalls };
                return copy;
              });
              const isClientLocalTool = isClientLocalToolName(tool);
              if (!isClientLocalTool || !requestId) return;
              const needsAuthorization = authorizationRequired || isHighRiskLocalToolName(tool);
              if (needsAuthorization) {
                setAiLocalToolAccessPrompt({
                  sessionId: targetSessionId,
                  requestId, tool, purpose,
                  argumentsPayload, riskLevel,
                  message: authorizationMessage,
                });
                setAiLocalToolAccessResolveError('');
                return;
              }
              void executeAndSubmitLocalToolResult({
                token: localToken!,
                requestId, tool, argumentsPayload,
              }).catch((submitError: unknown) => {
                const message = submitError instanceof Error
                  ? submitError.message
                  : t('aiChat.messages.localToolSubmitFailed', { defaultValue: '本地工具结果提交失败' });
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
              if (!streamThinkingEnabled || !aiConfig.deepseekThinking) return;
              const payload = event.payload as ThinkEventPayload;
              const thinkText = typeof payload?.text === 'string' ? payload.text : '';
              const thinkIndex = typeof payload?.index === 'number' ? payload.index : 0;
              if (!thinkText) return;
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                const nextThinkBlocks = Array.isArray(last.thinkBlocks) ? [...last.thinkBlocks] : [];
                const oldText = typeof nextThinkBlocks[thinkIndex] === 'string' ? nextThinkBlocks[thinkIndex] : '';
                nextThinkBlocks[thinkIndex] = `${oldText}${thinkText}`;
                copy[copy.length - 1] = { ...last, thinkBlocks: nextThinkBlocks };
                return copy;
              });
              return;
            }
            if (event.type === 'tool') {
              const payload = event.payload as ToolEventPayload;
              const toolTurn = typeof payload?.turn === 'number' ? payload.turn : 0;
              const toolName = typeof payload?.tool === 'string' ? payload.tool : 'unknown';
              const toolArgs = typeof payload?.arguments === 'object' && payload?.arguments !== null && payload?.arguments !== undefined
                ? payload.arguments as Record<string, unknown>
                : {};
              const toolSuccess = Boolean(payload?.success);
              const toolError = typeof payload?.error === 'string' ? payload.error : '';
              const toolResult = payload?.result;
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                const oldCalls = Array.isArray(last.toolCalls) ? [...last.toolCalls] : [];
                let matched = false;
                for (let i = oldCalls.length - 1; i >= 0; i--) {
                  const current = oldCalls[i];
                  if (!current) continue;
                  const turnMatched = toolTurn > 0 && current.turn === toolTurn && current.tool === toolName;
                  const pendingMatched = current.pending && current.tool === toolName;
                  if (turnMatched || pendingMatched) {
                    oldCalls[i] = { ...current, pending: false, success: toolSuccess, error: toolError, result: toolResult, arguments: toolArgs };
                    matched = true;
                    break;
                  }
                  if (!current.pending && current.tool === toolName) {
                    matched = true;
                    break;
                  }
                }
                if (!matched) {
                  oldCalls.push({ turn: toolTurn, tool: toolName, arguments: toolArgs, pending: false, success: toolSuccess, error: toolError, result: toolResult });
                }
                copy[copy.length - 1] = { ...last, toolCalls: oldCalls };
                return copy;
              });
              return;
            }
            if (event.type === 'todo') {
              const payload = event.payload as { turn?: unknown; items?: unknown };
              const turn = typeof payload?.turn === 'number' ? payload.turn : 0;
              const rawItems = Array.isArray(payload?.items) ? payload.items : [];
              const items: AiTodoItem[] = rawItems
                .map((raw, index) => {
                  if (!raw || typeof raw !== 'object') return null;
                  const obj = raw as Record<string, unknown>;
                  const content = typeof obj.content === 'string' ? obj.content.trim() : '';
                  if (!content) return null;
                  const idRaw = typeof obj.id === 'string' ? obj.id.trim() : '';
                  const statusRaw = typeof obj.status === 'string' ? obj.status.trim().toLowerCase() : '';
                  const status: AiTodoItem['status'] = statusRaw === 'in_progress' || statusRaw === 'completed'
                    ? statusRaw
                    : 'pending';
                  return { id: idRaw || String(index + 1), content, status } as AiTodoItem;
                })
                .filter((item): item is AiTodoItem => item !== null && item !== undefined);
              if (items.length === 0) return;
              const snapshot: AiTodoSnapshot = { turn, items };
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === 'assistant') {
                  const oldSnapshots = Array.isArray(last.todoSnapshots) ? last.todoSnapshots : [];
                  copy[copy.length - 1] = { ...last, todoSnapshots: [...oldSnapshots, snapshot] };
                }
                return copy;
              });
              return;
            }
            if (event.type === 'error') {
              const payload = event.payload as { message?: unknown };
              const message = typeof payload?.message === 'string'
                ? payload.message
                : t('aiChat.messages.agentError', { defaultValue: 'mihtnelis agent 返回错误' });
              mihtnelisErrorMessage = message;
              return;
            }
            if (event.type === 'final') {
              const payload = event.payload as FinalEventPayload;
              const rawTraceId = payload?.traceId ?? payload?.traceid ?? payload?.trace_id;
              const traceId = typeof rawTraceId === 'string' ? rawTraceId.trim() : '';
              const billedInput = typeof payload?.billedInputTokens === 'number' ? payload.billedInputTokens : 0;
              const billedOutput = typeof payload?.billedOutputTokens === 'number' ? payload.billedOutputTokens : 0;
              const billedReasoning = typeof payload?.billedReasoningTokens === 'number' ? payload.billedReasoningTokens : 0;
              const billedTotal = typeof payload?.billedTokenTotal === 'number' ? payload.billedTokenTotal : (billedInput + billedOutput);
              const tokenSource = typeof payload?.tokenSource === 'string' ? payload.tokenSource : '';
              const tokenUsage = (billedInput > 0 || billedOutput > 0)
                ? { inputTokens: billedInput, outputTokens: billedOutput, reasoningTokens: billedReasoning, totalTokens: billedTotal, source: tokenSource }
                : undefined;
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return copy;
                copy[copy.length - 1] = { ...last, finalized: true, traceId, ...(tokenUsage ? { tokenUsage } : {}) };
                return copy;
              });
              return;
            }
          },
        });
        if (!receivedMihtnelisChunk) {
          const fallbackMessage = mihtnelisErrorMessage
            ? `❌ ${mihtnelisErrorMessage}`
            : t('aiChat.messages.noModelOutput', { defaultValue: '未收到模型输出，请检查 DeepSeek 配置与服务端日志。' });
          updateTargetMessages(prev => {
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
            updateTargetMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: last.content + chunk };
              }
              return copy;
            });
          },
          controller.signal,
          {
            apiRequestFailed: t('aiChat.messages.apiRequestFailed', {
              defaultValue: 'API 请求失败 ({{status}}): {{detail}}',
              status: '{{status}}',
              detail: '{{detail}}',
            }),
            cannotReadResponseStream: t('aiChat.messages.cannotReadResponseStream', { defaultValue: '无法读取响应流' }),
          },
        );
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const errMsg = err instanceof Error
        ? err.message
        : t('aiChat.messages.unknownError', { defaultValue: '未知错误' });
      updateTargetMessages(prev => {
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
      if (SESSION_ABORT_CONTROLLERS.get(targetSessionId) !== controller) return;
      SESSION_ABORT_CONTROLLERS.delete(targetSessionId);
      SESSION_STREAMING_IDS.delete(targetSessionId);
      refreshActiveSessionStreaming();
      if (pendingMessageFlushRafRef.current !== null && pendingMessageFlushRafRef.current !== undefined) {
        window.cancelAnimationFrame(pendingMessageFlushRafRef.current);
        pendingMessageFlushRafRef.current = null;
      }
      flushPendingAssistantUpdates();
      // 流结束后解包 JSON 信封并强制补存
      const storeState = useIslandStore.getState();
      const finalMessages = storeState.aiChatSessions.find((item) => item.id === targetSessionId)?.messages || [];
      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content) {
        const unwrapped = unwrapJsonEnvelope(lastMsg.content);
        if (unwrapped !== lastMsg.content) {
          const patched = [...finalMessages];
          patched[patched.length - 1] = { ...lastMsg, content: unwrapped };
          storeState.setAiChatSessionMessages(targetSessionId, patched);
        } else {
          storeState.setAiChatSessionMessages(targetSessionId, finalMessages);
        }
      } else {
        storeState.setAiChatSessionMessages(targetSessionId, finalMessages);
      }
      markAiChatSessionReplyFinished(targetSessionId, Date.now());
      setResolvingWebAccessDecision(false);
      setResolvingLocalToolAccessDecision(false);
    }
  }, [
    input, agentMode, aiChatMessages, aiChatSessions, activeAiChatSessionId,
    aiConfig, selectedModel, isOllamaModel, isCustomApiModel,
    selectedProvider, hasCustomApiCredentials, contextUsageTokens, selectedContextLimit,
    pendingAttachments, state.pendingQuote,
    setAiChatStreaming, setAiChatSessionMessages, markAiChatSessionReplyFinished, setAiChatMessages,
    setAiWebAccessPrompt, setAiWebAccessResolveError, setAiLocalToolAccessPrompt, setAiLocalToolAccessResolveError,
    setResolvingWebAccessDecision, setResolvingLocalToolAccessDecision,
    setMaxExpandTab, setVisibleWindowStart, setInput,
    setPendingAttachments, setPendingQuote,
    updateMessages, flushPendingAssistantUpdates,
    scheduleAssistantUpdateFlush, refreshActiveSessionStreaming,
    executeAndSubmitLocalToolResult,
    pendingMessageFlushRafRef, t,
  ]);

  /** 标记附件拖放无效 */
  const markAttachmentDropInvalid = useCallback(() => {
    setAttachmentDropInvalid(true);
    if (attachmentInvalidTimerRef.current !== null && attachmentInvalidTimerRef.current !== undefined) {
      window.clearTimeout(attachmentInvalidTimerRef.current);
    }
    attachmentInvalidTimerRef.current = window.setTimeout(() => {
      setAttachmentDropInvalid(false);
      attachmentInvalidTimerRef.current = null;
    }, 1200);
  }, [setAttachmentDropInvalid, attachmentInvalidTimerRef]);

  /** 处理文件附件 */
  const handleAttachFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    fileArray.forEach((file) => {
      if (pendingAttachments.length >= ATTACHMENT_MAX_COUNT) return;
      if (file.size > ATTACHMENT_MAX_SIZE_BYTES) return;
      if (!isAcceptedAttachmentFile(file.name)) return;
      if (pendingAttachments.some((a) => a.name === file.name)) return;
      const reader = new FileReader();
      reader.onload = () => {
        const content = typeof reader.result === 'string' ? reader.result : '';
        if (!content) return;
        setPendingAttachments((prev) => {
          if (prev.length >= ATTACHMENT_MAX_COUNT) return prev;
          if (prev.some((a) => a.name === file.name)) return prev;
          return [...prev, { name: file.name, size: file.size, content }];
        });
      };
      reader.readAsText(file);
    });
    if (state.fileInputRef.current) state.fileInputRef.current.value = '';
  }, [pendingAttachments, setPendingAttachments, state.fileInputRef]);

  /** 处理附件拖放 */
  const handleAttachmentDrop = useCallback((files: FileList | File[]) => {
    if (aiChatStreaming) return;
    const fileArray = Array.from(files);
    if (pendingAttachments.length >= ATTACHMENT_MAX_COUNT) {
      markAttachmentDropInvalid();
      return;
    }
    const hasInvalid = fileArray.some(
      (file) => file.size > ATTACHMENT_MAX_SIZE_BYTES || !isAcceptedAttachmentFile(file.name),
    );
    if (hasInvalid) {
      markAttachmentDropInvalid();
    }
    handleAttachFiles(fileArray);
  }, [aiChatStreaming, handleAttachFiles, markAttachmentDropInvalid, pendingAttachments.length]);

  const handleAttachmentDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    attachmentDragDepthRef.current += 1;
    setAttachmentDragOver((prev) => (prev ? prev : true));
  }, [setAttachmentDragOver, attachmentDragDepthRef]);

  const handleAttachmentDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleAttachmentDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    attachmentDragDepthRef.current = Math.max(0, attachmentDragDepthRef.current - 1);
    if (attachmentDragDepthRef.current === 0) {
      setAttachmentDragOver(false);
    }
  }, [setAttachmentDragOver, attachmentDragDepthRef]);

  const handleAttachmentDropEvent = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    attachmentDragDepthRef.current = 0;
    setAttachmentDragOver(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleAttachmentDrop(e.dataTransfer.files);
    }
  }, [handleAttachmentDrop, setAttachmentDragOver, attachmentDragDepthRef]);

  /** 上报问题 */
  const handleReportIssueFromFinalAnswer = useCallback((traceId: string, finalAnswer: string): void => {
    const safeTraceId = traceId.trim() || '-';
    const safeAnswer = finalAnswer.trim();
    const payload = {
      title: t('aiChat.feedback.issueTitle', { defaultValue: 'Agent输出不符合预期 - {{traceId}}', traceId: safeTraceId }),
      content: safeAnswer,
    };
    void window.api.storeWrite('settings-about-feedback-prefill', payload)
      .then(() => window.api.storeWrite('settings-open-tab', 'about-feedback'))
      .then(() => window.api.storeRead('standalone-window-mode'))
      .then((mode) => {
        if (mode === 'standalone' || mode === 'integrated') return mode;
        return window.api.storeRead('countdown-window-mode').catch(() => null);
      })
      .then((mode) => {
        if (mode === 'standalone') {
          window.api.storeWrite('standalone-window-active-tab', 'settings').catch(() => {});
          window.api.openStandaloneWindow().catch(() => {});
        } else {
          setMaxExpandTab('settings');
          window.dispatchEvent(new CustomEvent('settings-open-tab-intent', { detail: 'about-feedback' }));
        }
      })
      .catch(() => {});
  }, [setMaxExpandTab, t]);

  /** 导航到设置标签 */
  const navigateToSettingsTab = useCallback((intent: string): void => {
    void window.api.storeWrite('settings-open-tab', intent)
      .then(() => window.api.storeRead('standalone-window-mode'))
      .then((mode) => {
        if (mode === 'standalone' || mode === 'integrated') return mode;
        return window.api.storeRead('countdown-window-mode').catch(() => null);
      })
      .then((mode) => {
        if (mode === 'standalone') {
          window.api.storeWrite('standalone-window-active-tab', 'settings').catch(() => {});
          window.api.openStandaloneWindow().catch(() => {});
        } else {
          setMaxExpandTab('settings');
          window.dispatchEvent(new CustomEvent('settings-open-tab-intent', { detail: intent }));
        }
      })
      .catch(() => {});
  }, [setMaxExpandTab]);

  /** 处理网页访问授权 */
  const handleResolveWebAccess = useCallback(async (allow: boolean): Promise<void> => {
    const localToken = readLocalToken();
    if (!localToken || !aiWebAccessPrompt?.requestId) return;
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
  }, [t, aiWebAccessPrompt, setAiWebAccessPrompt, setAiWebAccessResolveError, updateMessages, setResolvingWebAccessDecision]);

  /** 处理本地工具访问授权 */
  const handleResolveLocalToolAccess = useCallback(async (allow: boolean): Promise<void> => {
    const localToken = readLocalToken();
    if (!localToken || !aiLocalToolAccessPrompt?.requestId) return;
    setResolvingLocalToolAccessDecision(true);
    setAiLocalToolAccessResolveError('');
    try {
      await resolveMihtnelisLocalToolAccess({
        token: localToken,
        requestId: aiLocalToolAccessPrompt.requestId,
        allow,
      });
      if (!allow) {
        setAiLocalToolAccessPrompt(null);
        return;
      }
      await executeAndSubmitLocalToolResult({
        token: localToken,
        requestId: aiLocalToolAccessPrompt.requestId,
        tool: aiLocalToolAccessPrompt.tool,
        argumentsPayload: aiLocalToolAccessPrompt.argumentsPayload,
      });
      setAiLocalToolAccessPrompt(null);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : t('aiChat.messages.unknownError', { defaultValue: '未知错误' });
      if (errMsg.toLowerCase().includes('pending local tool request not found')) {
        setAiLocalToolAccessPrompt(null);
        updateMessages(prev => ([
          ...prev,
          {
            role: 'assistant',
            content: t('aiChat.localToolAccess.expiredHint', {
              defaultValue: '本地工具授权请求已失效，请重新发起请求后再授权。',
            }),
          },
        ]));
        return;
      }
      setAiLocalToolAccessResolveError(errMsg);
    } finally {
      setResolvingLocalToolAccessDecision(false);
    }
  }, [t, aiLocalToolAccessPrompt, executeAndSubmitLocalToolResult, updateMessages, setAiLocalToolAccessPrompt, setAiLocalToolAccessResolveError, setResolvingLocalToolAccessDecision]);

  /** 网页授权策略变更 */
  const handleDomainPolicyChange = useCallback((policy: SiteAuthorizationPolicy): void => {
    if (!aiWebAccessPrompt) return;
    setAiWebAccessPrompt({ ...aiWebAccessPrompt, domainPolicy: policy });
    setAiWebAccessResolveError('');
  }, [aiWebAccessPrompt, setAiWebAccessPrompt, setAiWebAccessResolveError]);

  return {
    handleSend,
    executeAndSubmitLocalToolResult,
    handleResolveWebAccess,
    handleResolveLocalToolAccess,
    handleDomainPolicyChange,
    handleAttachFiles,
    handleAttachmentDrop,
    handleAttachmentDragEnter,
    handleAttachmentDragOver,
    handleAttachmentDragLeave,
    handleAttachmentDropEvent,
    markAttachmentDropInvalid,
    handleReportIssueFromFinalAnswer,
    navigateToSettingsTab,
  };
}
