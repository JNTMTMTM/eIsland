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
 * @description 逐字歌词（Karaoke）Provider 综合单元测试 — kugou / netease / qqmusic / sodaMusic
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { KaraokeLine } from '../types';

/* ---------- hoisted mock stubs ---------- */

const mockRequestJsonWithLog = vi.hoisted(() => vi.fn());
const mockRequestTextWithLog = vi.hoisted(() => vi.fn());
const mockQishuiSearch = vi.hoisted(() => vi.fn());
const mockQishuiLyrics = vi.hoisted(() => vi.fn());

const mockCleanTitle = vi.hoisted(() => vi.fn((t: string) => t));
const mockCleanArtist = vi.hoisted(() => vi.fn((a: string) => a));

const mockDecryptKRC = vi.hoisted(() => vi.fn());
const mockDecryptQRC = vi.hoisted(() => vi.fn());

const mockParseSyncedLines = vi.hoisted(() => vi.fn((): KaraokeLine[] => []));
const mockSearchWithScoring = vi.hoisted(() => vi.fn<(input: unknown, searchFn: unknown, minScore?: number, wowScore?: number, splitChar?: string) => Promise<unknown | null>>());

/* ---------- module mocks ---------- */

vi.mock('../../normal/request', () => ({
  requestJsonWithLog: mockRequestJsonWithLog,
  requestTextWithLog: mockRequestTextWithLog,
}));

vi.mock('../../normal/helpers', () => ({
  cleanTitle: mockCleanTitle,
  cleanArtist: mockCleanArtist,
}));

vi.mock('../../normal/matcher', () => ({
  searchWithScoring: mockSearchWithScoring,
  makeSearchQueries: vi.fn((t: string, a: string) => [`${t} ${a}`]),
  scoreTrack: vi.fn(() => 0),
  bestMatch: vi.fn(() => null),
}));

vi.mock('../decrypt/krc', () => ({
  decryptKRC: mockDecryptKRC,
}));

vi.mock('../decrypt/qrc', () => ({
  decryptQRC: mockDecryptQRC,
}));

vi.mock('../parsers', () => ({
  parseSyncedLines: mockParseSyncedLines,
}));

vi.mock('../../../../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.stubGlobal('window', {
  api: {
    qishuiSearch: mockQishuiSearch,
    qishuiLyrics: mockQishuiLyrics,
  },
});

/* ---------- imports under test ---------- */

import { fetchKaraokeFromKugou } from '../providers/kugou';
import { fetchKaraokeFromNetease } from '../providers/netease';
import { fetchKaraokeFromQQMusic } from '../providers/qqmusic';
import { fetchKaraokeFromSodaMusic } from '../providers/sodaMusic';

/* ---------- helpers ---------- */

function makeKaraokeLine(text: string, timeMs = 0): KaraokeLine {
  return {
    time_ms: timeMs,
    duration_ms: 2000,
    text,
    syllables: [
      { start_offset_ms: 0, duration_ms: 1000, text: text.slice(0, 2) },
      { start_offset_ms: 1000, duration_ms: 1000, text: text.slice(2) },
    ],
  };
}

/* ================================================================
 *  Kugou — KRC pipeline
 * ================================================================ */

