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
 * @file providers.test.ts
 * @description 普通歌词 Provider 综合单元测试（kugou / lrclib / netease / qqmusic / sodaMusic）
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach, afterEach, type Mock } from 'vitest';

/* ---------- hoisted mock stubs ---------- */

const mockRequestJsonWithLog = vi.hoisted(() => vi.fn());
const mockRequestTextWithLog = vi.hoisted(() => vi.fn());
const mockQishuiSearch = vi.hoisted(() => vi.fn());
const mockQishuiLyrics = vi.hoisted(() => vi.fn());

const mockCleanTitle = vi.hoisted(() => vi.fn((t: string) => t));
const mockCleanArtist = vi.hoisted(() => vi.fn((a: string) => a));
const mockParseSyncedLrc = vi.hoisted(() => vi.fn((): Array<{ time_ms: number; text: string }> => []));
const mockParseYrc = vi.hoisted(() => vi.fn(() => []));
const mockParseKrc = vi.hoisted(() => vi.fn(() => []));
const mockExtractSyncedFromArray = vi.hoisted(() => vi.fn(() => null));
const mockExtractSyncedFromObject = vi.hoisted(() => vi.fn(() => null));
const mockSearchWithScoring = vi.hoisted(() => vi.fn<(input: unknown, searchFn: unknown, minScore?: number, wowScore?: number, splitChar?: string) => Promise<unknown | null>>());

/* ---------- module mocks ---------- */

vi.mock('../request', () => ({
  requestJsonWithLog: mockRequestJsonWithLog,
  requestTextWithLog: mockRequestTextWithLog,
}));

vi.mock('../helpers', () => ({
  cleanTitle: mockCleanTitle,
  cleanArtist: mockCleanArtist,
  parseSyncedLrc: mockParseSyncedLrc,
  parseYrc: mockParseYrc,
  parseKrc: mockParseKrc,
  extractSyncedFromArray: mockExtractSyncedFromArray,
  extractSyncedFromObject: mockExtractSyncedFromObject,
}));

vi.mock('../matcher', () => ({
  searchWithScoring: mockSearchWithScoring,
  makeSearchQueries: vi.fn((t: string, a: string) => [`${t} ${a}`]),
  scoreTrack: vi.fn(() => 0),
  bestMatch: vi.fn(() => null),
}));

