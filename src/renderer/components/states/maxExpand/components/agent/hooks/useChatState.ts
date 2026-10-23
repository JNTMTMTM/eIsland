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
 * @file useChatState.ts
 * @description AI 对话 Tab 的集中式状态管理 Hook，涵盖所有 useState / useRef / useMemo / useCallback / useEffect。
 * @author 鸡哥
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../store/slices';
import type { AiChatMessage } from '../../../../../../store/types';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { readLocalToken, readLocalProfile, subscribeUserAccountSessionChanged, getRoleFromToken } from '../../../../../../utils/userAccount';
import { useShallow } from 'zustand/react/shallow';
import { resolveSessionCardState } from '../utils/sessionUtils';
import { type AiLocalToolAccessPrompt } from '../types/chatTypes';
import {
  AGENT_MODES,
  CONTEXT_LIMIT_OPTIONS,
  EMPTY_GREETING_DEFAULTS,
  STREAM_UI_FLUSH_INTERVAL_MS,
  type AgentMode,
} from '../config/chatConstants';
import {
  isMinimaxModel,
  loadAgentMode,
  saveAgentMode,
} from '../utils/chatHelpers';
import { useClickOutside } from './useClickOutside';

/** 流式请求的 AbortController 映射（模块级，跨渲染保持） */
export const SESSION_ABORT_CONTROLLERS = new Map<string, AbortController>();
/** 当前正在流式输出的会话 ID 集合（模块级） */
export const SESSION_STREAMING_IDS = new Set<string>();

/** 本地工具授权提示缓存（模块级，避免 UI 卸载后丢失） */
let cachedAiLocalToolAccessPrompt: AiLocalToolAccessPrompt | null = null;
let cachedAiLocalToolAccessResolveError = '';

