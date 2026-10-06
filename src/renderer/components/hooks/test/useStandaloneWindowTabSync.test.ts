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
 * @file useStandaloneWindowTabSync.test.ts
 * @description 独立窗口标签 Hook 的真实认证状态、主旧存储恢复、本地切换、IPC广播与卸载竞争测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import useIslandStore from '../../../store/slices';
import { ACTIVE_TAB_STORE_KEY, AUTH_INTENT_STORE_KEY, LEGACY_ACTIVE_TAB_STORE_KEY, VALID_TABS } from '../../config/standaloneWindowConfig';
import { useStandaloneWindowTabSync } from '../useStandaloneWindowTabSync';
import { broadcast, deferredBackground, ipc, resetStandalone, settleBackground, surface, values } from './standaloneIpcHarness';
vi.hoisted(() => { vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } })); });
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
const setActiveTab = vi.fn<Parameters<typeof useStandaloneWindowTabSync>[0]['setActiveTab']>();
beforeEach(() => { resetStandalone(); setActiveTab.mockClear(); useIslandStore.setState({ state: 'maxExpand' }); });
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
/**
 * 提交真实同步 Hook 并等待初始存储读取。
 * @returns 当前微任务链完成。
 */
async function mount(): Promise<void> {
  renderWithHooks(() => useStandaloneWindowTabSync({ setActiveTab })); runEffects(); await settleBackground();
}
describe('独立标签与真实认证状态', () => {
  it.each([...VALID_TABS])('主存储恢复%s且不读取旧键', async (tab) => {
    values.set(ACTIVE_TAB_STORE_KEY, tab); await mount();
    expect(setActiveTab).toHaveBeenCalledExactlyOnceWith(tab); expect(ipc.storeRead).not.toHaveBeenCalledWith(LEGACY_ACTIVE_TAB_STORE_KEY);
  });
  it('主键非法时读取有效旧键，两个值均非法则不覆盖当前标签', async () => {
    values.set(ACTIVE_TAB_STORE_KEY, 'bad'); values.set(LEGACY_ACTIVE_TAB_STORE_KEY, 'countdown'); await mount();
    expect(setActiveTab).toHaveBeenCalledExactlyOnceWith('countdown');
    unmountHooks(); resetStandalone(); setActiveTab.mockClear();
    values.set(LEGACY_ACTIVE_TAB_STORE_KEY, 'bad'); await mount(); expect(setActiveTab).not.toHaveBeenCalled();
  });
  it.each(['login', 'register'] as const)('初始认证意图%s切换设置、执行真实 Zustand 操作并清除意图', async (intent) => {
    values.set(AUTH_INTENT_STORE_KEY, intent); await mount();
    expect(setActiveTab).toHaveBeenCalledWith('settings'); expect(useIslandStore.getState().state).toBe(intent);
    expect(ipc.storeWrite).toHaveBeenCalledExactlyOnceWith(AUTH_INTENT_STORE_KEY, null);
  });
  it.each([ACTIVE_TAB_STORE_KEY, LEGACY_ACTIVE_TAB_STORE_KEY, AUTH_INTENT_STORE_KEY])('存储读取%s失败被安全处理', async (failedKey) => {
    ipc.storeRead.mockImplementation((key) => key === failedKey ? Promise.reject(new Error('read-failed')) : Promise.resolve(undefined));
    await mount(); expect(setActiveTab).not.toHaveBeenCalled(); expect(useIslandStore.getState().state).toBe('maxExpand');
  });
  it.each([ACTIVE_TAB_STORE_KEY, LEGACY_ACTIVE_TAB_STORE_KEY, AUTH_INTENT_STORE_KEY])('卸载时未完成%s读取的晚结果不能改变标签或认证', async (pendingKey) => {
    const pending = deferredBackground<unknown>();
    ipc.storeRead.mockImplementation((key) => key === pendingKey ? pending.promise : Promise.resolve(undefined));
    await mount(); unmountHooks(); pending.resolve(pendingKey === AUTH_INTENT_STORE_KEY ? 'login' : 'todo'); await settleBackground();
    expect(setActiveTab).not.toHaveBeenCalled(); expect(useIslandStore.getState().state).toBe('maxExpand'); expect(ipc.storeWrite).not.toHaveBeenCalled();
  });
  it.each([...VALID_TABS])('IPC设置广播恢复合法标签%s', async (tab) => {
    await mount(); broadcast(`store:${  ACTIVE_TAB_STORE_KEY}`, tab);
    expect(setActiveTab).toHaveBeenCalledExactlyOnceWith(tab); expect(ipc.storeWrite).not.toHaveBeenCalled();
  });
  it.each(['login', 'register'] as const)('原生认证广播%s使用真实状态操作且写入失败不阻止切换', async (intent) => {
    await mount(); ipc.storeWrite.mockRejectedValue(new Error('write-failed'));
    broadcast(`store:${  AUTH_INTENT_STORE_KEY}`, intent); await settleBackground();
    expect(setActiveTab).toHaveBeenCalledExactlyOnceWith('settings'); expect(useIslandStore.getState().state).toBe(intent);
    expect(ipc.storeWrite).toHaveBeenCalledWith(AUTH_INTENT_STORE_KEY, null);
  });
  it('初始认证清除写入失败仍保留已应用的认证状态', async () => {
    values.set(AUTH_INTENT_STORE_KEY, 'login'); ipc.storeWrite.mockRejectedValue(new Error('write-failed')); await mount();
    expect(useIslandStore.getState().state).toBe('login'); expect(setActiveTab).toHaveBeenCalledWith('settings');
  });
  it.each([['unrelated', 'todo'], [`store:${  ACTIVE_TAB_STORE_KEY}`, 'invalid'], [`store:${  AUTH_INTENT_STORE_KEY}`, 'none'], [`store:${  AUTH_INTENT_STORE_KEY}`, null]])('无效广播%s/%s不改变状态', async (channel, value) => {
    await mount(); broadcast(channel, value);
    expect(setActiveTab).not.toHaveBeenCalled(); expect(useIslandStore.getState().state).toBe('maxExpand');
  });
  it.each([...VALID_TABS])('本地%s切换事件写入主存储，卸载后不再处理事件', async (tab) => {
    await mount(); surface.dispatchEvent(new CustomEvent('standalone-tab-switch', { detail: tab }));
    expect(setActiveTab).toHaveBeenCalledExactlyOnceWith(tab); expect(ipc.storeWrite).toHaveBeenCalledWith(ACTIVE_TAB_STORE_KEY, tab);
    unmountHooks(); surface.dispatchEvent(new CustomEvent('standalone-tab-switch', { detail: 'settings' }));
    broadcast(`store:${  ACTIVE_TAB_STORE_KEY}`, 'settings'); expect(setActiveTab).toHaveBeenCalledOnce();
  });
  it('本地无效值不持久化，合法切换的写入失败也保留当前标签', async () => {
    await mount(); surface.dispatchEvent(new CustomEvent('standalone-tab-switch', { detail: 'invalid' }));
    expect(setActiveTab).not.toHaveBeenCalled(); ipc.storeWrite.mockRejectedValue(new Error('write-failed'));
    surface.dispatchEvent(new CustomEvent('standalone-tab-switch', { detail: 'todo' })); await settleBackground();
    expect(setActiveTab).toHaveBeenCalledExactlyOnceWith('todo');
  });
  it('本地事件同轮先卸载时，真实 EventTarget 跳过已移除的标签监听器', async () => {
    surface.addEventListener('standalone-tab-switch', () => { unmountHooks(); }); await mount();
    surface.dispatchEvent(new CustomEvent('standalone-tab-switch', { detail: 'settings' }));
    expect(setActiveTab).not.toHaveBeenCalled(); expect(ipc.storeWrite).not.toHaveBeenCalled();
  });
  it('原生监听器快照在同轮卸载后进入旧回调时取消状态更新', async () => {
    ipc.onSettingsChanged(() => { unmountHooks(); }); await mount();
    broadcast(`store:${  ACTIVE_TAB_STORE_KEY}`, 'settings');
    expect(setActiveTab).not.toHaveBeenCalled();
  });
});
