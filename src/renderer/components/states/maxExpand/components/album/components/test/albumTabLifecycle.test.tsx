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
 * @file albumTabLifecycle.test.tsx
 * @description 真实相册主组件注册的原图清理在切换查看器及卸载时执行，保持组合边界。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../hooks/test/albumHookHarness';
import { find, invoke, elements } from '../../../../../test/tree';
const data = vi.hoisted(() => ({
  items: {
    items: [],
    loaded: true,
    statusMessage: '',
    releaseFullImage: vi.fn()
  },
  viewer: {
    activeId: null as number | null,
    setActiveId: vi.fn()
  },
  drag: {
    dragOverPage: false
  }
}));
vi.mock('../../hooks/useAlbumItems', () => ({
  useAlbumItems: () => data.items
}));
vi.mock('../../hooks/useAlbumViewer', () => ({
  useAlbumViewer: () => data.viewer
}));
vi.mock('../../hooks/useAlbumGridConfig', () => ({
  useAlbumGridConfig: () => ({
    filteredItems: [],
    groupedItems: []
  })
}));
vi.mock('../../hooks/useAlbumViewerActions', () => ({
  useAlbumViewerActions: () => ({})
}));
vi.mock('../../hooks/useAlbumSelection', () => ({
  useAlbumSelection: () => ({})
}));
vi.mock('../../hooks/useAlbumDrag', () => ({
  useAlbumDrag: () => data.drag
}));
const {
  AlbumTab
} = await import('../AlbumTab');
const {
  AlbumViewer
} = await import('../AlbumViewer');
const {
  AlbumOverview
} = await import('../AlbumOverview');
beforeEach(() => {
  resetHook();
  data.viewer.activeId = null;
  data.viewer.setActiveId.mockReset();
  data.items.releaseFullImage.mockReset();
  data.items.statusMessage = '';
  data.drag.dragOverPage = false;
});
afterEach(unmountHook);
describe('album tab original image cleanup effect', () => {
  it('registers cleanup after real component render, cleans prior viewing state and closes via onBack', () => {
    renderHook(AlbumTab);
    flushHookEffects();
    expect(data.items.releaseFullImage).not.toHaveBeenCalled();
    data.viewer.activeId = 1;
    const active = renderHook(AlbumTab);
    flushHookEffects();
    expect(data.items.releaseFullImage).toHaveBeenCalledOnce();
    invoke(find(active, (node) => node.type === AlbumViewer), 'onBack');
    expect(data.viewer.setActiveId).toHaveBeenCalledWith(null);
    data.viewer.activeId = null;
    const tree = renderHook(AlbumTab);
    flushHookEffects();
    expect(data.items.releaseFullImage).toHaveBeenCalledTimes(2);
    expect(elements(tree).some((node) => node.type === AlbumOverview)).toBe(true);
    unmountHook();
    expect(data.items.releaseFullImage).toHaveBeenCalledTimes(3);
  });
});
