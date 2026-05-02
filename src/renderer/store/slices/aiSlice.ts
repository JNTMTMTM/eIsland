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
 * @file aiSlice.ts
 * @description AI 配置相关逻辑，支持 localStorage 持久化
 * @author 鸡哥
 */

import type { StateCreator } from 'zustand';
import type { AiSlice, AiConfig, AiChatMessage, AiChatSession, AiWebAccessPrompt, AiSkill } from '../types';

const AI_CONFIG_KEY = 'eIsland_aiConfig';
const AI_CHAT_MESSAGES_KEY = 'eIsland_aiChatMessages';
const AI_CHAT_SESSIONS_KEY = 'eIsland_aiChatSessions';
const AI_ACTIVE_CHAT_SESSION_ID_KEY = 'eIsland_aiActiveChatSessionId';

function loadAiConfig(): AiConfig {
  const defaults: AiConfig = {
    apiKey: '',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    mcpEndpoint: '',
    systemPrompt: '你是一个有用的助手。',
    deepseekThinking: false,
    deepseekReasoningEffort: 'medium',
    contextLimit: 200_000,
    r1pxcAvatar: '',
    workspaces: [],
    skills: [],
  };
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AiConfig>;
      const merged = { ...defaults, ...parsed };
      const effort = merged.deepseekReasoningEffort;
      merged.deepseekReasoningEffort = effort === 'low' || effort === 'high' ? effort : 'medium';
      merged.deepseekThinking = Boolean(merged.deepseekThinking);
      const cl = Number(merged.contextLimit);
      merged.contextLimit = (cl === 400_000 || cl === 1_000_000) ? cl as 400_000 | 1_000_000 : 200_000;
      merged.r1pxcAvatar = typeof merged.r1pxcAvatar === 'string' && merged.r1pxcAvatar.trim().startsWith('data:image/')
        ? merged.r1pxcAvatar.trim()
        : '';
      merged.workspaces = Array.isArray(merged.workspaces) ? merged.workspaces.filter((w) => typeof w === 'string' && w.trim()) : [];
      merged.skills = Array.isArray(merged.skills)
        ? (merged.skills as AiSkill[]).filter((s) => typeof s?.id === 'string' && typeof s?.name === 'string' && typeof s?.filePath === 'string')
        : [];
      return merged;
    }
  } catch { /* ignore */ }
  return defaults;
}

