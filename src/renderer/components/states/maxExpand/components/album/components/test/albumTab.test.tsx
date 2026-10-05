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
 * @file albumTab.test.tsx
 * @description AlbumTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { AlbumTab as Component } from '../AlbumTab';
import { AlbumHeader } from '../AlbumHeader';
import { AlbumOverview } from '../AlbumOverview';
import { AlbumViewer } from '../AlbumViewer';
const items = vi.hoisted(() => ({ items: [], loaded: true, statusMessage: '', releaseFullImage: vi.fn() }));
const viewer = vi.hoisted(() => ({ activeId: null as string | null, setActiveId: vi.fn() }));
const drag = vi.hoisted(() => ({ dragOverPage: false, handleDrop: vi.fn() }));
vi.mock('../../hooks/useAlbumItems', () => ({ useAlbumItems: () => items }));
vi.mock('../../hooks/useAlbumViewer', () => ({ useAlbumViewer: () => viewer }));
vi.mock('../../hooks/useAlbumGridConfig', () => ({ useAlbumGridConfig: () => ({ filteredItems: [], groupedItems: [] }) }));
vi.mock('../../hooks/useAlbumViewerActions', () => ({ useAlbumViewerActions: () => ({}) }));
vi.mock('../../hooks/useAlbumSelection', () => ({ useAlbumSelection: () => ({}) }));
vi.mock('../../hooks/useAlbumDrag', () => ({ useAlbumDrag: () => drag }));
describe('AlbumTab', () => {
  it('switches overview and viewer and forwards drag/drop and return callbacks', () => {
    const tree = render(Component);
    expect(nodes(tree, AlbumOverview)).toHaveLength(1);
    expect(value(tree, AlbumHeader, 'totalCount')).toBe(0);
    expect(nodes(tree, '.album-status')).toHaveLength(0);
    viewer.activeId = 'a'; items.statusMessage = 'Added'; drag.dragOverPage = true;
    const active = render(Component);
    expect(nodes(active, AlbumViewer)).toHaveLength(1);
    expect(nodes(active, '.album-drop-mask')).toHaveLength(1);
    expect(text(active)).toContain('Added');
    trigger(active, AlbumViewer, 'onBack');
    expect(viewer.setActiveId).toHaveBeenCalledWith(null);
    trigger(active, '.album-tab', 'onDrop', { files: [] });
    expect(drag.handleDrop).toHaveBeenCalledWith({ files: [] });
  });
});
