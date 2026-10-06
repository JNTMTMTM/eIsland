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
 * @file album.test.ts
 * @description 总览相册真实数据过滤、名称回退、数值边界、配置和视频类型解析测试。
 * @author 鸡哥
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOverviewVideoMimeByExt, normalizeOverviewAlbumCardConfig, normalizeOverviewAlbumItems } from '../album';
afterEach(() => vi.useRealTimers());
describe('Overview album real normalization', () => {
  it('filters malformed entries, blank paths and case-insensitive duplicates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1234);
    expect(normalizeOverviewAlbumItems(null)).toEqual([]);
    expect(normalizeOverviewAlbumItems([null, {}, { path: 2 }, { path: ' ' }, { path: ' A.jpg ', ext: 'JPG', name: ' ', id: Infinity, addedAt: NaN }, { path: 'a.JPG' }, { path: 'C:\\folder\\video.mp4', mediaType: 'video', name: ' Named ', ext: 'MP4', id: 5, addedAt: 6 }, { path: '/x/B', name: 3, ext: 3, id: 3 }])).toEqual([
      { path: 'A.jpg', name: 'A.jpg', ext: 'jpg', mediaType: 'image', id: 1234, addedAt: 1234 },
      { path: 'C:\\folder\\video.mp4', name: 'Named', ext: 'mp4', mediaType: 'video', id: 5, addedAt: 6 },
      { path: '/x/B', name: 'B', ext: '', mediaType: 'image', id: 3, addedAt: 1234 }
    ]);
  });
  it.each([3000, 5000, 8000, 2])('validates carousel intervals %s and every public option', (intervalMs) => {
    const config = normalizeOverviewAlbumCardConfig({ intervalMs, orderMode: 'random', mediaFilter: 'video', clickBehavior: 'none', autoRotate: false, videoAutoPlay: false, videoMuted: false });
    expect(config).toEqual({ intervalMs: intervalMs === 2 ? 5000 : intervalMs, orderMode: 'random', mediaFilter: 'video', clickBehavior: 'none', autoRotate: false, videoAutoPlay: false, videoMuted: false });
    expect(normalizeOverviewAlbumCardConfig(null)).toMatchObject({ autoRotate: true, mediaFilter: 'all', clickBehavior: 'open-album', videoAutoPlay: true, videoMuted: true });
    expect(normalizeOverviewAlbumCardConfig({ mediaFilter: 'image' }).mediaFilter).toBe('image');
  });
  it.each([['mp4', 'video/mp4'], ['m4v', 'video/mp4'], ['webm', 'video/webm'], ['mov', 'video/quicktime'], ['avi', 'video/x-msvideo'], ['mkv', 'video/x-matroska'], ['unknown', 'video/mp4']])('maps extension %s to %s', (extension, mime) => {
    expect(getOverviewVideoMimeByExt(extension)).toBe(mime);
  });
});