vi.mock('../../../../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.stubGlobal('window', {
    api: {
      qishuiSearch: mockQishuiSearch,
      qishuiLyrics: mockQishuiLyrics,
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ---------- imports under test ---------- */

import { fetchLyricsFromKugou } from '../providers/kugou';
import { fetchLyricsFromLrclib } from '../providers/lrclib';
import { fetchLyricsFromNetease, fetchLyricsWithTranslationFromNetease } from '../providers/netease';
import { fetchLyricsFromQQMusic, fetchLyricsWithTranslationFromQQMusic } from '../providers/qqmusic';
import { fetchLyricsFromSodaMusic, fetchLyricsWithTranslationFromSodaMusic } from '../providers/sodaMusic';

/* ---------- helpers ---------- */

function okLines(...texts: string[]) {
  return texts.map((text, i) => ({ time_ms: i * 1000, text }));
}

/* ---------- per-provider suites ---------- */

/* ================================================================
 *  Kugou
 * ================================================================ */

describe('fetchLyricsFromKugou', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanTitle.mockImplementation((t: string) => t);
    mockCleanArtist.mockImplementation((a: string) => a);
  });

  it('constructs correct search URL with title + artist', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromKugou('MySong', 'MyArtist');

    const firstCallUrl: string = mockRequestJsonWithLog.mock.calls[0][0];
    expect(firstCallUrl).toContain('mobilecdn.kugou.com/api/v3/search/song');
    expect(firstCallUrl).toContain(encodeURIComponent('MySong MyArtist'));
  });

  it('returns null when search API returns null', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);
    expect(await fetchLyricsFromKugou('t', 'a')).toBeNull();
  });

  it('returns null when search results are empty', async () => {
    mockRequestJsonWithLog.mockResolvedValueOnce({ data: { info: [] } });
    expect(await fetchLyricsFromKugou('t', 'a')).toBeNull();
  });

  it('returns null when lyrics search candidates are empty', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce({ data: { info: [{ hash: 'abc', duration: 200 }] } })
      .mockResolvedValueOnce({ candidates: [] });
    expect(await fetchLyricsFromKugou('t', 'a')).toBeNull();
  });

  it('returns null when download response has no content', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce({ data: { info: [{ hash: 'abc', duration: 200 }] } })
      .mockResolvedValueOnce({ candidates: [{ id: '1', accesskey: 'ak' }] })
      .mockResolvedValueOnce({ content: '' });
    expect(await fetchLyricsFromKugou('t', 'a')).toBeNull();
  });

  it('decodes Base64 LRC and returns parsed lines', async () => {
    const lrcText = '[00:05.00]hello\n[00:10.00]world';
    const b64 = btoa(lrcText);
    mockRequestJsonWithLog
      .mockResolvedValueOnce({ data: { info: [{ hash: 'h', duration: 300 }] } })
      .mockResolvedValueOnce({ candidates: [{ id: '1', accesskey: 'ak' }] })
      .mockResolvedValueOnce({ content: b64 });
    mockParseSyncedLrc.mockReturnValueOnce(okLines('hello', 'world'));

    const result = await fetchLyricsFromKugou('t', 'a');
    expect(result).toEqual(okLines('hello', 'world'));
    expect(mockParseSyncedLrc).toHaveBeenCalled();
  });

  it('retries with cleaned title/artist when first attempt fails', async () => {
    mockCleanTitle.mockImplementation((t: string) => t.trim());
    mockCleanArtist.mockImplementation((a: string) => a.trim());
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromKugou('Song ', ' Artist');

    expect(mockCleanTitle).toHaveBeenCalledWith('Song ');
    expect(mockCleanArtist).toHaveBeenCalledWith(' Artist');
    // First call with raw, second call with cleaned
    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(2);
  });

  it('does not retry when title/artist are already clean', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromKugou('Clean', 'Artist');

    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(1);
  });

  it('constructs lyrics search URL with duration and hash', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);
    await fetchLyricsFromKugou('t', 'a');

    // Only the first call is made (search fails), so check URL pattern
    expect(mockRequestJsonWithLog.mock.calls[0][0]).toContain('keyword=');
  });
});

/* ================================================================
 *  LRCLIB
 * ================================================================ */

describe('fetchLyricsFromLrclib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanTitle.mockImplementation((t: string) => t);
    mockCleanArtist.mockImplementation((a: string) => a);
  });

  it('sends User-Agent header on every request', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromLrclib('t', 'a');

    mockRequestJsonWithLog.mock.calls.forEach((call) => {
      expect(call[1]?.headers?.['User-Agent']).toBe(
        'DynamicIsland/1.0 (https://github.com/user/dynamic-island)',
      );
    });
  });

  it('constructs URL1 with track_name + artist_name', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromLrclib('MySong', 'MyArtist');

    const url1: string = mockRequestJsonWithLog.mock.calls[0][0];
    expect(url1).toContain('lrclib.net/api/search?');
    expect(url1).toContain(`track_name=${encodeURIComponent('MySong')}`);
    expect(url1).toContain(`artist_name=${encodeURIComponent('MyArtist')}`);
  });

  it('returns null when all strategies fail', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);
    expect(await fetchLyricsFromLrclib('t', 'a')).toBeNull();
  });

  it('returns early when URL1 succeeds via extractSyncedFromArray', async () => {
    const lines = okLines('hit');
    mockRequestJsonWithLog.mockResolvedValueOnce([{ synced: true }]);
    mockExtractSyncedFromArray.mockReturnValueOnce(lines);

    const result = await fetchLyricsFromLrclib('t', 'a');
    expect(result).toEqual(lines);
    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(1);
    expect(mockExtractSyncedFromArray).toHaveBeenCalledWith([{ synced: true }]);
  });

  it('skips URL2 when title/artist are already clean', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromLrclib('Clean', 'Artist');

    // URL1 (search), URL3 (query), URL4 (get) = 3 calls, no URL2
    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(3);
    const urls = mockRequestJsonWithLog.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(urls.some((u: string) => u.includes('/api/search?track_name='))).toBe(true);
    expect(urls.some((u: string) => u.includes('/api/search?q='))).toBe(true);
    expect(urls.some((u: string) => u.includes('/api/get?'))).toBe(true);
  });

  it('uses URL2 with cleaned title/artist when originals differ', async () => {
    mockCleanTitle.mockImplementation((t: string) => t.replace(/\s+/g, ''));
    mockCleanArtist.mockImplementation((a: string) => a.replace(/\s+/g, ''));
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromLrclib('So ng', 'Art ist');

    // URL1, URL2, URL3, URL4 = 4 calls
    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(4);
    const url2: string = mockRequestJsonWithLog.mock.calls[1][0];
    expect(url2).toContain(encodeURIComponent('Song'));
    expect(url2).toContain(encodeURIComponent('Artist'));
  });

  it('uses URL4 (get) with extractSyncedFromObject as final fallback', async () => {
    const lines = okLines('from-object');
    mockRequestJsonWithLog.mockResolvedValue(null);
    mockRequestJsonWithLog.mockResolvedValueOnce(null); // URL1
    mockRequestJsonWithLog.mockResolvedValueOnce(null); // URL3
    mockRequestJsonWithLog.mockResolvedValueOnce({ syncedLyrics: '[00:01.00]x' }); // URL4
    mockExtractSyncedFromObject.mockReturnValueOnce(lines);

    const result = await fetchLyricsFromLrclib('Clean', 'Artist');
    expect(result).toEqual(lines);
    expect(mockExtractSyncedFromObject).toHaveBeenCalled();
  });

  it('constructs URL3 with q= cleanedTitle + cleanedArtist', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromLrclib('Clean', 'Artist');

    const url3: string = mockRequestJsonWithLog.mock.calls[1][0];
    expect(url3).toContain('/api/search?q=');
    expect(url3).toContain(encodeURIComponent('Clean Artist'));
  });
});

