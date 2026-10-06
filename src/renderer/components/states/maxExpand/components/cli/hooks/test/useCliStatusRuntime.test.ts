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
 * @file useCliStatusRuntime.test.ts
 * @description 真实 Claude/Codex 状态监听、活动上下文、控制动作及异步代际取消测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHookReactMock, deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import type { ClaudeCodeStatusSnapshot, ClaudeCodeHookMutationResult } from '../../../../../../../../preload/types/claudeCode';
import type { CliProvider } from '../../../../../../../store/types';
const context = vi.hoisted(() => ({
  active: true
}));
let hook: typeof import('../useCliStatus');
/** 完整原生状态协议。
 * @param updatedAt - 版本
 * @returns CLI状态
 */
function snapshot(updatedAt = 1): ClaudeCodeStatusSnapshot {
  return {
    updatedAt,
    enabled: true,
    receiverRunning: true,
    receiverUrl: null,
    settingsPath: '',
    hookScriptPath: '',
    sessions: [],
    events: [],
    heatmap: {}
  };
}
/** 建立原生 IPC 提供方协议模拟。
 * @returns 原生API与监听叶
 */
function bridge() {
  return {
    get: vi.fn<() => Promise<ClaudeCodeStatusSnapshot>>(),
    enable: vi.fn<() => Promise<ClaudeCodeHookMutationResult>>(),
    disable: vi.fn<() => Promise<ClaudeCodeHookMutationResult>>(),
    clear: vi.fn<() => Promise<ClaudeCodeStatusSnapshot>>(),
    remove: vi.fn<(ids: string[]) => Promise<ClaudeCodeStatusSnapshot>>(),
    off: vi.fn<() => void>(),
    receive: undefined as ((next: ClaudeCodeStatusSnapshot) => void) | undefined
  };
}
const bridges = {
  claude: bridge(),
  codex: bridge()
};
const actions = ['enableMonitor', 'disableMonitor', 'clearEvents', 'deleteSessions'] as const;
type Action = typeof actions[number];
/** 调用真实状态 Hook。
 * @param provider - 当前协议提供方
 * @returns 当前状态
 */
function run(provider: CliProvider = 'claude') {
  return renderHook(hook.useCliStatus, provider);
}
/** 完成真实挂载效果。
 * @param provider - 当前提供方
 * @returns 当前状态
 */
async function mount(provider: CliProvider = 'claude') {
  run(provider);
  flushHookEffects();
  await settleHook();
  return run(provider);
}
/** 执行公开控制动作。
 * @param action - 动作
 * @param provider - 提供方
 * @returns 动作完成Promise
 */
function invoke(action: Action, provider: CliProvider = 'claude'): Promise<void> {
  const state = run(provider);
  return action === 'deleteSessions' ? state.deleteSessions(['a']) : state[action]();
}
/** 返回对应原生请求叶。
 * @param action - 控制动作
 * @param provider - 提供方
 * @returns Promise协议叶
 */
