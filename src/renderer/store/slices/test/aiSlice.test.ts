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
 * @file aiSlice.test.ts
 * @description AI 状态切片单元测试。
 * @author 鸡哥
 */

import type { StateCreator } from 'zustand';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installAiChatStorage } from './aiChatStorageFixture';
import { createAiSlice } from '../aiSlice';

type AiState = ReturnType<typeof createAiSlice>;

const AI_CONFIG_KEY = 'eIsland_aiConfig';
const AI_CHAT_MESSAGES_KEY = 'eIsland_aiChatMessages';

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => (storage.has(key) ? storage.get(key)! : null)),
  setItem: vi.fn((key: string, value: string) => {
    storage.set(key, String(value));
  }),
  removeItem: vi.fn((key: string) => {
    storage.delete(key);
  }),
  clear: vi.fn(() => {
    storage.clear();
  }),
};

function createSliceState(creator: StateCreator<AiState, [], [], AiState>): { getState: () => AiState } {
  let state = {} as AiState;
  const setState = (updater: Partial<AiState> | ((prev: AiState) => Partial<AiState>)) => {
    const patch = typeof updater === 'function' ? updater(state) : updater;
    state = { ...state, ...patch };
  };
  state = creator(setState as never, (() => state) as never, {} as never);
  return { getState: () => state };
}

describe('createAiSlice', () => {
  beforeEach(() => {
    storage.clear();
    installAiChatStorage();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();

    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, 'window', {
      value: {
        addEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });
  });

  it('normalizes aiConfig from localStorage payload', () => {
    storage.set(AI_CONFIG_KEY, JSON.stringify({
      deepseekReasoningEffort: 'invalid',
      deepseekThinking: 1,
      contextLimit: 123,
      r1pxcAvatar: 'not-data-image',
      workspaces: ['ws-a', '', 1],
      skills: [
        { id: 's1', name: 'Skill 1', filePath: '/tmp/skill.ts' },
        { id: 1, name: 'Skill 2', filePath: '/tmp/skill-2.ts' },
      ],
      customApiMode: 'unknown',
      ollamaModel: ' llama3 ',
    }));

    const store = createSliceState(createAiSlice);
    const config = store.getState().aiConfig;

    expect(config.deepseekReasoningEffort).toBe('medium');
    expect(config.deepseekThinking).toBe(true);
    expect(config.contextLimit).toBe(200000);
    expect(config.r1pxcAvatar).toBe('');
    expect(config.workspaces).toEqual(['ws-a']);
    expect(config.skills).toEqual([{ id: 's1', name: 'Skill 1', filePath: '/tmp/skill.ts' }]);
    expect(config.customApiMode).toBe('relay');
    expect(config.ollamaModel).toBe('llama3');
  });

  it('bootstraps a session from legacy messages when sessions are absent', async () => {
    storage.set(AI_CHAT_MESSAGES_KEY, JSON.stringify([
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: '<attachment name="a.txt">\nabc\n</attachment>\n 你好  世界 ' },
    ]));

    const store = createSliceState(createAiSlice);
    await store.getState().ensureAiChatReady();
    const state = store.getState();

    expect(state.aiChatSessions.length).toBe(1);
    expect(state.activeAiChatSessionId).toBe(state.aiChatSessions[0].id);
    expect(state.aiChatMessages).toEqual(state.aiChatSessions[0].messages);
    expect(state.aiChatSessions[0].title).toBe('你好 世界');
  });

  it('normalizes ai web access prompt payload and filters invalid values', () => {
    const store = createSliceState(createAiSlice);

    store.getState().setAiWebAccessPrompt({
      sessionId: ' s-1 ',
      requestId: ' req-1 ',
      url: ' https://example.com ',
      hostname: ' example.com ',
      siteName: ' Example ',
      iconUrl: ' https://example.com/favicon.ico ',
      domainPolicy: 'invalid' as never,
      message: 'msg',
    });

    expect(store.getState().aiWebAccessPrompt).toEqual({
      sessionId: 's-1',
      requestId: 'req-1',
      url: 'https://example.com',
      hostname: 'example.com',
      siteName: 'Example',
      iconUrl: 'https://example.com/favicon.ico',
      domainPolicy: 'ask',
      message: 'msg',
    });

    store.getState().setAiWebAccessPrompt({
      sessionId: 's-2',
      requestId: ' ',
      url: ' ',
      message: '',
      hostname: '',
      siteName: '',
      iconUrl: '',
      domainPolicy: 'allow',
    });

    expect(store.getState().aiWebAccessPrompt).toBeNull();
  });
});
