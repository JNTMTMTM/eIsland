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
 * @file shellConstantsRuntime.test.ts
 * @description 启动模式真实 IPC 兼容读取、缺失桥接与解析错误边界测试
 * @author 鸡哥
 */
import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => vi.unstubAllGlobals());
it.each([
  { current: 'standalone', legacy: null, expected: 'standalone' },
  { current: 'integrated', legacy: 'standalone', expected: 'standalone' },
  { current: null, legacy: 'integrated', expected: 'integrated' },
  { current: 'reject', legacy: null, expected: 'integrated' },
  { current: null, legacy: 'reject', expected: 'integrated' },
])('resolves current=$current and legacy=$legacy through actual startup parsing', async ({ current, legacy, expected }) => {
  vi.resetModules();
  const storeRead = vi.fn((key: string) => {
    const value = key === 'standalone-window-mode' ? current : legacy;
    return value === 'reject' ? Promise.reject(new Error('IPC failed')) : Promise.resolve(value);
  });
  vi.stubGlobal('window', { api: { storeRead } }); const mode = await import('../shellConstants');
  await mode.getStartupModeReady(); expect(mode.isStartupModeResolved()).toBe(true); expect(mode.getStartupMode()).toBe(expected);
  expect(storeRead).toHaveBeenCalledTimes(current === 'standalone' || current === 'reject' ? 1 : 2);
});
it.each([{}, { api: {} }])('handles missing preload: %s', async (nativeWindow) => {
  vi.resetModules(); vi.stubGlobal('window', nativeWindow); const mode = await import('../shellConstants');
  await mode.getStartupModeReady(); expect(mode.getStartupMode()).toBe('integrated'); expect(mode.isStartupModeResolved()).toBe(true);
});
