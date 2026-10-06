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
 * @file useDebouncedQuery.test.ts
 * @description 城市查询真实防抖、重复输入、重置和卸载计时器清理测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedQuery } from '../useDebouncedQuery';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
import { PICKER_SEARCH_DEBOUNCE_MS } from '../../config/worldClockConfig';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
/**
 * 渲染公开查询状态与输入回调。
 * @param delay - 公开防抖延迟。
 * @returns 查询状态和操作。
 */
function view(delay?: number) {
  return renderWithHooks(() => useDebouncedQuery(delay));
}
beforeEach(() => {
  resetLifecycle();
  vi.useFakeTimers();
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
});
describe('useDebouncedQuery timer lifecycle', () => {
  it('updates input immediately and emits only the latest value at the default delay', () => {
    view();
    runEffects();
    view().handleQueryChange('first');
    expect(view()).toMatchObject({ query: 'first', debouncedQuery: '' });
    vi.advanceTimersByTime(PICKER_SEARCH_DEBOUNCE_MS - 1);
    view().handleQueryChange('second');
    vi.advanceTimersByTime(PICKER_SEARCH_DEBOUNCE_MS - 1);
    expect(view().debouncedQuery).toBe('');
    vi.advanceTimersByTime(1);
    expect(view().debouncedQuery).toBe('second');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('resets both values with or without pending timers and permits a later custom-delay input', () => {
    view(20);
    runEffects();
    view(20).resetQuery();
    view(20).handleQueryChange('pending');
    view(20).resetQuery();
    expect(view(20)).toMatchObject({ query: '', debouncedQuery: '' });
    expect(vi.getTimerCount()).toBe(0);
    view(20).handleQueryChange('later');
    vi.advanceTimersByTime(20);
    expect(view(20).debouncedQuery).toBe('later');
    view(20).resetQuery();
    expect(view(20)).toMatchObject({ query: '', debouncedQuery: '' });
  });
  it.each([false, true])('unmounts safely with pending input %s', (pending) => {
    view();
    runEffects();
    if (pending) view().handleQueryChange('cancelled');
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(PICKER_SEARCH_DEBOUNCE_MS);
    expect(view().debouncedQuery).toBe('');
  });
});
