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

import { aiChatStorage, toAiChatIndex } from '../utils/aiChatStorage';
import type { StateCreator } from 'zustand';
import type { AiSlice, AiConfig, AiChatMessage, AiChatSession, AiWebAccessPrompt, AiSkill } from '../types';

const AI_CONFIG_KEY = 'eIsland_aiConfig';
const AI_CHAT_MESSAGES_KEY = 'eIsland_aiChatMessages';
const AI_CHAT_SESSIONS_KEY = 'eIsland_aiChatSessions';
const AI_CHAT_RECOVERY_KEY = 'eIsland_aiChatRecovery';
const CHAT_CHECKPOINT_MS = 1000;
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
    ollamaModel: '',
    ollamaBaseUrl: '',
    customApiModel: '',
    customApiMode: 'relay',
    sttOrbEnabled: true,
    orbColorA: '',
    orbColorB: '',
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
      merged.ollamaModel = typeof merged.ollamaModel === 'string' ? merged.ollamaModel.trim() : '';
      merged.ollamaBaseUrl = typeof merged.ollamaBaseUrl === 'string' ? merged.ollamaBaseUrl.trim() : '';
      merged.customApiModel = typeof merged.customApiModel === 'string' ? merged.customApiModel.trim() : '';
      merged.customApiMode = merged.customApiMode === 'direct' ? 'direct' : 'relay';
      merged.sttOrbEnabled = merged.sttOrbEnabled !== false;
      merged.orbColorA = typeof merged.orbColorA === 'string' && /^#[0-9a-fA-F]{6}$/.test(merged.orbColorA) ? merged.orbColorA : '';
      merged.orbColorB = typeof merged.orbColorB === 'string' && /^#[0-9a-fA-F]{6}$/.test(merged.orbColorB) ? merged.orbColorB : '';
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
  const thinkDurations = Array.isArray(source.thinkDurations)
    ? source.thinkDurations.filter((item): item is number => typeof item === 'number' && Number.isFinite(item) && item > 0)
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
  if (thinkDurations.length > 0) {
    normalized.thinkDurations = thinkDurations;
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
  let readyTask: Promise<void> | null = null;
  let selectionVersion = 0;
  let releaseActiveOnSettle = false;
  const retained = new Map<string, number>();
  const dirty = new Set<string>();
  const deleting = new Set<string>();
  const checkpoints = new Map<string, ReturnType<typeof setTimeout>>();
  const revisions = new Map<string, number>();
  const urgent = new Set<string>();
  const recovery = new Map<string, { session: AiChatSession; revision: number }>();

  const writeRecovery = (): void => {
    try {
      if (recovery.size) localStorage.setItem(AI_CHAT_RECOVERY_KEY, JSON.stringify([...recovery.values()].map((item) => item.session)));
      else localStorage.removeItem(AI_CHAT_RECOVERY_KEY);
    } catch (error) { console.warn('[aiSlice] exit recovery failed', error); }
  };
  const cancelCheckpoint = (id: string): void => {
    const timer = checkpoints.get(id);
    if (timer !== undefined) clearTimeout(timer);
    checkpoints.delete(id);
  };
  const saving = new Map<string, Promise<void>>();

  const releaseBodies = (releaseActive = releaseActiveOnSettle): void => {
    const state = get();
    const sessions = state.aiChatSessions.map((session) => {
      if ((!releaseActive && session.id === state.activeAiChatSessionId) || retained.has(session.id)
        || dirty.has(session.id) || saving.has(session.id) || session.messagesLoaded === false) return session;
      return { ...toAiChatIndex(session), messages: [], messagesLoaded: false };
    });
    const clearActive = releaseActive && !retained.has(state.activeAiChatSessionId)
      && !dirty.has(state.activeAiChatSessionId) && !saving.has(state.activeAiChatSessionId) && state.aiChatMessages.length > 0;
    if (clearActive || sessions.some((session, index) => session !== state.aiChatSessions[index])) {
      set({ aiChatSessions: sessions, ...(clearActive ? { aiChatMessages: [] } : {}) });
    }
  };

  const persist = (id: string, immediate = true): Promise<void> => {
    cancelCheckpoint(id);
    if (deleting.has(id)) return Promise.resolve();
    if (immediate) urgent.add(id);
    dirty.add(id);
    const current = saving.get(id);
    if (current) return current;
    const task = (async () => {
      // 只持有正在写的一个快照，写入期间的新变更合并为下一次快照。
      while (dirty.has(id)) {
        const session = get().aiChatSessions.find((item) => item.id === id);
        if (!session || session.messagesLoaded === false) { dirty.delete(id); break; }
        dirty.delete(id);
        const revision = revisions.get(id) ?? 0;
        try {
          await aiChatStorage.save(session);
          if (recovery.has(id) && revision >= recovery.get(id)!.revision) { recovery.delete(id); writeRecovery(); }
        }
        catch (error) { dirty.add(id); set({ aiChatStorageError: true }); throw error; }
        if (retained.has(id) && dirty.has(id) && !urgent.has(id)) { checkpoint(id); break; }
      }
    })().finally(() => { saving.delete(id); urgent.delete(id); releaseBodies(); });
    saving.set(id, task);
    return task;
  };
  const save = (id: string, immediate = true): void => { void persist(id, immediate).catch((error) => console.warn('[aiSlice] save session failed', error)); };
  const checkpoint = (id: string): void => {
    if (checkpoints.has(id)) return;
    checkpoints.set(id, setTimeout(() => { checkpoints.delete(id); save(id, false); }, CHAT_CHECKPOINT_MS));
  };
  const select = async (id: string): Promise<void> => {
    const target = get().aiChatSessions.find((session) => session.id === id);
    if (!target) return;
    const version = ++selectionVersion;
    set({ activeAiChatSessionId: id, aiChatMessages: target.messages, aiChatLoading: true });
    try {
      const messages = target.messagesLoaded === false ? await aiChatStorage.read(id) : target.messages;
      if (!messages) throw new Error('Chat session body is missing');
      if (version !== selectionVersion) return;
      set((state) => ({
        aiChatMessages: messages, aiChatLoading: false,
        aiChatSessions: state.aiChatSessions.map((session) => session.id === id
          ? { ...session, messages, messagesLoaded: true } : session),
      }));
      try { localStorage.setItem(AI_ACTIVE_CHAT_SESSION_ID_KEY, id); } catch { /* 选择失败不影响正文事务。 */ }
      releaseBodies();
    } catch (error) {
      if (version === selectionVersion) set({ aiChatLoading: false, aiChatStorageError: true });
      throw error;
    }
  };

  if (typeof window !== 'undefined') {
    // 退出时 IndexedDB 提交可能被中断，仅为待写会话保留同步恢复日志。
    const flushOnExit = (): void => {
      [...new Set([...dirty, ...saving.keys()])].forEach((id) => {
        const session = get().aiChatSessions.find((item) => item.id === id);
        if (session && session.messagesLoaded !== false && !deleting.has(id)) recovery.set(id, { session, revision: revisions.get(id) ?? 0 });
      });
      if (recovery.size) writeRecovery();
      void get().flushAiChatStorage().catch(() => {});
    };
    window.addEventListener('pagehide', flushOnExit);
    window.addEventListener('beforeunload', flushOnExit);
    window.addEventListener('storage', (event) => {
      if (event.key === AI_CONFIG_KEY) {
        set({ aiConfig: loadAiConfig() });
      }
    });
  }

  return {
    aiConfig: loadAiConfig(),
    aiChatReady: false,
    aiChatLoading: false,
    aiChatStorageError: false,
    aiChatSessions: [],
    activeAiChatSessionId: '',
    aiChatMessages: [],
    aiChatStreaming: false,
    aiWebAccessPrompt: null,
    aiWebAccessResolveError: '',

    ensureAiChatReady: async () => {
      releaseActiveOnSettle = false;
      if (get().aiChatReady) {
        const active = get().aiChatSessions.find((item) => item.id === get().activeAiChatSessionId);
        await get().flushAiChatStorage();
        if (active?.messagesLoaded === false) await select(active.id);
        set({ aiChatStorageError: false });
        return;
      }
      if (readyTask) return readyTask;
      set({ aiChatLoading: true, aiChatStorageError: false });
      readyTask = (async () => {
        await aiChatStorage.initialize(() => {
          const sessions = loadAiChatSessions();
          return sessions.length ? sessions : [createAiChatSession(loadAiChatMessages())];
        }, () => ({ sessions: localStorage.getItem(AI_CHAT_SESSIONS_KEY), messages: localStorage.getItem(AI_CHAT_MESSAGES_KEY) }));
        // 只有所有正文与迁移标记提交完成，才删除可重试的旧数据。
        try {
          localStorage.removeItem(AI_CHAT_SESSIONS_KEY);
          localStorage.removeItem(AI_CHAT_MESSAGES_KEY);
        } catch { /* 旧数据保留不影响已提交的新存储。 */ }
        const pending = localStorage.getItem(AI_CHAT_RECOVERY_KEY);
        if (pending) {
          const parsed: unknown = JSON.parse(pending);
          if (!Array.isArray(parsed)) throw new Error('Invalid chat recovery journal');
          await parsed.reduce(async (previous, item: unknown) => {
            // 恢复记录依次提交，保持重复会话的覆盖顺序。
            await previous;
            const session = normalizeAiChatSession(item);
            if (!session) throw new Error('Invalid chat recovery session');
            await aiChatStorage.save(session);
          }, Promise.resolve());
          localStorage.removeItem(AI_CHAT_RECOVERY_KEY);
        }
        const index = await aiChatStorage.list();
        if (!index.length) {
          const first = createAiChatSession();
          await aiChatStorage.save(first);
          index.push(toAiChatIndex(first));
        }
        const sessions = index.map((item) => ({ ...item, messages: [], messagesLoaded: false }));
        const preferred = loadActiveAiChatSessionId();
        set({ aiChatSessions: sessions });
        await select(sessions.some((item) => item.id === preferred) ? preferred : sessions[0].id);
        set({ aiChatReady: true });
      })().catch((error) => { set({ aiChatLoading: false, aiChatStorageError: true }); throw error; })
        .finally(() => { readyTask = null; });
      return readyTask;
    },
    releaseAiChatBodies: () => { releaseActiveOnSettle = true; releaseBodies(true); },
    retainAiChatSession: (id, keep) => {
      if (keep) retained.set(id, (retained.get(id) ?? 0) + 1);
      else {
        const owners = retained.get(id) ?? 0;
        if (owners > 1) { retained.set(id, owners - 1); return; }
        retained.delete(id);
        cancelCheckpoint(id);
        if (dirty.has(id)) save(id);
        releaseBodies();
      }
    },
    flushAiChatStorage: async () => { await Promise.all([...saving.values(), ...[...dirty].map((id) => persist(id))]); },
    setAiConfig: (partial) => {
      const next = { ...get().aiConfig, ...partial };
      saveAiConfig(next);
      set({ aiConfig: next });
    },
    createNewAiChatSession: async () => {
      if (!get().aiChatReady) await get().ensureAiChatReady();
      const session = { ...createAiChatSession(), messagesLoaded: true };
      set({ aiChatSessions: [session, ...get().aiChatSessions], aiChatStreaming: false,
        aiWebAccessPrompt: null, aiWebAccessResolveError: '' });
      await select(session.id);
      save(session.id);
    },
    switchAiChatSession: async (id) => {
      if (!get().aiChatReady) await get().ensureAiChatReady();
      set({ aiChatStreaming: false });
      await select(id);
    },
    deleteAiChatSession: async (id) => {
      if (!get().aiChatReady) await get().ensureAiChatReady();
      if (get().aiChatSessions.length <= 1 || deleting.has(id)) return;
      deleting.add(id);
      cancelCheckpoint(id);
      dirty.delete(id);
      try {
        await saving.get(id)?.catch(() => {});
        await aiChatStorage.remove(id);
        if (recovery.delete(id)) writeRecovery();
        revisions.delete(id);
        retained.delete(id);
        const sessions = get().aiChatSessions.filter((session) => session.id !== id);
        set({ aiChatSessions: sessions });
        if (get().activeAiChatSessionId === id) await select(sessions[0].id);
      } catch (error) { set({ aiChatStorageError: true }); throw error; }
      finally { deleting.delete(id); }
    },
    setAiChatStreaming: (streaming) => {
      const previous = get().aiChatStreaming;
      set({ aiChatStreaming: Boolean(streaming) });
      const id = get().activeAiChatSessionId;
      if (previous && !streaming && dirty.has(id) && !retained.has(id)) save(id);
    },
    setAiChatSessionMessages: (id, messages) => {
      const target = get().aiChatSessions.find((session) => session.id === id);
      if (!target || target.messagesLoaded === false || deleting.has(id)) return;
      const updated = { ...target, messages, title: deriveAiChatSessionTitle(messages), messagesLoaded: true };
      set((state) => ({
        aiChatSessions: state.aiChatSessions.map((session) => session.id === id ? updated : session),
        aiChatMessages: state.activeAiChatSessionId === id ? messages : state.aiChatMessages,
      }));
      dirty.add(id);
      revisions.set(id, (revisions.get(id) ?? 0) + 1);
      if (retained.has(id)) checkpoint(id);
      else save(id);
    },
    markAiChatSessionReplyFinished: (id, finishedAt) => {
      const target = get().aiChatSessions.find((session) => session.id === id);
      if (!target || target.messagesLoaded === false || deleting.has(id)) return;
      revisions.set(id, (revisions.get(id) ?? 0) + 1);
      const updatedAt = typeof finishedAt === 'number' && Number.isFinite(finishedAt) ? finishedAt : Date.now();
      set((state) => ({ aiChatSessions: state.aiChatSessions.map((session) => session.id === id ? { ...session, updatedAt } : session) }));
      save(id);
    },
    setAiChatMessageThinkDuration: (messageIndex, thinkIndex, seconds) => {
      const messages = [...get().aiChatMessages];
      const message = messages[messageIndex];
      if (!message) return;
      const durations = [...(message.thinkDurations ?? [])];
      if (durations[thinkIndex] === seconds) return;
      durations[thinkIndex] = seconds;
      messages[messageIndex] = { ...message, thinkDurations: durations };
      get().setAiChatSessionMessages(get().activeAiChatSessionId, messages);
    },
    clearAiChatMessages: () => {
      const id = get().activeAiChatSessionId;
      if (retained.has(id)) return;
      get().setAiChatSessionMessages(id, []);
      get().markAiChatSessionReplyFinished(id);
      set({ aiChatStreaming: false, aiWebAccessPrompt: null, aiWebAccessResolveError: '' });
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
