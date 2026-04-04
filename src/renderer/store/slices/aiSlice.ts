/**
 * @file aiSlice.ts
 * @description AI 配置相关逻辑，支持 localStorage 持久化
 * @author 鸡哥
 */

import type { StateCreator } from 'zustand';
import type { AiSlice, AiConfig, AiChatMessage } from '../types';

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
  };
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
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
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content } as AiChatMessage));
  } catch {
    return [];
  }
}

function saveAiChatMessages(messages: AiChatMessage[]): void {
  try {
    localStorage.setItem(AI_CHAT_MESSAGES_KEY, JSON.stringify(messages));
  } catch { /* ignore */ }
}

export const createAiSlice: StateCreator<
  AiSlice,
  [],
  [],
  AiSlice
> = (set, get) => ({
  aiConfig: loadAiConfig(),
  aiChatMessages: loadAiChatMessages(),

  setAiConfig: (partial) => {
    const next = { ...get().aiConfig, ...partial };
    saveAiConfig(next);
    set({ aiConfig: next });
  },

  setAiChatMessages: (messages) => {
    saveAiChatMessages(messages);
    set({ aiChatMessages: messages });
  },

  clearAiChatMessages: () => {
    saveAiChatMessages([]);
    set({ aiChatMessages: [] });
  },
});