function leaf(action: Action, provider: CliProvider = 'claude') {
  if (action === 'enableMonitor') return bridges[provider].enable;
  if (action === 'disableMonitor') return bridges[provider].disable;
  if (action === 'clearEvents') return bridges[provider].clear;
  return bridges[provider].remove;
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  context.active = true;
  Object.values(bridges).forEach((api) => {
    Object.assign(api, { receive: undefined });
    api.get.mockResolvedValue(snapshot());
    api.enable.mockResolvedValue({
      ok: true,
      message: 'enabled',
      snapshot: snapshot(2)
    });
    api.disable.mockResolvedValue({
      ok: true,
      message: 'disabled',
      snapshot: snapshot(3)
    });
    api.clear.mockResolvedValue(snapshot(4));
    api.remove.mockResolvedValue(snapshot(5));
  });
  vi.doMock('react', async (original) => ({
    ...createHookReactMock(await original<typeof import('react')>()),
    useContext: () => context.active
  }));
  vi.stubGlobal('window', {
    api: {
      claudeCodeStatusGet: bridges.claude.get,
      claudeCodeHookInstall: bridges.claude.enable,
      claudeCodeHookUninstall: bridges.claude.disable,
      claudeCodeEventsClear: bridges.claude.clear,
      claudeCodeSessionsDelete: bridges.claude.remove,
      onClaudeCodeStatusUpdated: (receive: NonNullable<typeof bridges.claude.receive>) => {
        bridges.claude.receive = receive;
        return bridges.claude.off;
      },
      codexStatusGet: bridges.codex.get,
      codexMonitorEnable: bridges.codex.enable,
      codexMonitorDisable: bridges.codex.disable,
      codexEventsClear: bridges.codex.clear,
      codexSessionsDelete: bridges.codex.remove,
      onCodexStatusUpdated: (receive: NonNullable<typeof bridges.codex.receive>) => {
        bridges.codex.receive = receive;
        return bridges.codex.off;
      }
    }
  });
  hook = await import('../useCliStatus');
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe.each(['claude', 'codex'] as const)('useCliStatus true %s protocol and generation', (provider) => {
  it('loads initial snapshot and native pushes take precedence over late initial request', async () => {
    expect(run(provider).loading).toBe(true);
    expect((await mount(provider)).snapshot).toEqual(snapshot());
    unmountHook();
    resetHook();
    const pending = deferred<ClaudeCodeStatusSnapshot>();
    bridges[provider].get.mockReturnValue(pending.promise);
    run(provider);
    flushHookEffects();
    bridges[provider].receive?.(snapshot(20));
    pending.resolve(snapshot(10));
    await settleHook();
    expect(run(provider).snapshot).toEqual(snapshot(20));
    expect(run(provider).loading).toBe(false);
  });
  it.each(['active', 'unmounted'] as const)('native get rejection while %s is consumed and affects only active loading', async (phase) => {
    const pending = deferred<ClaudeCodeStatusSnapshot>();
    bridges[provider].get.mockReturnValue(pending.promise);
    run(provider);
    flushHookEffects();
    if (phase === 'unmounted') unmountHook();
    pending.reject(new Error('bridge'));
    await settleHook();
    expect(run(provider).loading).toBe(phase === 'unmounted');
  });
  it('late initial resolve and queued subscription after cleanup cannot replace empty state', async () => {
    const pending = deferred<ClaudeCodeStatusSnapshot>();
    bridges[provider].get.mockReturnValue(pending.promise);
    run(provider);
    flushHookEffects();
    unmountHook();
    pending.resolve(snapshot(30));
    bridges[provider].receive?.(snapshot(40));
    await settleHook();
    expect(run(provider).snapshot).toMatchObject({
      enabled: false,
      updatedAt: 0
    });
    expect(bridges[provider].off).toHaveBeenCalledOnce();
  });
  it.each(actions)('public %s uses correct native provider and applies response', async (action) => {
    await mount(provider);
    await invoke(action, provider);
    expect(leaf(action, provider)).toHaveBeenCalledOnce();
    expect(run(provider).snapshot).toEqual(snapshot({
      enableMonitor: 2,
      disableMonitor: 3,
      clearEvents: 4,
      deleteSessions: 5
    }[action]));
    if (action === 'enableMonitor' || action === 'disableMonitor') expect(run(provider).actionMessage).toBe(action === 'enableMonitor' ? 'enabled' : 'disabled');
  });
});
describe('useCliStatus true inactive and stale actions', () => {
  it.each(actions)('inactive %s does not start IPC and activity resume subscribes', async (action) => {
    context.active = false;
    await mount();
    await invoke(action);
    expect(bridges.claude.get).not.toHaveBeenCalled();
    expect(leaf(action)).not.toHaveBeenCalled();
    context.active = true;
    await mount();
    expect(bridges.claude.get).toHaveBeenCalledOnce();
  });
  it.each(actions)('pending %s invalidates after public provider switch and after cleanup', async (action) => {
    await mount();
    const pending = deferred<ClaudeCodeHookMutationResult & ClaudeCodeStatusSnapshot>();
    leaf(action).mockReturnValue(pending.promise);
    const result = invoke(action);
    run('codex');
    flushHookEffects();
    await settleHook();
    pending.resolve({
      ...snapshot(90),
      ok: true,
      message: 'stale',
      snapshot: snapshot(90)
    });
    await result;
    expect(run('codex').snapshot).toEqual(snapshot());
    expect(run('codex').actionMessage).toBe('');
    const pendingSecond = deferred<ClaudeCodeHookMutationResult & ClaudeCodeStatusSnapshot>();
    leaf(action, 'codex').mockReturnValue(pendingSecond.promise);
    const second = invoke(action, 'codex');
    unmountHook();
    pendingSecond.resolve({
      ...snapshot(99),
      ok: true,
      message: 'stale2',
      snapshot: snapshot(99)
    });
    await second;
    expect(run('codex').snapshot).toEqual(snapshot());
  });
});
