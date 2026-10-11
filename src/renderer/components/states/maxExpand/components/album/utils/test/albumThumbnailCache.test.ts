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
 * @file albumThumbnailCache.test.ts
 * @description 验证小缩略图的条数上限、近期可视区优先保留及显式删除释放预算。
 * @author 鸡哥
 */
import { expect, it } from 'vitest';
import { AlbumThumbnailCache } from '../albumThumbnailCache';
it('bounds small thumbnails by count and protects recently visible entries during eviction', () => {
  const cache = new AlbumThumbnailCache();
  const retained = new Set<number>();
  for (let id = 0; id < 300; id += 1) {
    retained.add(id);
    cache.put(id, 'small', new Set([0, id])).forEach((evicted) => retained.delete(evicted));
  }
  expect(retained.size).toBe(128);
  expect(retained.has(0)).toBe(true);
  expect(retained.has(299)).toBe(true);
  expect(retained.has(1)).toBe(false);
  cache.remove(0);
  expect(cache.put(300, 'small', new Set())).toEqual([]);
});