describe('fetchKaraokeFromKugou', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanTitle.mockImplementation((t: string) => t);
    mockCleanArtist.mockImplementation((a: string) => a);
  });

  it('constructs correct song search URL with title + artist', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchKaraokeFromKugou('MySong', 'MyArtist');

    const url: string = mockRequestJsonWithLog.mock.calls[0][0];
    expect(url).toContain('mobilecdn.kugou.com/api/v3/search/song');
    expect(url).toContain(encodeURIComponent('MySong MyArtist'));
  });

  it('returns null when song search returns null', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);
    expect(await fetchKaraokeFromKugou('t', 'a')).toBeNull();
  });

  it('returns null when song search results are empty', async () => {
    mockRequestJsonWithLog.mockResolvedValueOnce({ data: { info: [] } });
    expect(await fetchKaraokeFromKugou('t', 'a')).toBeNull();
  });

  it('returns null when first song has no hash', async () => {
    mockRequestJsonWithLog.mockResolvedValueOnce({ data: { info: [{ duration: 200 }] } });
    expect(await fetchKaraokeFromKugou('t', 'a')).toBeNull();
  });

  it('constructs lyrics search URL with hash and duration', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce({ data: { info: [{ hash: 'abc', duration: 200 }] } })
      .mockResolvedValueOnce(null);

    await fetchKaraokeFromKugou('t', 'a');

    const lyricUrl: string = mockRequestJsonWithLog.mock.calls[1][0];
    expect(lyricUrl).toContain('lyrics.kugou.com/search');
    expect(lyricUrl).toContain('hash=abc');
    expect(lyricUrl).toContain('duration=200000');
  });

  it('returns null when lyrics search candidates are empty', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce({ data: { info: [{ hash: 'abc', duration: 200 }] } })
      .mockResolvedValueOnce({ candidates: [] });
    expect(await fetchKaraokeFromKugou('t', 'a')).toBeNull();
  });

  it('returns null when candidate lacks id or accesskey', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce({ data: { info: [{ hash: 'abc', duration: 200 }] } })
      .mockResolvedValueOnce({ candidates: [{ id: '', accesskey: '' }] });
    expect(await fetchKaraokeFromKugou('t', 'a')).toBeNull();
  });

  it('constructs download URL with candidate id and accesskey', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce({ data: { info: [{ hash: 'abc', duration: 200 }] } })
      .mockResolvedValueOnce({ candidates: [{ id: 'lid1', accesskey: 'ak1' }] })
      .mockResolvedValueOnce(null);

    await fetchKaraokeFromKugou('t', 'a');

    const dlUrl: string = mockRequestJsonWithLog.mock.calls[2][0];
    expect(dlUrl).toContain('lyrics.kugou.com/download');
    expect(dlUrl).toContain('id=lid1');
    expect(dlUrl).toContain('accesskey=ak1');
    expect(dlUrl).toContain('fmt=krc');
  });

  it('returns null when download response has no content', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce({ data: { info: [{ hash: 'abc', duration: 200 }] } })
      .mockResolvedValueOnce({ candidates: [{ id: '1', accesskey: 'ak' }] })
      .mockResolvedValueOnce({ content: '' });
    expect(await fetchKaraokeFromKugou('t', 'a')).toBeNull();
  });

  it('decrypts KRC and returns parsed karaoke lines', async () => {
    const krcPlaintext = '[0000,2000](0,1000)He(1000,1000)llo';
    const expected = [makeKaraokeLine('Hello')];

    mockRequestJsonWithLog
      .mockResolvedValueOnce({ data: { info: [{ hash: 'abc', duration: 200 }] } })
      .mockResolvedValueOnce({ candidates: [{ id: '1', accesskey: 'ak' }] })
      .mockResolvedValueOnce({ content: 'base64cipher' });
    mockDecryptKRC.mockResolvedValueOnce(krcPlaintext);
    mockParseSyncedLines.mockReturnValueOnce(expected);

    const result = await fetchKaraokeFromKugou('t', 'a');
    expect(result).toEqual(expected);
    expect(mockDecryptKRC).toHaveBeenCalledWith('base64cipher');
    expect(mockParseSyncedLines).toHaveBeenCalledWith(krcPlaintext, 'auto', 'relative');
  });

  it('returns null when parseSyncedLines yields no syllable lines', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce({ data: { info: [{ hash: 'abc', duration: 200 }] } })
      .mockResolvedValueOnce({ candidates: [{ id: '1', accesskey: 'ak' }] })
      .mockResolvedValueOnce({ content: 'base64cipher' });
    mockDecryptKRC.mockResolvedValueOnce('plaintext');
    mockParseSyncedLines.mockReturnValueOnce([{ time_ms: 0, duration_ms: 0, text: 'x', syllables: [] }]);

    expect(await fetchKaraokeFromKugou('t', 'a')).toBeNull();
  });

  it('retries with cleaned title/artist when first attempt fails', async () => {
    mockCleanTitle.mockImplementation((t: string) => t.trim());
    mockCleanArtist.mockImplementation((a: string) => a.trim());
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchKaraokeFromKugou('Song ', ' Artist');

    expect(mockCleanTitle).toHaveBeenCalledWith('Song ');
    expect(mockCleanArtist).toHaveBeenCalledWith(' Artist');
    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(2);
  });

  it('does not retry when title/artist are already clean', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchKaraokeFromKugou('Clean', 'Artist');

    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(1);
  });
});

