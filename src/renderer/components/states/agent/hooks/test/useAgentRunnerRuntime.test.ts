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
 * @file useAgentRunnerRuntime.test.ts
 * @description 真实内联Agent编排、路由、事件、会话持久化与取消边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef, useState } from 'react';
import { createStore } from 'zustand/vanilla';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import { createAiSlice } from '../../../../../store/slices/aiSlice';
import type { AiConfig, AiSlice } from '../../../../../store/types';
import type { AuthPending } from '../../types/AuthPending';
import type { AgentPhase } from '../../config/agentContentConfig';
import type { MihtnelisAgentStreamEvent } from '../../../../../api/ai/types';
const leaves = vi.hoisted(() => ({
  cloud: vi.fn<typeof import('../../../../../api/ai/mihtnelisAgentStream').streamMihtnelisAgent>(),
  ollama: vi.fn<typeof import('../../../../../api/ai/ollamaLocalAgent').streamOllamaLocalAgent>(),
  direct: vi.fn<typeof import('../../../../../api/ai/customDirectAgent').streamCustomDirectAgent>(),
  result: vi.fn<typeof import('../../../../../api/ai/mihtnelisAgentStream').resolveMihtnelisLocalToolResult>(),
  readText: vi.fn<(path: string) => Promise<string | null>>(),
  execute: vi.fn<(request: unknown) => Promise<unknown>>()
}));
vi.mock('../../../../../api/ai/mihtnelisAgentStream', () => ({
  streamMihtnelisAgent: leaves.cloud,
  resolveMihtnelisLocalToolResult: leaves.result
}));
vi.mock('../../../../../api/ai/ollamaLocalAgent', () => ({
  streamOllamaLocalAgent: leaves.ollama
}));
vi.mock('../../../../../api/ai/customDirectAgent', () => ({
  streamCustomDirectAgent: leaves.direct
}));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
let store: ReturnType<ReturnType<typeof createStore<AiSlice>>>;
let module: typeof import('../useAgentRunner');
let prompt: string;
let storage: Map<string, string>;
const api = {
  storeRead: vi.fn<(key: string) => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<boolean>>(),
  readTextFile: leaves.readText,
  executeAgentLocalTool: leaves.execute
};
interface EventRequest {
  onEvent?: (event: MihtnelisAgentStreamEvent) => void;
  signal?: AbortSignal;
}
/** 创建真实父组件状态，调用真实编排 Hook。
 * @returns 实际状态及公共refs
 */
function run() {
  return renderHook(() => {
    const [phase, setPhase] = useState<AgentPhase>('connecting');
    const [thinkText, setThinkText] = useState('');
    const [answerText, setAnswerText] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [authPending, setAuthPending] = useState<AuthPending | null>(null);
    const [toolCallInfo, setToolCallInfo] = useState<{
      tool: string;
      purpose: string;
    } | null>(null);
    const answerAccRef = useRef('');
    const thinkAccRef = useRef('');
    const traceIdRef = useRef('');
    const tokenRef = useRef('');
    module.useAgentRunner({
      setPhase,
      setThinkText,
      setAnswerText,
      setErrorMsg,
      setAuthPending,
      setToolCallInfo,
      answerAccRef,
      thinkAccRef,
      traceIdRef,
      tokenRef,
      agentPrompt: prompt,
      aiConfig: store.getState().aiConfig
    });
    return {
      phase,
      thinkText,
      answerText,
      errorMsg,
      authPending,
      toolCallInfo,
      answerAccRef,
      thinkAccRef,
      traceIdRef,
      tokenRef
    };
  });
}
/** 启动真实Effect并完成异步请求。
 * @returns 实际展示状态
 */
async function mount() {
  run();
  flushHookEffects();
  await settleHook();
  return run();
}
/** 设置实际路由配置。
 * @param config - 部分公共配置
 */
function configure(config: Partial<AiConfig>): void {
  store.getState().setAiConfig(config);
}
/** 将API服务器叶事件交给真实处理器。
 * @param req - 原生API请求
 * @param type - 服务器事件类型
 * @param payload - 原生服务器载荷
 */
function emit(req: EventRequest, type: MihtnelisAgentStreamEvent['type'], payload: unknown): void {
  req.onEvent?.({
    type,
    payload
  });
}
/** 为不同transport安装同一叶事件序列。
 * @param driver - API模拟响应
 */
