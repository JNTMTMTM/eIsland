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
 * @file usePerformanceModeRuntime.test.ts
 * @description 真实性能模式初始缓存、设置广播、本地事件及卸载清理测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePerformanceMode } from '../usePerformanceMode';
import { MAXEXPAND_PERFORMANCE_MODE_CACHE_KEY, MAXEXPAND_PERFORMANCE_MODE_STORE_KEY } from '../../components/setting/utils/performanceSettings';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const read = vi.fn<(key: string) => Promise<unknown>>();
const off = vi.fn<() => void>();
let receive: (channel: string, value: unknown) => void;
let browser: EventTarget;
const storage = new Map<string, string>();
/** 实际事件广播。
 * @param value - 性能模式载荷
 */
function emit(value: unknown): void {
  const event = new Event('maxexpand-performance-mode-changed');
  Object.defineProperty(event, 'detail', {
    value
  });
  browser.dispatchEvent(event);
}
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  browser = new EventTarget();
  storage.clear();
  read.mockResolvedValue(undefined);
  vi.stubGlobal('window', Object.assign(browser, {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value)
    },
    api: {
      storeRead: read,
      onSettingsChanged: (callback: typeof receive) => {
        receive = callback;
        return off;
      }
    }
  }));
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('usePerformanceMode true cache and bridge', () => {
  it.each([false, true, null])('initial native %s normalizes to actual cache and later broadcasts', async (value) => {
    storage.set(MAXEXPAND_PERFORMANCE_MODE_CACHE_KEY, 'false');
    expect(renderHook(usePerformanceMode)).toBe(false);
    read.mockResolvedValue(value);
    flushHookEffects();
    await settleHook();
    expect(renderHook(usePerformanceMode)).toBe(value !== false);
    receive('unrelated', false);
    receive(`store:${  MAXEXPAND_PERFORMANCE_MODE_STORE_KEY}`, false);
    expect(renderHook(usePerformanceMode)).toBe(false);
    emit(true);
    expect(renderHook(usePerformanceMode)).toBe(true);
    expect(storage.get(MAXEXPAND_PERFORMANCE_MODE_CACHE_KEY)).toBe('true');
    emit(false);
    expect(renderHook(usePerformanceMode)).toBe(false);
    unmountHook();
    emit(true);
    receive(`store:${  MAXEXPAND_PERFORMANCE_MODE_STORE_KEY}`, true);
    expect(renderHook(usePerformanceMode)).toBe(false);
    expect(off).toHaveBeenCalledOnce();
  });
  it('read failures preserve defaults and late native read after unmount cannot update cache', async () => {
    read.mockRejectedValue(new Error('bridge'));
    renderHook(usePerformanceMode);
    flushHookEffects();
    await settleHook();
    expect(renderHook(usePerformanceMode)).toBe(true);
    unmountHook();
    resetHook();
    const pending = deferred<unknown>();
    read.mockReturnValue(pending.promise);
    renderHook(usePerformanceMode);
    flushHookEffects();
    unmountHook();
    pending.resolve(false);
    await settleHook();
    expect(renderHook(usePerformanceMode)).toBe(true);
    expect(storage.has(MAXEXPAND_PERFORMANCE_MODE_CACHE_KEY)).toBe(false);
  });
});