/* ================================================================
 *  Netease — YRC pipeline
 * ================================================================ */

describe('fetchKaraokeFromNetease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanTitle.mockImplementation((t: string) => t);
    mockCleanArtist.mockImplementation((a: string) => a);
  });

  it('posts to the correct search endpoint with Referer header', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchKaraokeFromNetease('t', 'a');

    const callArgs = mockRequestJsonWithLog.mock.calls[0];
    expect(callArgs[0]).toBe('https://music.163.com/api/search/get/web');
    expect(callArgs[1]?.method).toBe('POST');
    expect(callArgs[1]?.headers?.Referer).toBe('https://music.163.com');
  });

  it('encodes query as title + artist in POST body', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchKaraokeFromNetease('MySong', 'MyArtist');

    const body: string = mockRequestJsonWithLog.mock.calls[0][1]?.body;
    expect(body).toContain(`s=${encodeURIComponent('MySong MyArtist')}`);
    expect(body).toContain('type=1');
  });

  it('returns null when search returns null', async () => {
    mockRequestJsonWithLog.mockResolvedValue(null);
    expect(await fetchKaraokeFromNetease('t', 'a')).toBeNull();
  });

  it('returns null when search results have no songs', async () => {
    mockRequestJsonWithLog.mockResolvedValueOnce({ result: { songs: [] } });
    expect(await fetchKaraokeFromNetease('t', 'a')).toBeNull();
  });

  it('returns null when search result has no result field', async () => {
    mockRequestJsonWithLog.mockResolvedValueOnce({});
    expect(await fetchKaraokeFromNetease('t', 'a')).toBeNull();
  });

  it('calls lyrics v1 endpoint with song ID', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce({ result: { songs: [{ id: 42 }] } })
      .mockResolvedValueOnce(null);

    await fetchKaraokeFromNetease('t', 'a');

    const lrcCall = mockRequestJsonWithLog.mock.calls[1];
    expect(lrcCall[0]).toBe('https://interface3.music.163.com/api/song/lyric/v1');
    expect(lrcCall[1]?.body).toContain('id=42');
  });

  it('returns null when lyrics response has no yrc.lyric', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce({ result: { songs: [{ id: 123 }] } })
      .mockResolvedValueOnce({ yrc: {} });
    expect(await fetchKaraokeFromNetease('t', 'a')).toBeNull();
  });

  it('returns null when lyrics response has no yrc field', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce({ result: { songs: [{ id: 123 }] } })
      .mockResolvedValueOnce({});
    expect(await fetchKaraokeFromNetease('t', 'a')).toBeNull();
  });

  it('parses YRC content with prefix mode and absolute offset', async () => {
    const yrcText = '[1000,3000](1000,500)你(1500,500)好';
    const expected = [makeKaraokeLine('你好', 1000)];

    mockRequestJsonWithLog
      .mockResolvedValueOnce({ result: { songs: [{ id: 99 }] } })
      .mockResolvedValueOnce({ yrc: { lyric: yrcText } });
    mockParseSyncedLines.mockReturnValueOnce(expected);

    const result = await fetchKaraokeFromNetease('t', 'a');
    expect(result).toEqual(expected);
    expect(mockParseSyncedLines).toHaveBeenCalledWith(yrcText, 'prefix', 'absolute');
  });

  it('returns null when parseSyncedLines yields no syllable lines', async () => {
    mockRequestJsonWithLog
      .mockResolvedValueOnce({ result: { songs: [{ id: 99 }] } })
      .mockResolvedValueOnce({ yrc: { lyric: '[0000,1000]plain text' } });
    mockParseSyncedLines.mockReturnValueOnce([{ time_ms: 0, duration_ms: 0, text: 'x', syllables: [] }]);

    expect(await fetchKaraokeFromNetease('t', 'a')).toBeNull();
  });

  it('retries with cleaned title/artist when first attempt fails', async () => {
    mockCleanTitle.mockImplementation((t: string) => t.trim());
    mockCleanArtist.mockImplementation((a: string) => a.trim());
    mockRequestJsonWithLog.mockResolvedValue(null);

    await fetchKaraokeFromNetease('Song ', ' Artist');

    expect(mockCleanTitle).toHaveBeenCalledWith('Song ');
    expect(mockCleanArtist).toHaveBeenCalledWith(' Artist');
    expect(mockRequestJsonWithLog).toHaveBeenCalledTimes(2);
  });
});

