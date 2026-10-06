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
 * @file albumGridItem.test.tsx
 * @description AlbumGridItem 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { AlbumGridItem as Component } from '../AlbumGridItem';

describe('AlbumGridItem', () => {
  const item = { id: 'a', name: 'photo', mediaType: 'image' };
  const props = { item, selected: false, selectMode: false, onOpen: vi.fn(), onToggleSelection: vi.fn(), onRemove: vi.fn(), onMouseEnter: vi.fn(), onMouseLeave: vi.fn(), gridVideoRefs: { current: {} } };
  it('renders image loading, failure and ready thumbnails and routes selection', () => {
    expect(text(render(Component, props))).toContain('albumTab.thumb.loading');
    expect(text(render(Component, { ...props, meta: { loadFailed: true } }))).toContain('albumTab.thumb.failed');
    const tree = render(Component, { ...props, meta: { thumbnailUrl: 'thumb' } });
    expect(value(tree, 'img', 'src')).toBe('thumb');
    trigger(tree, '.album-thumb', 'onClick');
    expect(props.onOpen).toHaveBeenCalledWith(item);
    const selected = render(Component, { ...props, selectMode: true, selected: true });
    trigger(selected, '.album-thumb', 'onClick');
    trigger(selected, '.album-grid-remove', 'onClick');
    expect(props.onToggleSelection).toHaveBeenCalledWith('a');
    expect(props.onRemove).toHaveBeenCalledWith('a');
  });
  it('does not allocate an offscreen video source and retains its duration badge', () => {
    const tree = render(Component, { ...props, item: { ...item, mediaType: 'video' }, meta: { videoUrl: 'video', durationSec: 65 } });
    expect(nodes(tree, 'video')).toHaveLength(0);
    expect(text(tree)).toContain('1:05');
  });
});
