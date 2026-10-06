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
 * @file useChatSendStreams.test.ts
 * @description 三种 Agent 真实发送生命周期、事件回调、消息归并和失败边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { installChatRuntime, roleToken } from './chatRuntimeFixture';
import type { AiChatMessage, AiConfig } from '../../../../../../../store/types';
import type { MihtnelisAgentStreamEvent } from '../../../../../../../api/ai/types';
const leaves = vi.hoisted(() => ({
  cloud: vi.fn<typeof import('../../../../../../../api/ai/mihtnelisAgentStream').streamMihtnelisAgent>(),
  ollama: vi.fn<typeof import('../../../../../../../api/ai/ollamaLocalAgent').streamOllamaLocalAgent>(),
  direct: vi.fn<typeof import('../../../../../../../api/ai/customDirectAgent').streamCustomDirectAgent>(),
  web: vi.fn<typeof import('../../../../../../../api/ai/mihtnelisAgentStream').resolveMihtnelisWebAccess>(),
  access: vi.fn<typeof import('../../../../../../../api/ai/mihtnelisAgentStream').resolveMihtnelisLocalToolAccess>(),
  result: vi.fn<typeof import('../../../../../../../api/ai/mihtnelisAgentStream').resolveMihtnelisLocalToolResult>(),
  readText: vi.fn<(path: string) => Promise<string | null>>(),
  execute: vi.fn<(request: unknown) => Promise<unknown>>(),
  title: vi.fn<(url: string, timeout?: number) => Promise<string>>()
}));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
vi.mock('../../../../../../../api/ai/mihtnelisAgentStream', () => ({
  streamMihtnelisAgent: leaves.cloud,
  resolveMihtnelisWebAccess: leaves.web,
  resolveMihtnelisLocalToolAccess: leaves.access,
  resolveMihtnelisLocalToolResult: leaves.result
}));
vi.mock('../../../../../../../api/ai/ollamaLocalAgent', () => ({
  streamOllamaLocalAgent: leaves.ollama
}));
vi.mock('../../../../../../../api/ai/customDirectAgent', () => ({
  streamCustomDirectAgent: leaves.direct
}));
vi.mock('../../../../../../../api/site/siteMetaApi', async (original) => ({
  ...(await original<typeof import('../../../../../../../api/site/siteMetaApi')>()),
  fetchWebsiteTitle: leaves.title
}));
let runtime: ReturnType<typeof installChatRuntime>;
let stateModule: typeof import('../useChatState');
let sendModule: typeof import('../useChatSend');
type Provider = 'ollama' | 'direct' | 'cloud';
interface EventRequest {
  onEvent?: (event: MihtnelisAgentStreamEvent) => void;
}
/** 在一个渲染中执行真实聊天状态与发送 Hook。
 * @returns 状态和真实回调
 */
function run() {
  return renderHook(() => {
    const state = stateModule.useChatState();
    return {
      state,
      send: sendModule.useChatSend({
        state
      })
    };
  });
}
/** 设置模型并完成真实挂载。
 * @param provider - API 叶边界
 */
function select(provider: Provider): void {
  runtime.store.getState().setAiConfig({
    model: ({ ollama: 'ollama', direct: 'custom-api', cloud: 'deepseek-v4-flash' })[provider],
    customApiMode: 'direct',
    apiKey: 'key',
    endpoint: 'https://example.invalid/v1',
    deepseekThinking: true
  });
  run();
  flushHookEffects();
  run().state.setInput(' hello ');
}
/** 返回最后真实存储消息。
 * @returns AI 消息
 */
function last() {
  return runtime.store.getState().aiChatMessages.at(-1);
}
/** 对每类流入口安装相同的原生事件驱动。
 * @param driver - 事件驱动
 */
function drive(driver: (request: EventRequest) => Promise<void>): void {
  leaves.ollama.mockImplementation(driver);
  leaves.direct.mockImplementation(driver);
  leaves.cloud.mockImplementation(driver);
}
/** 发出真正到达 Hook 的 API 事件。
 * @param request - API 回调
 * @param type - 类型
 * @param payload - 服务器载荷
 */
