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
 * @file albumHeader.test.tsx
 * @description AlbumHeader 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { AlbumHeader as Component } from '../AlbumHeader';
import { MIN_COLUMNS, MAX_COLUMNS } from '../../config/albumConfig';
describe('AlbumHeader', () => {
  const props = { totalCount: 3, filteredCount: 0, columns: MIN_COLUMNS, filterMode: 'all', groupMode: 'none', onSortChange: vi.fn(), onFilterModeChange: vi.fn(), onGroupModeChange: vi.fn(), onColumnsChange: vi.fn(), onPickFiles: vi.fn(), onToggleSelectMode: vi.fn() };
  it('enforces column boundaries and disables selection without filtered items', () => {
    const minimum = render(Component, props);
    expect(value(minimum, '.album-icon-btn', 'disabled')).toBe(true);
    expect(value(minimum, '.album-text-btn', 'disabled')).toBe(true);
    const maximum = render(Component, { ...props, columns: MAX_COLUMNS, filteredCount: 2, selectMode: true });
    expect(value(maximum, '.album-icon-btn', 'disabled', 1)).toBe(true);
    expect(value(maximum, '.album-text-btn', 'disabled')).toBe(false);
    expect(nodes(maximum, '.album-text-btn--active')).toHaveLength(1);
  });
  it('routes sort, every filter and grouping choice and add action', () => {
    const tree = render(Component, props);
    trigger(tree, 'select', 'onChange', { target: { value: 'nameAsc' } });
    nodes(tree, '.album-filter-btn').forEach((node) => (node.props.onClick as () => void)());
    trigger(tree, '.album-primary-btn', 'onClick');
    expect(props.onSortChange).toHaveBeenCalledWith('nameAsc');
    expect(props.onFilterModeChange.mock.calls).toEqual([['all'], ['image'], ['video']]);
    expect(props.onGroupModeChange.mock.calls).toEqual([['none'], ['folder'], ['date']]);
    expect(props.onPickFiles).toHaveBeenCalledOnce();
  });
});
