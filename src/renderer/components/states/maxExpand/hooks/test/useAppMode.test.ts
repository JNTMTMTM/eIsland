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
 * @file useAppMode.test.ts
 * @description 应用化模式初始读取、切换事件和异步清理的回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppMode } from '../useAppMode';
import { MAXEXPAND_APP_MODE_ENABLED_STORE_KEY, MAXEXPAND_APP_MODE_CHANGED_EVENT } from '../../components/setting/utils/settingsConfig';
import type { IslandSlice } from '../../../../../store/types';

const mocks = vi.hoisted(() => ({
  effect: vi.fn(),
  setLoaded: vi.fn(),
  store: {} as Pick<IslandSlice, 'maxExpandAppModeEnabled' | 'maxExpandLauncherVisible' | 'showMaxExpandLauncher'>,
  setState: vi.fn(),
}));

vi.mock('react', () => ({
  useEffect: mocks.effect,
  useState: () => [false, mocks.setLoaded],
}));
vi.mock('../../../../../store/slices', () => ({
  default: Object.assign((selector: (state: typeof mocks.store) => unknown) => selector(mocks.store), {
    getState: () => mocks.store,
    setState: mocks.setState,
  }),
}));

describe('useAppMode', () => {
  let cleanup: (() => void) | undefined;
  let resolveRead: (value: unknown) => void;
  let rejectRead: (reason: Error) => void;
  let onSettingsChanged: (channel: string, value: unknown) => void;
  const unsubscribe = vi.fn();
  const storeRead = vi.fn();

  beforeEach(() => {
    cleanup = undefined;
    mocks.store = {
      maxExpandAppModeEnabled: false,
      maxExpandLauncherVisible: false,
      showMaxExpandLauncher: vi.fn(() => { mocks.store.maxExpandLauncherVisible = true; }),
    };
    mocks.setState.mockImplementation((patch: Partial<typeof mocks.store>) => Object.assign(mocks.store, patch));
    mocks.effect.mockImplementation((effect: () => () => void) => { cleanup = effect(); });
    storeRead.mockReturnValue(new Promise<unknown>((resolve, reject) => {
      resolveRead = resolve;
      rejectRead = reject;
    }));
    vi.stubGlobal('window', Object.assign(new EventTarget(), { api: {
      storeRead,
      onSettingsChanged: (listener: typeof onSettingsChanged) => {
        onSettingsChanged = listener;
        return unsubscribe;
      },
    } }));
  });

  afterEach(() => {
    cleanup?.();
    vi.unstubAllGlobals();
  });

  it('保留初始读取前指定的应用，不因加载已启用配置而返回导航页', async () => {
    expect(useAppMode()).toEqual({ appModeEnabled: false, appModeLoaded: false });
    expect(storeRead).toHaveBeenCalledWith(MAXEXPAND_APP_MODE_ENABLED_STORE_KEY);

    resolveRead(true);
    await Promise.resolve();

    expect(mocks.store.maxExpandAppModeEnabled).toBe(true);
    expect(mocks.store.maxExpandLauncherVisible).toBe(false);
    expect(mocks.store.showMaxExpandLauncher).not.toHaveBeenCalled();
    expect(mocks.setLoaded).toHaveBeenLastCalledWith(true);
  });

  it('设置窗口切换优先于迟到的读取结果，重复广播不会关闭已打开应用', async () => {
    useAppMode();
    onSettingsChanged(`store:${MAXEXPAND_APP_MODE_ENABLED_STORE_KEY}`, true);
    expect(mocks.store.maxExpandLauncherVisible).toBe(true);
    mocks.store.maxExpandLauncherVisible = false;
    onSettingsChanged(`store:${MAXEXPAND_APP_MODE_ENABLED_STORE_KEY}`, true);
    resolveRead(false);
    await Promise.resolve();

    expect(mocks.store.maxExpandAppModeEnabled).toBe(true);
    expect(mocks.store.maxExpandLauncherVisible).toBe(false);
    expect(mocks.store.showMaxExpandLauncher).toHaveBeenCalledOnce();
  });

  it('同窗口事件支持关闭再开启，忽略无关配置并规范非布尔值', () => {
    useAppMode();
    onSettingsChanged('store:other-setting', true);
    expect(mocks.setState).not.toHaveBeenCalled();

    window.dispatchEvent(new CustomEvent(MAXEXPAND_APP_MODE_CHANGED_EVENT, { detail: true }));
    expect(mocks.store.maxExpandAppModeEnabled).toBe(true);
    window.dispatchEvent(new CustomEvent(MAXEXPAND_APP_MODE_CHANGED_EVENT, { detail: 'true' }));
    expect(mocks.store.maxExpandAppModeEnabled).toBe(false);
    window.dispatchEvent(new CustomEvent(MAXEXPAND_APP_MODE_CHANGED_EVENT, { detail: true }));
    expect(mocks.store.showMaxExpandLauncher).toHaveBeenCalledTimes(2);
  });

  it('卸载后清理本地和远程监听，并拒绝挂起读取回写', async () => {
    useAppMode();
    cleanup?.();
    cleanup = undefined;
    onSettingsChanged(`store:${MAXEXPAND_APP_MODE_ENABLED_STORE_KEY}`, true);
    window.dispatchEvent(new CustomEvent(MAXEXPAND_APP_MODE_CHANGED_EVENT, { detail: true }));
    resolveRead(true);
    await Promise.resolve();

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(mocks.setState).not.toHaveBeenCalled();
    expect(mocks.setLoaded).not.toHaveBeenCalled();
    expect(mocks.store.showMaxExpandLauncher).not.toHaveBeenCalled();
  });

  it('读取失败时保留当前模式并解除加载等待', async () => {
    mocks.store.maxExpandAppModeEnabled = true;
    useAppMode();
    rejectRead(new Error('store unavailable'));
    await Promise.resolve();

    expect(mocks.store.maxExpandAppModeEnabled).toBe(true);
    expect(mocks.setState).not.toHaveBeenCalled();
    expect(mocks.setLoaded).toHaveBeenLastCalledWith(true);
  });
});
