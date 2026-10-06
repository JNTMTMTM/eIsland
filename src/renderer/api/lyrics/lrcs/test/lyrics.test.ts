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
 * @file lyrics.test.ts
 * @description 歌词模块单元测试
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

const fetchLyricsFromNetease = vi.hoisted(() => vi.fn());
const fetchLyricsWithTranslationFromNetease = vi.hoisted(() => vi.fn(async (...args: unknown[]) => {
  const lyrics = await fetchLyricsFromNetease(...args);
  return lyrics ? { lyrics, translation: { status: 'not-provided', lines: null } } : null;
}));
const fetchLyricsFromQQMusic = vi.hoisted(() => vi.fn());
const fetchLyricsWithTranslationFromQQMusic = vi.hoisted(() => vi.fn(async (...args: unknown[]) => {
  const lyrics = await fetchLyricsFromQQMusic(...args);
  return lyrics ? { lyrics, translation: { status: 'not-provided', lines: null } } : null;
}));
const fetchLyricsFromKugou = vi.hoisted(() => vi.fn());
const fetchLyricsFromSodaMusic = vi.hoisted(() => vi.fn());
const fetchLyricsWithTranslationFromSodaMusic = vi.hoisted(() => vi.fn(async (...args: unknown[]) => {
  const lyrics = await fetchLyricsFromSodaMusic(...args);
  return lyrics ? { lyrics, translation: { status: 'not-provided', lines: null } } : null;
}));
const fetchLyricsFromLrclib = vi.hoisted(() => vi.fn());
const fetchLyricsFromAppleMusic = vi.hoisted(() => vi.fn());
const fetchLyricsFromSpotify = vi.hoisted(() => vi.fn());
const fetchLyricsFromMoeKoe = vi.hoisted(() => vi.fn());

vi.mock('../normal/providers/netease', () => ({ fetchLyricsFromNetease, fetchLyricsWithTranslationFromNetease }));
vi.mock('../normal/providers/qqmusic', () => ({ fetchLyricsFromQQMusic, fetchLyricsWithTranslationFromQQMusic }));
vi.mock('../normal/providers/kugou', () => ({ fetchLyricsFromKugou }));
vi.mock('../normal/providers/sodaMusic', () => ({ fetchLyricsFromSodaMusic, fetchLyricsWithTranslationFromSodaMusic }));
vi.mock('../normal/providers/lrclib', () => ({ fetchLyricsFromLrclib }));
vi.mock('../normal/providers/appleMusic', () => ({ fetchLyricsFromAppleMusic }));
vi.mock('../normal/providers/spotify', () => ({ fetchLyricsFromSpotify }));
vi.mock('../normal/providers/moeKoe', () => ({ fetchLyricsFromMoeKoe }));

import type { LyricLine } from '../index';
import { getCurrentLyric, getNearbyLyrics, fetchLyrics, fetchLyricsWithTranslation } from '../index';

function makeLyric(time_ms: number, text: string): LyricLine {
  return { time_ms, text };
}

const SAMPLE_LYRICS: LyricLine[] = [
  makeLyric(0, 'line-0'),
  makeLyric(5000, 'line-5'),
  makeLyric(10000, 'line-10'),
  makeLyric(15000, 'line-15'),
  makeLyric(20000, 'line-20'),
];

describe('getCurrentLyric', () => {
  it('returns null for empty lyrics', () => {
    expect(getCurrentLyric([], 1000)).toBeNull();
  });

  it('returns null when position is before all lyrics', () => {
    expect(getCurrentLyric(SAMPLE_LYRICS, -1)).toBeNull();
  });

  it('returns the lyric matching the exact position', () => {
    const result = getCurrentLyric(SAMPLE_LYRICS, 10000);
    expect(result).toEqual(makeLyric(10000, 'line-10'));
  });

  it('returns the correct lyric when position is between two lines', () => {
    const result = getCurrentLyric(SAMPLE_LYRICS, 7000);
    expect(result).toEqual(makeLyric(5000, 'line-5'));
  });

  it('returns the last lyric when position is after all lyrics', () => {
    const result = getCurrentLyric(SAMPLE_LYRICS, 99999);
    expect(result).toEqual(makeLyric(20000, 'line-20'));
  });

  it('returns the first lyric when position is exactly at the start', () => {
    const result = getCurrentLyric(SAMPLE_LYRICS, 0);
    expect(result).toEqual(makeLyric(0, 'line-0'));
  });
});

describe('getNearbyLyrics', () => {
  it('returns empty array for empty lyrics', () => {
    expect(getNearbyLyrics([], 1000)).toEqual([]);
  });

  it('returns empty array when position is before all lyrics', () => {
    expect(getNearbyLyrics(SAMPLE_LYRICS, -1)).toEqual([]);
  });

  it('returns current + 2 before + 2 after', () => {
    const result = getNearbyLyrics(SAMPLE_LYRICS, 10000);
    expect(result).toEqual([
      { text: 'line-0', isCurrent: false },
      { text: 'line-5', isCurrent: false },
      { text: 'line-10', isCurrent: true },
      { text: 'line-15', isCurrent: false },
      { text: 'line-20', isCurrent: false },
    ]);
  });

  it('handles boundary at the start of lyrics', () => {
    const result = getNearbyLyrics(SAMPLE_LYRICS, 0);
    expect(result).toEqual([
      { text: 'line-0', isCurrent: true },
      { text: 'line-5', isCurrent: false },
      { text: 'line-10', isCurrent: false },
    ]);
  });

  it('handles boundary at the end of lyrics', () => {
    const result = getNearbyLyrics(SAMPLE_LYRICS, 99999);
    expect(result).toEqual([
      { text: 'line-10', isCurrent: false },
      { text: 'line-15', isCurrent: false },
      { text: 'line-20', isCurrent: true },
    ]);
  });

  it('returns fewer items when lyrics array is shorter than the window', () => {
    const short: LyricLine[] = [makeLyric(0, 'a'), makeLyric(1000, 'b')];
    const result = getNearbyLyrics(short, 500);
    expect(result).toEqual([
      { text: 'a', isCurrent: true },
      { text: 'b', isCurrent: false },
    ]);
  });
});

