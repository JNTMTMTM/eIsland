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
 * @file useThemeSetting.test.ts
 * @description 引导主题 Hook 的真实加载、模式应用与透明度边界持久化测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../DynamicIslandSharedWaveEffect/hooks/test/waveLifecycleHarness';

import { useThemeSetting } from '../useThemeSetting';
import { getThemeMode } from '../../../../../../utils/theme';

vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../../DynamicIslandSharedWaveEffect/hooks/test/waveLifecycleHarness')).lifecycleHooks,
}));

/** 等待实际 Promise 加载或持久化失败回调完成。
 * @returns 异步回调完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

const native = vi.hoisted(() => {
  const api = {
    themeModeGet: vi.fn<() => Promise<unknown>>(),
    islandOpacityGet: vi.fn<() => Promise<unknown>>(),
    themeModeSet: vi.fn<(mode: string) => Promise<void>>(),
    islandOpacitySet: vi.fn<(opacity: number) => Promise<void>>(),
  };
  const setAttribute = vi.fn<(key: string, value: string) => void>();
  const browser = { api, matchMedia: vi.fn(() => ({ matches: false })) };
  vi.stubGlobal('window', browser);
  return { api, browser, setAttribute };
});

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  native.api.themeModeGet.mockResolvedValue('dark');
  native.api.islandOpacityGet.mockResolvedValue(100);
  native.api.themeModeSet.mockResolvedValue();
  native.api.islandOpacitySet.mockResolvedValue();
  vi.stubGlobal('window', native.browser);
  vi.stubGlobal('document', { documentElement: { setAttribute: native.setAttribute } });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});

/** 重新求值实际 Hook 并保留公开状态。
 * @returns 当前主题设置。
 */
function view(): ReturnType<typeof useThemeSetting> {
  return renderWithHooks(useThemeSetting);
}

describe('引导主题真实设置', () => {
  it.each([
    ['dark', 10, 'dark', 10],
    ['light', 45, 'light', 45],
    ['system', 100, 'system', 100],
    ['unknown', '50', 'dark', 100],
    [null, null, 'dark', 100],
  ])('读取模式 %s 和透明度 %s 并按真实读取契约回退', async (mode, opacity, expectedMode, expectedOpacity) => {
    native.api.themeModeGet.mockResolvedValue(mode);
    native.api.islandOpacityGet.mockResolvedValue(opacity);
    expect(view()).toMatchObject({ mode: 'dark', opacity: 100 });
    runEffects();
    await settle();
    expect(view()).toMatchObject({ mode: expectedMode, opacity: expectedOpacity });
    expect(native.api.themeModeGet).toHaveBeenCalledOnce();
    expect(native.api.islandOpacityGet).toHaveBeenCalledOnce();
    expect(native.setAttribute).not.toHaveBeenCalled();
  });

  it.each(['theme', 'opacity'])('%s 加载失败保持初始状态', async (kind) => {
    if (kind === 'theme') native.api.themeModeGet.mockRejectedValue(new Error('IPC read'));
    else native.api.islandOpacityGet.mockRejectedValue(new Error('IPC read'));
    view();
    runEffects();
    await settle();
    expect(view()).toMatchObject({ mode: 'dark', opacity: 100 });
  });

  it.each([false, true])('模式实时应用实际主题工具，持久化失败=%s 仍保留选择供后续操作', async (reject) => {
    if (reject) native.api.themeModeSet.mockRejectedValue(new Error('IPC write'));
    view();
    runEffects();
    await settle();
    (['light', 'system', 'dark'] as const).forEach((mode) => {
      view().setMode(mode);
      expect(view().mode).toBe(mode);
      expect(getThemeMode()).toBe(mode);
      expect(native.api.themeModeSet).toHaveBeenLastCalledWith(mode);
      expect(native.setAttribute).toHaveBeenLastCalledWith('data-theme', mode === 'system' ? 'light' : mode);
    });
    await settle();
  });

  it.each([false, true])('透明度取整并限制上下界，持久化失败=%s 不抹掉当前输入', async (reject) => {
    if (reject) native.api.islandOpacitySet.mockRejectedValue(new Error('IPC write'));
    view();
    runEffects();
    await settle();
    [[-2, 10], [10, 10], [24.6, 25], [100, 100], [120, 100]].forEach(([input, expected]) => {
      view().setOpacity(input);
      expect(view().opacity).toBe(expected);
      expect(native.api.islandOpacitySet).toHaveBeenLastCalledWith(expected);
    });
    await settle();
  });
});
