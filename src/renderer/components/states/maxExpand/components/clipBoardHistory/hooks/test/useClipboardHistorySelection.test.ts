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
 * @file useClipboardHistorySelection.test.ts
 * @description 剪贴板真实筛选与时间清理、选择动画、批量删除和外部数据变化测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useClipboardHistorySelection } from '../useClipboardHistorySelection';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import type { ClipboardCleanupRange, ClipboardHistoryItem, UseClipboardHistorySelectionReturn } from '../../types/clipboardHistoryTypes';

vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});

let items: ClipboardHistoryItem[];
let expandedId: number | null;
const setExpanded = vi.fn<(value: React.SetStateAction<number | null>) => void>();
const setText = vi.fn<(value: React.SetStateAction<string>) => void>();
const setItems = vi.fn<(value: React.SetStateAction<ClipboardHistoryItem[]>) => void>();

/** 用公开入参提交真实生命周期。
 * @returns 真实 Hook 的当前结果
 */
function render(): UseClipboardHistorySelectionReturn {
  const value = renderHook(useClipboardHistorySelection, items, setItems, expandedId, setExpanded, setText);
  flushHookEffects();
  return value;
}

beforeEach(() => {
  resetHook();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 5, 12));
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  items = [
    { id: 1, text: 'https://one.example', createdAt: Date.now() },
    { id: 2, text: 'plain text', createdAt: Date.now() - 86400000 },
    { id: 3, text: 'older text', createdAt: Date.now() - 40 * 86400000 },
  ];
  expandedId = null;
  setExpanded.mockReset().mockImplementation((value) => { expandedId = typeof value === 'function' ? value(expandedId) : value; });
  setText.mockReset();
  setItems.mockReset().mockImplementation((value) => { items = typeof value === 'function' ? value(items) : value; });
});
afterEach(() => { unmountHook(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('derives visible counts and removes selected IDs absent from a new snapshot', () => {
  let hook = render();
  expect(hook.visibleItems).toEqual(items);
  expect(hook.allSelected).toBe(false);
  hook.setSelectedIds([1, 2, 99]);
  hook = render();
  expect(hook.selectedCount).toBe(3);
  items = items.slice(1);
  render();
  expect(render().selectedIds).toEqual([2]);
  items = [];
  expect(render().allSelected).toBe(false);
});

it('selects the current cleanup range and collapses after the animation', async () => {
  let hook = render();
  hook.handleToggleSelectionMode();
  hook = render();
  expect(hook.selectedIds).toEqual([1]);
  hook.handleToggleSelectionMode();
  hook = render();
  expect(hook.selectionCollapsing).toBe(true);
  hook.handleToggleSelectionMode();
  expect(vi.getTimerCount()).toBe(1);
  await vi.advanceTimersByTimeAsync(180);
  hook = render();
  expect(hook.selectionMode).toBe(false);
  expect(hook.selectionCollapsing).toBe(false);
  expect(hook.selectedIds).toEqual([]);
});

it('replaces a pending animation through the public mode setters and clears it at unmount', () => {
  let hook = render();
  hook.handleToggleSelectionMode();
  hook = render();
  hook.handleToggleSelectionMode();
  hook = render();
  hook.setSelectionCollapsing(false);
  hook = render();
  hook.handleToggleSelectionMode();
  expect(vi.getTimerCount()).toBe(1);
  hook = render();
  hook.setSelectionMode(false);
  hook = render();
  hook.handleToggleSelectionMode();
  expect(vi.getTimerCount()).toBe(0);
  hook = render();
  hook.handleToggleSelectionMode();
  unmountHook();
  expect(vi.getTimerCount()).toBe(0);
});

it('toggles individual and visible selections while retaining hidden selections', () => {
  let hook = render();
  hook.handleToggleSelect(2);
  hook = render();
  hook.handleToggleSelect(2);
  expect(render().selectedIds).toEqual([]);
  hook = render();
  hook.setActiveFilter('url');
  hook.setSelectedIds([2]);
  hook = render();
  hook.handleToggleSelectAll();
  hook = render();
  expect(hook.selectedIds).toEqual([2, 1]);
  expect(hook.allSelected).toBe(true);
  hook.handleToggleSelectAll();
  expect(render().selectedIds).toEqual([2]);
});

it.each(['lastHour', 'today', 'last7Days', 'last30Days', 'olderThan30Days'] as ClipboardCleanupRange[])('uses the real date boundaries for %s', (range) => {
  const hook = render();
  hook.handleCleanupRangeChange(range);
  const current = render();
  const expectedByRange = { olderThan30Days: [3], lastHour: [1], today: [1], last7Days: [1, 2], last30Days: [1, 2] };
  const expected = expectedByRange[range];
  expect(current.cleanupRange).toBe(range);
  expect(current.selectedIds).toEqual(expected);
  expect(current.cleanupMatchedCount).toBe(expected.length);
});

it.each([null, 1, 2, 99])('updates the filter and preserves only compatible expansion: %s', (id) => {
  expandedId = id;
  let hook = render();
  hook.setSelectedIds([1, 2]);
  hook = render();
  hook.handleFilterChange('url');
  hook = render();
  expect(hook.selectedIds).toEqual([]);
  expect(hook.visibleItems.map((item) => item.id)).toEqual([1]);
  expect(setExpanded).toHaveBeenCalledTimes(id === 2 ? 1 : 0);
  expect(setText).toHaveBeenCalledTimes(id === 2 ? 1 : 0);
});

it.each([null, 1, 2])('deletes selected items and closes matching expansion: %s', (id) => {
  expandedId = id;
  let hook = render();
  hook.handleRemoveSelected();
  expect(setItems).not.toHaveBeenCalled();
  hook.setSelectedIds([1]);
  hook = render();
  hook.handleRemoveSelected();
  expect(items.map((item) => item.id)).toEqual([2, 3]);
  expect(render().selectionMode).toBe(false);
  expect(setText).toHaveBeenCalledTimes(id === 1 ? 1 : 0);
});

it.each([null, 1, 2])('clears the matching date range and preserves the remaining selection: %s', (id) => {
  expandedId = id;
  let hook = render();
  hook.setSelectedIds([1, 2]);
  hook = render();
  hook.handleClearByRange();
  expect(items.map((item) => item.id)).toEqual([2, 3]);
  expect(render().selectedIds).toEqual([2]);
  expect(setText).toHaveBeenCalledTimes(id === 1 ? 1 : 0);
  setItems.mockClear();
  render().handleClearByRange();
  expect(setItems).not.toHaveBeenCalled();
});