function emit(request: EventRequest, type: MihtnelisAgentStreamEvent['type'], payload: unknown): void {
  request.onEvent?.({
    type,
    payload
  });
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  runtime = installChatRuntime();
  runtime.storage.set('user-account-token', roleToken('pro'));
  leaves.cloud.mockResolvedValue(undefined);
  leaves.ollama.mockResolvedValue(undefined);
  leaves.direct.mockResolvedValue(undefined);
  leaves.web.mockResolvedValue(undefined);
  leaves.access.mockResolvedValue(undefined);
  leaves.result.mockResolvedValue(undefined);
  leaves.title.mockResolvedValue('title');
  leaves.execute.mockResolvedValue({
    success: true,
    result: {
      content: 'read'
    },
    durationMs: 1
  });
  leaves.readText.mockResolvedValue('skill content');
  Object.assign(runtime.api, {
    readTextFile: leaves.readText,
    executeAgentLocalTool: leaves.execute
  });
  await import('../../utils/chatHelpers');
  stateModule = await import('../useChatState');
  sendModule = await import('../useChatSend');
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('useChatSend real stream lifecycle', () => {
  it.each(['ollama', 'direct', 'cloud'] as const)('%s tool results without previous calls and tool defaults use real empty metadata', async (provider) => {
    select(provider);
    drive(async (request) => {
      const state = runtime.store.getState();
      const id = state.activeAiChatSessionId;
      state.setAiChatSessionMessages(id, [{
        role: 'assistant',
        content: ''
      }]);
      emit(request, 'tool_call_result', {
        tool: 'missing'
      });
      state.setAiChatSessionMessages(id, [{
        role: 'assistant',
        content: ''
      }]);
      emit(request, 'tool', {
        error: 'leaf failure'
      });
      emit(request, 'tool_call_request', {});
      emit(request, 'tool_call_result', {});
      if (provider === 'direct') {
        emit(request, 'tool_call_request', {
          turn: 3,
          tool: 'matching'
        });
        emit(request, 'tool_call_result', {
          turn: 3,
          tool: 'matching'
        });
      }
      if (provider === 'cloud') {
        const live = JSON.parse('[{"role":"assistant","content":"","toolCalls":[null]}]') as AiChatMessage[];
        state.setAiChatSessionMessages(id, live);
        emit(request, 'tool', {
          tool: 'missing'
        });
      }
      emit(request, 'chunk', {
        text: 'finished'
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    expect(last()?.content).toBe('finished');
  });
  it('public store subscriber deleting the target after user addition keeps captured context without recreating it', async () => {
    select('cloud');
    const targetId = runtime.store.getState().activeAiChatSessionId;
    runtime.store.getState().createNewAiChatSession();
    runtime.store.getState().switchAiChatSession(targetId);
    let removed = false;
    const unsubscribe = runtime.store.subscribe((state) => {
      const session = state.aiChatSessions.find((item) => item.id === targetId);
      if (!removed && session?.messages.at(-1)?.role === 'user') {
        removed = true;
        state.deleteAiChatSession(targetId);
      }
    });
    await run().send.handleSend();
    unsubscribe();
    expect(removed).toBe(true);
    expect(runtime.store.getState().aiChatSessions.some((item) => item.id === targetId)).toBe(false);
    expect(leaves.cloud.mock.calls[0]?.[0].context).toBe('user: hello');
  });
  it('automatic authorization rejection preserves the original textual web message', async () => {
    select('cloud');
    const {
      setWebsiteAuthorizationPolicy
    } = await import('../../../../../../../api/site/siteMetaApi');
    setWebsiteAuthorizationPolicy('https://example.com', 'allow');
    leaves.web.mockRejectedValue(new Error('leaf error'));
    leaves.cloud.mockImplementation(async (request) => {
      emit(request, 'web_access_request', {
        requestId: 'web',
        url: 'https://example.com',
        message: 'original visit reason'
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    await settleHook();
    expect(run().state.aiWebAccessPrompt?.message).toBe('original visit reason');
  });
  it('custom cloud relay empty custom model selects its actual fallback', async () => {
    select('direct');
    runtime.store.getState().setAiConfig({
      customApiMode: 'relay',
      customApiModel: ''
    });
    await run().send.handleSend();
    expect(leaves.cloud.mock.calls[0]?.[0].model).toBe('gpt-4o-mini');
  });
  it.each(['ollama', 'direct', 'cloud'] as const)('%s invalid external events, public runtime metadata and unmatched tool results are guarded', async (provider) => {
    select(provider);
    drive(async (request) => {
      emit(request, 'meta', {
        thinkingEnabled: true
      });
      emit(request, 'think', {
        text: 4
      });
      emit(request, 'think', {
        text: ''
      });
      emit(request, 'tool_call_request', {
        tool: 4
      });
      emit(request, 'tool_call_result', {
        tool: 4
      });
      const state = runtime.store.getState();
      // setAiChatSessionMessages 接受公开实时载荷而不执行持久化归一化，覆盖外部运行时 metadata 空项。
      const live = JSON.parse('[{"role":"assistant","content":"","toolCalls":[null,{"tool":"other","pending":false},{"tool":"same","turn":0,"pending":true}],"thinkBlocks":null}]') as AiChatMessage[];
      state.setAiChatSessionMessages(state.activeAiChatSessionId, live);
      emit(request, 'think', {
        text: 't'
      });
      emit(request, 'tool_call_request', {
        tool: 'same'
      });
      emit(request, 'tool_call_result', {
        tool: 'same',
        success: true,
        error: 3,
        durationMs: 'invalid'
      });
      emit(request, 'tool_call_result', {});
      emit(request, 'tool', {});
      emit(request, 'tool_call_request', {
        tool: 'other',
        turn: 3
      });
      emit(request, 'tool_call_request', {
        tool: 'other',
        turn: 3
      });
      emit(request, 'final', {
        billedInputTokens: 0,
        billedOutputTokens: 0
      });
      emit(request, 'chunk', {
        text: 'done'
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    expect(last()?.content).toBe('done');
  });
  it.each(['ollama', 'direct', 'cloud'] as const)('%s all-blank skills and public nonarray skills both produce no resolved skills', async (provider) => {
    select(provider);
    runtime.store.getState().setAiConfig({
      skills: [{
        id: 'blank',
        name: 'blank',
        filePath: '/blank',
        enabled: true
      }]
    });
    leaves.readText.mockResolvedValue(' ');
    await run().send.handleSend();
    runtime.store.getState().setAiConfig(JSON.parse('{"skills":null}') as Partial<AiConfig>);
    run().state.setInput('again');
    await run().send.handleSend();
    expect(last()?.content).toContain('noModelOutput');
  });
  it.each(['ollama', 'direct'] as const)('%s low temperature, explicit model/base and logout between render/click use captured model safely', async (provider) => {
    select(provider);
    runtime.store.getState().setAiConfig({
      deepseekReasoningEffort: 'low',
      ollamaModel: 'model',
      ollamaBaseUrl: 'http://localhost:11434',
      customApiModel: 'model'
    });
    const {
      send
    } = run();
    runtime.storage.delete('user-account-token');
    await send.handleSend();
    const request = provider === 'ollama' ? leaves.ollama.mock.calls[0]?.[0] : leaves.direct.mock.calls[0]?.[0];
    expect(request).toMatchObject({
      model: 'model',
      temperature: 0.3,
      token: ''
    });
  });
  it.each(['ollama', 'direct', 'cloud'] as const)('%s client thinking switch off ignores think even when server enables it', async (provider) => {
    select(provider);
    runtime.store.getState().setAiConfig({
      deepseekThinking: false
    });
    drive(async (request) => {
      emit(request, 'meta', {
        thinkingEnabled: true
      });
      emit(request, 'think', {
        text: 'ignored'
      });
      emit(request, 'chunk', {
        text: 'answer'
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    expect(last()?.thinkBlocks).toEqual([]);
  });
  it('partner resend aborts old native request, cancels queued UI frame and keeps new request ownership', async () => {
    select('cloud');
    run().state.setAgentMode('r1pxc');
    const pending = deferred<void>();
    let firstSignal: AbortSignal | undefined;
    leaves.cloud.mockImplementationOnce((request) => {
      firstSignal = request.signal;
      return pending.promise;
    });
    const first = run().send.handleSend();
    await settleHook();
    run().state.scheduleAssistantUpdateFlush();
    run().state.setInput('second');
    leaves.cloud.mockImplementationOnce(async (request) => {
      emit(request, 'chunk', {
        text: 'second answer'
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    pending.resolve();
    await first;
    expect(firstSignal?.aborted).toBe(true);
    expect(last()?.content).toBe('second answer');
    expect(vi.getTimerCount()).toBe(0);
    run().state.setInput('third');
    stateModule.SESSION_STREAMING_IDS.add(run().state.activeAiChatSessionId);
    await run().send.handleSend();
  });
  it('deleted target session is never recreated by asynchronous events or final persistence', async () => {
    select('cloud');
    const targetId = runtime.store.getState().activeAiChatSessionId;
    runtime.store.getState().createNewAiChatSession();
    runtime.store.getState().switchAiChatSession(targetId);
    leaves.cloud.mockImplementation(async (request) => {
      runtime.store.getState().deleteAiChatSession(targetId);
      emit(request, 'chunk', {
        text: 'deleted'
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    expect(runtime.store.getState().aiChatSessions.some((session) => session.id === targetId)).toBe(false);
    expect(runtime.store.getState().aiChatMessages).toEqual([]);
  });
  it('error after a nonempty assistant answer appends failure, and pending UI RAF is cancelled in final cleanup', async () => {
    select('cloud');
    leaves.cloud.mockImplementation(async (request) => {
      emit(request, 'chunk', {
        text: 'partial'
      });
      run().state.scheduleAssistantUpdateFlush();
      await Promise.resolve();
      throw new Error('later failure');
    });
    await run().send.handleSend();
    expect(last()?.content).toBe('❌ later failure');
    expect(runtime.store.getState().aiChatMessages.at(-2)?.content).toBe('partial');
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([undefined, {
    city: '',
    regionName: '',
    country: ''
  }, {
    city: 'City',
    regionName: 'Region',
    country: 'Country'
  }])('cloud actual local location %j and westward native timezone become request metadata', async (location) => {
    select('cloud');
    if (location) runtime.storage.set('island_location', JSON.stringify(location));
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(120);
    await run().send.handleSend();
    expect(leaves.cloud.mock.calls[0]?.[0].timestamp).toMatch(/-02:00$/);
    expect(leaves.cloud.mock.calls[0]?.[0].location).toBe(location?.city ? 'City, Region, Country' : undefined);
  });
  it('custom relay keeps cloud credentials and model name instead of the direct transport', async () => {
    select('direct');
    runtime.store.getState().setAiConfig({
      customApiMode: 'relay',
      customApiModel: 'custom'
    });
    await run().send.handleSend();
    expect(leaves.cloud).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'custom',
      model: 'custom',
      customApiKey: 'key',
      customEndpoint: 'https://example.invalid/v1'
    }));
    expect(leaves.direct).not.toHaveBeenCalled();
  });
  it.each(['assistant', 'user', 'empty'] as const)('real HTTP SSE callback handles current public %s session and passes system message', async (mode) => {
    select('cloud');
    runtime.storage.delete('user-account-token');
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => {
      if (mode !== 'assistant') {
        const state = runtime.store.getState();
        state.setAiChatSessionMessages(state.activeAiChatSessionId, mode === 'empty' ? [] : [{
          role: 'user',
          content: 'public update'
        }]);
      }
      return Promise.resolve(new Response('data: {"choices":[{"delta":{"content":"http answer"}}]}\n\ndata: [DONE]\n', {
        status: 200
      }));
    });
    vi.stubGlobal('fetch', fetcher);
    await run().send.handleSend();
    expect(fetcher).toHaveBeenCalledWith('https://example.invalid/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"role":"system"') as unknown
    }));
    if (mode === 'assistant') expect(last()?.content).toBe('http answer');else expect(last()?.content).not.toBe('http answer');
  });
  it.each(['missing', 'replaced'] as const)('late site title does not mutate %s prompt', async (kind) => {
    select('cloud');
    const pending = deferred<string>();
    leaves.title.mockReturnValue(pending.promise);
    leaves.cloud.mockImplementation(async (request) => {
      emit(request, 'web_access_request', {
        requestId: 'web',
        url: 'https://example.com'
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    runtime.store.getState().setAiWebAccessPrompt(kind === 'missing' ? null : {
      requestId: 'other',
      url: 'https://other.example',
      message: ''
    });
    pending.resolve('late title');
    await settleHook();
    expect(run().state.aiWebAccessPrompt?.siteName).not.toBe('late title');
  });
  it.each(['allow', 'deny', 'ask'] as const)('cloud web request obeys real stored %s domain policy', async (policy) => {
    select('cloud');
    const {
      setWebsiteAuthorizationPolicy
    } = await import('../../../../../../../api/site/siteMetaApi');
    setWebsiteAuthorizationPolicy('https://example.com', policy);
    leaves.cloud.mockImplementation(async (request) => {
      emit(request, 'web_access_request', {
        requestId: 'web',
        url: 'https://example.com/page',
        message: 'visit'
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    await settleHook();
    if (policy === 'ask') {
      expect(run().state.aiWebAccessPrompt).toMatchObject({
        requestId: 'web',
        siteName: 'title',
        domainPolicy: 'ask'
      });
      expect(leaves.web).not.toHaveBeenCalled();
    } else {expect(leaves.web).toHaveBeenCalledWith(expect.objectContaining({
      allow: policy === 'allow'
    }));}
  });
  it.each([new Error('web failed'), 'unknown'])('automatic web denial failure %j falls back to ask state', async (error) => {
    select('cloud');
    const {
      setWebsiteAuthorizationPolicy
    } = await import('../../../../../../../api/site/siteMetaApi');
    setWebsiteAuthorizationPolicy('https://example.com', 'deny');
    leaves.web.mockRejectedValue(error);
    leaves.cloud.mockImplementation(async (request) => {
      emit(request, 'web_access_request', {
        requestId: 'web',
        url: 'https://example.com',
        message: 3
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    await settleHook();
    expect(run().state.aiWebAccessPrompt).toMatchObject({
      requestId: 'web',
      domainPolicy: 'ask',
      message: ''
    });
    expect(run().state.aiWebAccessResolveError).toBe(error instanceof Error ? error.message : 'aiChat.messages.unknownError');
  });
  it('cloud malformed requests are ignored, empty/title rejection and resolved/replaced prompts stay consistent', async () => {
    select('cloud');
    leaves.title.mockResolvedValue(' ');
    leaves.cloud.mockImplementation(async (request) => {
      emit(request, 'web_access_request', {});
      emit(request, 'web_access_request', {
        requestId: 'web',
        url: 4
      });
      emit(request, 'web_access_request', {
        requestId: 'web',
        url: 'not a valid url'
      });
      await Promise.resolve();
      emit(request, 'web_access_resolved', {});
      await Promise.resolve();
    });
    await run().send.handleSend();
    await settleHook();
    expect(run().state.aiWebAccessPrompt).toBeNull();
    run().state.setInput('again');
    leaves.title.mockRejectedValue(new Error('title'));
    await run().send.handleSend();
    await settleHook();
    expect(run().state.aiWebAccessPrompt).toBeNull();
  });
  it('cloud local authorization, automatic execution, duplicate and result matching execute real handlers', async () => {
    select('cloud');
    leaves.cloud.mockImplementation(async (request) => {
      emit(request, 'tool_call_request', {
        turn: 1,
        requestId: 'r',
        tool: 'file.read',
        arguments: {
          path: 'virtual'
        }
      });
      emit(request, 'tool_call_request', {
        turn: 1,
        requestId: 'r',
        tool: 'file.read'
      });
      emit(request, 'tool_call_result', {
        turn: 1,
        requestId: 'r',
        tool: 'file.read',
        success: true,
        durationMs: 1
      });
      emit(request, 'tool_call_request', {
        turn: 2,
        requestId: 'danger',
        tool: 'file.delete',
        authorizationRequired: false,
        purpose: 'delete',
        riskLevel: 'high',
        message: 'confirm'
      });
      emit(request, 'tool_call_request', {
        turn: 2,
        requestId: 'danger',
        tool: 'file.delete',
        authorizationRequired: true,
        purpose: 'delete',
        riskLevel: 'high',
        message: 'confirm'
      });
      emit(request, 'tool_call_result', {
        tool: 'unmatched'
      });
      emit(request, 'tool_call_request', {
        tool: 'server.tool'
      });
      emit(request, 'tool_call_request', {});
      emit(request, 'tool', {
        turn: 1,
        tool: 'file.read',
        success: true,
        arguments: {
          new: true
        }
      });
      emit(request, 'tool', {
        tool: 'unmatched',
        success: true
      });
      emit(request, 'tool', {});
      emit(request, 'chunk', {
        text: 'done'
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    await settleHook();
    expect(leaves.execute).toHaveBeenCalled();
    expect(run().state.aiLocalToolAccessPrompt).toMatchObject({
      requestId: 'danger',
      tool: 'file.delete',
      purpose: 'delete',
      message: 'confirm'
    });
    expect(last()?.toolCalls?.filter((c) => c.requestId === 'r')).toHaveLength(1);
    expect(last()?.toolCalls?.some((c) => c.tool === 'unknown')).toBe(true);
  });
  it.each([new Error('submit failed'), 'unknown'])('cloud automatic local result rejection %j produces stream fallback', async (error) => {
    select('cloud');
    leaves.result.mockRejectedValue(error);
    leaves.cloud.mockImplementation(async (request) => {
      emit(request, 'tool_call_request', {
        requestId: 'r',
        tool: 'file.read'
      });
      await settleHook();
    });
    await run().send.handleSend();
    expect(last()?.content).toContain(error instanceof Error ? 'submit failed' : 'localToolSubmitFailed');
  });
  it('cloud todo validates unknown external items and appends snapshots and final trace aliases', async () => {
    select('cloud');
    leaves.cloud.mockImplementation(async (request) => {
      emit(request, 'todo', {
        items: 'invalid'
      });
      emit(request, 'todo', {
        items: [null, 3, {
          content: ''
        }]
      });
      emit(request, 'todo', {
        turn: 2,
        items: [null, {
          id: ' one ',
          content: ' first ',
          status: 'completed'
        }, {
          content: 'next',
          status: 'in_progress'
        }, {
          content: 'pending',
          status: 'wrong'
        }, {
          content: 3
        }]
      });
      emit(request, 'todo', {
        items: [{
          content: 'another'
        }]
      });
      emit(request, 'meta', {});
      emit(request, 'think', {});
      emit(request, 'think', {
        text: 'default-index'
      });
      emit(request, 'chunk', {
        text: 'done'
      });
      emit(request, 'final', {
        traceid: ' alias ',
        billedOutputTokens: 2
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    expect(last()).toMatchObject({
      traceId: 'alias',
      thinkBlocks: ['default-index'],
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 2,
        totalTokens: 2
      },
      todoSnapshots: [{
        turn: 2,
        items: [{
          id: 'one',
          content: 'first',
          status: 'completed'
        }, {
          id: '3',
          content: 'next',
          status: 'in_progress'
        }, {
          id: '4',
          content: 'pending',
          status: 'pending'
        }]
      }, {
        turn: 0,
        items: [{
          id: '1',
          content: 'another',
          status: 'pending'
        }]
      }]
    });
  });
  it.each(['ollama', 'direct', 'cloud'] as const)('%s defensive event updates respect publicly replaced empty/user/assistant session messages', async (provider) => {
    select(provider);
    drive(async (request) => {
      const state = runtime.store.getState();
      const id = state.activeAiChatSessionId;
      const events: MihtnelisAgentStreamEvent[] = [{
        type: 'meta',
        payload: {
          thinkingEnabled: true
        }
      }, {
        type: 'think',
        payload: {
          text: 'thought'
        }
      }, {
        type: provider === 'cloud' ? 'chunk_reset' : 'stream_rollback' as MihtnelisAgentStreamEvent['type'],
        payload: {}
      }, {
        type: 'chunk',
        payload: {
          text: 'chunk'
        }
      }, {
        type: 'tool_call_request',
        payload: {
          tool: 'server.read'
        }
      }, {
        type: 'tool_call_result',
        payload: {
          tool: 'server.read'
        }
      }, {
        type: 'tool',
        payload: {}
      }, {
        type: 'todo',
        payload: {
          items: [{
            content: 'task'
          }]
        }
      }, {
        type: 'final',
        payload: {}
      }];
      state.setAiChatSessionMessages(id, []);
      events.forEach((e) => request.onEvent?.(e));
      state.setAiChatSessionMessages(id, [{
        role: 'user',
        content: 'public update'
      }]);
      events.forEach((e) => request.onEvent?.(e));
      state.setAiChatSessionMessages(id, [{
        role: 'assistant',
        content: ''
      }]);
      events.forEach((e) => request.onEvent?.(e));
      expect(runtime.store.getState().aiChatMessages.at(-1)?.content).toBe('chunk');
      await Promise.resolve();
    });
    await run().send.handleSend();
    expect(last()?.finalized).toBe(true);
  });
  it.each(['ollama', 'direct', 'cloud'] as const)('%s no-output fallback respects a changed session without assistant placeholder', async (provider) => {
    select(provider);
    drive(async () => {
      const state = runtime.store.getState();
      state.setAiChatSessionMessages(state.activeAiChatSessionId, [{
        role: 'user',
        content: 'public update'
      }]);
      await Promise.resolve();
    });
    await run().send.handleSend();
    expect(last()?.content).toBe('public update');
  });
  it('blank and already streaming non-partner input do not create messages', async () => {
    select('cloud');
    run().state.setInput(' ');
    await run().send.handleSend();
    expect(leaves.cloud).not.toHaveBeenCalled();
    run().state.setInput('text');
    stateModule.SESSION_STREAMING_IDS.add(run().state.activeAiChatSessionId);
    await run().send.handleSend();
    expect(leaves.cloud).not.toHaveBeenCalled();
  });
  it('missing credentials and exhausted context append real explanatory messages without stream', async () => {
    select('cloud');
    runtime.storage.delete('user-account-token');
    runtime.store.getState().setAiConfig({
      apiKey: ''
    });
    await run().send.handleSend();
    expect(last()?.content).toContain('missingApiKeyWarn');
    runtime.storage.set('user-account-token', roleToken('pro'));
    runtime.store.getState().setAiChatMessages([{
      role: 'assistant',
      content: 'full',
      tokenUsage: {
        inputTokens: 200000,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 200000,
        source: 'test'
      }
    }]);
    run().state.setInput('next');
    await run().send.handleSend();
    expect(last()?.content).toContain('contextLimitExceeded');
    expect(leaves.cloud).not.toHaveBeenCalled();
  });
  it.each(['ollama', 'direct', 'cloud'] as const)('%s events append thinking/chunks/tool records and final usage in real slice', async (provider) => {
    select(provider);
    drive(async (request) => {
      emit(request, 'meta', {
        thinkingEnabled: true
      });
      emit(request, 'think', {
        index: 0,
        text: 'think'
      });
      emit(request, 'think', {
        index: 0,
        text: ' more'
      });
      emit(request, 'chunk', {
        text: 'old'
      });
      emit(request, provider === 'cloud' ? 'chunk_reset' : 'stream_rollback' as MihtnelisAgentStreamEvent['type'], {});
      emit(request, 'chunk', {
        text: 'answer'
      });
      emit(request, 'tool_call_request', {
        requestId: 'request',
        turn: 1,
        tool: 'server.read',
        purpose: 'read',
        arguments: {
          path: 'x'
        },
        riskLevel: 'read'
      });
      emit(request, 'tool_call_result', {
        requestId: 'request',
        turn: 1,
        tool: 'server.read',
        success: true,
        error: '',
        result: {
          value: 2
        },
        durationMs: 3
      });
      emit(request, 'final', {
        billedInputTokens: 3,
        billedOutputTokens: 2,
        billedReasoningTokens: 1,
        billedTokenTotal: 6,
        tokenSource: 'test',
        traceId: 'trace'
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    expect(last()).toMatchObject({
      content: 'answer',
      finalized: true,
      thinkBlocks: ['think more'],
      tokenUsage: {
        inputTokens: 3,
        outputTokens: 2,
        totalTokens: 6,
        source: 'test'
      }
    });
    expect(last()?.toolCalls?.[0]).toMatchObject({
      pending: false,
      success: true,
      durationMs: 3
    });
    expect(runtime.store.getState().aiChatStreaming).toBe(false);
    expect(stateModule.SESSION_ABORT_CONTROLLERS.size).toBe(0);
  });
  it.each(['ollama', 'direct', 'cloud'] as const)('%s no output/error uses fallback and thinking-disabled/invalid chunks are ignored', async (provider) => {
    select(provider);
    drive(async (request) => {
      emit(request, 'meta', {
        thinkingEnabled: false
      });
      emit(request, 'think', {
        text: 'ignore'
      });
      emit(request, 'chunk', {
        text: 4
      });
      emit(request, 'billing', {});
      await Promise.resolve();
    });
    await run().send.handleSend();
    expect(last()?.content).toContain('noModelOutput');
    run().state.setInput('retry');
    drive(async (request) => {
      emit(request, 'error', {
        message: 'native failure'
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    expect(last()?.content).toBe('❌ native failure');
    run().state.setInput('retry');
    drive(async (request) => {
      emit(request, 'error', {});
      await Promise.resolve();
    });
    await run().send.handleSend();
    expect(last()?.content).toBe('❌ aiChat.messages.agentError');
  });
  it.each(['ollama', 'direct', 'cloud'] as const)('%s resolves enabled skill files with empty/null filtering and actual request defaults', async (provider) => {
    select(provider);
    runtime.store.getState().setAiConfig({
      deepseekReasoningEffort: 'high',
      skills: [{
        id: '1',
        name: 'valid',
        filePath: '/valid',
        enabled: true
      }, {
        id: '2',
        name: 'empty',
        filePath: '/empty',
        enabled: true
      }, {
        id: '3',
        name: 'blank',
        filePath: '/blank',
        enabled: true
      }, {
        id: '4',
        name: 'disabled',
        filePath: '/disabled',
        enabled: false
      }]
    });
    leaves.readText.mockImplementation((p) => { if (p === '/empty') return Promise.resolve(null); return Promise.resolve(p === '/blank' ? ' ' : 'skill'); });
    await run().send.handleSend();
    const request = ({ ollama: leaves.ollama.mock.calls[0]?.[0], direct: leaves.direct.mock.calls[0]?.[0], cloud: leaves.cloud.mock.calls[0]?.[0] })[provider];
    expect(request).toMatchObject({
      skills: [{
        name: 'valid',
        content: 'skill'
      }]
    });
    expect(leaves.readText).toHaveBeenCalledTimes(3);
  });
  it('user attachments, partner quote and system prompt are persisted and JSON final answer is unwrapped', async () => {
    select('cloud');
    const {
      state
    } = run();
    state.setAgentMode('r1pxc');
    state.setPendingQuote('quote');
    state.setPendingAttachments([{
      name: 'a.txt',
      size: 1,
      content: 'attached'
    }]);
    runtime.store.getState().setAiConfig({
      systemPrompt: 'system'
    });
    leaves.cloud.mockImplementation(async (request) => {
      emit(request, 'chunk', {
        text: '{"answer":"clean"}'
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    expect(runtime.store.getState().aiChatMessages.at(-2)).toMatchObject({
      role: 'user',
      attachments: [{
        name: 'a.txt',
        size: 1
      }],
      quote: 'quote'
    });
    expect(runtime.store.getState().aiChatMessages.at(-2)?.content).toContain('<attachment name="a.txt">');
    expect(last()?.content).toBe('clean');
    expect(run().state.pendingAttachments).toEqual([]);
    expect(run().state.pendingQuote).toBeNull();
  });
  it.each(['ollama', 'direct', 'cloud'] as const)('%s stale controller callbacks after user Stop are ignored', async (provider) => {
    select(provider);
    drive(async (request) => {
      run().state.handleStop();
      emit(request, 'chunk', {
        text: 'stale'
      });
      await Promise.resolve();
    });
    await run().send.handleSend();
    expect(last()?.content).not.toContain('stale');
    expect(stateModule.SESSION_STREAMING_IDS.size).toBe(0);
  });
  it.each([new Error('stream failure'), 'unknown', Object.assign(new Error('cancel'), {
    name: 'AbortError'
  })])('stream rejection %j ends request and reports only genuine failure', async (error) => {
    select('cloud');
    leaves.cloud.mockRejectedValue(error);
    await run().send.handleSend();
    if (error instanceof Error && error.name === 'AbortError') expect(last()?.content).toBe('');else expect(last()?.content).toContain(error instanceof Error ? 'stream failure' : 'unknownError');
    expect(stateModule.SESSION_ABORT_CONTROLLERS.size).toBe(0);
  });
});