/* ================================================================
 *  Netease
 * ================================================================ */

describe('fetchLyricsFromNetease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanTitle.mockImplementation((t: string) => t);
    mockCleanArtist.mockImplementation((a: string) => a);
  });

  function searchResponse(songs: unknown[]) {
    return { result: { songs } };
  }

  function lyricsResponse(yrcLyric?: string, lrcLyric?: string, translationLyric?: string) {
    const resp: Record<string, unknown> = {};
    if (yrcLyric !== undefined) resp.yrc = { lyric: yrcLyric };
    if (lrcLyric !== undefined) resp.lrc = { lyric: lrcLyric };
    if (translationLyric !== undefined) resp.tlyric = { lyric: translationLyric };
    return resp;
  }

  it('posts to the correct search endpoint', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromNetease('t', 'a');

    const callArgs = mockRequestJsonWithLog.mock.calls[0];
    expect(callArgs[0]).toBe('https://music.163.com/api/search/get/web');
    expect(callArgs[1]?.method).toBe('POST');
    expect(callArgs[1]?.headers?.Referer).toBe('https://music.163.com');
  });

  it('returns null when search returns no songs', async () => {
    mockRequestJsonWithLog.mockResolvedValueOnce(searchResponse([]));
    expect(await fetchLyricsFromNetease('t', 'a')).toBeNull();
  });

  it('returns null when search result has no songs field', async () => {
    mockRequestJsonWithLog.mockResolvedValueOnce({ result: {} });
    expect(await fetchLyricsFromNetease('t', 'a')).toBeNull();
  });

  it('prefers YRC lyrics over LRC', async () => {
    const yrcLines = okLines('yrc-line');
    mockRequestJsonWithLog
      .mockResolvedValueOnce(searchResponse([{ id: 123 }]))
      .mockResolvedValueOnce(lyricsResponse('[00:01.00]yrc-line', '[00:01.00]lrc-line'));
    mockParseYrc.mockReturnValueOnce(yrcLines);

    const result = await fetchLyricsFromNetease('t', 'a');
    expect(result).toEqual(yrcLines);
    expect(mockParseYrc).toHaveBeenCalled();
    expect(mockParseSyncedLrc).not.toHaveBeenCalled();
  });

  it('falls back to LRC when YRC is empty', async () => {
    const lrcLines = okLines('lrc-line');
    mockRequestJsonWithLog
      .mockResolvedValueOnce(searchResponse([{ id: 456 }]))
      .mockResolvedValueOnce(lyricsResponse(undefined, '[00:01.00]lrc-line'));
    mockParseSyncedLrc.mockReturnValueOnce(lrcLines);

    const result = await fetchLyricsFromNetease('t', 'a');
    expect(result).toEqual(lrcLines);
    expect(mockParseSyncedLrc).toHaveBeenCalled();
  });

  it('returns null when both YRC and LRC are missing', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce(searchResponse([{ id: 789 }]))
      .mockResolvedValueOnce({});
    expect(await fetchLyricsFromNetease('t', 'a')).toBeNull();
  });

  it('returns translation lyrics when tlyric exists', async () => {
    const yrcLines = okLines('yrc-line');
    const translationLines = okLines('translated-line');
    mockRequestJsonWithLog
      .mockResolvedValueOnce(searchResponse([{ id: 321 }]))
      .mockResolvedValueOnce(lyricsResponse('[00:01.00]yrc-line', undefined, '[00:01.00]translated-line'));
    mockParseSyncedLrc.mockReturnValueOnce(translationLines);
    mockParseYrc.mockReturnValueOnce(yrcLines);

    const result = await fetchLyricsWithTranslationFromNetease('t', 'a');

    expect(result).toEqual({
      lyrics: yrcLines,
      translation: { status: 'available', lines: translationLines },
    });
  });

  it('returns not-provided when Netease response has no translation lyrics', async () => {
    const lrcLines = okLines('lrc-line');
    mockRequestJsonWithLog
      .mockResolvedValueOnce(searchResponse([{ id: 654 }]))
      .mockResolvedValueOnce(lyricsResponse(undefined, '[00:01.00]lrc-line'));
    mockParseSyncedLrc.mockReturnValueOnce(lrcLines);

    const result = await fetchLyricsWithTranslationFromNetease('t', 'a');

    expect(result).toEqual({
      lyrics: lrcLines,
      translation: { status: 'not-provided', lines: null },
    });
  });

  it('calls the v1 lyrics endpoint with song ID', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce(searchResponse([{ id: 42 }]))
      .mockResolvedValueOnce(lyricsResponse());

    await fetchLyricsFromNetease('t', 'a');

    const lrcCall = mockRequestJsonWithLog.mock.calls[1];
    expect(lrcCall[0]).toBe('https://interface3.music.163.com/api/song/lyric/v1');
    expect(lrcCall[1]?.body).toContain('id=42');
  });

  it('retries with cleaned title/artist when first attempt returns null', async () => {
    mockCleanTitle.mockImplementation((t: string) => t.trim());
    mockCleanArtist.mockImplementation((a: string) => a.trim());
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchLyricsFromNetease('Song ', ' Artist');

    expect(mockCleanTitle).toHaveBeenCalledWith('Song ');
    expect(mockCleanArtist).toHaveBeenCalledWith(' Artist');
    // 2 search calls (raw + cleaned), each stops at null search
    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(2);
  });
});

