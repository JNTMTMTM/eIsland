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
 * @file notificationHelpers.test.ts
 * @description 通知容量与 ETA 格式、图标地址、更新源和 URL 收藏双层持久化测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatBytes, formatEta, isProOnlySource, normalizeUpdateSource, normalizeUrl, persistFavorites, resolveNotificationIconUrl, sanitizeFavorites } from '../notificationHelpers';
import type { UpdateSourceKey } from '../../config/notificationTypes';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('notification progress formatting', () => {
  it.each([[NaN, '0 B'], [Infinity, '0 B'], [-1, '0 B'], [0, '0 B'], [100, '100 B'], [1024, '1.0 KB'], [102400, '100 KB'], [1048576, '1.0 MB'], [1073741824, '1.0 GB'], [1099511627776, '1024 GB']])('bytes %s', (value, expected) => {
    expect(formatBytes(value)).toBe(expected);
  });
  it.each([[NaN, '00:00'], [Infinity, '00:00'], [-1, '00:00'], [0, '00:00'], [0.1, '00:01'], [61, '01:01'], [3661, '1:01:01']])('ETA %s', (value, expected) => {
    expect(formatEta(value)).toBe(expected);
  });
});

describe('notification URLs and update sources', () => {
  it.each([[' ', ''], [' HTTPS://example.test ', 'HTTPS://example.test'], ['http://example.test', 'http://example.test'], ['example.test', 'https://example.test']])('normalizes %s', (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });
  it.each([undefined, null, '', '  '])('empty icons %s', (input) => {
    expect(resolveNotificationIconUrl(input)).toBe('');
  });
  it.each(['http://example.test/icon', 'https://example.test/icon', 'data:image/png;base64,a', 'blob:icon', 'file:///icon', 'app:icon', 'chrome:icon', '//example.test/icon'])('preserves direct icon %s', (input) => {
    expect(resolveNotificationIconUrl(` ${  input  } `)).toBe(input);
  });
  it('resolves relative icons and preserves them when the base URL is invalid', () => {
    vi.stubGlobal('window', { location: { href: 'https://example.test/app/index.html' } });
    expect(resolveNotificationIconUrl('../icon.png')).toBe('https://example.test/icon.png');
    vi.stubGlobal('window', { location: { href: 'invalid' } });
    expect(resolveNotificationIconUrl('icon.png')).toBe('icon.png');
  });
  it.each<{ input: unknown; expected: UpdateSourceKey; pro: boolean }>([
    { input: 'github', expected: 'github', pro: false }, { input: 'tencent-cos', expected: 'tencent-cos', pro: true },
    { input: 'aliyun-oss', expected: 'aliyun-oss', pro: true }, { input: 'esa-cdn', expected: 'esa-cdn', pro: false },
    { input: 'cloudflare-r2', expected: 'cloudflare-r2', pro: false }, { input: null, expected: 'cloudflare-r2', pro: false },
  ])('source $input', ({ input, expected, pro }) => {
    expect(normalizeUpdateSource(input)).toBe(expected);
    expect(isProOnlySource(expected)).toBe(pro);
  });
});

describe('URL favorites normalization and storage', () => {
  it.each([null, undefined, 1, false, 'wrong', {}])('rejects non-array %s', (input) => {
    expect(sanitizeFavorites(input)).toEqual([]);
  });
  it('normalizes URLs, trims metadata, defaults invalid fields and filters empty URLs', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    expect(sanitizeFavorites([{}, { url: 4 }, { url: ' ' }, { url: ' example.test ', title: ' Title ', note: ' Note ', id: 10, createdAt: 20 }, { url: 'other.test', title: ' ', note: 1, id: NaN, createdAt: Infinity }, { url: 'third.test' }])).toEqual([
      { id: 10, url: 'https://example.test', title: 'Title', note: 'Note', createdAt: 20 },
      { id: 1000, url: 'https://other.test', title: 'https://other.test', note: '', createdAt: 1000 },
      { id: 1000, url: 'https://third.test', title: 'https://third.test', note: '', createdAt: 1000 },
    ]);
  });
  it.each([false, true])('persists favorites after local failure=%s', async (fails) => {
    const setItem = vi.fn(() => {
      if (fails) {
        throw new Error('quota');
      }
    });
    const storeWrite = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('localStorage', { setItem });
    vi.stubGlobal('window', { api: { storeWrite } });
    persistFavorites([]);
    await Promise.resolve();
    expect(setItem).toHaveBeenCalledExactlyOnceWith('eIsland_url_favorites', '[]');
    expect(storeWrite).toHaveBeenCalledExactlyOnceWith('url-favorites', []);
  });
  it('absorbs remote failures', async () => {
    vi.stubGlobal('localStorage', { setItem: vi.fn() });
    vi.stubGlobal('window', { api: { storeWrite: vi.fn().mockRejectedValue(new Error('offline')) } });
    expect(() => persistFavorites([])).not.toThrow();
    await Promise.resolve();
  });
});
