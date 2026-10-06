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
 * @file countdownBoundaries.test.ts
 * @description 倒数日图片路径和加载失败、损坏存档字段及默认时间参数边界测试。
 * @author 鸡哥
 */

import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { countdownText, diffDays, isArchived, isRenderableImageSource, normalizeImageSource, occurrenceDate, parseCountdownItems, sortCountdownItems } from '../countdownUtils';
import type { CountdownItem } from '../../types/countdownTypes';

const item: CountdownItem = { id: 1, name: 'Event', date: '2026-01-02', color: '#000', type: 'countdown' };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('countdown image and storage boundaries', () => {
  it('uses IDs to break equal-date sorting ties and formats multi-day relations', async () => {
    const now = new Date(2026, 0, 1, 12);
    const second = { ...item, id: 2 };
    expect(sortCountdownItems([second, item], now)).toEqual([item, second]);
    const locale = i18next.createInstance();
    await locale.init({ lng: 'en', resources: { en: { translation: { countdown: { days: { after: 'In {{days}} days', before: '{{days}} days ago' } } } } } });
    expect(countdownText({ ...item, date: '2026-01-05' }, locale.t, now)).toBe('In 4 days');
    expect(countdownText({ ...item, date: '2025-12-28' }, locale.t, now)).toBe('4 days ago');
  });
  it.each(['data:image/png,a', 'http://example.test/a', 'https://example.test/a', 'file:///a', 'blob:a', '/a'])('preserves rendered image source %s', async (src) => {
    expect(isRenderableImageSource(src)).toBe(true);
    expect(await normalizeImageSource(src)).toBe(src);
  });
  it('handles empty images and resolves local paths with a fallback on failure', async () => {
    const load = vi.fn().mockResolvedValueOnce('data:loaded').mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('missing'));
    vi.stubGlobal('window', { api: { loadWallpaperFile: load } });
    expect(await normalizeImageSource(undefined)).toBeUndefined();
    expect(await normalizeImageSource('')).toBeUndefined();
    expect(isRenderableImageSource('C:\\a.png')).toBe(false);
    expect(await normalizeImageSource('C:\\a.png')).toBe('data:loaded');
    expect(await normalizeImageSource('C:\\b.png')).toBe('C:\\b.png');
    expect(await normalizeImageSource('C:\\c.png')).toBe('C:\\c.png');
  });
  it.each([{ raw: null }, { raw: undefined }, { raw: 1 }, { raw: false }, { raw: 'bad' }, { raw: {} }])('rejects non-array $raw', ({ raw }) => {
    expect(parseCountdownItems(raw)).toEqual([]);
  });
  it('filters each invalid required field while preserving a valid item', () => {
    const corrupt = [null, 1, { ...item, id: '1' }, { ...item, id: NaN }, { ...item, name: 1 }, { ...item, date: 1 }, { ...item, date: 'invalid' }, { ...item, date: '9999-99-99' }, { ...item, date: '2026-02-30' }, { ...item, color: 1 }, { ...item, type: 1 }, { ...item, type: 'unknown' }];
    expect(parseCountdownItems([...corrupt, item])).toEqual([item]);
  });
  it('uses the current local date when no now argument is supplied', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12));
    expect(diffDays(item.date)).toBe(1);
    expect(occurrenceDate(item)).toBe(item.date);
    expect(isArchived(item)).toBe(false);
    expect(sortCountdownItems([{ ...item, id: 2, date: '2026-01-03' }, item])).toEqual([item, { ...item, id: 2, date: '2026-01-03' }]);
    const locale = i18next.createInstance();
    await locale.init({ lng: 'en', resources: { en: { translation: { countdown: { days: { tomorrow: 'Tomorrow', placeholder: '-' } } } } } });
    expect(countdownText(item, locale.t)).toBe('Tomorrow');
    expect(countdownText({ ...item, date: 'invalid' }, locale.t)).toBe('-');
  });
});
