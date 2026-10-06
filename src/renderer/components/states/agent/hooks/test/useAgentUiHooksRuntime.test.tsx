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
 * @file useAgentUiHooksRuntime.test.tsx
 * @description 真实Agent授权回调、Markdown展示态及文本滚动边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import { useAgentDisplayState } from '../useAgentDisplayState';
import { useAgentAutoScroll } from '../useAgentAutoScroll';
import { useAgentAuthDecision } from '../useAgentAuthDecision';
import type { AuthPending } from '../../types/AuthPending';
const leaves = vi.hoisted(() => ({
  web: vi.fn<typeof import('../../../../../api/ai/mihtnelisAgentStream').resolveMihtnelisWebAccess>(),
  access: vi.fn<typeof import('../../../../../api/ai/mihtnelisAgentStream').resolveMihtnelisLocalToolAccess>(),
  result: vi.fn<typeof import('../../../../../api/ai/mihtnelisAgentStream').resolveMihtnelisLocalToolResult>()
}));
vi.mock('../../../../../api/ai/mihtnelisAgentStream', () => ({
  resolveMihtnelisWebAccess: leaves.web,
  resolveMihtnelisLocalToolAccess: leaves.access,
  resolveMihtnelisLocalToolResult: leaves.result
}));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const native = {
  execute: vi.fn<(request: unknown) => Promise<unknown>>()
};
const setAuthPending = vi.fn();
const tokenRef = {
  current: 'token'
};
const workspaces = ['virtual'];
let authPending: AuthPending | null;
/** 调用真实授权Hook返回的公开动作。
 * @returns 授权动作
 */
