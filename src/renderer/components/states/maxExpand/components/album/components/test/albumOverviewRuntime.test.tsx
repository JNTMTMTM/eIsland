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
 * @file albumOverviewRuntime.test.tsx
 * @description 真实相册总览空态、分组副标题及滚轮传播边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, resetHook, unmountHook } from '../../hooks/test/albumHookHarness';
import { byClass, invoke, text, elements } from '../../../../../test/tree';
import type { AlbumOverviewProps } from '../../types/albumTypes';
const {
  AlbumOverview
} = await import('../AlbumOverview');
let props: AlbumOverviewProps;
beforeEach(() => {
  resetHook();
  props = {
    totalCount: 1,
    filteredCount: 1,
    columns: 5,
    groupMode: 'folder',
    groupedItems: [{
      key: 'folder',
      title: 'Folder',
      items: []
    }],
    metaCache: {},
    selectedIds: new Set(),
    selectMode: false,
    onToggleSelection: vi.fn(),
    onOpen: vi.fn(),
    onRemove: vi.fn(),
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
    gridVideoRefs: {
      current: {}
    },
    onPickFiles: vi.fn()
  };
});
afterEach(unmountHook);
describe('album overview boundary content', () => {
  it('renders title fallback when subtitle is absent and stops parent wheel handling', () => {
    const tree = renderHook(AlbumOverview, props);
    expect(byClass(tree, 'album-group-title').props.title).toBe('Folder');
    expect(elements(tree).some((node) => node.props.className === 'album-group-subtitle')).toBe(false);
    const stopPropagation = vi.fn();
    invoke(byClass(tree, 'album-group-list'), 'onWheelCapture', {
      stopPropagation
    });
    expect(stopPropagation).toHaveBeenCalledOnce();
  });
  it('renders subtitle and both empty messages, forwarding the add action', () => {
    props.groupedItems = [{
      key: 'folder',
      title: 'Folder',
      subtitle: 'C:/folder',
      items: []
    }];
    expect(byClass(renderHook(AlbumOverview, props), 'album-group-subtitle').props.title).toBe('C:/folder');
    props.totalCount = 0;
    let tree = renderHook(AlbumOverview, props);
    expect(text(tree)).toContain('albumTab.empty.title');
    invoke(byClass(tree, 'album-primary-btn'), 'onClick');
    expect(props.onPickFiles).toHaveBeenCalledOnce();
    props.totalCount = 1;
    props.filteredCount = 0;
    tree = renderHook(AlbumOverview, props);
    expect(text(tree)).toContain('albumTab.empty.filteredTitle');
  });
});
