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
 * @file dynamicIslandBackgroundMedia.test.ts
 * @description 背景媒体输入兼容、预览路径及文件桥接异常测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeBgMediaConfig, resolveBgMediaPreviewUrl } from '../dynamicIslandBackgroundMedia';

const loadWallpaperFile = vi.fn<(path: string) => Promise<string | null>>();
const directUrls = ['data:image/png;base64,test', 'http://example/bg', 'https://example/bg', 'blob:preview', 'file:///C:/bg.png', '/bg.png', './bg.png', '../bg.png', 'assets/bg.png'];

beforeEach(() => {
  loadWallpaperFile.mockReset().mockResolvedValue('data:image/png;base64,local');
  vi.stubGlobal('window', { api: { loadWallpaperFile } });
});
afterEach(() => vi.unstubAllGlobals());

describe('background configuration normalization', () => {
  it.each([null, undefined, false, 42, '', '  ', {}, [], { source: '' }, { source: '  ' }, { source: 42, image: false, url: null }])('rejects invalid persisted input %j', (input) => {
    expect(normalizeBgMediaConfig(input)).toBeNull();
  });
  it.each([
    ['  image.png  ', { type: 'image', source: 'image.png' }],
    [{ type: 'video', source: ' video.mp4 ', image: 'ignored' }, { type: 'video', source: 'video.mp4' }],
    [{ source: 1, image: ' legacy.png ', url: 'ignored' }, { type: 'image', source: 'legacy.png' }],
    [{ image: false, url: ' remote.png ' }, { type: 'image', source: 'remote.png' }],
    [{ type: 'unknown', source: 'image.png' }, { type: 'image', source: 'image.png' }],
  ])('preserves valid source precedence and trims only the media source', (input, expected) => {
    expect(normalizeBgMediaConfig(input)).toEqual(expected);
  });
});

describe('background media preview resolution', () => {
  it.each(directUrls)('uses direct image and video source %s without reading files', async (source) => {
    expect(await resolveBgMediaPreviewUrl({ source, type: 'image' })).toBe(source);
    expect(await resolveBgMediaPreviewUrl({ source, type: 'video' })).toBe(source);
    expect(loadWallpaperFile).not.toHaveBeenCalled();
  });
  it('loads local images through the bridge and preserves absent file results', async () => {
    expect(await resolveBgMediaPreviewUrl({ type: 'image', source: 'C:\\图片 a.png' })).toBe('data:image/png;base64,local');
    expect(loadWallpaperFile).toHaveBeenCalledWith('C:\\图片 a.png');
    loadWallpaperFile.mockResolvedValue(null);
    expect(await resolveBgMediaPreviewUrl({ type: 'image', source: 'missing.png' })).toBeNull();
  });
  it('returns null when the optional file bridge is unavailable', async () => {
    vi.stubGlobal('window', { api: {} });
    expect(await resolveBgMediaPreviewUrl({ type: 'image', source: 'missing.png' })).toBeNull();
  });
  it('propagates a failed file read to the caller', async () => {
    loadWallpaperFile.mockRejectedValue(new Error('cannot read image'));
    await expect(resolveBgMediaPreviewUrl({ type: 'image', source: 'local.png' })).rejects.toThrow('cannot read image');
  });
  it('encodes a local video path after normalizing Windows separators', async () => {
    expect(await resolveBgMediaPreviewUrl({ type: 'video', source: 'C:\\视频 a#1.mp4' })).toBe('eisland-media://local/C%3A%2F%E8%A7%86%E9%A2%91%20a%231.mp4');
    expect(loadWallpaperFile).not.toHaveBeenCalled();
  });
});

it('returns null when the entire optional API bridge is unavailable', async () => {
  vi.stubGlobal('window', {});
  expect(await resolveBgMediaPreviewUrl({ type: 'image', source: 'missing.png' })).toBeNull();
});