/* ================================================================
 *  QQ Music — QRC pipeline
 * ================================================================ */

describe('fetchKaraokeFromQQMusic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanTitle.mockImplementation((t: string) => t);
    mockCleanArtist.mockImplementation((a: string) => a);
  });

  it('returns null when no match found', async () => {
    mockSearchWithScoring.mockResolvedValue(null);
    expect(await fetchKaraokeFromQQMusic('t', 'a')).toBeNull();
  });

  it('returns null when matched song has no id', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '', mid: 'm', title: 't', artists: ['a'] });
    expect(await fetchKaraokeFromQQMusic('t', 'a')).toBeNull();
  });

  it('returns null when QRC text response is null', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '1', mid: 'm', title: 't', artists: ['a'] });
    mockRequestTextWithLog.mockResolvedValue(null);
    expect(await fetchKaraokeFromQQMusic('t', 'a')).toBeNull();
  });

  it('returns null when XML has no CDATA hex cipher', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '1', mid: 'm', title: 't', artists: ['a'] });
    mockRequestTextWithLog.mockResolvedValueOnce('<root>no-cdata-here</root>');
    expect(await fetchKaraokeFromQQMusic('t', 'a')).toBeNull();
  });

  it('extracts CDATA hex and decrypts QRC to karaoke lines', async () => {
    const hexCipher = 'A1B2C3D4E5F6';
    const qrcPlaintext = '[0000,3000]Hel(0,1000)lo(1000,1000)!<2000,1000>';
    const expected = [makeKaraokeLine('Hello!')];

    mockSearchWithScoring.mockResolvedValue({ id: '77', mid: 'm', title: 't', artists: ['a'] });
    mockRequestTextWithLog.mockResolvedValueOnce(
      `<lyric><![CDATA[${hexCipher}]]></lyric>`,
    );
    mockDecryptQRC.mockResolvedValueOnce(qrcPlaintext);
    mockParseSyncedLines.mockReturnValueOnce(expected);

    const result = await fetchKaraokeFromQQMusic('t', 'a');
    expect(result).toEqual(expected);
    expect(mockDecryptQRC).toHaveBeenCalledWith(hexCipher);
    expect(mockParseSyncedLines).toHaveBeenCalledWith(qrcPlaintext, 'suffix', 'absolute');
  });

  it('returns null when decryptQRC throws', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '1', mid: 'm', title: 't', artists: ['a'] });
    mockRequestTextWithLog.mockResolvedValueOnce(
      '<lyric><![CDATA[AABB]]></lyric>',
    );
    mockDecryptQRC.mockRejectedValueOnce(new Error('inflate failed'));

    expect(await fetchKaraokeFromQQMusic('t', 'a')).toBeNull();
  });

  it('returns null when parseSyncedLines yields no syllable lines', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '1', mid: 'm', title: 't', artists: ['a'] });
    mockRequestTextWithLog.mockResolvedValueOnce(
      '<lyric><![CDATA[AABB]]></lyric>',
    );
    mockDecryptQRC.mockResolvedValueOnce('plain');
    mockParseSyncedLines.mockReturnValueOnce([{ time_ms: 0, duration_ms: 0, text: 'x', syllables: [] }]);

    expect(await fetchKaraokeFromQQMusic('t', 'a')).toBeNull();
  });

  it('calls searchWithScoring with correct input', async () => {
    mockSearchWithScoring.mockResolvedValue(null);
    await fetchKaraokeFromQQMusic('Song', 'Artist');
    expect(mockSearchWithScoring).toHaveBeenCalledWith(
      { title: 'Song', artist: 'Artist' },
      expect.any(Function),
      5, 7, '/',
    );
  });
});

