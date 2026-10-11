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
 * @file useIslandTimeStrings.test.ts
 * @description 时间 Hook 的真实时间与农历格式化、秒级跨日更新、翻译依赖与定时器清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, resetLifecycle } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { renderWithHooks, runEffects, unmountHooks } from '../../states/register/hooks/test/authHookHarness';
import { useIslandTimeStrings } from '../useIslandTimeStrings';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(() => { vi.useFakeTimers(); resetLifecycle(); vi.setSystemTime(new Date(2026, 9, 6, 23, 59, 59)); });
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('useIslandTimeStrings 实际时间展示', () => {
  it('隐藏后没有时钟唤醒，恢复时立即校准墙钟', () => {
    const page = Object.assign(new EventTarget(), { hidden: false }); vi.stubGlobal('document', page);
    const t = (key: string) => key;
    renderWithHooks(() => useIslandTimeStrings({ t, language: 'zh-CN' })); runEffects();
    page.hidden = true; page.dispatchEvent(new Event('visibilitychange'));
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    page.hidden = false; page.dispatchEvent(new Event('visibilitychange'));
    expect(vi.getTimerCount()).toBe(1);
    expect(renderWithHooks(() => useIslandTimeStrings({ t, language: 'zh-CN' })).timeStr).toBe('00:00');
  });
  it('分钟精度只在分钟边界刷新，禁用时没有唤醒', () => {
    const t = vi.fn((key: string) => key);
    vi.setSystemTime(new Date(2026, 9, 6, 12, 0, 0));
    renderWithHooks(() => useIslandTimeStrings({ t, language: 'zh-CN', precision: 'minute' })); runEffects();
    t.mockClear();
    vi.advanceTimersByTime(59_000);
    expect(t).not.toHaveBeenCalled();
    expect(renderWithHooks(() => useIslandTimeStrings({ t, language: 'zh-CN', precision: 'minute' })).timeStr).toBe('12:00');
    vi.advanceTimersByTime(1000);
    expect(renderWithHooks(() => useIslandTimeStrings({ t, language: 'zh-CN', precision: 'minute' })).timeStr).toBe('12:01');
    expect(t).not.toHaveBeenCalled();
    renderWithHooks(() => useIslandTimeStrings({ t, language: 'zh-CN', enabled: false })); runEffects();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('初始化真实格式化文本并在跨日时刷新时间、星期与农历', () => {
    const t = vi.fn((key: string, options?: { defaultValue?: string }) => { void key; return options?.defaultValue ?? ''; });
    let result = renderWithHooks(() => useIslandTimeStrings({ t, language: 'zh-CN' })); runEffects();
    expect(result.timeStr).toBe('23:59'); expect(result.fullTimeStr).toBe('26-10-06 23:59:59'); expect(result.dayStr).toBe('周二');
    expect(result.lunarStr).toMatch(/月/); const previousLunar = result.lunarStr;
    vi.advanceTimersByTime(1000); result = renderWithHooks(() => useIslandTimeStrings({ t, language: 'zh-CN' }));
    expect(result.timeStr).toBe('00:00'); expect(result.fullTimeStr).toBe('26-10-07 00:00:00'); expect(result.dayStr).toBe('周三');
    expect(result.lunarStr).not.toBe(previousLunar); expect(vi.getTimerCount()).toBe(1);
  });
  it('翻译函数和语言依赖改变重建一个定时器，卸载后停止刷新', () => {
    const t = vi.fn((key: string) => key); const translated = vi.fn(() => 'Tuesday');
    renderWithHooks(() => useIslandTimeStrings({ t, language: undefined })); runEffects();
    expect(renderWithHooks(() => useIslandTimeStrings({ t, language: undefined })).dayStr).toBe('overview.time.weekdays.2');
    renderWithHooks(() => useIslandTimeStrings({ t: translated, language: 'en-US' })); runEffects();
    expect(renderWithHooks(() => useIslandTimeStrings({ t: translated, language: 'en-US' })).dayStr).toBe('Tuesday');
    expect(vi.getTimerCount()).toBe(1); unmountHooks(); vi.advanceTimersByTime(2000); expect(vi.getTimerCount()).toBe(0);
  });
});