function saveAiConfig(config: AiConfig): void {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

function loadAiChatMessages(): AiChatMessage[] {
  try {
    const raw = localStorage.getItem(AI_CHAT_MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((m) => normalizeAiChatMessage(m))
      .filter((m): m is AiChatMessage => m !== null && m !== undefined);
  } catch {
    return [];
  }
}

function stripAttachmentBlocks(content: string): string {
  if (!content) {
    return '';
  }
  return content.replace(/(?:<attachment name="[^"]*">\n[\s\S]*?\n<\/attachment>\n*)+/g, '').trim();
}

function deriveAiChatSessionTitle(messages: AiChatMessage[]): string {
  const firstUserMessage = messages.find((message) => {
    if (message.role !== 'user') {
      return false;
    }
    return stripAttachmentBlocks(message.content).trim().length > 0;
  });
  if (!firstUserMessage) {
    return '新对话';
  }
  const singleLine = stripAttachmentBlocks(firstUserMessage.content).replace(/\s+/g, ' ').trim();
  return singleLine.slice(0, 24) || '新对话';
}

function createAiChatSession(messages: AiChatMessage[] = []): AiChatSession {
  const now = Date.now();
  return {
    id: `chat-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: deriveAiChatSessionTitle(messages),
    updatedAt: now,
    messages,
  };
}

function normalizeAiChatMessage(value: unknown): AiChatMessage | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const source = value as Record<string, unknown>;
  const role = source.role === 'user' || source.role === 'assistant' ? source.role : '';
  const content = typeof source.content === 'string' ? source.content : '';
  if (!role) {
    return null;
  }
  const thinkBlocks = Array.isArray(source.thinkBlocks)
    ? source.thinkBlocks.filter((item): item is string => typeof item === 'string')
    : [];
  const toolCalls = Array.isArray(source.toolCalls)
    ? source.toolCalls
      .map((item) => normalizeAiToolCall(item))
      .filter((item): item is NonNullable<AiChatMessage['toolCalls']>[number] => item !== null && item !== undefined)
    : [];
  const todoSnapshots = Array.isArray(source.todoSnapshots)
    ? source.todoSnapshots
      .map((item) => normalizeAiTodoSnapshot(item))
      .filter((item): item is NonNullable<AiChatMessage['todoSnapshots']>[number] => item !== null && item !== undefined)
    : [];
  const normalized: AiChatMessage = {
    role,
    content,
  };
  if (thinkBlocks.length > 0) {
    normalized.thinkBlocks = thinkBlocks;
  }
  if (toolCalls.length > 0) {
    normalized.toolCalls = toolCalls;
  }
  if (todoSnapshots.length > 0) {
    normalized.todoSnapshots = todoSnapshots;
  }
  const attachments = Array.isArray(source.attachments)
    ? source.attachments
      .filter((a): a is { name: string; size: number } =>
        !!a && typeof a === 'object' && typeof (a as Record<string, unknown>).name === 'string' && typeof (a as Record<string, unknown>).size === 'number')
      .map((a) => ({ name: a.name, size: a.size }))
    : [];
  if (attachments.length > 0) {
    normalized.attachments = attachments;
  }
  if (typeof source.model === 'string' && source.model.trim()) {
    normalized.model = source.model.trim();
  }
  if (typeof source.traceId === 'string' && source.traceId.trim()) {
    normalized.traceId = source.traceId.trim();
  }
  if (typeof source.quote === 'string' && source.quote.trim()) {
    normalized.quote = source.quote.trim();
  }
  if (source.finalized === true) {
    normalized.finalized = true;
  }
  if (source.tokenUsage && typeof source.tokenUsage === 'object' && !Array.isArray(source.tokenUsage)) {
    const tu = source.tokenUsage as Record<string, unknown>;
    const inputTokens = typeof tu.inputTokens === 'number' ? tu.inputTokens : 0;
    const outputTokens = typeof tu.outputTokens === 'number' ? tu.outputTokens : 0;
    const reasoningTokens = typeof tu.reasoningTokens === 'number' ? tu.reasoningTokens : 0;
    const totalTokens = typeof tu.totalTokens === 'number' ? tu.totalTokens : 0;
    const tokenSource = typeof tu.source === 'string' ? tu.source : '';
    if (inputTokens > 0 || outputTokens > 0 || totalTokens > 0) {
      normalized.tokenUsage = { inputTokens, outputTokens, reasoningTokens, totalTokens, source: tokenSource };
    }
  }
  return normalized;
}

function normalizeAiTodoSnapshot(value: unknown): NonNullable<AiChatMessage['todoSnapshots']>[number] | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const source = value as Record<string, unknown>;
  const turn = typeof source.turn === 'number' && Number.isFinite(source.turn)
    ? source.turn
    : 0;
  const items = Array.isArray(source.items)
    ? source.items
      .map((item) => normalizeAiTodoItem(item))
      .filter((item): item is NonNullable<AiChatMessage['todoSnapshots']>[number]['items'][number] => item !== null && item !== undefined)
    : [];
  if (items.length === 0) {
    return null;
  }
  return {
    turn,
    items,
  };
}

function normalizeAiTodoItem(value: unknown): NonNullable<AiChatMessage['todoSnapshots']>[number]['items'][number] | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const source = value as Record<string, unknown>;
  const id = typeof source.id === 'string' ? source.id : '';
  const content = typeof source.content === 'string' ? source.content : '';
  const status = source.status === 'in_progress' || source.status === 'completed' ? source.status : 'pending';
  if (!id || !content) {
    return null;
  }
  return {
    id,
    content,
    status,
  };
}

function normalizeAiToolCall(value: unknown): NonNullable<AiChatMessage['toolCalls']>[number] | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const source = value as Record<string, unknown>;
  const tool = typeof source.tool === 'string' ? source.tool : '';
  if (!tool) {
    return null;
  }
  const turn = typeof source.turn === 'number' ? source.turn : 0;
  const requestId = typeof source.requestId === 'string' ? source.requestId : '';
  const purpose = typeof source.purpose === 'string' ? source.purpose : '';
  const riskLevel = typeof source.riskLevel === 'string' ? source.riskLevel : '';
  const durationMs = typeof source.durationMs === 'number' ? source.durationMs : 0;
  const pending = typeof source.pending === 'boolean' ? source.pending : false;
  const argumentsPayload = typeof source.arguments === 'object' && source.arguments !== null && source.arguments !== undefined
    ? source.arguments as Record<string, unknown>
    : undefined;
  const success = typeof source.success === 'boolean' ? source.success : undefined;
  const error = typeof source.error === 'string' ? source.error : '';
  return {
    turn,
    tool,
    requestId,
    purpose,
    riskLevel,
    durationMs,
    pending,
    arguments: argumentsPayload,
    success,
    error,
    result: source.result,
    authorizationRequired: typeof source.authorizationRequired === 'boolean' ? source.authorizationRequired : undefined,
    webAccessRequestId: typeof source.webAccessRequestId === 'string' ? source.webAccessRequestId : undefined,
    webAccessUrl: typeof source.webAccessUrl === 'string' ? source.webAccessUrl : undefined,
    webAccessResolved: typeof source.webAccessResolved === 'boolean' ? source.webAccessResolved : undefined,
    webAccessAllowed: typeof source.webAccessAllowed === 'boolean' ? source.webAccessAllowed : undefined,
    webAccessResolveError: typeof source.webAccessResolveError === 'string' ? source.webAccessResolveError : undefined,
  };
}

function normalizeAiChatSession(value: unknown): AiChatSession | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const source = value as Record<string, unknown>;
  const id = typeof source.id === 'string' ? source.id.trim() : '';
  if (!id) {
    return null;
  }
  const rawMessages = Array.isArray(source.messages) ? source.messages : [];
  const messages = rawMessages
    .map((item) => normalizeAiChatMessage(item))
    .filter((item): item is AiChatMessage => item !== null && item !== undefined);
  const title = typeof source.title === 'string' && source.title.trim()
    ? source.title.trim().slice(0, 48)
    : deriveAiChatSessionTitle(messages);
  const updatedAt = typeof source.updatedAt === 'number' && Number.isFinite(source.updatedAt)
    ? source.updatedAt
    : Date.now();
  return {
    id,
    title,
    updatedAt,
    messages,
  };
}

function loadAiChatSessions(): AiChatSession[] {
  try {
    const raw = localStorage.getItem(AI_CHAT_SESSIONS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => normalizeAiChatSession(item))
      .filter((item): item is AiChatSession => item !== null && item !== undefined);
  } catch {
    return [];
  }
}

function loadActiveAiChatSessionId(): string {
  try {
    return localStorage.getItem(AI_ACTIVE_CHAT_SESSION_ID_KEY) || '';
  } catch {
    return '';
  }
}

function saveAiChatMessages(messages: AiChatMessage[]): void {
  try {
    localStorage.setItem(AI_CHAT_MESSAGES_KEY, JSON.stringify(messages));
  } catch (err) {
    console.warn('[aiSlice] saveAiChatMessages failed', err);
  }
}

function saveAiChatSessions(sessions: AiChatSession[], activeSessionId: string): void {
  try {
    localStorage.setItem(AI_CHAT_SESSIONS_KEY, JSON.stringify(sessions));
    localStorage.setItem(AI_ACTIVE_CHAT_SESSION_ID_KEY, activeSessionId);
    const activeSession = sessions.find((session) => session.id === activeSessionId);
    saveAiChatMessages(activeSession?.messages || []);
  } catch (err) {
    console.warn('[aiSlice] saveAiChatSessions failed', err);
  }
}

function initializeAiChatState(): {
  sessions: AiChatSession[];
  activeSessionId: string;
  activeMessages: AiChatMessage[];
} {
  const loadedSessions = loadAiChatSessions();
  const legacyMessages = loadAiChatMessages();
  let sessions = loadedSessions;
  if (sessions.length === 0) {
    sessions = [createAiChatSession(legacyMessages)];
  }
  let activeSessionId = loadActiveAiChatSessionId();
  if (!activeSessionId || !sessions.some((session) => session.id === activeSessionId)) {
    activeSessionId = sessions[0].id;
  }
  const activeMessages = sessions.find((session) => session.id === activeSessionId)?.messages || [];
  return {
    sessions,
    activeSessionId,
    activeMessages,
  };
}

function normalizeAiWebAccessPrompt(value: AiWebAccessPrompt | null): AiWebAccessPrompt | null {
  if (!value) {
    return null;
  }
  const sessionId = typeof value.sessionId === 'string' ? value.sessionId.trim() : '';
  const requestId = typeof value.requestId === 'string' ? value.requestId.trim() : '';
  const url = typeof value.url === 'string' ? value.url.trim() : '';
  const message = typeof value.message === 'string' ? value.message : '';
  const hostname = typeof value.hostname === 'string' ? value.hostname.trim() : '';
  const siteName = typeof value.siteName === 'string' ? value.siteName.trim() : '';
  const iconUrl = typeof value.iconUrl === 'string' ? value.iconUrl.trim() : '';
  const domainPolicy = value.domainPolicy === 'allow' || value.domainPolicy === 'deny' ? value.domainPolicy : 'ask';
  if (!requestId || !url) {
    return null;
  }
  return {
    sessionId,
    requestId,
    url,
    message,
    hostname,
    siteName,
    iconUrl,
    domainPolicy,
  };
}

export const createAiSlice: StateCreator<
  AiSlice,
  [],
  [],
  AiSlice
> = (set, get) => {
  const initialChatState = initializeAiChatState();

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === AI_CONFIG_KEY) {
        set({ aiConfig: loadAiConfig() });
      }
    });
  }

  return {
    aiConfig: loadAiConfig(),
    aiChatSessions: initialChatState.sessions,
    activeAiChatSessionId: initialChatState.activeSessionId,
    aiChatMessages: initialChatState.activeMessages,
    aiChatStreaming: false,
    aiWebAccessPrompt: null,
    aiWebAccessResolveError: '',

    setAiConfig: (partial) => {
      const next = { ...get().aiConfig, ...partial };
      saveAiConfig(next);
      set({ aiConfig: next });
    },

    createNewAiChatSession: () => {
      const nextSession = createAiChatSession([]);
      const nextSessions = [nextSession, ...get().aiChatSessions];
      saveAiChatSessions(nextSessions, nextSession.id);
      set({
        aiChatSessions: nextSessions,
        activeAiChatSessionId: nextSession.id,
        aiChatMessages: [],
        aiChatStreaming: false,
        aiWebAccessPrompt: null,
        aiWebAccessResolveError: '',
      });
    },

    switchAiChatSession: (sessionId) => {
      const target = get().aiChatSessions.find((session) => session.id === sessionId);
      if (!target) {
        return;
      }
      saveAiChatSessions(get().aiChatSessions, target.id);
      set({
        activeAiChatSessionId: target.id,
        aiChatMessages: target.messages,
        aiChatStreaming: false,
      });
    },

    deleteAiChatSession: (sessionId) => {
      const sessions = get().aiChatSessions;
      if (sessions.length <= 1) {
        return;
      }
      const nextSessions = sessions.filter((session) => session.id !== sessionId);
      if (nextSessions.length === 0) {
        return;
      }
      const activeId = get().activeAiChatSessionId === sessionId
        ? nextSessions[0].id
        : get().activeAiChatSessionId;
      const activeMessages = nextSessions.find((session) => session.id === activeId)?.messages || [];
      saveAiChatSessions(nextSessions, activeId);
      set({
        aiChatSessions: nextSessions,
        activeAiChatSessionId: activeId,
        aiChatMessages: activeMessages,
        aiChatStreaming: false,
      });
    },

    setAiChatStreaming: (streaming) => {
      const nextStreaming = Boolean(streaming);
      const prevStreaming = get().aiChatStreaming;
      set({ aiChatStreaming: nextStreaming });
      if (prevStreaming && !nextStreaming) {
        saveAiChatSessions(get().aiChatSessions, get().activeAiChatSessionId);
      }
    },

    setAiChatSessionMessages: (sessionId, messages) => {
      const nextSessions = get().aiChatSessions.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }
        return {
          ...session,
          messages,
          title: deriveAiChatSessionTitle(messages),
        };
      });
      if (!get().aiChatStreaming || sessionId !== get().activeAiChatSessionId) {
        saveAiChatSessions(nextSessions, get().activeAiChatSessionId);
      }
      set((state) => ({
        aiChatSessions: nextSessions,
        aiChatMessages: state.activeAiChatSessionId === sessionId ? messages : state.aiChatMessages,
      }));
    },

    markAiChatSessionReplyFinished: (sessionId, finishedAt) => {
      const stamp = typeof finishedAt === 'number' && Number.isFinite(finishedAt) ? finishedAt : Date.now();
      const nextSessions = get().aiChatSessions.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }
        return {
          ...session,
          updatedAt: stamp,
        };
      });
      saveAiChatSessions(nextSessions, get().activeAiChatSessionId);
      set({ aiChatSessions: nextSessions });
    },

    clearAiChatMessages: () => {
      const now = Date.now();
      const activeId = get().activeAiChatSessionId;
      const nextSessions = get().aiChatSessions.map((session) => {
        if (session.id !== activeId) {
          return session;
        }
        return {
          ...session,
          title: '新对话',
          updatedAt: now,
          messages: [],
        };
      });
      saveAiChatSessions(nextSessions, activeId);
      set({
        aiChatSessions: nextSessions,
        aiChatMessages: [],
        aiChatStreaming: false,
        aiWebAccessPrompt: null,
        aiWebAccessResolveError: '',
      });
    },

    setAiWebAccessPrompt: (prompt) => {
      set({ aiWebAccessPrompt: normalizeAiWebAccessPrompt(prompt) });
    },

    setAiWebAccessResolveError: (message) => {
      set({ aiWebAccessResolveError: typeof message === 'string' ? message : '' });
    },

    setAiChatMessages: (messages) => {
      get().setAiChatSessionMessages(get().activeAiChatSessionId, messages);
    },
  };
};