function drive(driver: (request: EventRequest) => Promise<void>): void {
  leaves.cloud.mockImplementation(driver);
  leaves.ollama.mockImplementation(driver);
  leaves.direct.mockImplementation(driver);
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  storage = new Map([['user-account-token', `header.${  btoa(JSON.stringify({
    role: 'pro'
  }))  }.signature`]]);
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  };
  api.storeRead.mockResolvedValue(null);
  api.storeWrite.mockResolvedValue(true);
  leaves.readText.mockResolvedValue('skill');
  leaves.execute.mockResolvedValue({
    success: true,
    result: {
      content: 'local'
    },
    error: '',
    durationMs: 2
  });
  leaves.result.mockResolvedValue(undefined);
  leaves.cloud.mockResolvedValue(undefined);
  leaves.ollama.mockResolvedValue(undefined);
  leaves.direct.mockResolvedValue(undefined);
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    localStorage,
    api
  }));
  store = createStore<AiSlice>()(createAiSlice);
  vi.doMock('../../../../../store/isLandStore', () => ({
    default: {
      getState: store.getState
    }
  }));
  await import('../../../maxExpand/components/agent/utils/chatHelpers');
  module = await import('../useAgentRunner');
  prompt = ' hello ';
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('useAgentRunner real state and helpers', () => {
  it.each(['missing-token', 'empty-prompt'] as const)('%s produces a real preflight error without stream', async (kind) => {
    if (kind === 'missing-token') storage.delete('user-account-token');else prompt = ' ';
    const state = await mount();
    expect(state.phase).toBe('error');
    expect(state.errorMsg).toBe(kind === 'missing-token' ? '请先登录' : '没有输入内容');
    expect(leaves.cloud).not.toHaveBeenCalled();
  });
  it.each(['ollama', 'direct', 'relay', 'cloud'] as const)('%s route calls real preparation, event handler and persisted transcript', async (kind) => {
    const models = {
      ollama: 'ollama',
      direct: 'custom-api',
      relay: 'custom-api',
      cloud: 'deepseek-v4-flash'
    };
    configure({
      model: models[kind],
      apiKey: 'key',
      endpoint: 'https://example.invalid/v1',
      customApiMode: kind === 'relay' ? 'relay' : 'direct',
      customApiModel: ' custom '
    });
    drive(async (request) => {
      emit(request, 'think', {
        text: 'thinking'
      });
      emit(request, 'chunk', {
        text: 'answer'
      });
      emit(request, 'final', {
        traceId: ' trace '
      });
      await Promise.resolve();
    });
    const state = await mount();
    expect(state).toMatchObject({
      phase: 'done',
      answerText: 'answer',
      thinkText: 'thinking',
      errorMsg: ''
    });
    expect(store.getState().aiChatMessages).toEqual([expect.objectContaining({
      role: 'user',
      content: 'hello'
    }), expect.objectContaining({
      role: 'assistant',
      content: 'answer',
      thinkBlocks: ['thinking'],
      traceId: 'trace',
      finalized: true
    })]);
    const calls = {
      ollama: leaves.ollama,
      direct: leaves.direct,
      relay: leaves.cloud,
      cloud: leaves.cloud
    };
    expect(calls[kind]).toHaveBeenCalledOnce();
    expect(calls[kind].mock.calls[0]?.[0].message).toContain('hello');
  });
  it.each(['low', 'medium', 'high'] as const)('ollama/direct %s temperature and optional model/context/base select defaults', async (effort) => {
    configure({
      model: 'ollama',
      deepseekReasoningEffort: effort,
      ollamaModel: '',
      ollamaBaseUrl: ''
    });
    await mount();
    expect(leaves.ollama.mock.calls[0]?.[0]).toMatchObject({
      model: 'qwen3:8b',
      temperature: {
        low: 0.3,
        medium: 0.6,
        high: 1
      }[effort]
    });
    unmountHook();
    resetHook();
    configure({
      model: 'custom-api',
      apiKey: 'key',
      endpoint: 'endpoint',
      customApiMode: 'direct',
      customApiModel: ''
    });
    await mount();
    expect(leaves.direct.mock.calls[0]?.[0]).toMatchObject({
      model: 'gpt-4o-mini',
      temperature: {
        low: 0.3,
        medium: 0.6,
        high: 1
      }[effort]
    });
  });
  it('relay defaults custom model and actual empty public session state falls back to inline identifier', async () => {
    configure({
      model: 'custom-api',
      apiKey: 'key',
      endpoint: 'endpoint',
      customApiMode: 'relay',
      customApiModel: ''
    });
    store.setState({
      activeAiChatSessionId: '',
      aiChatSessions: []
    });
    await mount();
    expect(leaves.cloud.mock.calls[0]?.[0]).toMatchObject({
      model: 'gpt-4o-mini',
      sessionId: 'island-agent-inline'
    });
  });
  it.each([new Error('API failure'), 'unknown'])('stream rejects %j and ends in real error phase', async (cause) => {
    leaves.cloud.mockRejectedValue(cause);
    const state = await mount();
    expect(state).toMatchObject({
      phase: 'error',
      errorMsg: cause instanceof Error ? cause.message : '请求失败'
    });
  });
  it('server error remains error through successful stream completion without assistant answer', async () => {
    leaves.cloud.mockImplementation(async (request) => {
      emit(request, 'error', {
        message: 'server failure'
      });
      await Promise.resolve();
    });
    expect(await mount()).toMatchObject({
      phase: 'error',
      errorMsg: 'server failure'
    });
    expect(store.getState().aiChatMessages).toEqual([]);
  });
  it.each(['resolve', 'reject'] as const)('late stream %s after unmount never updates state/persistence', async (mode) => {
    const pending = deferred<void>();
    let request: EventRequest | undefined;
    leaves.cloud.mockImplementation((req) => {
      request = req;
      return pending.promise;
    });
    await mount();
    unmountHook();
    expect(request?.signal?.aborted).toBe(true);
    if (request) {emit(request, 'chunk', {
      text: 'stale'
    });}
    if (mode === 'resolve') pending.resolve();else pending.reject(new Error('late'));
    await settleHook();
    expect(store.getState().aiChatMessages).toEqual([]);
  });
  it('session replaced during stream persists public active-session state and absent metadata fallback', async () => {
    leaves.cloud.mockImplementation(async (request) => {
      store.setState({
        activeAiChatSessionId: 'missing',
        aiChatSessions: []
      });
      emit(request, 'chunk', {
        text: 'answer without thinking'
      });
      await Promise.resolve();
    });
    await mount();
    expect(store.getState().aiChatSessions).toEqual([]);
  });
  it('actual context/skill resolution filters blank, missing and disabled native files', async () => {
    store.getState().setAiChatMessages([{
      role: 'user',
      content: 'old'
    }]);
    configure({
      model: 'ollama',
      ollamaModel: 'explicit',
      ollamaBaseUrl: 'http://localhost:11434',
      skills: [{
        id: '1',
        name: 'yes',
        filePath: 'yes',
        enabled: true
      }, {
        id: '2',
        name: 'blank',
        filePath: 'blank',
        enabled: true
      }, {
        id: '3',
        name: 'null',
        filePath: 'null',
        enabled: true
      }, {
        id: '4',
        name: 'off',
        filePath: 'off',
        enabled: false
      }]
    });
    leaves.readText.mockImplementation((path) => {
      if (path === 'null') return Promise.resolve(null);
      return Promise.resolve(path === 'blank' ? ' ' : 'content');
    });
    await mount();
    expect(leaves.ollama.mock.calls[0]?.[0]).toMatchObject({
      model: 'explicit',
      baseUrl: 'http://localhost:11434',
      context: 'user: old',
      skills: [{
        name: 'yes',
        content: 'content'
      }]
    });
    expect(leaves.readText).toHaveBeenCalledTimes(3);
  });
  it.each(['user', 'admin', 'pro'] as const)('actual JWT role %s constrains premium model routing', async (role) => {
    storage.set('user-account-token', `header.${  btoa(JSON.stringify({
      role
    }))  }.signature`);
    configure({
      model: 'deepseek-v4-pro'
    });
    await mount();
    expect(leaves.cloud.mock.calls[0]?.[0].model).toBe(role === 'user' ? 'deepseek-v4-flash' : 'deepseek-v4-pro');
  });
});
it.each([new Error('skill read failed'), 'unknown'])('preparation IPC rejection %j enters error without starting stream', async (cause) => {
  configure({
    skills: [{
      id: 'skill',
      name: 'skill',
      filePath: '/virtual-skill',
      enabled: true
    }]
  });
  leaves.readText.mockRejectedValue(cause);
  const state = await mount();
  expect(state).toMatchObject({
    phase: 'error',
    errorMsg: cause instanceof Error ? cause.message : '请求失败'
  });
  expect(leaves.cloud).not.toHaveBeenCalled();
});
it('late preparation IPC rejection after unmount is consumed without state or request update', async () => {
  const pending = deferred<string | null>();
  configure({
    skills: [{
      id: 'skill',
      name: 'skill',
      filePath: '/virtual',
      enabled: true
    }]
  });
  leaves.readText.mockReturnValue(pending.promise);
  await mount();
  unmountHook();
  pending.reject(new Error('late skill'));
  await settleHook();
  expect(run()).toMatchObject({
    phase: 'connecting',
    errorMsg: ''
  });
  expect(leaves.cloud).not.toHaveBeenCalled();
});
it('native malformed tool request id and web URL are ignored without authorization', async () => {
  leaves.cloud.mockImplementation(async (request) => {
    emit(request, 'tool_call_request', {
      requestId: 3,
      tool: 'file.read'
    });
    emit(request, 'web_access_request', {
      requestId: 'web',
      url: 7
    });
    emit(request, 'chunk', {
      text: 'done'
    });
    await Promise.resolve();
  });
  const state = await mount();
  expect(state.authPending).toBeNull();
  expect(state.answerText).toBe('done');
  expect(leaves.execute).not.toHaveBeenCalled();
});
it('native westward timezone is included in real cloud request', async () => {
  vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(120);
  await mount();
  expect(leaves.cloud.mock.calls[0]?.[0].timestamp).toMatch(/-02:00$/);
});
