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
import type { AiSlice, AiConfig, AiChatMessage, AiWebAccessPrompt } from '../types';

const AI_CONFIG_KEY = 'eIsland_aiConfig';
const AI_CHAT_MESSAGES_KEY = 'eIsland_aiChatMessages';

/** 从 localStorage 读取已保存的 AI 配置 */
function loadAiConfig(): AiConfig {
  const defaults: AiConfig = {
    apiKey: '',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    mcpEndpoint: '',
    systemPrompt: '你是一个有用的助手。',
    deepseekThinking: false,
    deepseekReasoningEffort: 'medium',
  };
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AiConfig>;
      const merged = { ...defaults, ...parsed };
      const effort = merged.deepseekReasoningEffort;
      merged.deepseekReasoningEffort = effort === 'low' || effort === 'high' ? effort : 'medium';
      merged.deepseekThinking = Boolean(merged.deepseekThinking);
      return merged;
    }
  } catch { /* ignore */ }
  return defaults;
}

/** 保存 AI 配置到 localStorage */
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
  return normalized;
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
  const riskLevel = typeof source.riskLevel === 'string' ? source.riskLevel : '';
  const durationMs = typeof source.durationMs === 'number' ? source.durationMs : 0;
  const pending = typeof source.pending === 'boolean' ? source.pending : false;
  const argumentsPayload = typeof source.arguments === 'object' && source.arguments != null
    ? source.arguments as Record<string, unknown>
    : undefined;
  const success = typeof source.success === 'boolean' ? source.success : undefined;
  const error = typeof source.error === 'string' ? source.error : '';
  const normalized = {
    turn,
    tool,
    requestId,
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
  return normalized;
}

function saveAiChatMessages(messages: AiChatMessage[]): void {
  try {
    localStorage.setItem(AI_CHAT_MESSAGES_KEY, JSON.stringify(messages));
  } catch { /* ignore */ }
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
> = (set, get) => ({
  aiConfig: loadAiConfig(),
  aiChatMessages: loadAiChatMessages(),
  aiChatStreaming: false,
  aiWebAccessPrompt: null,
  aiWebAccessResolveError: '',

  setAiConfig: (partial) => {
    const next = { ...get().aiConfig, ...partial };
    saveAiConfig(next);
    set({ aiConfig: next });
  },

  setAiChatMessages: (messages) => {
    saveAiChatMessages(messages);
    set({ aiChatMessages: messages });
  },

  setAiChatStreaming: (streaming) => {
    set({ aiChatStreaming: Boolean(streaming) });
  },

  clearAiChatMessages: () => {
    saveAiChatMessages([]);
    set({
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
});
