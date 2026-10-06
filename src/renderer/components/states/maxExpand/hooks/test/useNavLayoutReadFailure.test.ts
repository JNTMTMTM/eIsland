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
 * @file useNavLayoutReadFailure.test.ts
 * @description 导航配置原生读取失败及真实本地监听器卸载测试。
 * @author 鸡哥
 */

import { afterEach, expect, it, vi } from 'vitest';
import { useNavLayout } from '../useNavLayout';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../hooks/test/startupHookHarness';

vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});

afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});

it('读取拒绝保留未加载状态，本地真实事件可恢复且卸载后无状态写入', async () => {
  resetHook();
  const off = vi.fn<() => void>();
  const storeRead = vi.fn<(key: string) => Promise<unknown>>().mockRejectedValue(new Error('native store blocked'));
  let receive: (channel: string, value: unknown) => void = () => undefined;
  const browser = Object.assign(new EventTarget(), { api: { storeRead, onSettingsChanged: (callback: typeof receive) => {
    receive = callback;
    return off;
  } } });
  vi.stubGlobal('window', browser);
  expect(renderHook(useNavLayout)).toEqual({ navLayoutConfig: [], navLayoutLoaded: false });
  flushHookEffects();
  await settleHook();
  expect(renderHook(useNavLayout)).toEqual({ navLayoutConfig: [], navLayoutLoaded: false });
  receive('store:unrelated-setting', [{ id: 'todo', visible: false }]);
  expect(renderHook(useNavLayout)).toEqual({ navLayoutConfig: [], navLayoutLoaded: false });
  browser.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: [{ id: 'memo', visible: true }, { id: 'invalid-cache', visible: true }] }));
  const loaded = renderHook(useNavLayout);
  expect(loaded.navLayoutLoaded).toBe(true);
  expect(loaded.navLayoutConfig[0]).toEqual({ id: 'memo', visible: true });
  expect(loaded.navLayoutConfig.some((item) => String(item.id) === 'invalid-cache')).toBe(false);
  unmountHook();
  browser.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: [{ id: 'todo', visible: false }] }));
  expect(renderHook(useNavLayout)).toEqual(loaded);
  expect(off).toHaveBeenCalledOnce();
});
