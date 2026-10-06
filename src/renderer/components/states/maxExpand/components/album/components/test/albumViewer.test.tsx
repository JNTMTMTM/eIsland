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
 * @file albumViewer.test.tsx
 * @description AlbumViewer 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, text } from '../../../../test/componentHarness';
import { AlbumViewer as Component } from '../AlbumViewer';
import { ZOOM_MIN, ZOOM_MAX } from '../../config/albumConfig';
describe('AlbumViewer', () => {
  const item = { id: 'a', name: 'photo', path: '/photo' };
  const viewer = { activeItem: item, activeMeta: null, activeIsVideo: false, zoom: ZOOM_MIN, pan: { x: 4, y: 5 }, navigateInViewer: vi.fn(), handleResetZoom: vi.fn(), videoCurrentTime: 10, videoDuration: 0, videoMuted: true, videoVolume: 0.7 };
  const props = { viewer, filteredCount: 1, onBack: vi.fn(), onOpenInExplorer: vi.fn(), onSaveAs: vi.fn() };
  it('renders empty, loading, failed and image-ready branches with zoom boundaries', () => {
    expect(nodes(render(Component, { ...props, viewer: { ...viewer, activeItem: null } }), '.album-viewer')).toHaveLength(0);
    const tree = render(Component, props);
    expect(text(tree)).toContain('albumTab.viewer.loading');
    expect(value(tree, '.album-icon-btn', 'disabled', 1)).toBe(true);
    expect(value(tree, '.album-icon-btn', 'disabled', 3)).toBe(true);
    expect(text(render(Component, { ...props, viewer: { ...viewer, activeMeta: { loadFailed: true } } }))).toContain('albumTab.viewer.failed');
    const image = render(Component, { ...props, filteredCount: 2, viewer: { ...viewer, zoom: ZOOM_MAX, activeMeta: { dataUrl: 'photo-data' } } });
    expect(value(image, '.album-viewer-image', 'style')).toEqual({ transform: `translate(4px, 5px) scale(${  ZOOM_MAX  })` });
    expect(value(image, '.album-icon-btn', 'disabled', 4)).toBe(true);
  });
  it('uses video controls and clamps zero-duration seeking and muted volume', () => {
    const tree = render(Component, { ...props, viewer: { ...viewer, activeIsVideo: true, activeVideoUrl: 'video' } });
    expect(value(tree, '.album-viewer-canvas', 'onWheel')).toBeUndefined();
    expect(value(tree, '.album-video-seek', 'disabled')).toBe(true);
    expect(value(tree, '.album-video-seek', 'value')).toBe(0);
    expect(value(tree, '.album-video-volume', 'value')).toBe(0);
    const collapsed = render(Component, { ...props, viewer: { ...viewer, activeIsVideo: true, activeVideoUrl: 'video', videoControlsCollapsed: true } });
    expect(nodes(collapsed, '.album-video-seek')).toHaveLength(0);
    expect(nodes(collapsed, '.album-viewer-zoom-group')).toHaveLength(0);
  });
});
