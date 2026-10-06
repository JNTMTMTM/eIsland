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
 * @file albumUtils.test.ts
 * @description 相册媒体格式、路径清洗、排序、持久化和损坏输入契约测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { clampColumns, estimateBytesFromDataUrl, formatBytes, formatDateGroup, formatDuration, formatTimestamp, getFolderName, getMediaTypeByExt, getParentFolder, getVideoMimeByExt, guessVideoCodecByExt, persistAlbumItems, revokeBlobUrl, sanitizeAlbumItems, sortAlbumItems } from '../albumUtils';
import type { AlbumItem, AlbumMeta, AlbumSortMode } from '../../types/albumTypes';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('album formatting and media extensions', () => {
  it.each([[undefined, '-'], [NaN, '-'], [Infinity, '-'], [-1, '-'], [0, '-'], [0.9, '0:00'], [61.9, '1:01'], [3661, '1:01:01']])('duration %s -> %s', (value, expected) => {
    expect(formatDuration(value)).toBe(expected);
  });
  it.each([['jpg', 'image'], ['jpeg', 'image'], ['png', 'image'], ['webp', 'image'], ['gif', 'image'], ['bmp', 'image'], ['mp4', 'video'], ['m4v', 'video'], ['mov', 'video'], ['webm', 'video'], ['exe', null]])('media %s -> %s', (ext, expected) => {
    expect(getMediaTypeByExt(ext)).toBe(expected);
  });
  it.each([['mp4', 'video/mp4'], ['m4v', 'video/mp4'], ['webm', 'video/webm'], ['mov', 'video/quicktime'], ['unknown', 'video/mp4']])('mime %s', (ext, expected) => {
    expect(getVideoMimeByExt(ext)).toBe(expected);
  });
  it.each([['mp4', 'H.264/H.265 (container-based)'], ['m4v', 'H.264/H.265 (container-based)'], ['mov', 'H.264/H.265 (container-based)'], ['webm', 'VP8/VP9/AV1 (container-based)'], ['png', '-']])('codec %s', (ext, expected) => {
    expect(guessVideoCodecByExt(ext)).toBe(expected);
  });
  it.each([[undefined, '-'], [NaN, '-'], [Infinity, '-'], [-1, '-'], [0, '0 B'], [1023, '1023 B'], [1024, '1.0 KB'], [1048576, '1.00 MB'], [1073741824, '1.00 GB']])('bytes %s -> %s', (value, expected) => {
    expect(formatBytes(value)).toBe(expected);
  });
  it.each([undefined, NaN, Infinity, 0, -1])('invalid timestamp %s', (value) => {
    expect(formatTimestamp(value)).toBe('-');
  });
  it('formats timestamps locally and handles a locale formatter failure', () => {
    const ts = new Date(2026, 0, 2, 3, 4, 5).getTime();
    expect(formatTimestamp(ts)).toBe(new Date(ts).toLocaleString());
    vi.spyOn(Date.prototype, 'toLocaleString').mockImplementation(() => {
      throw new Error('locale unavailable');
    });
    expect(formatTimestamp(ts)).toBe('-');
  });
  it('formats date groups and rejects invalid timestamps/locales', () => {
    const ts = new Date(2026, 0, 2).getTime();
    expect(formatDateGroup(ts, 'en-US')).toBe('01/02/2026');
    expect(formatDateGroup(ts, 'invalid_@locale')).toBe('-');
    [NaN, Infinity, 0, -1].forEach((invalid) => {
      expect(formatDateGroup(invalid, 'en-US')).toBe('-');
    });
    expect(formatDateGroup(Number.MAX_VALUE, 'en-US')).toBe('-');
  });
  it('revokes only nonempty blob URLs', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    [undefined, '', 'https://example.test/image', 'blob:local'].forEach((url) => {
      revokeBlobUrl(url);
    });
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:local');
  });
});

