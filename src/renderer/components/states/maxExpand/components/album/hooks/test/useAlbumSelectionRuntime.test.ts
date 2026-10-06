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
 * @file useAlbumSelectionRuntime.test.ts
 * @description 真实相册选择 Hook 的可见范围、存留项清理和批量删除联动测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from './albumHookHarness';
import type { AlbumItem } from '../../types/albumTypes';
const {
  useAlbumSelection
} = await import('../useAlbumSelection');
const item = (id: number): AlbumItem => ({
  id,
  path: `C:/${  id  }.jpg`,
  name: `${id  }.jpg`,
  ext: 'jpg',
  mediaType: 'image',
  addedAt: id
});
let items: AlbumItem[];
let filtered: AlbumItem[];
let active: number | null;
const setActive = vi.fn();
const remove = vi.fn();
/** 执行实际选择状态回调。
 * @returns 当前选择状态
 */
function view() {
  return renderHook(useAlbumSelection, items, filtered, active, setActive, remove);
}
beforeEach(() => {
  resetHook();
  items = [item(1), item(2), item(3)];
  filtered = items.slice(0, 2);
  active = null;
  setActive.mockReset();
  remove.mockReset();
});
afterEach(unmountHook);
describe('album visible selection', () => {
  it('toggles an individual selection and select mode clears items on exit', () => {
    view();
    flushHookEffects();
    expect(view().selectedCount).toBe(0);
    view().handleToggleItemSelection(1);
    expect(view().visibleSelectedCount).toBe(1);
    view().handleToggleItemSelection(1);
    expect(view().selectedCount).toBe(0);
    view().handleToggleSelectMode();
    expect(view().selectMode).toBe(true);
    view().handleToggleItemSelection(1);
    view().handleToggleSelectMode();
    expect(view().selectMode).toBe(false);
    expect(view().selectedCount).toBe(0);
  });
  it('selects only visible items and keeps hidden selections while deselecting visible items', () => {
    view().handleToggleItemSelection(3);
    view().handleSelectAllVisible();
    expect(view().selectedIds).toEqual(new Set([1, 2, 3]));
    expect(view().allVisibleSelected).toBe(true);
    view().handleSelectAllVisible();
    expect(view().selectedIds).toEqual(new Set([3]));
    filtered = [];
    expect(view().allVisibleSelected).toBe(false);
    view().handleSelectAllVisible();
    expect(view().selectedIds).toEqual(new Set([3]));
    view().handleClearSelection();
    expect(view().selectedCount).toBe(0);
  });
  it('preserves unchanged selections and removes selected IDs deleted from source items', () => {
    view().handleToggleItemSelection(1);
    view().handleToggleItemSelection(3);
    const selected = view().selectedIds;
    items = [...items];
    view();
    flushHookEffects();
    expect(view().selectedIds).toBe(selected);
    items = items.filter((entry) => entry.id !== 3);
    view();
    flushHookEffects();
    expect(view().selectedIds).toEqual(new Set([1]));
  });
  it.each([null, 1, 2])('removes selected items and only closes a selected active viewer %s', (value) => {
    active = value;
    view().handleRemoveSelectedItems();
    expect(remove).not.toHaveBeenCalled();
    view().handleToggleItemSelection(1);
    view().handleRemoveSelectedItems();
    expect(remove).toHaveBeenCalledWith(new Set([1]));
    expect(setActive.mock.calls).toEqual(value === 1 ? [[null]] : []);
    expect(view().selectedCount).toBe(0);
  });
});
