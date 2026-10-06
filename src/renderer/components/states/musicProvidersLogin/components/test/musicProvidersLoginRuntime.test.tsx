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
 * @file musicProvidersLoginRuntime.test.tsx
 * @description 真实音乐登录界面组合二维码 Hook 与 Zustand 切片的渲染及事件测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import { byClass, elements, invoke, text } from '../../../test/tree';
import type { MusicProviderAuthStatus, MusicProviderId, MusicProviderQrCodeResult } from '../../../../../../shared/musicProviderAuth';
import type { IslandSlice } from '../../../../../store/types';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const api = {
  musicProviderAuthStatus: vi.fn<(provider: MusicProviderId) => Promise<MusicProviderAuthStatus>>(),
  musicProviderAuthCreateQr: vi.fn<(provider: MusicProviderId) => Promise<MusicProviderQrCodeResult>>(),
  musicProviderAuthCheckQr: vi.fn<(provider: MusicProviderId, token: string) => Promise<MusicProviderAuthStatus>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<boolean>>(),
  expandWindowSettings: vi.fn<() => void>(),
  disableMousePassthrough: vi.fn<() => void>()
};
let module: typeof import('../MusicProvidersLoginContent');
let store: StoreApi<IslandSlice>;
/** 返回真实组件元素树。
 * @returns 登录界面
 */
function run() {
  return renderHook(module.MusicProvidersLoginContent);
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  const status: MusicProviderAuthStatus = {
    provider: 'qishui',
    loggedIn: false,
    state: 'waiting',
    retryAfterMs: 0
  };
  api.musicProviderAuthStatus.mockResolvedValue(status);
  api.musicProviderAuthCreateQr.mockResolvedValue({
    ...status,
    token: 'token',
    qrContent: 'qr-content',
    expiresAt: null
  });
  api.musicProviderAuthCheckQr.mockResolvedValue({
    ...status,
    state: 'confirmed',
    loggedIn: true
  });
  api.storeWrite.mockResolvedValue(true);
  const localStorage = {
    getItem: () => null
  };
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', {
    api,
    localStorage,
    location: {
      pathname: '/index.html'
    }
  });
  const {
    createIslandSlice
  } = await import('../../../../../store/slices/islandSlice');
  store = createStore<IslandSlice>()(createIslandSlice);
  store.setState({
    state: 'musicProvidersLogin',
    authReturnState: 'maxExpand'
  });
  vi.doMock('../../../../../store/slices', () => ({
    default: () => store.getState()
  }));
  module = await import('../MusicProvidersLoginContent');
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('MusicProvidersLoginContent with real login state', () => {
  it('native pending QR shows spinner, becomes actual QR props, refreshes and stops event bubbling', async () => {
    let root = run();
    expect(text(root)).toContain('settings.musicProviderLogin.loading');
    expect(byClass(root, 'settings-user-primary-btn').props.disabled).toBe(true);
    const stopPropagation = vi.fn();
    invoke(byClass(root, 'auth-state-content'), 'onClick', {
      stopPropagation
    });
    expect(stopPropagation).toHaveBeenCalledOnce();
    flushHookEffects();
    await settleHook();
    root = run();
    expect(elements(root).find((node) => node.props.value === 'qr-content')?.props).toMatchObject({
      size: 180,
      level: 'M'
    });
    invoke(byClass(root, 'settings-user-primary-btn'), 'onClick');
    await settleHook();
    expect(api.musicProviderAuthCreateQr).toHaveBeenCalledTimes(2);
  });
  it.each([true, false])('confirmed native login report issue handles store success=%s and opens actual settings state', async (success) => {
    if (!success) api.storeWrite.mockRejectedValue(new Error('write'));
    run();
    flushHookEffects();
    await settleHook();
    await vi.advanceTimersByTimeAsync(1200);
    const root = run();
    expect(text(root)).toContain('settings.musicProviderLogin.success');
    invoke(byClass(root, 'settings-user-secondary-btn'), 'onClick');
    await settleHook();
    expect(api.storeWrite).toHaveBeenCalledWith('settings-open-tab', 'about-feedback');
    expect(store.getState()).toMatchObject({
      state: 'maxExpand',
      maxExpandTab: 'settings'
    });
    expect(api.expandWindowSettings).toHaveBeenCalledOnce();
  });
  it('actual public runtime provider state fallback and back return to captured auth state', async () => {
    store.setState(JSON.parse('{"musicProviderLogin":"unknown-provider"}') as Partial<IslandSlice>);
    let root = run();
    expect(text(root)).toContain('settings.musicProviderLogin.qishui.name');
    flushHookEffects();
    await settleHook();
    root = run();
    invoke(byClass(root, 'settings-user-secondary-btn'), 'onClick');
    expect(store.getState().state).toBe('maxExpand');
    expect(api.musicProviderAuthStatus).toHaveBeenCalledWith('qishui');
  });
  it('failed native QR creation leaves unavailable placeholder and keeps retry enabled', async () => {
    api.musicProviderAuthCreateQr.mockRejectedValue(new Error('QR'));
    run();
    flushHookEffects();
    await settleHook();
    const root = run();
    expect(text(root)).toContain('settings.musicProviderLogin.qrUnavailable');
    expect(byClass(root, 'settings-user-primary-btn').props.disabled).toBe(false);
  });
});
