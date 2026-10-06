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
 * @file useClaudeCliSessionStatus.test.ts
 * @description CLI状态 Hook 的真实双提供商活动追踪、会话/权限去重、Zustand跳转和音量播放失败测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import useIslandStore from '../../../store/isLandStore';
import { useClaudeCliSessionStatus } from '../useClaudeCliSessionStatus';
import { deferredBackground, ipc, settleBackground, surface } from './standaloneIpcHarness';
import { audios, claude, cliIpc, codex, play, resetCliBoundary, snapshot } from './cliHookHarness';
vi.hoisted(() => { vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } })); });
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-i18next', async (load) => ({ ...(await load<typeof import('react-i18next')>()), useTranslation: () => ({ t: (key: string) => key }) }));
beforeEach(() => {
  resetCliBoundary(); useIslandStore.setState({ state: 'idle', uiStateLocked: false, maxExpandAppModeEnabled: false, maxExpandLauncherVisible: false, maxExpandTab: 'todo', cliProvider: 'claude', notification: { title: '', body: '' } });
});
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
/**
 * 提交真实 Hook 并完成初始原生快照读取。
 * @returns 活跃会话同步引用。
 */
async function mount(): Promise<ReturnType<typeof useClaudeCliSessionStatus>> {
  const state = renderWithHooks(useClaudeCliSessionStatus); runEffects(); await settleBackground(); return state;
}
describe('CLI原生状态与真实副作用', () => {
  it('初始双提供商读取只建立基线，活动联合引用保留另一提供商的未完成会话', async () => {
    cliIpc.claudeCodeStatusGet.mockResolvedValue(snapshot('completed', 'old'));
    cliIpc.codexStatusGet.mockResolvedValue(snapshot('idle', 'codex'));
    const state = await mount(); expect(state.hasActiveSessionRef.current).toBe(true);
    expect(play).not.toHaveBeenCalled(); expect(useIslandStore.getState().notification).toEqual({ title: '', body: '' });
    claude?.(snapshot('running', 'old')); codex?.(snapshot('completed', 'codex'));
    expect(state.hasActiveSessionRef.current).toBe(true);
    claude?.(snapshot('completed', 'old')); expect(state.hasActiveSessionRef.current).toBe(false);
    expect(useIslandStore.getState().notification).toEqual({ title: '', body: '' });
  });
  it.each(['claude', 'codex'] as const)('%s新会话执行真实通知和音量换算，不重复通知同一会话', async (provider) => {
    await mount(); const emit = provider === 'claude' ? claude : codex;
    emit?.(snapshot('running', 'new')); await settleBackground();
    expect(useIslandStore.getState().notification).toMatchObject({ title: provider === 'codex' ? 'Codex' : 'Claude Code', type: 'cli-session-detected', cliProvider: provider, body: 'notification.cliSessionDetected.body' });
    expect(cliIpc.expandWindowNotification).toHaveBeenCalledOnce(); expect(cliIpc.cliGlowShow).toHaveBeenCalledOnce();
    expect(audios.at(-1)).toMatchObject({ src: '../audio/AGENT.wav', volume: 0.2 }); expect(play).toHaveBeenCalledOnce();
    emit?.(snapshot('running', 'new')); await settleBackground();
    expect(play).toHaveBeenCalledOnce(); expect(cliIpc.expandWindowNotification).toHaveBeenCalledOnce();
  });
  it('新sessionstart事件即使会话ID不变仍通知，重复ID和其他事件类型不通知', async () => {
    cliIpc.claudeCodeStatusGet.mockResolvedValue(snapshot()); await mount();
    claude?.({ ...snapshot(), events: [{ id: 'event1', eventName: 'SessionStart' }] }); await settleBackground();
    expect(play).toHaveBeenCalledOnce();
    claude?.({ ...snapshot(), events: [{ id: 'event1', eventName: 'sessionstart' }] }); await settleBackground();
    claude?.({ ...snapshot(), events: [{ id: 'event2', eventName: 'Stop' }] }); await settleBackground();
    claude?.({ ...snapshot(), events: [{ id: 'event3' }] }); await settleBackground();
    expect(play).toHaveBeenCalledOnce(); expect(cliIpc.cliGlowShow).toHaveBeenCalledOnce();
  });
  it.each([
    { state: 'cli' as const, app: false, launcher: false, tab: 'todo' as const },
    { state: 'maxExpand' as const, app: false, launcher: true, tab: 'cli' as const },
    { state: 'maxExpand' as const, app: true, launcher: false, tab: 'cli' as const },
  ])('已在CLI视图时新会话不弹通知：$state/$app/$launcher', async ({ state, app, launcher, tab }) => {
    await mount(); useIslandStore.setState({ state, maxExpandAppModeEnabled: app, maxExpandLauncherVisible: launcher, maxExpandTab: tab });
    claude?.(snapshot()); await settleBackground(); expect(play).not.toHaveBeenCalled(); expect(cliIpc.cliGlowShow).not.toHaveBeenCalled();
  });
  it.each([
    { state: 'idle' as const, app: false, launcher: false, tab: 'todo' as const },
    { state: 'maxExpand' as const, app: true, launcher: true, tab: 'cli' as const },
    { state: 'maxExpand' as const, app: false, launcher: false, tab: 'todo' as const },
  ])('CLI视图之外的新会话提示：$state/$app/$launcher/$tab', async ({ state, app, launcher, tab }) => {
    await mount(); useIslandStore.setState({ state, maxExpandAppModeEnabled: app, maxExpandLauncherVisible: launcher, maxExpandTab: tab });
    claude?.(snapshot()); await settleBackground(); expect(play).toHaveBeenCalledOnce(); expect(useIslandStore.getState().state).toBe('notification');
  });
  it('新权限提醒执行真实通知音并跳转提供商，已处理权限和缺少权限ID不重复', async () => {
    cliIpc.codexStatusGet.mockResolvedValue(snapshot()); await mount();
    const pending = { ...snapshot('waiting_permission'), sessions: [{ id: 'session', phase: 'waiting_permission' as const, pendingPermission: { id: 'permission' } }] };
    codex?.(pending); await settleBackground();
    expect(useIslandStore.getState()).toMatchObject({ state: 'cli', cliProvider: 'codex' });
    expect(cliIpc.disableMousePassthrough).toHaveBeenCalledOnce(); expect(play).toHaveBeenCalledOnce();
    codex?.(pending); codex?.(snapshot('waiting_permission')); await settleBackground();
    expect(play).toHaveBeenCalledOnce(); expect(cliIpc.expandWindowNotification).toHaveBeenCalledOnce();
  });
  it.each([
    { state: 'cli' as const, app: false, launcher: false, tab: 'todo' as const, expected: false },
    { state: 'maxExpand' as const, app: true, launcher: false, tab: 'cli' as const, expected: false },
    { state: 'maxExpand' as const, app: true, launcher: true, tab: 'cli' as const, expected: true },
    { state: 'maxExpand' as const, app: false, launcher: false, tab: 'todo' as const, expected: true },
  ])('权限提醒遵守现有CLI和启动器可见状态：$state/$app/$launcher/$tab', async ({ state, app, launcher, tab, expected }) => {
    cliIpc.claudeCodeStatusGet.mockResolvedValue(snapshot()); await mount();
    useIslandStore.setState({ state, maxExpandAppModeEnabled: app, maxExpandLauncherVisible: launcher, maxExpandTab: tab });
    claude?.({ sessions: [{ id: 'session', phase: 'waiting_permission', pendingPermission: { id: 'new' } }] }); await settleBackground();
    expect(cliIpc.expandWindowNotification).toHaveBeenCalledTimes(expected ? 1 : 0); expect(play).toHaveBeenCalledOnce();
  });
  it('一次快照的多个新权限只播放一次，初始权限只建立去重基线', async () => {
    cliIpc.claudeCodeStatusGet.mockResolvedValue({ sessions: [{ id: 'a', phase: 'waiting_permission', pendingPermission: { id: 'old' } }, { id: 'b', phase: 'running' }] });
    await mount(); expect(play).not.toHaveBeenCalled();
    claude?.({ sessions: [{ id: 'a', phase: 'waiting_permission', pendingPermission: { id: 'old' } }, { id: 'b', phase: 'waiting_permission', pendingPermission: { id: 'new' } }] }); await settleBackground();
    expect(play).toHaveBeenCalledOnce(); expect(useIslandStore.getState().state).toBe('cli');
  });
  it('播放失败使用备用音源并处理备用再次失败', async () => {
    await mount(); play.mockRejectedValue(new Error('autoplay-blocked'));
    claude?.(snapshot()); await settleBackground();
    expect(play).toHaveBeenCalledTimes(2); expect(audios.at(-1)).toMatchObject({ src: './public/audio/AGENT.wav', volume: 0.2 });
  });
  it('原生音量读取同步抛错时，真实音量工具拒绝后使用默认音量', async () => {
    await mount(); ipc.storeRead.mockImplementation(() => { throw new Error('renderer-disconnected'); });
    claude?.(snapshot()); await settleBackground(); expect(audios.at(-1)?.volume).toBe(1); expect(play).toHaveBeenCalledOnce();
  });
  it('状态请求失败仍可接收后续广播，空快照不建立错误的活动状态', async () => {
    cliIpc.claudeCodeStatusGet.mockRejectedValue(new Error('native-unavailable'));
    cliIpc.codexStatusGet.mockRejectedValue(new Error('native-unavailable'));
    const state = await mount(); claude?.(null); codex?.(undefined);
    expect(state.hasActiveSessionRef.current).toBe(false);
    claude?.(snapshot()); expect(state.hasActiveSessionRef.current).toBe(true); expect(play).not.toHaveBeenCalled();
  });
  it('卸载注销双订阅，晚到的初始快照不改变活动状态或弹通知', async () => {
    const pending = deferredBackground<Awaited<ReturnType<typeof cliIpc.claudeCodeStatusGet>>>();
    cliIpc.claudeCodeStatusGet.mockReturnValue(pending.promise);
    const state = await mount(); unmountHooks(); pending.resolve(snapshot()); await settleBackground();
    expect(claude).toBeNull(); expect(codex).toBeNull(); expect(state.hasActiveSessionRef.current).toBe(false); expect(play).not.toHaveBeenCalled();
  });
  it.each([undefined, {}])('没有原生API或CLI方法时安全挂载和卸载：%j', async (api) => {
    vi.stubGlobal('window', Object.assign(surface, { api }));
    const state = await mount(); expect(state.hasActiveSessionRef.current).toBe(false); expect(play).not.toHaveBeenCalled(); unmountHooks();
  });
  it('API提供快照与订阅但没有glow叶接口时仍发布通知', async () => {
    const withoutGlow = { ...cliIpc, cliGlowShow: undefined };
    vi.stubGlobal('window', Object.assign(surface, { api: { ...ipc, ...withoutGlow } }));
    await mount(); claude?.(snapshot()); await settleBackground();
    expect(useIslandStore.getState().state).toBe('notification'); expect(play).toHaveBeenCalledOnce();
  });
});
