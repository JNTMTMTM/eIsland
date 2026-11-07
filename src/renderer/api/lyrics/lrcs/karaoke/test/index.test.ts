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
 * @file index.test.ts
 * @description fetchKaraokeLyrics 单元测试 — 模拟所有 provider 与 window.api
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

const fetchKaraokeFromNetease = vi.hoisted(() => vi.fn());
const fetchKaraokeFromQQMusic = vi.hoisted(() => vi.fn());
const fetchKaraokeFromKugou = vi.hoisted(() => vi.fn());
const fetchKaraokeFromSodaMusic = vi.hoisted(() => vi.fn());

vi.mock('../providers/netease', () => ({ fetchKaraokeFromNetease }));
vi.mock('../providers/qqmusic', () => ({ fetchKaraokeFromQQMusic }));
vi.mock('../providers/kugou', () => ({ fetchKaraokeFromKugou }));
vi.mock('../providers/sodaMusic', () => ({ fetchKaraokeFromSodaMusic }));

import type { KaraokeLine } from '../types';
import { fetchKaraokeLyrics } from '../index';

function makeLine(time_ms: number, text: string): KaraokeLine {
  return { time_ms, duration_ms: 0, text, syllables: [] };
}

const SAMPLE_KARAOKE: KaraokeLine[] = [makeLine(0, 'hello'), makeLine(5000, 'world')];

