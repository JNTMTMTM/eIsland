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
 * @file useAlbumGridConfigRuntime.test.ts
 * @description 真实相册网格配置的初始化、持久化、筛选、六种排序及文件夹/日期分组测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, language, renderHook, resetHook, settleHook, unmountHook } from './albumHookHarness';
import type { AlbumItem, AlbumMeta, AlbumSortMode, AlbumGroupMode } from '../../types/albumTypes';
const {
  useAlbumGridConfig
} = await import('../useAlbumGridConfig');
const write = vi.fn<(key: string, value: unknown) => Promise<boolean>>();
let items: AlbumItem[];
let meta: Record<number, AlbumMeta>;
let loaded: boolean;
let columns: number;
let sort: AlbumSortMode;
let group: AlbumGroupMode;
/** 执行真实网格 Hook。
 * @returns 网格数据及交互回调
 */
function view() {
  return renderHook(useAlbumGridConfig, items, meta, loaded, columns, sort, group);
}
/** 提交配置初始化及持久化 effect。
 * @returns 当前网格状态
 */
async function commit() {
  view();
  flushHookEffects();
  await settleHook();
  view();
  flushHookEffects();
  await settleHook();
  return view();
}
beforeEach(() => {
  resetHook();
  write.mockReset();
  write.mockResolvedValue(true);
  loaded = false;
  columns = 5;
  sort = 'addedDesc';
  group = 'none';
  language.current = 'zh-CN';
  meta = {};
  items = [{
    id: 1,
    path: 'C:/summer/z.jpg',
    name: 'z.jpg',
    ext: 'jpg',
    mediaType: 'image',
    addedAt: 1700000000000
  }, {
    id: 2,
    path: 'C:/summer/a.mp4',
    name: 'a.mp4',
    ext: 'mp4',
    mediaType: 'video',
    addedAt: 1700000000001
  }, {
    id: 3,
    path: 'plain.jpg',
    name: 'plain.jpg',
    ext: 'jpg',
    mediaType: 'image',
    addedAt: 0
  }];
  vi.stubGlobal('window', {
    api: {
      storeWrite: write
    }
  });
  vi.stubGlobal('navigator', {
    language: 'en-US'
  });
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('album grid config', () => {
  it('waits for loaded config, applies it once, persists updates and catches rejected writes', async () => {
    await commit();
    expect(write).not.toHaveBeenCalled();
    loaded = true;
    columns = 7;
    sort = 'nameAsc';
    group = 'folder';
    await commit();
    expect(view()).toMatchObject({
      columns: 7,
      sortMode: 'nameAsc',
      groupMode: 'folder'
    });
    expect(write).toHaveBeenCalledWith('photo-album-columns', 7);
    expect(write).toHaveBeenCalledWith('photo-album-sort', 'nameAsc');
    expect(write).toHaveBeenCalledWith('photo-album-group-mode', 'folder');
    columns = 3;
    sort = 'nameDesc';
    group = 'date';
    await commit();
    expect(view().columns).toBe(7);
    write.mockRejectedValue(new Error('storage'));
    view().handleColumnsChange(100);
    view().handleSortChange('nameDesc');
    view().handleGroupModeChange('date');
    await commit();
    expect(view().columns).toBe(8);
    view().handleColumnsChange(-100);
    await commit();
    expect(view().columns).toBe(3);
  });
  it.each(['addedDesc', 'addedAsc', 'nameAsc', 'nameDesc', 'durationDesc', 'durationAsc'] as const)('accepts %s but ignores other sort values', (value) => {
    view().handleSortChange(value);
    expect(view().sortMode).toBe(value);
    view().handleSortChange('invalid');
    expect(view().sortMode).toBe(value);
  });
  it('filters images and videos while all mode keeps the sorted result', () => {
    expect(view().filteredItems).toHaveLength(3);
    view().handleFilterModeChange('image');
    expect(view().filteredItems.map((item) => item.id)).toEqual([1, 3]);
    view().handleFilterModeChange('video');
    expect(view().filteredItems.map((item) => item.id)).toEqual([2]);
    view().setFilterMode('all');
    expect(view().groupedItems).toHaveLength(1);
  });
  it('groups common folders together and uses translated unknown folder for relative paths', () => {
    view().handleGroupModeChange('folder');
    const groups = view().groupedItems;
    expect(groups.find((entry) => entry.key === 'C:/summer')?.items.map((item) => item.id)).toEqual([2, 1]);
    expect(groups.find((entry) => entry.key === '-')).toMatchObject({
      title: 'albumTab.group.unknownFolder',
      subtitle: ''
    });
  });
  it.each(['zh-CN', '', 'navigator-empty'])('groups dates using locale fallback %s and translates unknown dates', (locale) => {
    language.current = locale === 'navigator-empty' ? '' : locale;
    vi.stubGlobal('navigator', {
      language: locale === 'navigator-empty' ? '' : 'en-US'
    });
    items = [items[0], {
      ...items[1],
      addedAt: items[0].addedAt
    }, {
      ...items[2],
      addedAt: NaN
    }];
    view().handleGroupModeChange('date');
    const groups = view().groupedItems;
    expect(groups).toHaveLength(2);
    expect(groups.find((entry) => entry.key === '-')).toMatchObject({
      title: 'albumTab.group.unknownDate',
      subtitle: ''
    });
    expect(groups.find((entry) => entry.key !== '-')?.items).toHaveLength(2);
  });
});