/** useChatState Hook 返回类型 */
export interface ChatState {
  /** refs */
  chatRootRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  pendingAssistantChunkRef: React.MutableRefObject<string>;
  pendingThinkChunksRef: React.MutableRefObject<Map<number, string>>;
  pendingMessageFlushRafRef: React.MutableRefObject<number | null>;
  attachmentInvalidTimerRef: React.MutableRefObject<number | null>;
  attachmentDragDepthRef: React.MutableRefObject<number>;
  skillDragDepthRef: React.MutableRefObject<number>;
  lastAssistantFlushAtRef: React.MutableRefObject<number>;
  agentModeDropdownRef: React.RefObject<HTMLDivElement | null>;
  agentModeTriggerRef: React.RefObject<HTMLButtonElement | null>;
  modelDropdownRef: React.RefObject<HTMLDivElement | null>;
  contextDropdownRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  /** state */
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  showSessionSidebar: boolean;
  setShowSessionSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  agentMode: AgentMode;
  setAgentMode: (mode: AgentMode) => void;
  showAgentModeDropdown: boolean;
  setShowAgentModeDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  agentModeDropdownPos: { left: number; bottom: number } | null;
  showModelCard: boolean;
  setShowModelCard: React.Dispatch<React.SetStateAction<boolean>>;
  showModelDropdown: boolean;
  setShowModelDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  showContextDropdown: boolean;
  setShowContextDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  skillDragOver: boolean;
  setSkillDragOver: React.Dispatch<React.SetStateAction<boolean>>;
  attachmentDragOver: boolean;
  setAttachmentDragOver: React.Dispatch<React.SetStateAction<boolean>>;
  attachmentDropInvalid: boolean;
  setAttachmentDropInvalid: React.Dispatch<React.SetStateAction<boolean>>;
  pendingAttachments: Array<{ name: string; size: number; content: string }>;
  setPendingAttachments: React.Dispatch<React.SetStateAction<Array<{ name: string; size: number; content: string }>>>;
  resolvingWebAccessDecision: boolean;
  setResolvingWebAccessDecision: React.Dispatch<React.SetStateAction<boolean>>;
  aiLocalToolAccessPrompt: AiLocalToolAccessPrompt | null;
  setAiLocalToolAccessPrompt: React.Dispatch<React.SetStateAction<AiLocalToolAccessPrompt | null>>;
  aiLocalToolAccessResolveError: string;
  setAiLocalToolAccessResolveError: React.Dispatch<React.SetStateAction<string>>;
  resolvingLocalToolAccessDecision: boolean;
  setResolvingLocalToolAccessDecision: React.Dispatch<React.SetStateAction<boolean>>;
  pendingQuote: string | null;
  setPendingQuote: React.Dispatch<React.SetStateAction<string | null>>;
  hasLoginSession: boolean;
  userAvatarUrl: string | null;
  /** derived */
  availableModels: readonly ['deepseek-v4-flash', 'deepseek-v4-pro', 'mimo-v2.5', 'mimo-v2.5-pro', 'MiniMax-M2.7', 'MiniMax-M2.7-highspeed', 'MiniMax-M2.5', 'MiniMax-M2.5-highspeed', 'ollama', 'custom-api'];
  isProUser: boolean;
  selectedModel: string;
  isOllamaModel: boolean;
  isCustomApiModel: boolean;
  customApiDisplayLabel: string;
  ollamaDisplayLabel: string;
  selectedProvider: string;
  modelToggleIcon: string | null;
  hasCustomApiCredentials: boolean;
  currentAgentModeConfig: (typeof AGENT_MODES)[number];
  toggleAgentModeDropdown: () => void;
  emptyGreeting: string;
  orderedSessions: ReturnType<typeof useIslandStore.getState>['aiChatSessions'];
  getSessionCardState: (sessionId: string) => 'idle' | 'running' | 'awaiting' | 'success' | 'failed';
  contextTokenUsage: { inputTokens: number; outputTokens: number; reasoningTokens: number; totalTokens: number; source: string };
  contextUsageTokens: number;
  selectedContextLimit: number;
  contextUsagePercent: number;
  contextUsagePercentText: string;
  contextUsageLevelClass: string;
  contextUsageInlineText: string;
  selectedContextLabel: string;
  /** actions */
  updateMessages: (updater: (prev: AiChatMessage[]) => AiChatMessage[]) => void;
  flushPendingAssistantUpdates: () => void;
  scheduleAssistantUpdateFlush: () => void;
  refreshActiveSessionStreaming: () => void;
  hasActiveTextSelection: () => boolean;
  syncInputHeight: () => void;
  handleStop: () => void;
  handleCreateNewChat: () => void;
  /** store */
  aiConfig: ReturnType<typeof useIslandStore.getState>['aiConfig'];
  setAiConfig: ReturnType<typeof useIslandStore.getState>['setAiConfig'];
  aiChatMessages: AiChatMessage[];
  aiChatSessions: ReturnType<typeof useIslandStore.getState>['aiChatSessions'];
  activeAiChatSessionId: string;
  aiChatStreaming: boolean;
  createNewAiChatSession: ReturnType<typeof useIslandStore.getState>['createNewAiChatSession'];
  switchAiChatSession: ReturnType<typeof useIslandStore.getState>['switchAiChatSession'];
  deleteAiChatSession: ReturnType<typeof useIslandStore.getState>['deleteAiChatSession'];
  setAiChatStreaming: ReturnType<typeof useIslandStore.getState>['setAiChatStreaming'];
  setMaxExpandTab: ReturnType<typeof useIslandStore.getState>['setMaxExpandTab'];
  setAiChatSessionMessages: ReturnType<typeof useIslandStore.getState>['setAiChatSessionMessages'];
  markAiChatSessionReplyFinished: ReturnType<typeof useIslandStore.getState>['markAiChatSessionReplyFinished'];
  setAiChatMessages: ReturnType<typeof useIslandStore.getState>['setAiChatMessages'];
  aiWebAccessPrompt: ReturnType<typeof useIslandStore.getState>['aiWebAccessPrompt'];
  setAiWebAccessPrompt: ReturnType<typeof useIslandStore.getState>['setAiWebAccessPrompt'];
  aiWebAccessResolveError: string;
  setAiWebAccessResolveError: ReturnType<typeof useIslandStore.getState>['setAiWebAccessResolveError'];
  setLogin: ReturnType<typeof useIslandStore.getState>['setLogin'];
  setRegister: ReturnType<typeof useIslandStore.getState>['setRegister'];
  dominantColor: ReturnType<typeof useIslandStore.getState>['dominantColor'];
}

