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
 * @file albumHeaderRuntime.test.tsx
 * @description 真实相册工具栏筛选/分组状态、列数边界和实际事件转发测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, resetHook, unmountHook } from '../../hooks/test/albumHookHarness';
import { byClass, find, invoke, text, elements } from '../../../../../test/tree';
import type { AlbumHeaderProps } from '../../types/albumTypes';
const {
  AlbumHeader
} = await import('../AlbumHeader');
let props: AlbumHeaderProps;
beforeEach(() => {
  resetHook();
  props = {
    totalCount: 3,
    filteredCount: 3,
    sortMode: 'addedDesc',
    filterMode: 'all',
    groupMode: 'none',
    columns: 5,
    selectMode: false,
    onSortChange: vi.fn(),
    onFilterModeChange: vi.fn(),
    onGroupModeChange: vi.fn(),
    onColumnsChange: vi.fn(),
    onPickFiles: vi.fn(),
    onToggleSelectMode: vi.fn()
  };
});
afterEach(unmountHook);
describe('album header options', () => {
  it.each(['all', 'image', 'video'] as const)('renders %s filter and forwards all toolbar actions', (mode) => {
    props.filterMode = mode;
    const tree = renderHook(AlbumHeader, props);
    expect(elements(tree).filter((node) => node.props.className === 'album-filter-btn album-filter-btn--active')).toHaveLength(2);
    ['all', 'image', 'video'].forEach((filter) => invoke(find(tree, (node) => node.type === 'button' && text(node) === `albumTab.filter.${  filter}`), 'onClick'));
    expect(props.onFilterModeChange).toHaveBeenCalledTimes(3);
    invoke(byClass(tree, 'album-sort-select'), 'onChange', {
      target: {
        value: 'nameDesc'
      }
    });
    expect(props.onSortChange).toHaveBeenCalledWith('nameDesc');
    invoke(find(tree, (node) => node.props.title === 'albumTab.columns.smaller'), 'onClick');
    invoke(find(tree, (node) => node.props.title === 'albumTab.columns.larger'), 'onClick');
    expect(props.onColumnsChange).toHaveBeenNthCalledWith(1, -1);
    expect(props.onColumnsChange).toHaveBeenNthCalledWith(2, 1);
    invoke(byClass(tree, 'album-primary-btn'), 'onClick');
    invoke(find(tree, (node) => node.props.title === 'albumTab.actions.select'), 'onClick');
    expect(props.onPickFiles).toHaveBeenCalledOnce();
    expect(props.onToggleSelectMode).toHaveBeenCalledOnce();
  });
  it.each(['none', 'folder', 'date'] as const)('renders %s grouping and disabled boundary columns', (group) => {
    props.groupMode = group;
    props.columns = 3;
    props.filteredCount = 0;
    props.selectMode = true;
    let tree = renderHook(AlbumHeader, props);
    expect(find(tree, (node) => node.props.title === 'albumTab.columns.smaller').props.disabled).toBe(true);
    expect(find(tree, (node) => node.props.title === 'albumTab.actions.select').props.disabled).toBe(true);
    ['none', 'folder', 'date'].forEach((mode) => invoke(find(tree, (node) => node.type === 'button' && text(node) === `albumTab.group.${  mode}`), 'onClick'));
    expect(props.onGroupModeChange).toHaveBeenCalledTimes(3);
    props.columns = 8;
    tree = renderHook(AlbumHeader, props);
    expect(find(tree, (node) => node.props.title === 'albumTab.columns.larger').props.disabled).toBe(true);
  });
});