function decision() {
  return renderHook(useAgentAuthDecision, {
    authPending,
    setAuthPending,
    tokenRef,
    workspaces
  });
}
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  leaves.web.mockResolvedValue(undefined);
  leaves.access.mockResolvedValue(undefined);
  leaves.result.mockResolvedValue(undefined);
  native.execute.mockResolvedValue({
    success: true,
    result: {
      content: 'local'
    },
    error: '',
    durationMs: 3
  });
  authPending = {
    type: 'tool',
    requestId: 'request',
    description: 'native permission',
    tool: 'file.read',
    argumentsPayload: {
      path: 'virtual'
    }
  };
  tokenRef.current = 'token';
  vi.stubGlobal('window', {
    api: {
      executeAgentLocalTool: native.execute
    }
  });
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('Agent real UI hooks', () => {
  it.each(['missing-auth', 'missing-token'] as const)('%s leaves permission state and native APIs untouched', async (kind) => {
    if (kind === 'missing-auth') authPending = null;else tokenRef.current = '';
    await decision()(true);
    expect(setAuthPending).not.toHaveBeenCalled();
    expect(leaves.access).not.toHaveBeenCalled();
  });
  it.each([true, false])('web allow=%s forwards only actual web decision and clears permission', async (allow) => {
    authPending = {
      type: 'web',
      requestId: 'web',
      description: 'web permission'
    };
    await decision()(allow);
    expect(setAuthPending).toHaveBeenCalledWith(null);
    expect(leaves.web).toHaveBeenCalledWith({
      allow,
      token: 'token',
      requestId: 'web'
    });
    expect(native.execute).not.toHaveBeenCalled();
  });
  it('local deny resolves authorization without executing the native tool', async () => {
    await decision()(false);
    expect(leaves.access).toHaveBeenCalledWith({
      token: 'token',
      requestId: 'request',
      allow: false
    });
    expect(native.execute).not.toHaveBeenCalled();
    expect(leaves.result).not.toHaveBeenCalled();
  });
  it.each(['missing-api', 'missing-executor'] as const)('%s reports native local runtime unavailable after permission', async (kind) => {
    vi.stubGlobal('window', kind === 'missing-api' ? {} : {
      api: {}
    });
    await decision()(true);
    expect(leaves.result).toHaveBeenCalledWith({
      token: 'token',
      requestId: 'request',
      success: false,
      result: {},
      error: 'LOCAL_RUNTIME_UNAVAILABLE',
      durationMs: 0
    });
  });
  it.each([{
    success: true,
    result: {
      content: 'local'
    },
    error: 'note',
    durationMs: 4
  }, null, {
    success: false,
    error: 3,
    durationMs: 'wrong'
  }])('native executor response %j reaches actual guarded result handler', async (response) => {
    if (authPending) delete authPending.argumentsPayload;
    native.execute.mockResolvedValue(response);
    await decision()(true);
    expect(native.execute).toHaveBeenCalledWith({
      tool: 'file.read',
      arguments: {},
      workspaces: ['virtual']
    });
    expect(leaves.result).toHaveBeenCalledWith(expect.objectContaining({
      success: Boolean(response?.success),
      error: typeof response?.error === 'string' ? response.error : '',
      durationMs: typeof response?.durationMs === 'number' ? response.durationMs : 0
    }));
  });
  it.each([new Error('execution'), 'unknown'])('native executor failure %j becomes structured failure', async (error) => {
    native.execute.mockRejectedValue(error);
    await decision()(true);
    expect(leaves.result).toHaveBeenCalledWith({
      token: 'token',
      requestId: 'request',
      success: false,
      result: {},
      error: error instanceof Error ? error.message : '本地工具执行失败',
      durationMs: 0
    });
  });
  it.each(['web', 'access', 'result'] as const)('%s transport failure is consumed by actual authorization callback', async (kind) => {
    leaves[kind].mockRejectedValue(new Error('leaf failure'));
    if (kind === 'web') {authPending = {
      type: 'web',
      requestId: 'web',
      description: 'web'
    };}
    await expect(decision()(true)).resolves.toBeUndefined();
    expect(setAuthPending).toHaveBeenCalledWith(null);
  });
  it('missing native scroll node is safe; new thought and answer independently scroll to current height', () => {
    const textRef: {
      current: HTMLDivElement | null;
    } = {
      current: null
    };
    renderHook(useAgentAutoScroll, {
      textRef,
      thinkText: '',
      answerText: ''
    });
    flushHookEffects();
    const node = {
      scrollTop: 0,
      scrollHeight: 100
    };
    textRef.current = node as unknown as HTMLDivElement;
    renderHook(useAgentAutoScroll, {
      textRef,
      thinkText: 'thinking',
      answerText: ''
    });
    flushHookEffects();
    expect(node.scrollTop).toBe(100);
    node.scrollHeight = 250;
    renderHook(useAgentAutoScroll, {
      textRef,
      thinkText: 'thinking',
      answerText: 'answer'
    });
    flushHookEffects();
    expect(node.scrollTop).toBe(250);
  });
  it.each(['connecting', 'thinking', 'toolCalling', 'answering', 'done', 'error'] as const)('empty %s display uses actual phase label', (phase) => {
    const state = renderHook(useAgentDisplayState, {
      phase,
      answerText: '',
      thinkText: '',
      errorMsg: '',
      authPending: null,
      toolCallInfo: null
    });
    expect(state.overlayText).toBeNull();
    expect(state.overlayLabel).toBeNull();
    expect(renderToStaticMarkup(<>{state.renderedDisplay}</>)).not.toBe('');
    expect(state.isThinkOnly).toBe(false);
  });
  it.each([{
    answerText: '**answer**\n\nagain',
    thinkText: 'think',
    errorMsg: 'error',
    expected: 'answer',
    onlyThink: false
  }, {
    answerText: '',
    thinkText: 'thought',
    errorMsg: 'error',
    expected: 'thought',
    onlyThink: true
  }, {
    answerText: '',
    thinkText: '',
    errorMsg: 'failed',
    expected: 'failed',
    onlyThink: false
  }])('actual Markdown precedence and newline normalization %j', (row) => {
    const state = renderHook(useAgentDisplayState, {
      ...row,
      phase: 'done',
      authPending: null,
      toolCallInfo: null
    });
    const markup = renderToStaticMarkup(<>{state.renderedDisplay}</>);
    expect(markup).toContain(row.expected);
    expect(markup).not.toContain('**');
    expect(markup).not.toContain('\n\n');
    expect(state.isThinkOnly).toBe(row.onlyThink);
  });
  it('auth overlay outranks tool overlay; a blank valid description falls through to Markdown', () => {
    let state = renderHook(useAgentDisplayState, {
      phase: 'answering',
      answerText: 'answer',
      thinkText: '',
      errorMsg: '',
      authPending: {
        type: 'web',
        requestId: 'web',
        description: 'native authorization'
      },
      toolCallInfo: {
        tool: 'read',
        purpose: 'tool purpose'
      }
    });
    expect(state).toMatchObject({
      overlayLabel: '需要授权',
      overlayText: 'native authorization',
      renderedDisplay: 'native authorization'
    });
    state = renderHook(useAgentDisplayState, {
      phase: 'answering',
      answerText: 'answer',
      thinkText: '',
      errorMsg: '',
      authPending: null,
      toolCallInfo: {
        tool: 'read',
        purpose: 'tool purpose'
      }
    });
    expect(state).toMatchObject({
      overlayLabel: '正在调用: read',
      renderedDisplay: 'tool purpose'
    });
    state = renderHook(useAgentDisplayState, {
      phase: 'answering',
      answerText: 'answer',
      thinkText: '',
      errorMsg: '',
      authPending: {
        type: 'web',
        requestId: 'web',
        description: ''
      },
      toolCallInfo: null
    });
    expect(renderToStaticMarkup(<>{state.renderedDisplay}</>)).toContain('answer');
  });
});
