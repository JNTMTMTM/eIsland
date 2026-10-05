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
 * @file albumOverview.test.tsx
 * @description AlbumOverview 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { AlbumOverview as Component } from '../AlbumOverview';
import { AlbumGridItem } from '../AlbumGridItem';
describe('AlbumOverview', () => {
  const props = { totalCount: 0, filteredCount: 0, columns: 3, groupMode: 'none', groupedItems: [], metaCache: {}, selectedIds: new Set(), onPickFiles: vi.fn() };
  it('distinguishes an empty album from a filter with no matches', () => {
    const empty = render(Component, props);
    expect(text(empty)).toContain('albumTab.empty.title');
    trigger(empty, '.album-primary-btn', 'onClick');
    expect(props.onPickFiles).toHaveBeenCalledOnce();
    const filtered = render(Component, { ...props, totalCount: 1 });
    expect(text(filtered)).toContain('albumTab.empty.filteredTitle');
    expect(nodes(filtered, 'button')).toHaveLength(0);
  });
  it('maps selected items and metadata and shows headers only for grouping', () => {
    const item = { id: 'a' }; const meta = { thumbnailUrl: 'thumb' };
    const populated = { ...props, totalCount: 1, filteredCount: 1, groupedItems: [{ key: 'g', title: 'Group', subtitle: 'Path', items: [item] }], metaCache: { a: meta }, selectedIds: new Set(['a']) };
    const tree = render(Component, populated);
    expect(value(tree, AlbumGridItem, 'selected')).toBe(true);
    expect(value(tree, AlbumGridItem, 'meta')).toBe(meta);
    expect(nodes(tree, '.album-group-header')).toHaveLength(0);
    expect(text(render(Component, { ...populated, groupMode: 'folder' }))).toContain('GroupPath');
  });
});