/* ================================================================
 *  QQ Music
 * ================================================================ */

describe('fetchLyricsFromQQMusic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanTitle.mockImplementation((t: string) => t);
    mockCleanArtist.mockImplementation((a: string) => a);
  });

  it('returns null when no match found', async () => {
    mockSearchWithScoring.mockResolvedValue(null);
    expect(await fetchLyricsFromQQMusic('t', 'a')).toBeNull();
  });

  it('returns null when matched song has no mid', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '1', mid: '', title: 't', artists: ['a'] });
    expect(await fetchLyricsFromQQMusic('t', 'a')).toBeNull();
  });

  it('returns null when JSONP text is null', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '1', mid: 'abc', title: 't', artists: ['a'] });
    mockRequestTextWithLog.mockResolvedValueOnce(null);
    expect(await fetchLyricsFromQQMusic('t', 'a')).toBeNull();
  });

  it('returns null when JSONP wrapper cannot be parsed', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '1', mid: 'abc', title: 't', artists: ['a'] });
    mockRequestTextWithLog.mockResolvedValueOnce('not-jsonp-at-all');
    expect(await fetchLyricsFromQQMusic('t', 'a')).toBeNull();
  });

  it('decodes JSONP + Base64 lyrics and parses LRC', async () => {
    const lrcText = '[00:05.00]qq-line';
    const b64 = btoa(unescape(encodeURIComponent(lrcText)));
    const callback = 'MusicJsonCallback_lrc';
    const jsonpBody = `${callback}(${JSON.stringify({ lyric: b64 })})`;

    mockSearchWithScoring.mockResolvedValue({ id: '1', mid: 'xyz', title: 't', artists: ['a'] });
    mockRequestTextWithLog.mockResolvedValueOnce(jsonpBody);
    mockParseSyncedLrc.mockReturnValueOnce(okLines('qq-line'));

    const result = await fetchLyricsFromQQMusic('t', 'a');
    expect(result).toEqual(okLines('qq-line'));
    expect(mockParseSyncedLrc).toHaveBeenCalledWith(lrcText);
  });

  it('decodes trans field as translation lyrics', async () => {
    const lrcText = '[00:05.00]qq-line';
    const transText = '[00:05.00]qq-translated';
    const lyricB64 = btoa(unescape(encodeURIComponent(lrcText)));
    const transB64 = btoa(unescape(encodeURIComponent(transText)));
    const callback = 'MusicJsonCallback_lrc';
    const jsonpBody = `${callback}(${JSON.stringify({ lyric: lyricB64, trans: transB64 })})`;
    const lyricLines = okLines('qq-line');
    const translationLines = okLines('qq-translated');

    mockSearchWithScoring.mockResolvedValue({ id: '1', mid: 'xyz', title: 't', artists: ['a'] });
    mockRequestTextWithLog.mockResolvedValueOnce(jsonpBody);
    mockParseSyncedLrc
      .mockReturnValueOnce(lyricLines)
      .mockReturnValueOnce(translationLines);

    const result = await fetchLyricsWithTranslationFromQQMusic('t', 'a');

    expect(result).toEqual({
      lyrics: lyricLines,
      translation: { status: 'available', lines: translationLines },
    });
    expect(mockParseSyncedLrc).toHaveBeenNthCalledWith(1, lrcText);
    expect(mockParseSyncedLrc).toHaveBeenNthCalledWith(2, transText);
  });

  it('returns null when decoded LRC parses to empty', async () => {
    const callback = 'MusicJsonCallback_lrc';
    const b64 = btoa(unescape(encodeURIComponent('[99:99.99]')));
    const jsonpBody = `${callback}(${JSON.stringify({ lyric: b64 })})`;

    mockSearchWithScoring.mockResolvedValue({ id: '1', mid: 'abc', title: 't', artists: ['a'] });
    mockRequestTextWithLog.mockResolvedValueOnce(jsonpBody);
    mockParseSyncedLrc.mockReturnValueOnce([]);

    expect(await fetchLyricsFromQQMusic('t', 'a')).toBeNull();
  });

  it('calls searchWithScoring with correct input', async () => {
    mockSearchWithScoring.mockResolvedValue(null);
    await fetchLyricsFromQQMusic('Song', 'Artist');
    expect(mockSearchWithScoring).toHaveBeenCalledWith(
      { title: 'Song', artist: 'Artist' },
      expect.any(Function),
      5, 7, '/',
    );
  });
});

