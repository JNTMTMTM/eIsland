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
import type { AiSlice, AiConfig, AiChatMessage, AiChatSession, AiWebAccessPrompt } from '../types';

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
    workspaces: [],
  };
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AiConfig>;
      const merged = { ...defaults, ...parsed };
      const effort = merged.deepseekReasoningEffort;
      merged.deepseekReasoningEffort = effort === 'low' || effort === 'high' ? effort : 'medium';
      merged.deepseekThinking = Boolean(merged.deepseekThinking);
      merged.workspaces = Array.isArray(merged.workspaces) ? merged.workspaces.filter((w) => typeof w === 'string' && w.trim()) : [];
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
      .filter((m): m is AiChatMessage => m != null);
  } catch {
    return [];
  }
}

function deriveAiChatSessionTitle(messages: AiChatMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === 'user' && message.content.trim());
  if (!firstUserMessage) {
    return '新对话';
  }
  const singleLine = firstUserMessage.content.replace(/\s+/g, ' ').trim();
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
      .filter((item): item is NonNullable<AiChatMessage['toolCalls']>[number] => item != null)
    : [];
  const todoSnapshots = Array.isArray(source.todoSnapshots)
    ? source.todoSnapshots
      .map((item) => normalizeAiTodoSnapshot(item))
      .filter((item): item is NonNullable<AiChatMessage['todoSnapshots']>[number] => item != null)
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
      .filter((item): item is NonNullable<AiChatMessage['todoSnapshots']>[number]['items'][number] => item != null)
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
  const argumentsPayload = typeof source.arguments === 'object' && source.arguments != null
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
    .filter((item): item is AiChatMessage => item != null);
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
      .filter((item): item is AiChatSession => item != null);
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
        aiWebAccessPrompt: null,
        aiWebAccessResolveError: '',
      });
    },

    setAiChatMessages: (messages) => {
      const now = Date.now();
      const activeId = get().activeAiChatSessionId;
      const nextSessions = get().aiChatSessions.map((session) => {
        if (session.id !== activeId) {
          return session;
        }
        return {
          ...session,
          messages,
          updatedAt: now,
          title: deriveAiChatSessionTitle(messages),
        };
      });
      if (!get().aiChatStreaming) {
        saveAiChatSessions(nextSessions, activeId);
      }
      set({
        aiChatMessages: messages,
        aiChatSessions: nextSessions,
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
  };
};
