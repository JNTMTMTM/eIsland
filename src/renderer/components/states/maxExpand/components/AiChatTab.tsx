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
  resolveMihtnelisLocalToolAccess,
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
import { SvgIcon, resolveDevIconByFileName } from '../../../../utils/SvgIcon';
import useIslandStore from '../../../../store/slices';
import type { AiChatAttachment, AiChatMessage, AiToolCall, AiTodoItem, AiTodoSnapshot } from '../../../../store/types';
import { readLocalToken } from '../../../../utils/userAccount';
import { MarkdownCodeBlock } from './agent/components/MarkdownCodeBlock';
import { MarkdownSiteLink } from './agent/components/MarkdownSiteLink';
import {
  buildMihtnelisContext,
  normalizeMarkdownCodeFences,
  streamChatCompletion,
  toPrettyJson,
  unwrapJsonEnvelope,
} from './agent/utils/chatUtils';
import {
  type AiLocalToolAccessPrompt,
  type FinalEventPayload,
  type MetaEventPayload,
  type ThinkEventPayload,
  type ToolCallRequestPayload,
  type ToolCallResultPayload,
  type ToolEventPayload,
} from './agent/utils/chatTypes';
import { resolveSessionCardState } from './agent/utils/sessionUtils';

const SESSION_ABORT_CONTROLLERS = new Map<string, AbortController>();
const SESSION_STREAMING_IDS = new Set<string>();
const CONTEXT_LIMIT_OPTIONS = [
  { value: 200_000 as const, label: '200K', proOnly: false },
  { value: 400_000 as const, label: '400K', proOnly: false },
  { value: 1_000_000 as const, label: '1M', proOnly: true },
] as const;
let cachedAiLocalToolAccessPrompt: AiLocalToolAccessPrompt | null = null;
let cachedAiLocalToolAccessResolveError = '';
const STREAM_UI_FLUSH_INTERVAL_MS = 90;
const VISIBLE_CHAT_WINDOW_SIZE = 4;
const VISIBLE_CHAT_WINDOW_STEP = 4;
const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';
const SETTINGS_ABOUT_FEEDBACK_PREFILL_STORE_KEY = 'settings-about-feedback-prefill';
const ATTACHMENT_MAX_SIZE_BYTES = 102400;
const ATTACHMENT_MAX_COUNT = 5;
const ATTACHMENT_ACCEPT_EXTENSIONS = '.txt,.md,.json,.log,.csv,.xml,.yaml,.yml,.toml,.ini,.cfg,.conf,.env,.sh,.bat,.ps1,.py,.js,.ts,.jsx,.tsx,.html,.css,.scss,.less,.sql,.c,.cpp,.h,.hpp,.java,.kt,.swift,.go,.rs,.rb,.php,.lua,.diff,.patch';
const ATTACHMENT_ACCEPT_EXT_SET = new Set(
  ATTACHMENT_ACCEPT_EXTENSIONS
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
);
const EMPTY_GREETING_DEFAULTS = [
  '你好呀，今天想一起处理点什么？',
  '嗨，我在这儿，随时可以帮你。',
  '欢迎回来，先聊聊你现在最想解决的问题吧。',
  '今天也一起高效一点，你想从哪件事开始？',
] as const;
type AgentMode = 'mihtnelis' | 'r1pxc' | 'edoc';
const AGENT_MODES: ReadonlyArray<{ id: AgentMode; label: string; desc: string; icon: string; noFilter?: boolean; badgeIcon?: string }> = [
  { id: 'mihtnelis', label: 'mihtnelis', desc: '全能', icon: SvgIcon.AI },
  { id: 'r1pxc', label: 'r1pxc', desc: '女友', icon: SvgIcon.LOVER, noFilter: true, badgeIcon: SvgIcon.VERIFIED },
  { id: 'edoc', label: 'edoc', desc: 'coding', icon: SvgIcon.CODING },
] as const;
const AGENT_MODE_STORAGE_KEY = 'eIsland_agentMode';
function loadAgentMode(): AgentMode {
  try {
    const raw = localStorage.getItem(AGENT_MODE_STORAGE_KEY);
    if (raw && AGENT_MODES.some((m) => m.id === raw)) return raw as AgentMode;
  } catch { /* ignore */ }
  return 'mihtnelis';
}
function saveAgentMode(mode: AgentMode): void {
  try { localStorage.setItem(AGENT_MODE_STORAGE_KEY, mode); } catch { /* ignore */ }
}
const CLIENT_LOCAL_TOOL_PREFIXES = [
  'file.',
  'cmd.',
  'sys.',
  'win.',
  'clipboard.',
  'notification.',
  'net.',
  'monitor.',
  'volume.',
  'brightness.',
  'display.',
  'power.',
  'wifi.',
  'registry.',
  'service.',
  'schedule.',
  'firewall.',
  'defender.',
  'island.',
] as const;
const CLIENT_LOCAL_TOOL_EXACT_NAMES = new Set(['web.search']);
const HIGH_RISK_LOCAL_TOOL_PREFIXES = [
  'file.delete',
  'file.rename',
  'file.trash',
  'cmd.exec',
  'cmd.powershell',
  'win.close',
  'win.minimize',
  'win.maximize',
  'win.restore',
  'power.',
  'registry.write',
  'registry.delete',
  'service.start',
  'service.stop',
  'service.restart',
  'schedule.task.create',
  'net.proxy',
  'net.hosts',
  'defender.scan',
  'island.settings.write',
  'island.theme.set',
  'island.opacity.set',
  'island.restart',
] as const;

function isClientLocalToolName(tool: string): boolean {
  const normalized = tool.trim().toLowerCase();
  return CLIENT_LOCAL_TOOL_EXACT_NAMES.has(normalized)
    || CLIENT_LOCAL_TOOL_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

function isHighRiskLocalToolName(tool: string): boolean {
  const normalized = tool.trim().toLowerCase();
  return HIGH_RISK_LOCAL_TOOL_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

const getRoleFromToken = (token: string | null | undefined): string | null => {
  if (!token) return null;
  const rawToken = token.trim().replace(/^bearer\s+/i, '');
  const parts = rawToken.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalizedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = JSON.parse(atob(normalizedPayload)) as { role?: unknown };
    const role = typeof decoded.role === 'string' ? decoded.role.trim().toLowerCase().replace(/^role_/, '') : null;
    return role;
  } catch {
    return null;
  }
};

function isAcceptedAttachmentFile(fileName: string): boolean {
  const lowerName = (fileName ?? '').toLowerCase();
  if (!lowerName) {
    return false;
  }
  return Array.from(ATTACHMENT_ACCEPT_EXT_SET).some((ext) => lowerName.endsWith(ext));
}

const MARKDOWN_REMARK_PLUGINS = [remarkGfm];
const MARKDOWN_COMPONENTS: import('react-markdown').Components = {
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className ?? '');
    if (!isBlock) {
      return <code className={className}>{children}</code>;
    }
    return <MarkdownCodeBlock className={className}>{children}</MarkdownCodeBlock>;
  },
  a: ({ href, children, onClick, target, rel }) => {
    return (
      <MarkdownSiteLink
        href={typeof href === 'string' ? href : ''}
        children={children}
        onClick={onClick}
        target={target}
        rel={rel}
      />
    );
  },
};