describe('fetchKaraokeLyrics', () => {
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

  it('returns null on empty title without throwing', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromNetease.mockResolvedValue(null);
    fetchKaraokeFromQQMusic.mockResolvedValue(null);
    fetchKaraokeFromKugou.mockResolvedValue(null);
    fetchKaraokeFromSodaMusic.mockResolvedValue(null);

    const result = await fetchKaraokeLyrics('', 'artist');

    expect(result).toBeNull();
  });

  it('uses forced provider when source setting is netease-only', async () => {
    musicLyricsSourceGet.mockResolvedValue('netease-only');
    fetchKaraokeFromNetease.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromNetease).toHaveBeenCalledWith('song', 'artist');
    expect(fetchKaraokeFromQQMusic).not.toHaveBeenCalled();
    expect(fetchKaraokeFromKugou).not.toHaveBeenCalled();
    expect(fetchKaraokeFromSodaMusic).not.toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('drops empty and whitespace-only rows but keeps symbol-only rows', async () => {
    musicLyricsSourceGet.mockResolvedValue('netease-only');
    fetchKaraokeFromNetease.mockResolvedValue([makeLine(0, 'hello'), makeLine(1000, ''), makeLine(2000, '  '), makeLine(3000, '…')]);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(result?.map((line) => line.text)).toEqual(['hello', '…']);
  });

  it('uses forced provider when source setting is qqmusic-only', async () => {
    musicLyricsSourceGet.mockResolvedValue('qqmusic-only');
    fetchKaraokeFromQQMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromQQMusic).toHaveBeenCalledWith('song', 'artist');
    expect(fetchKaraokeFromNetease).not.toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('uses forced provider when source setting is kugou-only', async () => {
    musicLyricsSourceGet.mockResolvedValue('kugou-only');
    fetchKaraokeFromKugou.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromKugou).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('uses forced provider when source setting is sodamusic-only', async () => {
    musicLyricsSourceGet.mockResolvedValue('sodamusic-only');
    fetchKaraokeFromSodaMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromSodaMusic).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('returns null when setting is lrclib-only (no karaoke from lrclib)', async () => {
    musicLyricsSourceGet.mockResolvedValue('lrclib-only');

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromNetease).not.toHaveBeenCalled();
    expect(fetchKaraokeFromQQMusic).not.toHaveBeenCalled();
    expect(fetchKaraokeFromKugou).not.toHaveBeenCalled();
    expect(fetchKaraokeFromSodaMusic).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('falls back through provider chain when first providers return null', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromNetease.mockResolvedValue(null);
    fetchKaraokeFromQQMusic.mockResolvedValue(null);
    fetchKaraokeFromKugou.mockResolvedValue(null);
    fetchKaraokeFromSodaMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromNetease).toHaveBeenCalled();
    expect(fetchKaraokeFromQQMusic).toHaveBeenCalled();
    expect(fetchKaraokeFromKugou).toHaveBeenCalled();
    expect(fetchKaraokeFromSodaMusic).toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('stops at first successful provider', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromNetease.mockResolvedValue(null);
    fetchKaraokeFromQQMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromNetease).toHaveBeenCalled();
    expect(fetchKaraokeFromQQMusic).toHaveBeenCalled();
    expect(fetchKaraokeFromKugou).not.toHaveBeenCalled();
    expect(fetchKaraokeFromSodaMusic).not.toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('returns null when all providers fail', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromNetease.mockResolvedValue(null);
    fetchKaraokeFromQQMusic.mockResolvedValue(null);
    fetchKaraokeFromKugou.mockResolvedValue(null);
    fetchKaraokeFromSodaMusic.mockResolvedValue(null);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(result).toBeNull();
  });

  it('handles provider throwing an error and continues to next', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromNetease.mockRejectedValue(new Error('network error'));
    fetchKaraokeFromQQMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromNetease).toHaveBeenCalled();
    expect(fetchKaraokeFromQQMusic).toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('ignores providers returning empty arrays and continues', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromNetease.mockResolvedValue([]);
    fetchKaraokeFromQQMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromNetease).toHaveBeenCalled();
    expect(fetchKaraokeFromQQMusic).toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('routes to netease based on cloudmusic.exe sourceAppId', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromNetease.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist', 'cloudmusic.exe');

    expect(fetchKaraokeFromNetease).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('routes to qqmusic based on QQMusic sourceAppId', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromQQMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist', 'QQMusic.exe');

    expect(fetchKaraokeFromQQMusic).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('routes to kugou based on kugou sourceAppId', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromKugou.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist', 'kugou.exe');

    expect(fetchKaraokeFromKugou).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('routes to sodamusic based on 汽水音乐 sourceAppId', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromSodaMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist', '汽水音乐.exe');

    expect(fetchKaraokeFromSodaMusic).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('routes to sodamusic based on qishui sourceAppId', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromSodaMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist', 'qishui.exe');

    expect(fetchKaraokeFromSodaMusic).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('routes to sodamusic based on SodaMusic sourceAppId', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromSodaMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist', 'SodaMusic.exe');

    expect(fetchKaraokeFromSodaMusic).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('case-insensitive sourceAppId matching (CLOUDMUSIC.EXE)', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromNetease.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist', 'CLOUDMUSIC.EXE');

    expect(fetchKaraokeFromNetease).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('uses window.api.musicLyricsSourceGet to read source setting', async () => {
    musicLyricsSourceGet.mockResolvedValue('netease-only');
    fetchKaraokeFromNetease.mockResolvedValue(SAMPLE_KARAOKE);

    await fetchKaraokeLyrics('song', 'artist');

    expect(musicLyricsSourceGet).toHaveBeenCalled();
  });

  it('falls back to auto when musicLyricsSourceGet throws', async () => {
    musicLyricsSourceGet.mockRejectedValue(new Error('settings unavailable'));
    musicDetectSourceAppId.mockResolvedValue({ ok: true, sources: [] });
    fetchKaraokeFromNetease.mockResolvedValue(null);
    fetchKaraokeFromQQMusic.mockResolvedValue(null);
    fetchKaraokeFromKugou.mockResolvedValue(null);
    fetchKaraokeFromSodaMusic.mockResolvedValue(null);

    const result = await fetchKaraokeLyrics('song', 'artist');

    // all providers were tried (auto fallback)
    expect(fetchKaraokeFromNetease).toHaveBeenCalled();
    expect(fetchKaraokeFromQQMusic).toHaveBeenCalled();
    expect(fetchKaraokeFromKugou).toHaveBeenCalled();
    expect(fetchKaraokeFromSodaMusic).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('uses window.api.musicDetectSourceAppId for auto-detection when no sourceAppId provided', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({
      ok: true,
      sources: [{ isPlaying: true, hasTitle: true, sourceAppId: 'QQMusic.exe' }],
    });
    fetchKaraokeFromQQMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(musicDetectSourceAppId).toHaveBeenCalled();
    expect(fetchKaraokeFromQQMusic).toHaveBeenCalledWith('song', 'artist');
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('prefers playing source over non-playing source in auto-detection', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({
      ok: true,
      sources: [
        { isPlaying: false, hasTitle: true, sourceAppId: 'kugou.exe' },
        { isPlaying: true, hasTitle: true, sourceAppId: 'QQMusic.exe' },
      ],
    });
    fetchKaraokeFromQQMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromQQMusic).toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('falls back to first source when none is playing in auto-detection', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    musicDetectSourceAppId.mockResolvedValue({
      ok: true,
      sources: [
        { isPlaying: false, hasTitle: true, sourceAppId: 'kugou.exe' },
      ],
    });
    fetchKaraokeFromKugou.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist');

    expect(fetchKaraokeFromKugou).toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });

  it('skips musicDetectSourceAppId when sourceAppId is provided', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromNetease.mockResolvedValue(SAMPLE_KARAOKE);

    await fetchKaraokeLyrics('song', 'artist', 'cloudmusic.exe');

    expect(musicDetectSourceAppId).not.toHaveBeenCalled();
  });

  it('falls through all providers when detected primary fails', async () => {
    musicLyricsSourceGet.mockResolvedValue('auto');
    fetchKaraokeFromNetease.mockResolvedValue(null);
    fetchKaraokeFromQQMusic.mockResolvedValue(SAMPLE_KARAOKE);

    const result = await fetchKaraokeLyrics('song', 'artist', 'cloudmusic.exe');

    // netease is primary (cloudmusic), tried first then falls back
    expect(fetchKaraokeFromNetease).toHaveBeenCalled();
    expect(fetchKaraokeFromQQMusic).toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_KARAOKE);
  });
});