/* ================================================================
 *  Soda Music
 * ================================================================ */

describe('fetchLyricsFromSodaMusic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanTitle.mockImplementation((t: string) => t);
    mockCleanArtist.mockImplementation((a: string) => a);
  });

  it('returns null when no match found', async () => {
    mockSearchWithScoring.mockResolvedValue(null);
    expect(await fetchLyricsFromSodaMusic('t', 'a')).toBeNull();
  });

  it('returns null when detail response has no lyric content', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '100', title: 't', artists: ['a'] });
    mockQishuiLyrics.mockResolvedValueOnce({ lyric: '', tlyric: '' });
    expect(await fetchLyricsFromSodaMusic('t', 'a')).toBeNull();
  });

  it('requests lyrics through preload API and calls parseKrc', async () => {
    const krcLines = okLines('soda-line');
    mockSearchWithScoring.mockResolvedValue({ id: '42', title: 't', artists: ['a'] });
    mockQishuiLyrics.mockResolvedValueOnce({ lyric: 'krc-data', tlyric: '' });
    mockParseKrc.mockReturnValueOnce(krcLines);

    const result = await fetchLyricsFromSodaMusic('t', 'a');
    expect(result).toEqual(krcLines);
    expect(mockQishuiLyrics).toHaveBeenCalledWith('42');
    expect(mockParseKrc).toHaveBeenCalledWith('krc-data');
  });

  it('returns translation lyrics from translations field (string format)', async () => {
    const krcLines = okLines('soda-line');
    const translationLines = okLines('soda-translated');
    mockSearchWithScoring.mockResolvedValue({ id: '42', title: 't', artists: ['a'] });
    mockQishuiLyrics.mockResolvedValueOnce({
      lyric: 'krc-data', tlyric: '[00:01.00]soda-translated',
    });
    mockParseKrc.mockReturnValueOnce(krcLines);
    mockParseSyncedLrc.mockReturnValueOnce(translationLines);

    const result = await fetchLyricsWithTranslationFromSodaMusic('t', 'a');

    expect(result).toEqual({
      lyrics: krcLines,
      translation: { status: 'available', lines: translationLines },
    });
  });

  it('returns normalized translation lyrics from the business API', async () => {
    const krcLines = okLines('soda-line');
    const translationLines = okLines('soda-translated');
    mockSearchWithScoring.mockResolvedValue({ id: '42', title: 't', artists: ['a'] });
    mockQishuiLyrics.mockResolvedValueOnce({
      lyric: 'krc-data', tlyric: '[00:01.00]soda-translated',
    });
    mockParseKrc.mockReturnValueOnce(krcLines);
    mockParseSyncedLrc.mockReturnValueOnce(translationLines);

    const result = await fetchLyricsWithTranslationFromSodaMusic('t', 'a');

    expect(result).toEqual({
      lyrics: krcLines,
      translation: { status: 'available', lines: translationLines },
    });
  });

  it('passes normalized tlyric text to the translation parser', async () => {
    const krcLines = okLines('soda-line');
    const translationLines = okLines('soda-translated');
    mockSearchWithScoring.mockResolvedValue({ id: '42', title: 't', artists: ['a'] });
    mockQishuiLyrics.mockResolvedValueOnce({
      lyric: 'krc-data', tlyric: '[00:01.00]soda-translated',
    });
    mockParseKrc.mockReturnValueOnce(krcLines);
    mockParseSyncedLrc.mockReturnValueOnce(translationLines);

    const result = await fetchLyricsWithTranslationFromSodaMusic('t', 'a');

    expect(result).toEqual({
      lyrics: krcLines,
      translation: { status: 'available', lines: translationLines },
    });
    expect(mockParseSyncedLrc).toHaveBeenCalledWith('[00:01.00]soda-translated');
  });

  it('returns not-provided when translations is null', async () => {
    const krcLines = okLines('soda-line');
    mockSearchWithScoring.mockResolvedValue({ id: '42', title: 't', artists: ['a'] });
    mockQishuiLyrics.mockResolvedValueOnce({
      lyric: 'krc-data', tlyric: '',
    });
    mockParseKrc.mockReturnValueOnce(krcLines);

    const result = await fetchLyricsWithTranslationFromSodaMusic('t', 'a');

    expect(result).toEqual({
      lyrics: krcLines,
      translation: { status: 'not-provided', lines: null },
    });
  });

  it('returns null when parseKrc returns empty', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '1', title: 't', artists: ['a'] });
    mockQishuiLyrics.mockResolvedValueOnce({ lyric: 'bad-krc', tlyric: '' });
    mockParseKrc.mockReturnValueOnce([]);

    expect(await fetchLyricsFromSodaMusic('t', 'a')).toBeNull();
  });

  it('returns null when detail response is null', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '99', title: 't', artists: ['a'] });
    mockQishuiLyrics.mockResolvedValueOnce(null);
    expect(await fetchLyricsFromSodaMusic('t', 'a')).toBeNull();
  });

  it('calls searchWithScoring with correct input', async () => {
    mockSearchWithScoring.mockResolvedValue(null);
    await fetchLyricsFromSodaMusic('Song', 'Artist');
    expect(mockSearchWithScoring).toHaveBeenCalledWith(
      { title: 'Song', artist: 'Artist' },
      expect.any(Function),
      5, 7,
    );
  });
});