const AssistantMarkdown = React.memo(function AssistantMarkdown({ content }: { content: string }): React.ReactElement {
  return (
    <ReactMarkdown remarkPlugins={MARKDOWN_REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
      {content}
    </ReactMarkdown>
  );
});

/**
 * AI 对话 Tab
 * @description 包含消息列表和输入栏的聊天界面，调用 OpenAI 兼容 API
 */
export function AiChatTab(): React.ReactElement {
  const availableModels = ['deepseek-v4-flash', 'deepseek-v4-pro'] as const;
  const { t } = useTranslation();
  const localTokenForRole = readLocalToken();
  const isProUser = useMemo(() => {
    const role = getRoleFromToken(localTokenForRole);
    return role === 'pro' || role === 'admin';
  }, [localTokenForRole]);
  const chatRootRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingAssistantChunkRef = useRef('');
  const pendingThinkChunksRef = useRef<Map<number, string>>(new Map());
  const pendingMessageFlushRafRef = useRef<number | null>(null);
  const attachmentInvalidTimerRef = useRef<number | null>(null);
  const attachmentDragDepthRef = useRef(0);
  const skillDragDepthRef = useRef(0);
  const lastAssistantFlushAtRef = useRef(0);
  const hasInitializedAutoScrollRef = useRef(false);
  const [input, setInput] = useState('');
  const [visibleWindowStart, setVisibleWindowStart] = useState(0);
  const [showSessionSidebar, setShowSessionSidebar] = useState(false);
  const [agentMode, setAgentModeState] = useState<AgentMode>(loadAgentMode);
  const [showAgentModeDropdown, setShowAgentModeDropdown] = useState(false);
  const agentModeDropdownRef = useRef<HTMLDivElement>(null);
  const agentModeTriggerRef = useRef<HTMLButtonElement>(null);
  const [agentModeDropdownPos, setAgentModeDropdownPos] = useState<{ left: number; bottom: number } | null>(null);
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
  const [showModelCard, setShowModelCard] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const [showContextDropdown, setShowContextDropdown] = useState(false);
  const contextDropdownRef = useRef<HTMLDivElement>(null);
  const [skillDragOver, setSkillDragOver] = useState(false);
  const [attachmentDragOver, setAttachmentDragOver] = useState(false);
  const [attachmentDropInvalid, setAttachmentDropInvalid] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ name: string; size: number; content: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resolvingWebAccessDecision, setResolvingWebAccessDecision] = useState(false);
  const [aiLocalToolAccessPrompt, setAiLocalToolAccessPrompt] = useState<AiLocalToolAccessPrompt | null>(() => cachedAiLocalToolAccessPrompt);
  const [aiLocalToolAccessResolveError, setAiLocalToolAccessResolveError] = useState(() => cachedAiLocalToolAccessResolveError);
  const [resolvingLocalToolAccessDecision, setResolvingLocalToolAccessDecision] = useState(false);
  const {
    aiConfig,
    setAiConfig,
    aiChatMessages,
    aiChatSessions,
    activeAiChatSessionId,
    aiChatStreaming,
    createNewAiChatSession,
    switchAiChatSession,
    deleteAiChatSession,
    setAiChatStreaming,
    setMaxExpandTab,
    setAiChatSessionMessages,
    markAiChatSessionReplyFinished,
    setAiChatMessages,
    aiWebAccessPrompt,
    setAiWebAccessPrompt,
    aiWebAccessResolveError,
    setAiWebAccessResolveError,
  } = useIslandStore();
  const selectedModel = (() => {
    const m = availableModels.includes(aiConfig.model as (typeof availableModels)[number])
      ? aiConfig.model
      : 'deepseek-v4-flash';
    if (!isProUser && m === 'deepseek-v4-pro') return 'deepseek-v4-flash';
    return m;
  })();
  const showDeepseekIconOnModelToggle = selectedModel.toLowerCase().includes('deepseek');
  const visibleWindowEnd = Math.min(aiChatMessages.length, visibleWindowStart + VISIBLE_CHAT_WINDOW_SIZE);
  const hasUpperHiddenMessages = visibleWindowStart > 0;
  const hasLowerHiddenMessages = visibleWindowEnd < aiChatMessages.length;
  const [emptyGreetingVariantIndex] = useState(() => Math.floor(Math.random() * EMPTY_GREETING_DEFAULTS.length));
  const emptyGreeting = t(`aiChat.messages.emptyGreetingVariants.${emptyGreetingVariantIndex}`, {
    defaultValue: EMPTY_GREETING_DEFAULTS[emptyGreetingVariantIndex] || EMPTY_GREETING_DEFAULTS[0],
  });
  const visibleMessages = useMemo(() => {
    return aiChatMessages.slice(visibleWindowStart, visibleWindowEnd);
  }, [aiChatMessages, visibleWindowStart, visibleWindowEnd]);
  const visibleStartIndex = visibleWindowStart;
  const orderedSessions = useMemo(() => (
    [...aiChatSessions].sort((a, b) => b.updatedAt - a.updatedAt)
  ), [aiChatSessions]);
  const getSessionCardState = useCallback((sessionId: string): 'idle' | 'running' | 'awaiting' | 'success' | 'failed' => {
    return resolveSessionCardState({
      sessionId,
      streamingSessionIds: SESSION_STREAMING_IDS,
      webAccessPrompt: aiWebAccessPrompt,
      localToolAccessPrompt: aiLocalToolAccessPrompt,
      sessions: aiChatSessions,
    });
  }, [aiChatSessions, aiLocalToolAccessPrompt, aiWebAccessPrompt]);
  const contextTokenUsage = useMemo(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    let reasoningTokens = 0;
    let totalTokens = 0;
    let source = '';
    for (const msg of aiChatMessages) {
      if (msg?.role === 'assistant' && msg.tokenUsage) {
        inputTokens += msg.tokenUsage.inputTokens;
        outputTokens += msg.tokenUsage.outputTokens;
        reasoningTokens += msg.tokenUsage.reasoningTokens;
        totalTokens += msg.tokenUsage.totalTokens;
        source = msg.tokenUsage.source;
      }
    }
    return { inputTokens, outputTokens, reasoningTokens, totalTokens, source };
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

  useEffect(() => {
    if (!showAgentModeDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (agentModeDropdownRef.current?.contains(target)) return;
      if (agentModeTriggerRef.current?.contains(target)) return;
      setShowAgentModeDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAgentModeDropdown]);

  useEffect(() => {
    if (!showModelDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelDropdown]);

  useEffect(() => {
    if (!showContextDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (contextDropdownRef.current && !contextDropdownRef.current.contains(e.target as Node)) {
        setShowContextDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showContextDropdown]);

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

  /** 始终从 store 读最新消息再更新，避免流式 chunk 之间的闭包过期 */
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

  useEffect(() => {
    const maxStart = Math.max(0, aiChatMessages.length - VISIBLE_CHAT_WINDOW_SIZE);
    setVisibleWindowStart(prev => {
      if (prev === 0 && aiChatMessages.length > VISIBLE_CHAT_WINDOW_SIZE) {
        return maxStart;
      }
      if (aiChatStreaming) {
        return maxStart;
      }
      return Math.min(prev, maxStart);
    });
  }, [aiChatMessages.length, aiChatStreaming]);

  /** 滚动到最新消息 */
  useEffect(() => {
    const waitingForLatestWindowAlignment = aiChatMessages.length > VISIBLE_CHAT_WINDOW_SIZE
      && visibleWindowStart === 0;
    if (waitingForLatestWindowAlignment) {
      return;
    }
    if (hasActiveTextSelection()) {
      return;
    }
    const isFirstAutoScroll = !hasInitializedAutoScrollRef.current;
    hasInitializedAutoScrollRef.current = true;
    chatEndRef.current?.scrollIntoView({ behavior: (aiChatStreaming || isFirstAutoScroll) ? 'auto' : 'smooth' });
  }, [aiChatMessages, aiChatStreaming, hasActiveTextSelection, visibleWindowStart]);

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

  const markAttachmentDropInvalid = useCallback(() => {
    setAttachmentDropInvalid(true);
    if (attachmentInvalidTimerRef.current !== null && attachmentInvalidTimerRef.current !== undefined) {
      window.clearTimeout(attachmentInvalidTimerRef.current);
    }
    attachmentInvalidTimerRef.current = window.setTimeout(() => {
      setAttachmentDropInvalid(false);
      attachmentInvalidTimerRef.current = null;
    }, 1200);
  }, []);

  const handleAttachFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    fileArray.forEach((file) => {
      if (pendingAttachments.length >= ATTACHMENT_MAX_COUNT) return;
      if (!isAcceptedAttachmentFile(file.name)) return;
      if (file.size > ATTACHMENT_MAX_SIZE_BYTES) return;
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pendingAttachments]);

  const handleAttachmentDrop = useCallback((files: FileList | File[]) => {
    if (aiChatStreaming) {
      return;
    }
    const fileArray = Array.from(files);
    if (pendingAttachments.length >= ATTACHMENT_MAX_COUNT) {
      markAttachmentDropInvalid();
      return;
    }
    const hasInvalid = fileArray.some((file) => (
      !isAcceptedAttachmentFile(file.name)
      || file.size > ATTACHMENT_MAX_SIZE_BYTES
    ));
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
  }, []);

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
  }, []);

  const handleAttachmentDropEvent = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    attachmentDragDepthRef.current = 0;
    setAttachmentDragOver(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleAttachmentDrop(e.dataTransfer.files);
    }
  }, [handleAttachmentDrop]);

  /** 发送消息并调用 API */
  const handleSend = useCallback(async (): Promise<void> => {
    const text = input.trim();
    const targetSessionId = activeAiChatSessionId;
    if (!text || SESSION_STREAMING_IDS.has(targetSessionId)) return;
    const updateTargetMessages = (updater: (prev: AiChatMessage[]) => AiChatMessage[]): void => {
      const state = useIslandStore.getState();
      const session = state.aiChatSessions.find((item) => item.id === targetSessionId);
      const prevMessages = session?.messages ?? [];
      state.setAiChatSessionMessages(targetSessionId, updater(prevMessages));
    };

    const localToken = readLocalToken();
    const canUseMihtnelis = Boolean(localToken && localToken.trim().length > 0);

    if (!canUseMihtnelis && !aiConfig.apiKey) {
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
    const fullContent = attachmentPrefix + text;
    const userMsg: AiChatMessage = {
      role: 'user',
      content: fullContent,
      ...(attachmentMeta.length > 0 ? { attachments: attachmentMeta } : {}),
    };
    const nextMessages: AiChatMessage[] = [...aiChatMessages, userMsg];
    updateTargetMessages(prev => [...prev, userMsg]);
    setVisibleWindowStart(0);
    setInput('');
    setPendingAttachments([]);
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
    updateTargetMessages(prev => ([...prev, { role: 'assistant', content: '', finalized: false, thinkBlocks: [], toolCalls: [] }]));

    const controller = new AbortController();
    SESSION_ABORT_CONTROLLERS.set(targetSessionId, controller);
    SESSION_STREAMING_IDS.add(targetSessionId);
    refreshActiveSessionStreaming();

    try {
      if (canUseMihtnelis) {
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
          provider: 'deepseek',
          model: selectedModel,
          agentMode,
          context,
          workspaces: aiConfig.workspaces,
          skills: resolvedSkills,
          thinking: aiConfig.deepseekThinking,
          reasoningEffort: aiConfig.deepseekReasoningEffort,
          signal: controller.signal,
          onEvent: (event) => {
            if (SESSION_ABORT_CONTROLLERS.get(targetSessionId) !== controller) {
              return;
            }
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
                if (!last || last.role !== 'assistant') {
                  return copy;
                }
                copy[copy.length - 1] = { ...last, content: `${last.content}${chunk}` };
                return copy;
              });
              return;
            }

            if (event.type === 'chunk_reset') {
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') {
                  return copy;
                }
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
                  const requestMatched = Boolean(requestId) && Boolean(current.requestId) && current.requestId === requestId;
                  const turnMatched = turn > 0 && current.turn === turn && current.tool === tool;
                  const pendingMatched = current.pending && current.tool === tool;
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
              const purpose = typeof payload?.purpose === 'string' ? payload.purpose.trim() : '';
              const riskLevel = typeof payload?.riskLevel === 'string' ? payload.riskLevel : '';
              const authorizationRequired = Boolean(payload?.authorizationRequired);
              const authorizationMessage = typeof payload?.message === 'string' ? payload.message : '';
              const argumentsPayload = typeof payload?.arguments === 'object' && payload?.arguments !== null && payload?.arguments !== undefined
                ? payload.arguments as Record<string, unknown>
                : {};
              if (!tool) {
                return;
              }

              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') {
                  return copy;
                }
                const oldCalls = Array.isArray(last.toolCalls) ? [...last.toolCalls] : [];
                // deduplicate: skip if an entry with the same requestId or turn+tool already exists
                const alreadyExists = oldCalls.some((c) => {
                  if (!c) return false;
                  if (requestId && c.requestId === requestId) return true;
                  if (turn > 0 && c.turn === turn && c.tool === tool) return true;
                  return false;
                });
                if (alreadyExists) {
                  return copy;
                }
                const call: AiToolCall = {
                  turn,
                  requestId,
                  tool,
                  purpose,
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

              const isClientLocalTool = isClientLocalToolName(tool);
              if (!isClientLocalTool || !requestId) {
                return;
              }

              const needsAuthorization = authorizationRequired || isHighRiskLocalToolName(tool);
              if (needsAuthorization) {
                setAiLocalToolAccessPrompt({
                  sessionId: targetSessionId,
                  requestId,
                  tool,
                  purpose,
                  argumentsPayload,
                  riskLevel,
                  message: authorizationMessage,
                });
                setAiLocalToolAccessResolveError('');
                return;
              }

              void executeAndSubmitLocalToolResult({
                token: localToken!,
                requestId,
                tool,
                argumentsPayload,
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
              if (!streamThinkingEnabled || !aiConfig.deepseekThinking) {
                return;
              }
              const payload = event.payload as ThinkEventPayload;
              const thinkText = typeof payload?.text === 'string' ? payload.text : '';
              const thinkIndex = typeof payload?.index === 'number' ? payload.index : 0;
              if (!thinkText) return;
              updateTargetMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') {
                  return copy;
                }
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
                if (!last || last.role !== 'assistant') {
                  return copy;
                }
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
                  return {
                    id: idRaw || String(index + 1),
                    content,
                    status,
                  } as AiTodoItem;
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
                if (!last || last.role !== 'assistant') {
                  return copy;
                }
                copy[copy.length - 1] = {
                  ...last,
                  finalized: true,
                  traceId,
                  ...(tokenUsage ? { tokenUsage } : {}),
                };
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
      if (SESSION_ABORT_CONTROLLERS.get(targetSessionId) !== controller) {
        return;
      }
      SESSION_ABORT_CONTROLLERS.delete(targetSessionId);
      SESSION_STREAMING_IDS.delete(targetSessionId);
      refreshActiveSessionStreaming();
      if (pendingMessageFlushRafRef.current !== null && pendingMessageFlushRafRef.current !== undefined) {
        window.cancelAnimationFrame(pendingMessageFlushRafRef.current);
        pendingMessageFlushRafRef.current = null;
      }
      flushPendingAssistantUpdates();
      // 流结束后解包 JSON 信封并强制补存，防止数据丢失
      const state = useIslandStore.getState();
      const finalMessages = state.aiChatSessions.find((item) => item.id === targetSessionId)?.messages || [];
      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content) {
        const unwrapped = unwrapJsonEnvelope(lastMsg.content);
        if (unwrapped !== lastMsg.content) {
          const patched = [...finalMessages];
          patched[patched.length - 1] = { ...lastMsg, content: unwrapped };
          state.setAiChatSessionMessages(targetSessionId, patched);
        } else {
          state.setAiChatSessionMessages(targetSessionId, finalMessages);
        }
      } else {
        state.setAiChatSessionMessages(targetSessionId, finalMessages);
      }
      markAiChatSessionReplyFinished(targetSessionId, Date.now());
      setResolvingWebAccessDecision(false);
      setResolvingLocalToolAccessDecision(false);
    }
  }, [
    input,
    aiChatStreaming,
    aiChatMessages,
    aiChatSessions,
    activeAiChatSessionId,
    aiConfig,
    setAiChatStreaming,
    setAiChatSessionMessages,
    markAiChatSessionReplyFinished,
    setAiChatMessages,
    updateMessages,
    t,
    executeAndSubmitLocalToolResult,
    setAiWebAccessPrompt,
    setAiWebAccessResolveError,
    flushPendingAssistantUpdates,
    scheduleAssistantUpdateFlush,
    refreshActiveSessionStreaming,
  ]);

  const handleReportIssueFromFinalAnswer = useCallback((traceId: string, finalAnswer: string): void => {
    const safeTraceId = traceId.trim() || '-';
    const safeAnswer = finalAnswer.trim();
    const payload = {
      title: `Agent输出不符合预期 - ${safeTraceId}`,
      content: safeAnswer,
    };
    void window.api.storeWrite(SETTINGS_ABOUT_FEEDBACK_PREFILL_STORE_KEY, payload)
      .then(() => window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'about-feedback'))
      .then(() => {
        setMaxExpandTab('settings');
      })
      .catch(() => {});
  }, [setMaxExpandTab]);

  /** 回车发送 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** 停止生成 */
  const handleStop = (): void => {
    const controller = SESSION_ABORT_CONTROLLERS.get(activeAiChatSessionId);
    controller?.abort();
    SESSION_ABORT_CONTROLLERS.delete(activeAiChatSessionId);
    SESSION_STREAMING_IDS.delete(activeAiChatSessionId);
    refreshActiveSessionStreaming();
    if (pendingMessageFlushRafRef.current !== null && pendingMessageFlushRafRef.current !== undefined) {
      window.cancelAnimationFrame(pendingMessageFlushRafRef.current);
      pendingMessageFlushRafRef.current = null;
    }
    flushPendingAssistantUpdates();
  };

  /** 新建对话 */
  const handleCreateNewChat = (): void => {
    const controller = SESSION_ABORT_CONTROLLERS.get(activeAiChatSessionId);
    controller?.abort();
    SESSION_ABORT_CONTROLLERS.delete(activeAiChatSessionId);
    SESSION_STREAMING_IDS.delete(activeAiChatSessionId);
    refreshActiveSessionStreaming();
    if (pendingMessageFlushRafRef.current !== null && pendingMessageFlushRafRef.current !== undefined) {
      window.cancelAnimationFrame(pendingMessageFlushRafRef.current);
      pendingMessageFlushRafRef.current = null;
    }
    pendingAssistantChunkRef.current = '';
    pendingThinkChunksRef.current.clear();
    createNewAiChatSession();
    setVisibleWindowStart(0);
    setResolvingWebAccessDecision(false);
    setAiWebAccessPrompt(null);
    setAiWebAccessResolveError('');
    setResolvingLocalToolAccessDecision(false);
    setAiLocalToolAccessPrompt(null);
    setAiLocalToolAccessResolveError('');
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

  const handleResolveLocalToolAccess = useCallback(async (allow: boolean): Promise<void> => {
    const localToken = readLocalToken();
    if (!localToken || !aiLocalToolAccessPrompt?.requestId) {
      return;
    }
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
  }, [t, aiLocalToolAccessPrompt, executeAndSubmitLocalToolResult, updateMessages]);

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
    <div className="max-expand-chat" ref={chatRootRef}>
      {/* 标题 */}
      <div className="max-expand-chat-header">
        <span className="max-expand-chat-header-title">{t('aiChat.title', { defaultValue: 'mihtnelis Agent' })}</span>
        <div className="max-expand-chat-header-actions">
          <span className="max-expand-chat-header-model">{readLocalToken() ? selectedModel : (selectedModel || t('aiChat.notConfigured', { defaultValue: '未配置' }))}</span>
          <button className="max-expand-chat-clear" onClick={handleCreateNewChat} type="button">
            {t('aiChat.actions.newChat', { defaultValue: '新建对话' })}
          </button>
        </div>
      </div>
      <div className="max-expand-chat-body">
        <aside
          className={`max-expand-chat-session-sidebar ${showSessionSidebar ? 'is-open' : 'is-closed'}`}
          aria-hidden={!showSessionSidebar}
        >
          <div className="max-expand-chat-session-sidebar-inner">
            <div className="max-expand-chat-session-sidebar-title">
              {t('aiChat.session.historyTitle', { defaultValue: '历史会话' })}
            </div>
            <div className="max-expand-chat-session-list">
              {orderedSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={`max-expand-chat-session-item ${session.id === activeAiChatSessionId ? 'active' : ''} status-${getSessionCardState(session.id)}`}
                  onClick={() => {
                    if (session.id === activeAiChatSessionId) {
                      return;
                    }
                    switchAiChatSession(session.id);
                    setAiChatStreaming(SESSION_STREAMING_IDS.has(session.id));
                    setVisibleWindowStart(0);
                    setResolvingWebAccessDecision(false);
                    setResolvingLocalToolAccessDecision(false);
                  }}
                >
                  <span className="max-expand-chat-session-item-main">
                    <span className="max-expand-chat-session-item-title">{session.title || t('aiChat.session.untitled', { defaultValue: '新对话' })}</span>
                    <span className="max-expand-chat-session-item-time">{new Date(session.updatedAt).toLocaleString()}</span>
                  </span>
                  <span className="max-expand-chat-session-item-actions">
                    <span
                      className="max-expand-chat-session-delete"
                      role="button"
                      aria-label={t('aiChat.actions.deleteSession', { defaultValue: '删除会话' })}
                      title={t('aiChat.actions.deleteSession', { defaultValue: '删除会话' })}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        deleteAiChatSession(session.id);
                      }}
                    >
                      <img src={SvgIcon.DELETE} alt="" />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
        <div className="max-expand-chat-content">
      {/* 消息列表 */}
      <div className="max-expand-chat-messages">
        {hasUpperHiddenMessages && (
          <div className="max-expand-chat-history-tip">
            <button
              type="button"
              className="max-expand-chat-history-load-more"
              onClick={() => {
                setVisibleWindowStart(prev => Math.max(0, prev - VISIBLE_CHAT_WINDOW_STEP));
              }}
            >
              {t('aiChat.actions.loadMoreHistory', { defaultValue: '加载更多对话' })}
            </button>
          </div>
        )}
        {aiChatMessages.length === 0 && (
          <div className="max-expand-chat-empty">
            <div>{emptyGreeting}</div>
            <div className="max-expand-chat-empty-disclaimer">
              {t('aiChat.messages.aiGeneratedDisclaimer', { defaultValue: '内容由 AI 生成，请仔细甄别。' })}
            </div>
          </div>
        )}
        {visibleMessages.map((msg, i) => {
          const absoluteIndex = visibleStartIndex + i;
          const isEmptyAssistant = msg.role === 'assistant' && !msg.content
            && (!Array.isArray(msg.todoSnapshots) || msg.todoSnapshots.length === 0)
            && (!Array.isArray(msg.thinkBlocks) || msg.thinkBlocks.length === 0)
            && (!Array.isArray(msg.toolCalls) || msg.toolCalls.filter(tc => tc.tool !== 'agent.todo.write').length === 0)
            && !(aiChatStreaming && absoluteIndex === aiChatMessages.length - 1);
          if (isEmptyAssistant) return null;
          return (
          <div key={absoluteIndex} className={`max-expand-chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}${agentMode === 'r1pxc' ? ' r1pxc-chat' : ''}`}>
            {msg.role === 'user' ? (
              <>
                {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                  <div className="max-expand-chat-bubble-attachments">
                    {msg.attachments.map((a) => (
                      <span key={a.name} className="max-expand-chat-bubble-attachment-tag">
                        {resolveDevIconByFileName(a.name) ? (
                          <img className="max-expand-chat-bubble-attachment-icon" src={resolveDevIconByFileName(a.name)} alt="" aria-hidden="true" />
                        ) : (
                          <span className="max-expand-chat-bubble-attachment-icon-fallback" aria-hidden="true" />
                        )}
                        <span>{a.name}</span>
                      </span>
                    ))}
                  </div>
                )}
                {msg.content.replace(/^(?:<attachment name="[^"]*">\n[\s\S]*?\n<\/attachment>\n*)+/, '').trim()}
              </>
            ) : (
              <>
                {(() => {
                  const isLatestAssistantMsg = absoluteIndex === aiChatMessages.length - 1;

                  /* ── r1pxc 聊天框模式：仅渲染纯文本气泡 ── */
                  if (agentMode === 'r1pxc') {
                    const normalizedContent = normalizeMarkdownCodeFences(msg.content);
                    return (
                      <>
                        {msg.content ? (
                          <AssistantMarkdown content={normalizedContent} />
                        ) : (
                          aiChatStreaming && isLatestAssistantMsg ? (
                            <div className="max-expand-chat-loading-row">
                              <span className="max-expand-chat-generating-dots"><i /><i /><i /></span>
                            </div>
                          ) : ''
                        )}
                      </>
                    );
                  }

                  const thinkBlocks = aiConfig.deepseekThinking && Array.isArray(msg.thinkBlocks)
                    ? msg.thinkBlocks
                    : [];
                  const sortedToolCalls = Array.isArray(msg.toolCalls)
                      ? [...msg.toolCalls]
                        // agent.todo.write 由独立 TodoList 卡片承载，不在工具时间线中重复展示。
                        .filter((toolCall) => toolCall.tool !== 'agent.todo.write')
                        .map((tc, idx) => ({ ...tc, _idx: idx }))
                        .sort((a, b) => {
                          const aTurn = Number.isFinite(a.turn) && (a.turn ?? 0) > 0 ? Number(a.turn) : Number.MAX_SAFE_INTEGER;
                          const bTurn = Number.isFinite(b.turn) && (b.turn ?? 0) > 0 ? Number(b.turn) : Number.MAX_SAFE_INTEGER;
                          return aTurn - bTurn || a._idx - b._idx;
                        })
                      : [];
                  const todoSnapshots: AiTodoSnapshot[] = Array.isArray(msg.todoSnapshots) ? msg.todoSnapshots : [];

                  const showThinkingFooter = aiConfig.deepseekThinking && aiChatStreaming && isLatestAssistantMsg;
                  const traceId = typeof msg.traceId === 'string' ? msg.traceId.trim() : '';
                  const showFinalTraceMeta = Boolean(msg.finalized);
                  const normalizedMarkdownContent = normalizeMarkdownCodeFences(msg.content);
                  const timelineNodes: React.ReactElement[] = [];

                  // turn=0 的 todoSnapshot（旧服务端不带 turn 字段时的兜底）放在时间线最前面
                  const unturnedTodoSnapshots = todoSnapshots.filter((snap) => !(snap.turn > 0));
                  for (let snapIndex = 0; snapIndex < unturnedTodoSnapshots.length; snapIndex++) {
                    const snap = unturnedTodoSnapshots[snapIndex];
                    const completedCount = snap.items.reduce((acc, item) => acc + (item.status === 'completed' ? 1 : 0), 0);
                    const allCompleted = completedCount === snap.items.length;
                    timelineNodes.push(
                      <details
                        key={`todo-0-${snapIndex}`}
                        className="max-expand-chat-todo-card"
                        open={!allCompleted}
                      >
                        <summary className="max-expand-chat-todo-card-head">
                          <span className="max-expand-chat-todo-title">
                            <span>{t('aiChat.timeline.todoList', { defaultValue: '任务清单' })}</span>
                          </span>
                          <span className="max-expand-chat-todo-progress">
                            {completedCount}/{snap.items.length}
                          </span>
                        </summary>
                        <ul className="max-expand-chat-todo-list">
                          {snap.items.map((item) => (
                            <li
                              key={item.id}
                              className={`max-expand-chat-todo-item status-${item.status}`}
                            >
                              <span className="max-expand-chat-todo-item-marker" aria-hidden>
                                {item.status === 'completed' ? '✓' : item.status === 'in_progress' ? '●' : '○'}
                              </span>
                              <span className="max-expand-chat-todo-item-text">{item.content}</span>
                            </li>
                          ))}
                        </ul>
                      </details>,
                    );
                  }

                  // 收集所有有效 turn（包括 agent.todo.write 的 turn，标记时间线位置）
                  const allGroupTurns = new Set<number>();
                  const allToolCalls = Array.isArray(msg.toolCalls) ? msg.toolCalls : [];
                  allToolCalls.forEach((tc) => {
                    const t = Number.isFinite(tc.turn) && (tc.turn ?? 0) > 0 ? Number(tc.turn) : 0;
                    if (t > 0) allGroupTurns.add(t);
                  });
                  todoSnapshots.forEach((snap) => {
                    if (snap.turn > 0) allGroupTurns.add(snap.turn);
                  });
                  const sortedGroupTurns = [...allGroupTurns].sort((a, b) => a - b);

                  // think[0] 放在所有工具/todo 组之前（初始推理）
                  if (thinkBlocks.length > 0 && thinkBlocks[0]) {
                    timelineNodes.push(
                      <details
                        key="think-0"
                        className="max-expand-chat-think-card"
                        open={aiChatStreaming && thinkBlocks.length === 1 && isLatestAssistantMsg}
                      >
                        <summary>
                          <span className="max-expand-chat-think-title">
                            <img className="max-expand-chat-think-title-icon" src={SvgIcon.DEEPSEEK} alt="" />
                            <span>{t('aiChat.timeline.thinkingProcess', { defaultValue: '思考过程 #{{index}}', index: 1 })}</span>
                          </span>
                        </summary>
                        <div className="max-expand-chat-think-content">{thinkBlocks[0]}</div>
                      </details>,
                    );
                  }

                  // 按 turn 顺序渲染工具/todo 组，每组后面穿插对应的 think 块
                  let nextThinkIdx = 1; // think[0] 已在前面渲染
                  for (let groupIdx = 0; groupIdx < sortedGroupTurns.length; groupIdx++) {
                    const turn = sortedGroupTurns[groupIdx];

                    const turnTodoSnapshots = todoSnapshots.filter((snap) => snap.turn === turn);
                    for (let snapIndex = 0; snapIndex < turnTodoSnapshots.length; snapIndex++) {
                      const snap = turnTodoSnapshots[snapIndex];
                      const completedCount = snap.items.reduce((acc, item) => acc + (item.status === 'completed' ? 1 : 0), 0);
                      const allCompleted = completedCount === snap.items.length;
                      timelineNodes.push(
                        <details
                          key={`todo-${turn}-${snapIndex}`}
                          className="max-expand-chat-todo-card"
                          open={!allCompleted}
                        >
                          <summary className="max-expand-chat-todo-card-head">
                            <span className="max-expand-chat-todo-title">
                              <span>{t('aiChat.timeline.todoList', { defaultValue: '任务清单' })}</span>
                              <span className="max-expand-chat-tool-turn">#{turn}</span>
                            </span>
                            <span className="max-expand-chat-todo-progress">
                              {completedCount}/{snap.items.length}
                            </span>
                          </summary>
                          <ul className="max-expand-chat-todo-list">
                            {snap.items.map((item) => (
                              <li
                                key={item.id}
                                className={`max-expand-chat-todo-item status-${item.status}`}
                              >
                                <span className="max-expand-chat-todo-item-marker" aria-hidden>
                                  {item.status === 'completed' ? '✓' : item.status === 'in_progress' ? '●' : '○'}
                                </span>
                                <span className="max-expand-chat-todo-item-text">{item.content}</span>
                              </li>
                            ))}
                          </ul>
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
                              {toolCall.pending
                                ? t('aiChat.timeline.toolStatus.pending', { defaultValue: '执行中' })
                                : (toolCall.success
                                  ? t('aiChat.timeline.toolStatus.success', { defaultValue: '完成' })
                                  : t('aiChat.timeline.toolStatus.failed', { defaultValue: '失败' }))}
                            </span>
                          </summary>
                          <div className="max-expand-chat-tool-result">
                            <div className="max-expand-chat-tool-result-title">{t('aiChat.timeline.toolResultTitle', { defaultValue: '工具返回结果' })}</div>
                            <pre>{toPrettyJson(toolCall.result)}</pre>
                          </div>
                        </details>,
                      );
                    }

                    // 每个工具组后面穿插对应的 think 块（工具执行后的推理过程）
                    if (nextThinkIdx < thinkBlocks.length && thinkBlocks[nextThinkIdx]) {
                      const thinkText = thinkBlocks[nextThinkIdx];
                      const thinkIdx = nextThinkIdx;
                      nextThinkIdx++;
                      timelineNodes.push(
                        <details
                          key={`think-${thinkIdx}`}
                          className="max-expand-chat-think-card"
                          open={aiChatStreaming && thinkIdx === thinkBlocks.length - 1 && isLatestAssistantMsg}
                        >
                          <summary>
                            <span className="max-expand-chat-think-title">
                              <img className="max-expand-chat-think-title-icon" src={SvgIcon.DEEPSEEK} alt="" />
                              <span>{t('aiChat.timeline.thinkingProcess', { defaultValue: '思考过程 #{{index}}', index: thinkIdx + 1 })}</span>
                            </span>
                          </summary>
                          <div className="max-expand-chat-think-content">{thinkText}</div>
                        </details>,
                      );
                    }
                  }

                  // 剩余的 think 块（没有对应工具组的后续推理）
                  for (let idx = nextThinkIdx; idx < thinkBlocks.length; idx++) {
                    const thinkText = thinkBlocks[idx] || '';
                    if (thinkText) {
                      timelineNodes.push(
                        <details
                          key={`think-${idx}`}
                          className="max-expand-chat-think-card"
                          open={aiChatStreaming && idx === thinkBlocks.length - 1 && isLatestAssistantMsg}
                        >
                          <summary>
                            <span className="max-expand-chat-think-title">
                              <img className="max-expand-chat-think-title-icon" src={SvgIcon.DEEPSEEK} alt="" />
                              <span>{t('aiChat.timeline.thinkingProcess', { defaultValue: '思考过程 #{{index}}', index: idx + 1 })}</span>
                            </span>
                          </summary>
                          <div className="max-expand-chat-think-content">{thinkText}</div>
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
                            {toolCall.pending
                              ? t('aiChat.timeline.toolStatus.pending', { defaultValue: '执行中' })
                              : (toolCall.success
                                ? t('aiChat.timeline.toolStatus.success', { defaultValue: '完成' })
                                : t('aiChat.timeline.toolStatus.failed', { defaultValue: '失败' }))}
                          </span>
                        </summary>
                        <div className="max-expand-chat-tool-result">
                          <div className="max-expand-chat-tool-result-title">{t('aiChat.timeline.toolResultTitle', { defaultValue: '工具返回结果' })}</div>
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
                        <>
                          {timelineNodes.length > 0 ? <div className="max-expand-chat-final-divider" /> : null}
                          <AssistantMarkdown content={normalizedMarkdownContent} />
                          {showFinalTraceMeta && (
                            <>
                              <div className="max-expand-chat-final-divider" />
                              <div className="max-expand-chat-trace-id">
                                <span>TraceID: {traceId || '-'}</span>
                                <button
                                  type="button"
                                  className="max-expand-chat-trace-report-btn"
                                  onClick={() => handleReportIssueFromFinalAnswer(traceId, msg.content)}
                                >
                                  {t('aiChat.actions.reportIssue', { defaultValue: '报告问题' })}
                                </button>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        aiChatStreaming && isLatestAssistantMsg && !showThinkingFooter ? (
                          <div className="max-expand-chat-loading-row">
                            <span className="max-expand-chat-generating-dots"><i /><i /><i /></span>
                          </div>
                        ) : ''
                      )}

                      {showThinkingFooter && (
                        <div className="max-expand-chat-loading-row">
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
          );
        })}
        {hasLowerHiddenMessages && (
          <div className="max-expand-chat-history-tip">
            <button
              type="button"
              className="max-expand-chat-history-load-more"
              onClick={() => {
                const maxStart = Math.max(0, aiChatMessages.length - VISIBLE_CHAT_WINDOW_SIZE);
                setVisibleWindowStart(prev => Math.min(maxStart, prev + VISIBLE_CHAT_WINDOW_STEP));
              }}
            >
              {t('aiChat.actions.loadMoreHistory', { defaultValue: '加载更多对话' })}
            </button>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      {aiWebAccessPrompt?.sessionId === activeAiChatSessionId && (
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
      {aiLocalToolAccessPrompt?.sessionId === activeAiChatSessionId && (
        <div className="max-expand-chat-web-access-panel max-expand-chat-local-tool-access-panel">
          <div className="max-expand-chat-web-access-card max-expand-chat-local-tool-access-card">
            <div className="max-expand-chat-local-tool-access-scroll">
            <div className="max-expand-chat-web-access-title">
              {t('aiChat.localToolAccess.title', { defaultValue: '本地高风险操作授权' })}
            </div>
            <div className="max-expand-chat-web-access-desc">
              {aiLocalToolAccessPrompt.message || t('aiChat.localToolAccess.requestHint', { defaultValue: 'Agent 请求执行以下本地操作，是否允许？' })}
            </div>
            <div className="max-expand-chat-local-tool-meta">
              <div className="max-expand-chat-local-tool-meta-item">
                <div className="max-expand-chat-local-tool-meta-head">
                  <span className="max-expand-chat-local-tool-meta-label">
                    {t('aiChat.localToolAccess.toolLabel', { defaultValue: '操作' })}
                  </span>
                  <span className="max-expand-chat-local-tool-meta-shot">
                    {t('aiChat.localToolAccess.screenshotTag', { defaultValue: '截图' })}
                  </span>
                </div>
                <span className="max-expand-chat-local-tool-meta-value">{aiLocalToolAccessPrompt.tool}</span>
              </div>
              <div className="max-expand-chat-local-tool-meta-item">
                <div className="max-expand-chat-local-tool-meta-head">
                  <span className="max-expand-chat-local-tool-meta-label">
                    {t('aiChat.localToolAccess.riskLabel', { defaultValue: '风险等级' })}
                  </span>
                  <span className="max-expand-chat-local-tool-meta-shot">
                    {t('aiChat.localToolAccess.screenshotTag', { defaultValue: '截图' })}
                  </span>
                </div>
                <span className="max-expand-chat-local-tool-meta-value">
                  {(aiLocalToolAccessPrompt.riskLevel || t('aiChat.localToolAccess.riskLevel.high', { defaultValue: 'high' })).toUpperCase()}
                </span>
              </div>
              <div className="max-expand-chat-local-tool-meta-item">
                <div className="max-expand-chat-local-tool-meta-head">
                  <span className="max-expand-chat-local-tool-meta-label">
                    {t('aiChat.localToolAccess.purposeTitle', { defaultValue: '调用用途' })}
                  </span>
                  <span className="max-expand-chat-local-tool-meta-shot">
                    {t('aiChat.localToolAccess.screenshotTag', { defaultValue: '截图' })}
                  </span>
                </div>
                <span className="max-expand-chat-local-tool-meta-value">
                  {aiLocalToolAccessPrompt.purpose || t('aiChat.localToolAccess.purposeFallback', { defaultValue: '未提供用途说明' })}
                </span>
              </div>
            </div>
            <div className="max-expand-chat-tool-result max-expand-chat-local-tool-arguments-card">
              <div className="max-expand-chat-tool-result-title">{t('aiChat.localToolAccess.argumentsTitle', { defaultValue: '参数' })}</div>
              <pre>{toPrettyJson(aiLocalToolAccessPrompt.argumentsPayload)}</pre>
            </div>
            <div className="max-expand-chat-web-access-actions">
              <button
                type="button"
                className="max-expand-chat-web-access-btn deny"
                onClick={() => { handleResolveLocalToolAccess(false); }}
                disabled={resolvingLocalToolAccessDecision}
              >
                {t('aiChat.localToolAccess.deny', { defaultValue: '拒绝执行' })}
              </button>
              <button
                type="button"
                className="max-expand-chat-web-access-btn allow"
                onClick={() => { handleResolveLocalToolAccess(true); }}
                disabled={resolvingLocalToolAccessDecision}
              >
                {t('aiChat.localToolAccess.allow', { defaultValue: '允许执行' })}
              </button>
            </div>
            {aiLocalToolAccessResolveError && (
              <div className="max-expand-chat-web-access-error">{aiLocalToolAccessResolveError}</div>
            )}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
      {/* 输入栏 */}
      <div>
        {showModelCard && (
          <div style={{ marginBottom: 8 }}>
            <div className="max-expand-chat-model-card">
              <div
                className="max-expand-chat-model-card-scroll"
                onWheelCapture={(e) => {
                  e.stopPropagation();
                }}
                onWheel={(e) => {
                  e.stopPropagation();
                }}
              >

              <div style={{ fontSize: 12, opacity: 0.72 }}>
                {t('aiChat.modelCard.title', { defaultValue: '模型选择卡片' })}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>{t('settings.ai.model', { defaultValue: '模型' })}</span>
                  <div className="max-expand-chat-model-select-shell" ref={modelDropdownRef}>
                    <button
                      type="button"
                      className="max-expand-chat-model-dropdown-trigger"
                      onClick={() => setShowModelDropdown((v) => !v)}
                      title={t('settings.ai.model', { defaultValue: '模型' })}
                    >
                      <span className="max-expand-chat-model-dropdown-trigger-label">{selectedModel}</span>
                      <span className="max-expand-chat-model-dropdown-arrow">▾</span>
                    </button>
                    {showModelDropdown && (
                      <div className="max-expand-chat-model-dropdown-list">
                        {availableModels.map((m) => {
                          const isPro = m === 'deepseek-v4-pro';
                          const disabled = isPro && !isProUser;
                          return (
                            <button
                              key={m}
                              type="button"
                              className={`max-expand-chat-model-dropdown-item${selectedModel === m ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                              onClick={() => {
                                if (disabled) return;
                                setAiConfig({ model: m });
                                setShowModelDropdown(false);
                              }}
                            >
                              <span>{m}</span>
                              {isPro && <img className="max-expand-chat-model-dropdown-pro-icon" src={SvgIcon.PRO} alt="PRO" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
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
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>{t('aiChat.modelCard.contextLimit', { defaultValue: '上下文' })}</span>
                  <div className="max-expand-chat-model-select-shell" ref={contextDropdownRef}>
                    <button
                      type="button"
                      className="max-expand-chat-model-dropdown-trigger"
                      onClick={() => setShowContextDropdown((v) => !v)}
                      title={t('aiChat.modelCard.contextLimit', { defaultValue: '上下文' })}
                    >
                      <span className="max-expand-chat-model-dropdown-trigger-label">{selectedContextLabel}</span>
                      <span className="max-expand-chat-model-dropdown-arrow">▾</span>
                    </button>
                    {showContextDropdown && (
                      <div className="max-expand-chat-model-dropdown-list">
                        {CONTEXT_LIMIT_OPTIONS.map((opt) => {
                          const disabled = opt.proOnly && !isProUser;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              className={`max-expand-chat-model-dropdown-item${selectedContextLimit === opt.value ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                              onClick={() => {
                                if (disabled) return;
                                setAiConfig({ contextLimit: opt.value });
                                setShowContextDropdown(false);
                              }}
                            >
                              <span>{opt.label}</span>
                              {opt.proOnly && <img className="max-expand-chat-model-dropdown-pro-icon" src={SvgIcon.PRO} alt="PRO" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Agent Skills */}
              <div
                className={`max-expand-chat-skills-section${skillDragOver ? ' drag-over' : ''}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  skillDragDepthRef.current += 1;
                  setSkillDragOver((prev) => (prev ? prev : true));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  skillDragDepthRef.current = Math.max(0, skillDragDepthRef.current - 1);
                  if (skillDragDepthRef.current === 0) {
                    setSkillDragOver(false);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  skillDragDepthRef.current = 0;
                  setSkillDragOver(false);
                  const files = Array.from(e.dataTransfer.files);
                  const mdFiles = files.filter((f) => f.name.toLowerCase().endsWith('.md'));
                  if (mdFiles.length === 0) return;
                  const current = Array.isArray(aiConfig.skills) ? aiConfig.skills : [];
                  const newSkills = [...current];
                  mdFiles.forEach((file) => {
                    const filePath = window.api.getPathForFile(file);
                    if (!filePath) return;
                    if (newSkills.some((s) => s.filePath.toLowerCase() === filePath.toLowerCase())) return;
                    const name = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/i, '') || 'skill';
                    const id = `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                    newSkills.push({ id, name, filePath, enabled: true });
                  });
                  if (newSkills.length !== current.length) {
                    setAiConfig({ skills: newSkills });
                  }
                }}
              >
                <div className="max-expand-chat-skills-header">
                  <span className="max-expand-chat-skills-title">
                    {t('aiChat.skills.title', { defaultValue: 'Skills' })}
                  </span>
                  <button
                    type="button"
                    className="max-expand-chat-skills-add-btn"
                    onClick={async () => {
                      const filePath = await window.api.pickSkillFile();
                      if (!filePath) return;
                      const current = Array.isArray(aiConfig.skills) ? aiConfig.skills : [];
                      if (current.some((s) => s.filePath.toLowerCase() === filePath.toLowerCase())) return;
                      const name = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/i, '') || 'skill';
                      const id = `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                      setAiConfig({ skills: [...current, { id, name, filePath, enabled: true }] });
                    }}
                  >
                    {t('aiChat.skills.add', { defaultValue: '+ 添加' })}
                  </button>
                </div>
                {Array.isArray(aiConfig.skills) && aiConfig.skills.length > 0 ? (
                  <div className="max-expand-chat-skills-list">
                    {aiConfig.skills.map((skill) => (
                      <div key={skill.id} className={`max-expand-chat-skills-item ${skill.enabled ? '' : 'disabled'}`}>
                        <button
                          type="button"
                          className={`max-expand-chat-skills-toggle ${skill.enabled ? 'on' : 'off'}`}
                          onClick={() => {
                            const updated = aiConfig.skills.map((s) => s.id === skill.id ? { ...s, enabled: !s.enabled } : s);
                            setAiConfig({ skills: updated });
                          }}
                          title={skill.enabled ? t('aiChat.skills.disable', { defaultValue: '禁用' }) : t('aiChat.skills.enable', { defaultValue: '启用' })}
                        />
                        <span className="max-expand-chat-skills-name" title={skill.filePath}>{skill.name}</span>
                        <button
                          type="button"
                          className="max-expand-chat-skills-remove-btn"
                          onClick={() => {
                            const updated = aiConfig.skills.filter((s) => s.id !== skill.id);
                            setAiConfig({ skills: updated });
                          }}
                          title={t('aiChat.skills.remove', { defaultValue: '移除' })}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="max-expand-chat-skills-drop-hint">
                    {t('aiChat.skills.dropHint', { defaultValue: '拖入 .md 文件或点击添加' })}
                  </div>
                )}
              </div>
              <div
                className={`max-expand-chat-context-usage in-card ${contextUsageLevelClass}`}
                role="img"
                aria-label={t('aiChat.contextUsage.aria', {
                  defaultValue: '上下文使用情况：{{used}} / {{max}} tokens（{{percent}}）',
                  used: contextUsageTokens.toLocaleString(),
                  max: selectedContextLimit.toLocaleString(),
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
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT_EXTENSIONS}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files) handleAttachFiles(e.target.files); }}
        />
        <div
          className={`max-expand-chat-attachments-drop-zone${attachmentDragOver ? ' drag-over' : ''}${attachmentDropInvalid ? ' invalid' : ''}`}
          onDragEnter={(e) => {
            setAttachmentDropInvalid(false);
            handleAttachmentDragEnter(e);
          }}
          onDragOver={handleAttachmentDragOver}
          onDragLeave={handleAttachmentDragLeave}
          onDrop={handleAttachmentDropEvent}
        >
          {pendingAttachments.length > 0 && (
            <div className="max-expand-chat-attachments-pending">
              {pendingAttachments.map((a) => (
                <span key={a.name} className="max-expand-chat-attachment-tag">
                  {resolveDevIconByFileName(a.name) ? (
                    <img className="max-expand-chat-attachment-tag-icon" src={resolveDevIconByFileName(a.name)} alt="" aria-hidden="true" />
                  ) : (
                    <span className="max-expand-chat-attachment-tag-icon-fallback" aria-hidden="true" />
                  )}
                  <span className="max-expand-chat-attachment-tag-name">{a.name}</span>
                  <button
                    type="button"
                    className="max-expand-chat-attachment-tag-remove"
                    onClick={() => setPendingAttachments((prev) => prev.filter((p) => p.name !== a.name))}
                    aria-label={t('aiChat.attachments.remove', { defaultValue: '移除附件' })}
                  >×</button>
                </span>
              ))}
            </div>
          )}
          <div className="max-expand-chat-input-bar">
          <button
            className="max-expand-chat-send max-expand-chat-session-toggle"
            type="button"
            onClick={() => {
              setShowSessionSidebar((prev) => !prev);
            }}
            title={t('aiChat.session.toggleHistory', { defaultValue: '展开历史会话' })}
          >
            <img
              className="max-expand-chat-session-toggle-icon"
              src={showSessionSidebar ? SvgIcon.COLLAPSE : SvgIcon.EXPAND}
              alt=""
            />
          </button>
          <button
            className="max-expand-chat-send max-expand-chat-session-toggle"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={t('aiChat.attachments.add', { defaultValue: '添加文本附件' })}
            disabled={aiChatStreaming || pendingAttachments.length >= ATTACHMENT_MAX_COUNT}
          >
            <img
              className="max-expand-chat-session-toggle-icon"
              src={SvgIcon.ATTACHMENT}
              alt=""
            />
          </button>
          <div className="max-expand-chat-agent-mode-wrap">
            <button
              ref={agentModeTriggerRef}
              className="max-expand-chat-agent-mode-trigger"
              type="button"
              onClick={toggleAgentModeDropdown}
              title={t('aiChat.agentMode.switch', { defaultValue: '切换 Agent 模式' })}
            >
              <img className={`max-expand-chat-agent-mode-icon${currentAgentModeConfig.noFilter ? ' no-filter' : ''}`} src={currentAgentModeConfig.icon} alt="" />
            </button>
            {showAgentModeDropdown && agentModeDropdownPos && (
              <div
                ref={agentModeDropdownRef}
                className="max-expand-chat-agent-mode-dropdown"
                style={{ position: 'fixed', left: agentModeDropdownPos.left, bottom: agentModeDropdownPos.bottom }}
              >
                {AGENT_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`max-expand-chat-agent-mode-item${agentMode === m.id ? ' active' : ''}`}
                    onClick={() => setAgentMode(m.id)}
                  >
                    <img className={`max-expand-chat-agent-mode-item-icon${m.noFilter ? ' no-filter' : ''}`} src={m.icon} alt="" />
                    <span className="max-expand-chat-agent-mode-item-label">{m.label}</span>
                    <span className="max-expand-chat-agent-mode-item-desc">{m.desc}</span>
                    {m.badgeIcon && <img className="max-expand-chat-agent-mode-item-badge" src={m.badgeIcon} alt="" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <textarea
            ref={inputRef}
            className="max-expand-chat-input"
            placeholder={aiChatStreaming
              ? t('aiChat.input.generatingPlaceholder', { defaultValue: '生成中...' })
              : t('aiChat.input.placeholder', { defaultValue: '输入消息...' })}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={aiChatStreaming}
            aria-disabled={aiChatStreaming}
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
    </div>
  );
}