/* ================================================================
 *  Soda Music — plaintext KRC-style pipeline
 * ================================================================ */

describe('fetchKaraokeFromSodaMusic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanTitle.mockImplementation((t: string) => t);
    mockCleanArtist.mockImplementation((a: string) => a);
  });

  it('returns null when no match found', async () => {
    mockSearchWithScoring.mockResolvedValue(null);
    expect(await fetchKaraokeFromSodaMusic('t', 'a')).toBeNull();
  });

  it('returns null when detail response has no lyric content', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '100', title: 't', artists: ['a'] });
    mockQishuiLyrics.mockResolvedValueOnce({ lyric: '', tlyric: '' });
    expect(await fetchKaraokeFromSodaMusic('t', 'a')).toBeNull();
  });

  it('returns null when detail response has no lyric field', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '100', title: 't', artists: ['a'] });
    mockQishuiLyrics.mockResolvedValueOnce({});
    expect(await fetchKaraokeFromSodaMusic('t', 'a')).toBeNull();
  });

  it('parses lyric content with prefix mode and relative offset', async () => {
    const lyricContent = '[0000,2000](0,1000)He(1000,1000)llo';
    const expected = [makeKaraokeLine('Hello')];

    mockSearchWithScoring.mockResolvedValue({ id: '42', title: 't', artists: ['a'] });
    mockQishuiLyrics.mockResolvedValueOnce({ lyric: lyricContent, tlyric: '' });
    mockParseSyncedLines.mockReturnValueOnce(expected);

    const result = await fetchKaraokeFromSodaMusic('t', 'a');
    expect(result).toEqual(expected);
    expect(mockParseSyncedLines).toHaveBeenCalledWith(lyricContent, 'prefix', 'relative');
  });

  it('returns null when parseSyncedLines yields no syllable lines', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '1', title: 't', artists: ['a'] });
    mockQishuiLyrics.mockResolvedValueOnce({ lyric: 'bad-data', tlyric: '' });
    mockParseSyncedLines.mockReturnValueOnce([]);

    expect(await fetchKaraokeFromSodaMusic('t', 'a')).toBeNull();
  });

  it('returns null when detail response is null', async () => {
    mockSearchWithScoring.mockResolvedValue({ id: '99', title: 't', artists: ['a'] });
    mockQishuiLyrics.mockResolvedValueOnce(null);
    expect(await fetchKaraokeFromSodaMusic('t', 'a')).toBeNull();
  });

  it('calls searchWithScoring with correct input', async () => {
    mockSearchWithScoring.mockResolvedValue(null);
    await fetchKaraokeFromSodaMusic('Song', 'Artist');
    expect(mockSearchWithScoring).toHaveBeenCalledWith(
      { title: 'Song', artist: 'Artist' },
      expect.any(Function),
      5, 7,
    );
  });
});
