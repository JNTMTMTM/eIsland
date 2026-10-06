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
 * @file aiSliceRuntime.test.ts
 * @description 真实 Zustand AI 切片的持久化归一化、会话切换、流式更新、工具/待办记录及授权边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createAiSlice } from '../aiSlice';
import installStorage from './sliceStorageFixture';
import type { AiSlice, AiChatMessage, AiWebAccessPrompt } from '../../types';
let storage: ReturnType<typeof installStorage>;
const keys = {
  config: 'eIsland_aiConfig',
  messages: 'eIsland_aiChatMessages',
  sessions: 'eIsland_aiChatSessions',
  active: 'eIsland_aiActiveChatSessionId'
};
/** 写入真实 JSON 存储载荷。
 * @param key - 存储键
 * @param value - 外部载荷
 */
function persist(key: string, value: unknown): void {
  storage.values.set(key, JSON.stringify(value));
}
/** 创建真实 Zustand store 并执行目标切片。
 * @returns Zustand 状态 API
 */
function store() {
  return createStore<AiSlice>()(createAiSlice);
}
/** 创建两个有效持久化会话。 */
function sessions(): void {
  persist(keys.sessions, [{
    id: 'a',
    title: 'A',
    updatedAt: 1,
    messages: [{
      role: 'user',
      content: 'First'
    }]
  }, {
    id: 'b',
    title: 'B',
    updatedAt: 2,
    messages: [{
      role: 'assistant',
      content: 'Second'
    }]
  }]);
  storage.values.set(keys.active, 'a');
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-02T03:04:05Z'));
  storage = installStorage();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('AI slice configuration and hydration', () => {
  it('uses defaults with missing storage and without a window, and handles malformed and inaccessible JSON', () => {
    expect(store().getState().aiConfig).toMatchObject({
      endpoint: 'https://api.openai.com/v1',
      contextLimit: 200000,
      skills: [],
      workspaces: [],
      sttOrbEnabled: true
    });
    vi.stubGlobal('window', undefined);
    storage.values.set(keys.config, '{');
    storage.values.set(keys.messages, '{');
    storage.values.set(keys.sessions, '{');
    expect(store().getState().aiChatSessions).toHaveLength(1);
    storage.get.mockImplementation(() => {
      throw new Error('storage denied');
    });
    expect(store().getState().aiConfig.apiKey).toBe('');
    expect(store().getState().activeAiChatSessionId).toMatch(/^chat-/);
  });
  it.each([{
    effort: 'low',
    context: 400000
  }, {
    effort: 'high',
    context: 1000000
  }, {
    effort: 'medium',
    context: 5
  }])('hydrates valid reasoning effort $effort and context limit $context', ({
    effort,
    context
  }) => {
    persist(keys.config, {
      deepseekReasoningEffort: effort,
      contextLimit: context,
      r1pxcAvatar: ' data:image/png;base64,abc ',
      workspaces: [' ws ', '', 3],
      skills: [{
        id: 'one',
        name: 'Skill',
        filePath: '/skill'
      }, null, {
        id: 'bad',
        name: 3
      }, {
        id: 'bad',
        name: 'name',
        filePath: 1
      }],
      ollamaModel: ' model ',
      ollamaBaseUrl: ' url ',
      customApiModel: ' custom ',
      customApiMode: 'direct',
      sttOrbEnabled: false,
      orbColorA: '#aAbBcC',
      orbColorB: '#112233'
    });
    expect(store().getState().aiConfig).toMatchObject({
      deepseekReasoningEffort: effort,
      contextLimit: context === 5 ? 200000 : context,
      r1pxcAvatar: 'data:image/png;base64,abc',
      workspaces: [' ws '],
      skills: [{
        id: 'one',
        name: 'Skill',
        filePath: '/skill'
      }],
      ollamaModel: 'model',
      ollamaBaseUrl: 'url',
      customApiModel: 'custom',
      customApiMode: 'direct',
      sttOrbEnabled: false,
      orbColorA: '#aAbBcC',
      orbColorB: '#112233'
    });
  });
  it('drops unsupported optional config types and receives matching storage events only', () => {
    persist(keys.config, {
      r1pxcAvatar: null,
      workspaces: null,
      skills: {},
      ollamaModel: 1,
      ollamaBaseUrl: null,
      customApiModel: false,
      orbColorA: 3,
      orbColorB: 'bad'
    });
    const api = store();
    expect(api.getState().aiConfig).toMatchObject({
      r1pxcAvatar: '',
      workspaces: [],
      skills: [],
      ollamaModel: '',
      ollamaBaseUrl: '',
      customApiModel: '',
      orbColorA: '',
      orbColorB: ''
    });
    persist(keys.config, {
      apiKey: 'external-key'
    });
    storage.listeners[0]({
      key: 'other'
    });
    expect(api.getState().aiConfig.apiKey).toBe('');
    storage.listeners[0]({
      key: keys.config
    });
    expect(api.getState().aiConfig.apiKey).toBe('external-key');
    storage.set.mockImplementation(() => {
      throw new Error('full');
    });
    api.getState().setAiConfig({
      apiKey: 'memory-only'
    });
    expect(api.getState().aiConfig.apiKey).toBe('memory-only');
  });
  it.each([{}, null, [], [null, 4, {}, {
    id: 3
  }, {
    id: ' '
  }]])('recovers invalid session list %j from legacy messages', (payload) => {
    persist(keys.sessions, payload);
    persist(keys.messages, [{
      role: 'assistant',
      content: 'Reply'
    }, {
      role: 'user',
      content: ''
    }, {
      role: 'user',
      content: '<attachment name="x.txt">\nignored\n</attachment>\n hello world '
    }]);
    const state = store().getState();
    expect(state.aiChatSessions).toHaveLength(1);
    expect(state.aiChatMessages).toHaveLength(3);
    expect(state.aiChatSessions[0].title).toBe('hello world');
  });
  it.each([{}, null, false, '{'])('drops invalid legacy messages %j', (payload) => {
    if (payload === '{') storage.values.set(keys.messages, payload);else persist(keys.messages, payload);
    expect(store().getState().aiChatMessages).toEqual([]);
  });
  it('normalizes cached sessions, active selection, explicit title length and fallback title/time', () => {
    persist(keys.sessions, [{
      id: ' a ',
      title: 'x'.repeat(60),
      updatedAt: 8,
      messages: [null, {
        role: 'system'
      }, {
        role: 'user',
        content: ' hello '
      }]
    }, {
      id: 'b',
      title: '',
      updatedAt: 'bad',
      messages: [{
        role: 'user',
        content: 'y'.repeat(30)
      }]
    }, {
      id: 'c',
      messages: null
    }, null]);
    storage.values.set(keys.active, 'b');
    const state = store().getState();
    expect(state.activeAiChatSessionId).toBe('b');
    expect(state.aiChatSessions.map((session) => session.title)).toEqual(['x'.repeat(48), 'y'.repeat(24), '新对话']);
    expect(state.aiChatSessions[1].updatedAt).toBe(Date.now());
    expect(state.aiChatMessages).toEqual([{
      role: 'user',
      content: 'y'.repeat(30)
    }]);
    storage.values.set(keys.active, 'missing');
    expect(store().getState().activeAiChatSessionId).toBe('a');
  });
  it('normalizes tool, todo, attachment, thinking, model and token metadata from external JSON', () => {
    persist(keys.messages, [null, false, 5, {}, {
      role: 'system'
    }, {
      role: 'user',
      content: '',
      thinkBlocks: null,
      thinkDurations: {},
      toolCalls: {},
      todoSnapshots: {},
      attachments: {}
    }, {
      role: 'assistant',
      content: 5,
      thinkBlocks: ['Think', 5],
      thinkDurations: [1, 0, -1, 'bad'],
      toolCalls: [null, 4, {}, {
        tool: 3
      }, {
        tool: 'Read',
        turn: 2,
        requestId: 'request',
        purpose: 'reason',
        riskLevel: 'low',
        durationMs: 3,
        pending: true,
        arguments: {
          path: '/tmp'
        },
        success: true,
        error: 'reason',
        result: {
          value: 1
        },
        authorizationRequired: true,
        webAccessRequestId: 'web',
        webAccessUrl: 'https://site',
        webAccessResolved: true,
        webAccessAllowed: false,
        webAccessResolveError: 'denied'
      }, {
        tool: 'Bare',
        arguments: null
      }],
      todoSnapshots: [null, 3, {}, {
        turn: 2,
        items: [null, 3, {}, {
          id: '',
          content: 'invalid'
        }, {
          id: 'invalid'
        }, {
          id: 'one',
          content: 'Done',
          status: 'completed'
        }, {
          id: 'two',
          content: 'Working',
          status: 'in_progress'
        }, {
          id: 'three',
          content: 'Next',
          status: 'other'
        }]
      }, {
        turn: 'bad',
        items: [{
          id: 'four',
          content: 'Another'
        }]
      }],
      attachments: [null, 3, {}, {
        name: 5,
        size: 1
      }, {
        name: 'bad',
        size: 'bad'
      }, {
        name: 'file',
        size: 42
      }],
      model: ' model ',
      traceId: ' trace ',
      quote: ' quote ',
      finalized: true,
      tokenUsage: {
        inputTokens: 1,
        outputTokens: 2,
        reasoningTokens: 3,
        totalTokens: 6,
        source: 'remote'
      }
    }]);
    const [, message] = store().getState().aiChatMessages;
    expect(message).toMatchObject({
      role: 'assistant',
      content: '',
      thinkBlocks: ['Think'],
      thinkDurations: [1],
      attachments: [{
        name: 'file',
        size: 42
      }],
      model: 'model',
      traceId: 'trace',
      quote: 'quote',
      finalized: true,
      tokenUsage: {
        inputTokens: 1,
        outputTokens: 2,
        reasoningTokens: 3,
        totalTokens: 6,
        source: 'remote'
      }
    });
    expect(message.toolCalls).toHaveLength(2);
    expect(message.toolCalls?.[0]).toMatchObject({
      tool: 'Read',
      arguments: {
        path: '/tmp'
      },
      success: true,
      pending: true,
      webAccessAllowed: false
    });
    expect(message.toolCalls?.[1]).toMatchObject({
      tool: 'Bare',
      turn: 0,
      requestId: '',
      durationMs: 0,
      pending: false,
      arguments: undefined
    });
    expect(message.todoSnapshots?.map((snapshot) => snapshot.turn)).toEqual([2, 0]);
    expect(message.todoSnapshots?.[0].items.map((todo) => todo.status)).toEqual(['completed', 'in_progress', 'pending']);
  });
  it.each([{
    tokenUsage: {
      inputTokens: 1
    }
  }, {
    tokenUsage: {
      outputTokens: 2
    }
  }, {
    tokenUsage: {
      totalTokens: 3
    }
  }, {
    tokenUsage: {
      reasoningTokens: 4
    }
  }, {
    tokenUsage: []
  }, {
    tokenUsage: null
  }, {
    tokenUsage: 'bad'
  }, {
    model: ' ',
    traceId: ' ',
    quote: ' ',
    finalized: false
  }])('handles partial token metadata and absent text %j', (fields) => {
    persist(keys.messages, [{
      role: 'assistant',
      content: 'Reply',
      ...fields
    }]);
    const [message] = store().getState().aiChatMessages;
    expect(message.content).toBe('Reply');
    expect(message.model).toBeUndefined();
    expect(message.traceId).toBeUndefined();
    expect(message.quote).toBeUndefined();
  });
  it('rejects overflow thinking durations, session timestamps and todo turn while keeping valid records', () => {
    storage.values.set(keys.sessions, '[{"id":"a","updatedAt":1e400,"messages":[{"role":"assistant","thinkDurations":[1e400,2],"todoSnapshots":[{"turn":1e400,"items":[{"id":"a","content":"Task"}]}]}]}]');
    const state = store().getState();
    expect(state.aiChatSessions[0].updatedAt).toBe(Date.now());
    expect(state.aiChatMessages[0].thinkDurations).toEqual([2]);
    expect(state.aiChatMessages[0].todoSnapshots?.[0].turn).toBe(0);
  });
});
describe('AI slice session actions and persistence', () => {
  it('uses empty message fallbacks after a public store patch selects an absent active session', () => {
    sessions();
    const api = store();
    api.setState({ activeAiChatSessionId: 'missing' });
    api.getState().deleteAiChatSession('a');
    expect(api.getState().activeAiChatSessionId).toBe('missing');
    expect(api.getState().aiChatMessages).toEqual([]);
    expect(storage.set).toHaveBeenCalledWith(keys.messages, '[]');
    api.setState({ aiChatSessions: [] });
    api.getState().setAiChatSessionMessages('missing', []);
    expect(api.getState().aiChatSessions).toEqual([]);
    expect(storage.set).toHaveBeenCalledWith(keys.messages, '[]');
  });
  it('creates, switches, deletes sessions and resets streaming/authorization state', () => {
    sessions();
    const api = store();
    api.getState().setAiChatStreaming(true);
    api.getState().setAiWebAccessResolveError('denied');
    api.getState().createNewAiChatSession();
    const newId = api.getState().activeAiChatSessionId;
    expect(api.getState().aiChatSessions).toHaveLength(3);
    expect(api.getState().aiChatMessages).toEqual([]);
    expect(api.getState().aiChatStreaming).toBe(false);
    expect(api.getState().aiWebAccessResolveError).toBe('');
    api.getState().switchAiChatSession('missing');
    expect(api.getState().activeAiChatSessionId).toBe(newId);
    api.getState().switchAiChatSession('b');
    expect(api.getState().aiChatMessages).toEqual([{
      role: 'assistant',
      content: 'Second'
    }]);
    api.getState().deleteAiChatSession('a');
    expect(api.getState().activeAiChatSessionId).toBe('b');
    api.getState().deleteAiChatSession('b');
    expect(api.getState().activeAiChatSessionId).toBe(newId);
    api.getState().deleteAiChatSession(newId);
    expect(api.getState().aiChatSessions).toHaveLength(1);
  });
  it('preserves non-active message array while updating other sessions and defers active streaming persistence', () => {
    sessions();
    const api = store();
    const messages: AiChatMessage[] = [{
      role: 'user',
      content: 'New title'
    }];
    storage.set.mockClear();
    api.getState().setAiChatStreaming(false);
    expect(storage.set).not.toHaveBeenCalled();
    api.getState().setAiChatStreaming(true);
    api.getState().setAiChatMessages(messages);
    expect(storage.set).not.toHaveBeenCalled();
    expect(api.getState().aiChatSessions[0].title).toBe('New title');
    api.getState().setAiChatSessionMessages('b', [{
      role: 'assistant',
      content: 'Other reply'
    }]);
    expect(api.getState().aiChatMessages).toEqual(messages);
    expect(storage.set).toHaveBeenCalledWith(keys.sessions, expect.any(String));
    storage.set.mockClear();
    api.getState().setAiChatStreaming(false);
    expect(storage.set).toHaveBeenCalledWith(keys.messages, JSON.stringify(messages));
    api.getState().setAiChatStreaming(false);
    api.getState().setAiChatSessionMessages('missing', []);
    expect(api.getState().aiChatSessions).toHaveLength(2);
  });
  it('marks finish timestamps, updates thinking duration and clears only the active session', () => {
    sessions();
    const api = store();
    api.getState().markAiChatSessionReplyFinished('a', 99);
    expect(api.getState().aiChatSessions[0].updatedAt).toBe(99);
    api.getState().markAiChatSessionReplyFinished('b', Number.NaN);
    expect(api.getState().aiChatSessions[1].updatedAt).toBe(Date.now());
    api.getState().markAiChatSessionReplyFinished('missing');
    api.getState().setAiChatMessageThinkDuration(5, 0, 1);
    api.getState().setAiChatMessageThinkDuration(0, 0, 3);
    expect(api.getState().aiChatMessages[0].thinkDurations).toEqual([3]);
    const saved = storage.set.mock.calls.length;
    api.getState().setAiChatMessageThinkDuration(0, 0, 3);
    expect(storage.set).toHaveBeenCalledTimes(saved);
    api.getState().setAiChatMessageThinkDuration(0, 1, 4);
    expect(api.getState().aiChatSessions[0].messages[0].thinkDurations).toEqual([3, 4]);
    api.getState().setAiChatStreaming(true);
    api.getState().clearAiChatMessages();
    expect(api.getState().aiChatSessions[0]).toMatchObject({
      title: '新对话',
      updatedAt: Date.now(),
      messages: []
    });
    expect(api.getState().aiChatSessions[1].messages).toEqual([{
      role: 'assistant',
      content: 'Second'
    }]);
    expect(api.getState().aiChatStreaming).toBe(false);
  });
  it('keeps session state when persistence fails and warns for session/message write boundaries', () => {
    sessions();
    const api = store();
    storage.set.mockImplementation((key, value) => {
      if (key === keys.messages) throw new Error('message full');
      storage.values.set(key, value);
    });
    api.getState().setAiChatMessages([{
      role: 'user',
      content: 'Persist failure'
    }]);
    expect(console.warn).toHaveBeenCalledWith('[aiSlice] saveAiChatMessages failed', expect.any(Error));
    storage.set.mockImplementation(() => {
      throw new Error('session full');
    });
    api.getState().createNewAiChatSession();
    expect(api.getState().aiChatSessions).toHaveLength(3);
    expect(console.warn).toHaveBeenCalledWith('[aiSlice] saveAiChatSessions failed', expect.any(Error));
  });
  it('retains duplicate-id external sessions when removing them would leave no sessions', () => {
    persist(keys.sessions, [{
      id: 'a',
      messages: []
    }, {
      id: 'a',
      messages: []
    }]);
    const api = store();
    api.getState().deleteAiChatSession('a');
    expect(api.getState().aiChatSessions).toHaveLength(2);
  });
  it.each(['allow', 'deny', 'ask'] as const)('normalizes web access prompt policy %s and resets it explicitly', (domainPolicy) => {
    const api = store();
    api.getState().setAiWebAccessPrompt({
      domainPolicy,
      sessionId: ' a ',
      requestId: ' r ',
      url: ' https://site ',
      message: 'body',
      hostname: ' site ',
      siteName: ' Site ',
      iconUrl: ' https://icon '
    });
    expect(api.getState().aiWebAccessPrompt).toEqual({
      domainPolicy,
      sessionId: 'a',
      requestId: 'r',
      url: 'https://site',
      message: 'body',
      hostname: 'site',
      siteName: 'Site',
      iconUrl: 'https://icon'
    });
    api.getState().setAiWebAccessPrompt(null);
    expect(api.getState().aiWebAccessPrompt).toBeNull();
    api.getState().setAiWebAccessResolveError('failed');
    expect(api.getState().aiWebAccessResolveError).toBe('failed');
  });
  it('rejects incomplete and malformed external web-access requests', () => {
    const api = store();
    const malformed = {
      sessionId: 1,
      requestId: 'r',
      url: 'https://site',
      hostname: null,
      siteName: 3,
      iconUrl: false,
      message: 3,
      domainPolicy: 'unknown'
    };
    api.getState().setAiWebAccessPrompt(malformed as unknown as AiWebAccessPrompt);
    expect(api.getState().aiWebAccessPrompt).toEqual({
      sessionId: '',
      requestId: 'r',
      url: 'https://site',
      hostname: '',
      siteName: '',
      iconUrl: '',
      message: '',
      domainPolicy: 'ask'
    });
    Reflect.apply(api.getState().setAiWebAccessPrompt, undefined, [{
      requestId: 3,
      url: null
    }]);
    expect(api.getState().aiWebAccessPrompt).toBeNull();
    Reflect.apply(api.getState().setAiWebAccessPrompt, undefined, [{
      requestId: 'r',
      url: ' '
    }]);
    Reflect.apply(api.getState().setAiWebAccessResolveError, undefined, [null]);
    expect(api.getState().aiWebAccessResolveError).toBe('');
  });
});
