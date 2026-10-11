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
 * @file albumVirtualGrid.test.ts
 * @description 万项相册的有界行窗口、末行、分组和尺寸变化验证。
 * @author 鸡哥
 */
import { describe, expect, it } from 'vitest';
import { buildAlbumVirtualLayout, getAlbumVisibleGroups } from '../useAlbumVirtualGrid';
import type { AlbumItem } from '../../types/albumTypes';
const items: AlbumItem[] = Array.from({length: 10000}, (_, id) => ({id, name: `${id}.jpg`, path: `${id}.jpg`, ext: 'jpg', addedAt: id, mediaType: 'image'}));
describe('album virtual grid', () => {
  it('mounts only the visible rows and two overscan rows at either edge', () => {
    const layout = buildAlbumVirtualLayout([{key: 'all', title: 'all', items}], 5, 800, 'none');
    const first = getAlbumVisibleGroups(layout, 0, 600).flatMap((group) => group.items);
    expect(first.length).toBeLessThan(40);
    expect(first[0].id).toBe(0);
    const last = getAlbumVisibleGroups(layout, layout.totalHeight, 600).flatMap((group) => group.items);
    expect(last.length).toBeLessThan(40);
    expect(last.at(-1)?.id).toBe(9999);
    expect(getAlbumVisibleGroups(layout, 0, 0)).toEqual([]);
  });
  it('positions headers and row padding correctly across groups and column changes', () => {
    const groups = [{key: 'a', title: 'a', subtitle: 'folder', items: items.slice(0, 5000)}, {key: 'b', title: 'b', items: items.slice(5000)}];
    for (const columns of [3, 5, 8]) {
      const layout = buildAlbumVirtualLayout(groups, columns, 1024, 'folder');
      const boundary = layout.groups[1].top;
      const visible = getAlbumVisibleGroups(layout, boundary, 600);
      expect(visible.map((group) => group.group.key)).toContain('b');
      const b = visible.find((group) => group.group.key === 'b')!;
      expect(b.items[0].id).toBe(5000);
      expect(b.paddingTop).toBe(0);
      expect(b.paddingBottom).toBeGreaterThan(0);
      expect(visible.flatMap((group) => group.items).length).toBeLessThan(100);
    }
  });
});
