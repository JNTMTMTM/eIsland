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
 * @file useClockTick.test.ts
 * @description 真实城市 tick 构建、加载边界、定时刷新、依赖更新与清理测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClockTick } from '../useClockTick';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
import { CLOCK_UPDATE_INTERVAL_MS } from '../../config/worldClockConfig';
import type { WorldClockCity } from '../../types/worldClockTypes';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
const cities: WorldClockCity[] = [{ timezone: 'UTC', label: 'UTC', order: 2 }, { timezone: 'Asia/Shanghai', label: 'Shanghai', order: 1 }];
/**
 * 提交真实 tick effect 与城市计算。
 * @param items - 当前城市。
 * @param loaded - 是否完成加载。
 * @param local - 当前本机时区。
 * @param locale - 当前语言。
 * @returns 真实时钟 tick。
 */
function view(items = cities, loaded = true, local = 'UTC', locale = 'en-US') {
  renderWithHooks(() => useClockTick(items, loaded, local, locale));
  runEffects();
  return renderWithHooks(() => useClockTick(items, loaded, local, locale));
}
beforeEach(() => {
  resetLifecycle();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-02T03:04:05Z'));
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
});
describe('useClockTick actual time engine', () => {
  it('waits for loading and accepts empty cities without a timer', () => {
    expect(view(cities, false)).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    expect(view([], true)).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('sorts real ticks, advances second hands and updates locale/local timezone without duplicate timers', () => {
    const first = view();
    expect(first.map((tick) => tick.timezone)).toEqual(['Asia/Shanghai', 'UTC']);
    expect(first[1]).toMatchObject({ label: 'UTC', isLocal: true, utcOffset: '+00:00', handAngles: { second: 30 } });
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(CLOCK_UPDATE_INTERVAL_MS);
    const next = view();
    expect(next[1].handAngles.second).toBe(36);
    expect(next[1].formattedTime).not.toBe(first[1].formattedTime);
    const switched = view(cities, true, 'Asia/Shanghai', 'zh-CN');
    expect(switched[0].isLocal).toBe(true);
    expect(switched[1].isLocal).toBe(false);
    expect(switched[0].formattedDate).toBe(new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric' }).format(new Date()));
    expect(vi.getTimerCount()).toBe(1);
    expect(view([], true)).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('clears a running interval on unmount', () => {
    view();
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
  });
});