/** AI 对话集中式状态管理 Hook */
export function useChatState(): ChatState {
  const { t } = useTranslation();

  const availableModels = ['deepseek-v4-flash', 'deepseek-v4-pro', 'mimo-v2.5', 'mimo-v2.5-pro', 'MiniMax-M2.7', 'MiniMax-M2.7-highspeed', 'MiniMax-M2.5', 'MiniMax-M2.5-highspeed', 'ollama', 'custom-api'] as const;

  const localTokenForRole = readLocalToken();
  const isProUser = useMemo(() => {
    const role = getRoleFromToken(localTokenForRole);
    return role === 'pro' || role === 'admin';
  }, [localTokenForRole]);

  // ── refs ──
  const chatRootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingAssistantChunkRef = useRef('');
  const pendingThinkChunksRef = useRef<Map<number, string>>(new Map());
  const pendingMessageFlushRafRef = useRef<number | null>(null);
  const attachmentInvalidTimerRef = useRef<number | null>(null);
  const attachmentDragDepthRef = useRef(0);
  const skillDragDepthRef = useRef(0);
  const lastAssistantFlushAtRef = useRef(0);
  const agentModeDropdownRef = useRef<HTMLDivElement>(null);
  const agentModeTriggerRef = useRef<HTMLButtonElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const contextDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── state ──
  const [input, setInput] = useState('');
  const [showSessionSidebar, setShowSessionSidebar] = useState(false);
  const [agentMode, setAgentModeState] = useState<AgentMode>(loadAgentMode);
  const [showAgentModeDropdown, setShowAgentModeDropdown] = useState(false);
  const [agentModeDropdownPos, setAgentModeDropdownPos] = useState<{ left: number; bottom: number } | null>(null);
  const [modelCardRequested, setModelCardRequested] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showContextDropdown, setShowContextDropdown] = useState(false);
  const [skillDragOver, setSkillDragOver] = useState(false);
  const [attachmentDragOver, setAttachmentDragOver] = useState(false);
  const [attachmentDropInvalid, setAttachmentDropInvalid] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ name: string; size: number; content: string }>>([]);
  const [resolvingWebAccessDecision, setResolvingWebAccessDecision] = useState(false);
  const [aiLocalToolAccessPrompt, setAiLocalToolAccessPrompt] = useState<AiLocalToolAccessPrompt | null>(() => cachedAiLocalToolAccessPrompt);
  const [aiLocalToolAccessResolveError, setAiLocalToolAccessResolveError] = useState(() => cachedAiLocalToolAccessResolveError);
  const [resolvingLocalToolAccessDecision, setResolvingLocalToolAccessDecision] = useState(false);
  const [pendingQuote, setPendingQuote] = useState<string | null>(null);
  const [hasLoginSession, setHasLoginSession] = useState<boolean>(() => Boolean(readLocalToken()));
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(() => readLocalProfile()?.avatar ?? null);

  // ── store ──
  const {
    aiConfig, setAiConfig,
    aiChatMessages, aiChatSessions, activeAiChatSessionId, aiChatStreaming,
    createNewAiChatSession, switchAiChatSession, deleteAiChatSession,
    setAiChatStreaming, setMaxExpandTab, setAiChatSessionMessages,
    markAiChatSessionReplyFinished, setAiChatMessages,
    aiWebAccessPrompt, setAiWebAccessPrompt,
    aiWebAccessResolveError, setAiWebAccessResolveError,
    setLogin, setRegister, dominantColor,
  } = useIslandStore(useShallow((store) => ({
    aiConfig: store.aiConfig, setAiConfig: store.setAiConfig,
    aiChatMessages: store.aiChatMessages, aiChatSessions: store.aiChatSessions,
    activeAiChatSessionId: store.activeAiChatSessionId, aiChatStreaming: store.aiChatStreaming,
    createNewAiChatSession: store.createNewAiChatSession, switchAiChatSession: store.switchAiChatSession,
    deleteAiChatSession: store.deleteAiChatSession, setAiChatStreaming: store.setAiChatStreaming,
    setMaxExpandTab: store.setMaxExpandTab, setAiChatSessionMessages: store.setAiChatSessionMessages,
    markAiChatSessionReplyFinished: store.markAiChatSessionReplyFinished, setAiChatMessages: store.setAiChatMessages,
    aiWebAccessPrompt: store.aiWebAccessPrompt, setAiWebAccessPrompt: store.setAiWebAccessPrompt,
    aiWebAccessResolveError: store.aiWebAccessResolveError, setAiWebAccessResolveError: store.setAiWebAccessResolveError,
    setLogin: store.setLogin, setRegister: store.setRegister, dominantColor: store.dominantColor,
  })));

  // 授权优先：渲染时立即屏蔽模型卡片，再清除打开状态，避免同帧到达的请求与点击互相覆盖。
  const hasActiveAuthorization = aiWebAccessPrompt?.sessionId === activeAiChatSessionId
    || aiLocalToolAccessPrompt?.sessionId === activeAiChatSessionId;
  const showModelCard = modelCardRequested && !hasActiveAuthorization;
  const setShowModelCard = useCallback<React.Dispatch<React.SetStateAction<boolean>>>((next) => {
    setModelCardRequested(hasActiveAuthorization ? false : next);
  }, [hasActiveAuthorization]);
  useEffect(() => {
    setModelCardRequested(false);
    setShowModelDropdown(false);
    setShowContextDropdown(false);
  }, [activeAiChatSessionId, hasActiveAuthorization]);

  // ── 用户会话同步 ──
  useEffect(() => {
    const syncSession = (): void => {
      setHasLoginSession(Boolean(readLocalToken()));
      setUserAvatarUrl(readLocalProfile()?.avatar ?? null);
    };
    syncSession();
    return subscribeUserAccountSessionChanged(syncSession);
  }, []);

  // ── 模型计算 ──
  const hasCustomApiCredentials = Boolean(aiConfig.apiKey?.trim() && aiConfig.endpoint?.trim());
  const selectedModel = (() => {
    const m = availableModels.includes(aiConfig.model as (typeof availableModels)[number])
      ? aiConfig.model
      : 'deepseek-v4-flash';
    if (m === 'custom-api' && (!isProUser || !hasCustomApiCredentials)) return 'deepseek-v4-flash';
    if (!isProUser && (m === 'deepseek-v4-pro'
      || m === 'mimo-v2.5-pro'
      || m === 'MiniMax-M2.7-highspeed'
      || m === 'MiniMax-M2.5-highspeed')) return 'deepseek-v4-flash';
    return m;
  })();
  const isOllamaModel = selectedModel === 'ollama';
  const isCustomApiModel = selectedModel === 'custom-api';
  const customApiDisplayLabel = aiConfig.customApiModel
    ? `custom-api (${aiConfig.customApiModel})`
    : 'custom-api';
  const selectedProvider = isCustomApiModel
    ? 'custom'
    : (isOllamaModel
      ? 'ollama'
      : (selectedModel.startsWith('mimo-')
        ? 'mimo'
        : (isMinimaxModel(selectedModel) ? 'minimax' : 'deepseek')));
  const modelToggleIcon = isCustomApiModel
    ? SvgIcon.AI
    : (isOllamaModel
      ? SvgIcon.OLLAMA
      : (selectedModel.startsWith('mimo-')
        ? SvgIcon.MIMO
        : (isMinimaxModel(selectedModel) ? SvgIcon.MINIMAX : (selectedModel.toLowerCase().includes('deepseek') ? SvgIcon.DEEPSEEK : null))));
  const ollamaDisplayLabel = aiConfig.ollamaModel ? `ollama (${aiConfig.ollamaModel})` : 'ollama';

  // ── agent 模式 ──
  const currentAgentModeConfig = useMemo(() => AGENT_MODES.find((m) => m.id === agentMode) ?? AGENT_MODES[0], [agentMode]);
  const toggleAgentModeDropdown = useCallback(() => {
    setShowAgentModeDropdown((prev) => {
      if (!prev && agentModeTriggerRef.current) {
        const rect = agentModeTriggerRef.current.getBoundingClientRect();
        setAgentModeDropdownPos({ left: rect.left, bottom: window.innerHeight - rect.top + 6 });
      }
      return !prev;
    });
  }, []);
  const setAgentMode = useCallback((mode: AgentMode) => {
    setAgentModeState(mode);
    saveAgentMode(mode);
    setShowAgentModeDropdown(false);
  }, []);

  // ── 空白问候语 ──
  const [emptyGreetingVariantIndex] = useState(() => Math.floor(Math.random() * EMPTY_GREETING_DEFAULTS.length));
  const emptyGreeting = t(`aiChat.messages.emptyGreetingVariants.${emptyGreetingVariantIndex}`, {
    defaultValue: EMPTY_GREETING_DEFAULTS[emptyGreetingVariantIndex] || EMPTY_GREETING_DEFAULTS[0],
  });

  // ── 会话排序 ──
  const orderedSessions = useMemo(() => (
    [...aiChatSessions].sort((a, b) => b.updatedAt - a.updatedAt)
  ), [aiChatSessions]);

  // ── 会话卡片状态 ──
  // 卡片逐项查找整个会话数组会退化为 O(n²)，为每次列表更新建立一次索引。
  const sessionsById = useMemo(() => new Map(aiChatSessions.map((session) => [session.id, session])), [aiChatSessions]);
  const getSessionCardState = useCallback((sessionId: string): 'idle' | 'running' | 'awaiting' | 'success' | 'failed' => {
    return resolveSessionCardState({
      sessionId,
      streamingSessionIds: SESSION_STREAMING_IDS,
      webAccessPrompt: aiWebAccessPrompt,
      localToolAccessPrompt: aiLocalToolAccessPrompt,
      session: sessionsById.get(sessionId),
    });
  }, [sessionsById, aiLocalToolAccessPrompt, aiWebAccessPrompt]);

  // ── 上下文 token 统计 ──
  const contextTokenUsage = useMemo(() => {
    return aiChatMessages.reduce((acc, msg) => {
      if (msg?.role !== 'assistant' || !msg.tokenUsage) {
        return acc;
      }
      acc.inputTokens += msg.tokenUsage.inputTokens;
      acc.outputTokens += msg.tokenUsage.outputTokens;
      acc.reasoningTokens += msg.tokenUsage.reasoningTokens;
      acc.totalTokens += msg.tokenUsage.totalTokens;
      acc.source = msg.tokenUsage.source;
      return acc;
    }, {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      source: '',
    });
  }, [aiChatMessages]);
  const contextUsageTokens = contextTokenUsage.totalTokens;
  const selectedContextLimit = (() => {
    const raw = aiConfig.contextLimit;
    if (!isProUser && raw === 1_000_000) return 400_000;
    return raw;
  })();
  const contextUsagePercent = contextUsageTokens > 0 ? Math.min(100, (contextUsageTokens / selectedContextLimit) * 100) : 0;
  const contextUsagePercentText = `${contextUsagePercent.toFixed(1)}%`;
  const contextUsageLevelClass = contextUsagePercent >= 90
    ? 'danger'
    : (contextUsagePercent >= 70 ? 'warn' : 'normal');
  const contextUsageInlineText = t('aiChat.contextUsage.inline', {
    defaultValue: '{{used}} / {{max}} · {{percent}}',
    used: contextUsageTokens.toLocaleString(),
    max: selectedContextLimit.toLocaleString(),
    percent: contextUsagePercentText,
  });
  const selectedContextLabel = CONTEXT_LIMIT_OPTIONS.find((o) => o.value === selectedContextLimit)?.label ?? '200K';

  // ── 流式状态同步 ──
  const refreshActiveSessionStreaming = useCallback((): void => {
    const activeId = useIslandStore.getState().activeAiChatSessionId;
    useIslandStore.getState().setAiChatStreaming(SESSION_STREAMING_IDS.has(activeId));
  }, []);

  useEffect(() => {
    setAiChatStreaming(SESSION_STREAMING_IDS.has(activeAiChatSessionId));
  }, [activeAiChatSessionId, setAiChatStreaming]);

  useEffect(() => {
    cachedAiLocalToolAccessPrompt = aiLocalToolAccessPrompt;
    cachedAiLocalToolAccessResolveError = aiLocalToolAccessResolveError;
  }, [aiLocalToolAccessPrompt, aiLocalToolAccessResolveError]);

  // ── click outside ──
  useClickOutside([agentModeDropdownRef, agentModeTriggerRef], () => {
    setShowAgentModeDropdown(false);
  }, showAgentModeDropdown);
  useClickOutside([modelDropdownRef], () => {
    setShowModelDropdown(false);
  }, showModelDropdown);
  useClickOutside([contextDropdownRef], () => {
    setShowContextDropdown(false);
  }, showContextDropdown);

  // ── 消息更新 ──
  const updateMessages = useCallback((updater: (prev: AiChatMessage[]) => AiChatMessage[]) => {
    const latest = useIslandStore.getState().aiChatMessages;
    useIslandStore.getState().setAiChatMessages(updater(latest));
  }, []);

  const flushPendingAssistantUpdates = useCallback((): void => {
    const pendingChunk = pendingAssistantChunkRef.current;
    const pendingThinkEntries = [...pendingThinkChunksRef.current.entries()];
    if (!pendingChunk && pendingThinkEntries.length === 0) {
      return;
    }
    pendingAssistantChunkRef.current = '';
    pendingThinkChunksRef.current.clear();
    lastAssistantFlushAtRef.current = Date.now();
    updateMessages(prev => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (!last || last.role !== 'assistant') {
        return copy;
      }
      let nextContent = last.content;
      if (pendingChunk) {
        nextContent += pendingChunk;
      }
      let nextThinkBlocks = Array.isArray(last.thinkBlocks) ? [...last.thinkBlocks] : [];
      pendingThinkEntries.forEach(([thinkIndex, thinkText]) => {
        if (!thinkText) {
          return;
        }
        const current = typeof nextThinkBlocks[thinkIndex] === 'string' ? nextThinkBlocks[thinkIndex] : '';
        nextThinkBlocks[thinkIndex] = current + thinkText;
      });
      copy[copy.length - 1] = {
        ...last,
        content: nextContent,
        thinkBlocks: nextThinkBlocks,
      };
      return copy;
    });
  }, [updateMessages]);

  const hasActiveTextSelection = useCallback((): boolean => {
    const isInsideSelectableChatArea = (node: Node | null): boolean => {
      if (!node || !chatRootRef.current) {
        return false;
      }
      const element = node instanceof Element ? node : node.parentElement;
      if (!element || !chatRootRef.current.contains(element)) {
        return false;
      }
      return Boolean(element.closest('.max-expand-chat-bubble, .max-expand-chat-input'));
    };
    const inputEl = inputRef.current;
    if (inputEl && document.activeElement === inputEl) {
      const start = inputEl.selectionStart;
      const end = inputEl.selectionEnd;
      if (typeof start === 'number' && typeof end === 'number' && end > start) {
        return true;
      }
    }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return false;
    }
    if (!isInsideSelectableChatArea(selection.anchorNode) || !isInsideSelectableChatArea(selection.focusNode)) {
      return false;
    }
    for (let i = 0; i < selection.rangeCount; i += 1) {
      const range = selection.getRangeAt(i);
      if (!isInsideSelectableChatArea(range.startContainer) || !isInsideSelectableChatArea(range.endContainer)) {
        return false;
      }
    }
    return true;
  }, []);

  const scheduleAssistantUpdateFlush = useCallback((): void => {
    if (pendingMessageFlushRafRef.current !== null && pendingMessageFlushRafRef.current !== undefined) {
      return;
    }
    const flushWhenSelectable = (): void => {
      if (hasActiveTextSelection()) {
        pendingMessageFlushRafRef.current = window.requestAnimationFrame(flushWhenSelectable);
        return;
      }
      if (Date.now() - lastAssistantFlushAtRef.current < STREAM_UI_FLUSH_INTERVAL_MS) {
        pendingMessageFlushRafRef.current = window.requestAnimationFrame(flushWhenSelectable);
        return;
      }
      pendingMessageFlushRafRef.current = null;
      flushPendingAssistantUpdates();
    };
    pendingMessageFlushRafRef.current = window.requestAnimationFrame(flushWhenSelectable);
  }, [flushPendingAssistantUpdates, hasActiveTextSelection]);

  // ── 输入框高度同步 ──
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

  useEffect(() => () => {
    if (attachmentInvalidTimerRef.current !== null && attachmentInvalidTimerRef.current !== undefined) {
      window.clearTimeout(attachmentInvalidTimerRef.current);
      attachmentInvalidTimerRef.current = null;
    }
  }, []);

  // ── 停止生成 ──
  const handleStop = (): void => {
    const controller = SESSION_ABORT_CONTROLLERS.get(activeAiChatSessionId);
    controller?.abort();
    SESSION_ABORT_CONTROLLERS.delete(activeAiChatSessionId);
    if (SESSION_STREAMING_IDS.delete(activeAiChatSessionId)) {
      useIslandStore.getState().retainAiChatSession(activeAiChatSessionId, false);
    }
    refreshActiveSessionStreaming();
    if (pendingMessageFlushRafRef.current !== null && pendingMessageFlushRafRef.current !== undefined) {
      window.cancelAnimationFrame(pendingMessageFlushRafRef.current);
      pendingMessageFlushRafRef.current = null;
    }
    flushPendingAssistantUpdates();
  };

  // ── 新建对话 ──
  const handleCreateNewChat = (): void => {
    const controller = SESSION_ABORT_CONTROLLERS.get(activeAiChatSessionId);
    controller?.abort();
    SESSION_ABORT_CONTROLLERS.delete(activeAiChatSessionId);
    if (SESSION_STREAMING_IDS.delete(activeAiChatSessionId)) {
      useIslandStore.getState().retainAiChatSession(activeAiChatSessionId, false);
    }
    refreshActiveSessionStreaming();
    if (pendingMessageFlushRafRef.current !== null && pendingMessageFlushRafRef.current !== undefined) {
      window.cancelAnimationFrame(pendingMessageFlushRafRef.current);
      pendingMessageFlushRafRef.current = null;
    }
    pendingAssistantChunkRef.current = '';
    pendingThinkChunksRef.current.clear();
    void createNewAiChatSession().catch(() => {});
    setPendingQuote(null);
    setResolvingWebAccessDecision(false);
    setAiWebAccessPrompt(null);
    setAiWebAccessResolveError('');
    setResolvingLocalToolAccessDecision(false);
    setAiLocalToolAccessPrompt(null);
    setAiLocalToolAccessResolveError('');
  };

  return {
    availableModels,
    isProUser,
    chatRootRef, inputRef,
    pendingAssistantChunkRef, pendingThinkChunksRef, pendingMessageFlushRafRef,
    attachmentInvalidTimerRef, attachmentDragDepthRef, skillDragDepthRef,
    lastAssistantFlushAtRef,
    agentModeDropdownRef, agentModeTriggerRef,
    modelDropdownRef, contextDropdownRef, fileInputRef,
    input, setInput,
    showSessionSidebar, setShowSessionSidebar,
    agentMode, setAgentMode,
    showAgentModeDropdown, setShowAgentModeDropdown,
    agentModeDropdownPos,
    showModelCard, setShowModelCard,
    showModelDropdown, setShowModelDropdown,
    showContextDropdown, setShowContextDropdown,
    skillDragOver, setSkillDragOver,
    attachmentDragOver, setAttachmentDragOver,
    attachmentDropInvalid, setAttachmentDropInvalid,
    pendingAttachments, setPendingAttachments,
    resolvingWebAccessDecision, setResolvingWebAccessDecision,
    aiLocalToolAccessPrompt, setAiLocalToolAccessPrompt,
    aiLocalToolAccessResolveError, setAiLocalToolAccessResolveError,
    resolvingLocalToolAccessDecision, setResolvingLocalToolAccessDecision,
    pendingQuote, setPendingQuote,
    hasLoginSession, userAvatarUrl,
    selectedModel, isOllamaModel, isCustomApiModel,
    customApiDisplayLabel, ollamaDisplayLabel,
    selectedProvider, modelToggleIcon,
    hasCustomApiCredentials,
    currentAgentModeConfig, toggleAgentModeDropdown,
    emptyGreeting,
    orderedSessions, getSessionCardState,
    contextTokenUsage, contextUsageTokens, selectedContextLimit,
    contextUsagePercent, contextUsagePercentText,
    contextUsageLevelClass, contextUsageInlineText, selectedContextLabel,
    updateMessages, flushPendingAssistantUpdates,
    scheduleAssistantUpdateFlush, refreshActiveSessionStreaming,
    hasActiveTextSelection, syncInputHeight,
    handleStop, handleCreateNewChat,
    aiConfig, setAiConfig,
    aiChatMessages, aiChatSessions, activeAiChatSessionId, aiChatStreaming,
    createNewAiChatSession, switchAiChatSession, deleteAiChatSession,
    setAiChatStreaming, setMaxExpandTab, setAiChatSessionMessages,
    markAiChatSessionReplyFinished, setAiChatMessages,
    aiWebAccessPrompt, setAiWebAccessPrompt,
    aiWebAccessResolveError, setAiWebAccessResolveError,
    setLogin, setRegister, dominantColor,
  };
}