describe('fetchLyrics', () => {
  let musicLyricsSourceGet: Mock;
  let musicDetectSourceAppId: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    musicLyricsSourceGet = vi.fn(async () => 'auto');
    musicDetectSourceAppId = vi.fn(async () => ({ ok: true, sources: [] }));
    Object.defineProperty(globalThis, 'window', {
      value: { api: { musicLyricsSourceGet, musicDetectSourceAppId } },
      configurable: true,
      writable: true,
    });
  });

  it('uses lrclib directly when setting is lrclib-only', async () => {
    musicLyricsSourceGet.mockResolvedValue('lrclib-only');
    const expected: LyricLine[] = [makeLyric(0, 'lrclib-line')];
    fetchLyricsFromLrclib.mockResolvedValue(expected);

    const result = await fetchLyrics('song', 'artist');

    expect(fetchLyricsFromLrclib).toHaveBeenCalledWith('song', 'artist');
    expect(fetchLyricsFromNetease).not.toHaveBeenCalled();
    expect(result).toEqual(expected);
  });

  it('routes to forced provider when setting is netease-only', async () => {
    musicLyricsSourceGet.mockResolvedValue('netease-only');
    const expected: LyricLine[] = [makeLyric(0, 'ne-line')];
    fetchLyricsFromNetease.mockResolvedValue(expected);

    const result = await fetchLyrics('song', 'artist');

    expect(fetchLyricsFromNetease).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(expected);
  });

  it('falls back to lrclib when forced provider returns null', async () => {
    musicLyricsSourceGet.mockResolvedValue('netease-only');
    fetchLyricsFromNetease.mockResolvedValue(null);
    const expected: LyricLine[] = [makeLyric(0, 'fallback')];
    fetchLyricsFromLrclib.mockResolvedValue(expected);

    const result = await fetchLyrics('song', 'artist');

    expect(fetchLyricsFromNetease).toHaveBeenCalled();
    expect(fetchLyricsFromLrclib).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(expected);
  });

  it('detects provider from sourceAppId and tries it first', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    const expected: LyricLine[] = [makeLyric(0, 'ne-line')];
    fetchLyricsFromNetease.mockResolvedValue(expected);

    const result = await fetchLyrics('song', 'artist', 'cloudmusic.exe');

    expect(fetchLyricsFromNetease).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(expected);
  });

  it('falls through providers in order when all return null', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchLyricsFromNetease.mockResolvedValue(null);
    fetchLyricsFromQQMusic.mockResolvedValue(null);
    fetchLyricsFromKugou.mockResolvedValue(null);
    fetchLyricsFromSodaMusic.mockResolvedValue(null);
    const expected: LyricLine[] = [makeLyric(0, 'lrclib')];
    fetchLyricsFromLrclib.mockResolvedValue(expected);

    const result = await fetchLyrics('song', 'artist');

    expect(fetchLyricsFromNetease).toHaveBeenCalled();
    expect(fetchLyricsFromQQMusic).toHaveBeenCalled();
    expect(fetchLyricsFromKugou).toHaveBeenCalled();
    expect(fetchLyricsFromSodaMusic).toHaveBeenCalled();
    expect(fetchLyricsFromLrclib).toHaveBeenCalled();
    expect(result).toEqual(expected);
  });

  it('stops at first successful provider', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    const expected: LyricLine[] = [makeLyric(0, 'qq-line')];
    fetchLyricsFromNetease.mockResolvedValue(null);
    fetchLyricsFromQQMusic.mockResolvedValue(expected);

    const result = await fetchLyrics('song', 'artist');

    expect(fetchLyricsFromQQMusic).toHaveBeenCalled();
    expect(fetchLyricsFromKugou).not.toHaveBeenCalled();
    expect(fetchLyricsFromLrclib).not.toHaveBeenCalled();
    expect(result).toEqual(expected);
  });

  it('keeps translation payload in the data-layer result', async () => {
    musicLyricsSourceGet.mockResolvedValue('netease-only');
    const lyrics: LyricLine[] = [makeLyric(0, 'ne-line')];
    const translation = { status: 'available' as const, lines: [makeLyric(0, 'translated-line')] };
    fetchLyricsWithTranslationFromNetease.mockResolvedValueOnce({ lyrics, translation });

    const result = await fetchLyricsWithTranslation('song', 'artist');

    expect(fetchLyricsWithTranslationFromNetease).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual({ lyrics, translation });
  });

  it('returns null when all providers including lrclib fail', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchLyricsFromNetease.mockResolvedValue(null);
    fetchLyricsFromQQMusic.mockResolvedValue(null);
    fetchLyricsFromKugou.mockResolvedValue(null);
    fetchLyricsFromSodaMusic.mockResolvedValue(null);
    fetchLyricsFromLrclib.mockResolvedValue(null);

    const result = await fetchLyrics('song', 'artist');

    expect(result).toBeNull();
  });
});