describe('album path and input normalization', () => {
  it.each([['file.png', '-'], ['/file.png', '-'], [' /folder/image.png ', '/folder'], ['C:\\folder\\image.png', 'C:\\folder']])('parent folder %s', (path, expected) => {
    expect(getParentFolder(path)).toBe(expected);
  });
  it.each([['', '-'], ['-', '-'], ['folder', 'folder'], ['/root/folder', 'folder'], ['C:\\folder', 'folder'], ['/folder/', '/folder/']])('folder name %s', (path, expected) => {
    expect(getFolderName(path)).toBe(expected);
  });
  it.each([['invalid', 0], ['data:,', 0], ['data:;base64,YQ==', 1], ['data:;base64,YWI=', 2], ['data:;base64,YWJj', 3], ['data:;base64,====', 1]])('base64 estimate %s', (data, expected) => {
    expect(estimateBytesFromDataUrl(data)).toBe(expected);
  });
  it.each([null, undefined, false, 1, 'wrong', {}])('rejects non-array %s', (value) => {
    expect(sanitizeAlbumItems(value)).toEqual([]);
  });
  it('filters invalid paths/extensions, deduplicates case-insensitively, fills defaults', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    const result = sanitizeAlbumItems([
      null, {}, { path: 4 }, { path: '  ' }, { path: '/folder/a.exe' }, { path: 'unknown' },
      { path: ' C:\\images\\A.PNG ', name: ' custom ', id: 10, addedAt: 20 },
      { path: 'c:\\images\\a.png', id: 11 },
      { path: '/movies/b.MP4', id: Infinity, addedAt: NaN, name: '' },
      { path: 'stream', mediaType: 'video', name: 4 },
      { path: 'bare.jpg', mediaType: 'invalid', addedAt: 42 },
      { path: '/other.jpg', mediaType: 'image', name: '  ', id: NaN, addedAt: 'bad' },
    ]);
    expect(result).toEqual([
      { id: 10, path: 'C:\\images\\A.PNG', name: 'custom', ext: 'png', mediaType: 'image', addedAt: 20 },
      { id: 1234, path: '/movies/b.MP4', name: 'b.MP4', ext: 'mp4', mediaType: 'video', addedAt: 1234 },
      { id: 1234, path: 'stream', name: 'stream', ext: '', mediaType: 'video', addedAt: 1234 },
      { id: 42, path: 'bare.jpg', name: 'bare.jpg', ext: 'jpg', mediaType: 'image', addedAt: 42 },
      { id: 1234, path: '/other.jpg', name: 'other.jpg', ext: 'jpg', mediaType: 'image', addedAt: 1234 },
    ]);
  });
  it.each([[undefined, 5], [NaN, 5], [Infinity, 5], ['7', 5], [-1, 3], [3.49, 3], [3.5, 4], [9, 8], [5, 5]])('column clamp %s', (value, expected) => {
    expect(clampColumns(value)).toBe(expected);
  });
});

const items: AlbumItem[] = [
  { id: 1, path: 'a.mp4', name: 'A', ext: 'mp4', mediaType: 'video', addedAt: 30 },
  { id: 2, path: 'c.mp4', name: 'C', ext: 'mp4', mediaType: 'video', addedAt: 10 },
  { id: 3, path: 'b.mp4', name: 'B', ext: 'mp4', mediaType: 'video', addedAt: 20 },
];
const meta: Record<number, AlbumMeta> = { 1: { durationSec: 8 }, 2: { durationSec: 4 } };

describe('album sorting and persistence', () => {
  it('keeps equal missing durations stable on both comparator sides', () => {
    const missing = { 1: {}, 2: {}, 3: {} };
    const reversed = [items[2], items[1], items[0]];
    expect(sortAlbumItems(reversed, 'durationDesc', missing)).toEqual(reversed);
    expect(sortAlbumItems(reversed, 'durationAsc', missing)).toEqual(reversed);
  });
  it.each<{ mode: AlbumSortMode; order: number[] }>([
    { mode: 'addedDesc', order: [1, 3, 2] }, { mode: 'addedAsc', order: [2, 3, 1] },
    { mode: 'nameAsc', order: [1, 3, 2] }, { mode: 'nameDesc', order: [2, 3, 1] },
    { mode: 'durationDesc', order: [1, 2, 3] }, { mode: 'durationAsc', order: [2, 1, 3] },
  ])('sorts $mode without mutating input', ({ mode, order }) => {
    expect(sortAlbumItems(items, mode, meta).map((item) => item.id)).toEqual(order);
    expect(items.map((item) => item.id)).toEqual([1, 2, 3]);
  });
  it.each([false, true])('writes both storage layers despite local storage failure %s', async (fails) => {
    const setItem = vi.fn(() => {
      if (fails) {
        throw new Error('quota');
      }
    });
    const storeWrite = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('localStorage', { setItem });
    vi.stubGlobal('window', { api: { storeWrite } });
    await expect(persistAlbumItems(items)).resolves.toBeUndefined();
    expect(setItem).toHaveBeenCalledExactlyOnceWith('eIsland_photo_album_items', JSON.stringify(items));
    expect(storeWrite).toHaveBeenCalledExactlyOnceWith('photo-album-items', items);
  });
  it('absorbs remote persistence failure after saving the local fallback', async () => {
    const setItem = vi.fn();
    const storeWrite = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('localStorage', { setItem });
    vi.stubGlobal('window', { api: { storeWrite } });
    await expect(persistAlbumItems(items)).resolves.toBeUndefined();
    expect(setItem).toHaveBeenCalledOnce();
  });
});
