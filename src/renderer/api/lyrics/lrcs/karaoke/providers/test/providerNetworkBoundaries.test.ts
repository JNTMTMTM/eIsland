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
 * @file providerNetworkBoundaries.test.ts
 * @description 网易云与酷狗逐字歌词的真实网络链路、解密解析和响应字段边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchKaraokeFromNetease } from '../netease';
import { fetchKaraokeFromKugou } from '../kugou';

interface RequestOptions { body?: string }
const netFetch = vi.fn<(url: string, options?: RequestOptions) => Promise<{ ok: boolean; status: number; body: string }>>();
const singleKrc = 'a3JjMTjbGsglTcDm0Lewo2dTL8VN37NG7sE8ipj/Ni1PTWY2';
const untimedKrc = 'a3JjMTjbGsglTR0ZGFBfR0SQJwMFTmE2rDUx';
const expected = [{ time_ms: 1000, duration_ms: 500, text: 'Hello', syllables: [{ start_offset_ms: 0, duration_ms: 500, text: 'Hello' }] }];
let search: unknown;
let lyricSearch: unknown;
let lyric: unknown;

beforeEach(() => {
  vi.resetAllMocks();
  netFetch.mockImplementation((url) => {
    let value = lyric;
    if (url.includes('/search/song') || url.includes('/search/get')) value = search;
    else if (url.includes('lyrics.kugou.com/search')) value = lyricSearch;
    return Promise.resolve({ ok: value !== null, status: value === null ? 503 : 200, body: JSON.stringify(value) });
  });
  vi.stubGlobal('window', { api: { netFetch } });
  vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null) });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Netease real YRC transport and parser', () => {
  beforeEach(() => { search = { result: { songs: [{ id: 123 }] } }; lyric = { yrc: { lyric: '[1000,500](1000,500,0)Hello\n[2000,500]untimed' } }; });
  it.each([123, '123'])('sends numeric or string song id %s and keeps absolute word offsets', async (id) => {
    search = { result: { songs: [{ id }] } };
    expect(await fetchKaraokeFromNetease('Song', 'Artist')).toEqual(expected);
    expect(new URLSearchParams(netFetch.mock.calls[0][1]?.body).get('s')).toBe('Song Artist');
    expect(new URLSearchParams(netFetch.mock.calls[1][1]?.body).get('id')).toBe('123');
  });
  it.each([null, {}, { result: {} }, { result: { songs: [] } }, { result: { songs: [{}] } }, { result: { songs: [null] } }])('returns null for incomplete search %j', async (value) => {
    search = value;
    expect(await fetchKaraokeFromNetease('Song', 'Artist')).toBeNull();
  });
  it.each([null, {}, { yrc: {} }, { yrc: { lyric: '' } }, { yrc: { lyric: 'untimed' } }, { yrc: { lyric: '[1000,500]untimed' } }])('returns null without usable word timing %j', async (value) => {
    lyric = value;
    expect(await fetchKaraokeFromNetease('Song', 'Artist')).toBeNull();
  });
  it('contains search transport rejection', async () => {
    netFetch.mockRejectedValueOnce(new Error('offline'));
    expect(await fetchKaraokeFromNetease('Song', 'Artist')).toBeNull();
  });
  it.each([['Song (Live)', 'Artist'], ['Song', 'Artist / Guest']])('retries cleaned inputs %s / %s', async (title, artist) => {
    netFetch.mockResolvedValueOnce({ ok: true, status: 200, body: '{}' });
    expect(await fetchKaraokeFromNetease(title, artist)).toEqual(expected);
    expect(new URLSearchParams(netFetch.mock.calls[1][1]?.body).get('s')).toBe('Song Artist');
  });
});

describe('Kugou real KRC download, decryption and parser', () => {
  beforeEach(() => {
    search = { data: { info: [{ hash: 'hash', duration: 3 }] } };
    lyricSearch = { candidates: [{ id: 'lyric-id', accesskey: 'key' }] };
    lyric = { content: singleKrc };
  });
  it('preserves a real encrypted single syllable and sends download credentials', async () => {
    expect(await fetchKaraokeFromKugou('Song', 'Artist')).toEqual(expected);
    expect(new URL(netFetch.mock.calls[0][0]).searchParams.get('keyword')).toBe('Song Artist');
    expect(new URL(netFetch.mock.calls[1][0]).searchParams.get('duration')).toBe('3000');
    expect(new URL(netFetch.mock.calls[2][0]).searchParams.get('id')).toBe('lyric-id');
    expect(new URL(netFetch.mock.calls[2][0]).searchParams.get('accesskey')).toBe('key');
  });
  it('omits unknown duration and converts a numeric lyric id', async () => {
    search = { data: { info: [{ hash: 'hash', duration: '3' }] } };
    lyricSearch = { candidates: [{ id: 123, accesskey: 'key' }] };
    expect(await fetchKaraokeFromKugou('Song', 'Artist')).toEqual(expected);
    expect(new URL(netFetch.mock.calls[1][0]).searchParams.has('duration')).toBe(false);
    expect(new URL(netFetch.mock.calls[2][0]).searchParams.get('id')).toBe('123');
  });
  it.each([null, {}, { data: {} }, { data: { info: [] } }, { data: { info: [{}] } }, { data: { info: [{ hash: 123 }] } }, { data: { info: [null] } }])('returns null for unusable song search %j', async (value) => {
    search = value;
    expect(await fetchKaraokeFromKugou('Song', 'Artist')).toBeNull();
  });
  it.each([null, {}, { candidates: [] }, { candidates: [{}] }, { candidates: [{ id: 'id' }] }, { candidates: [{ id: 'id', accesskey: 123 }] }, { candidates: [{ accesskey: 'key' }] }, { candidates: [null] }])('returns null for unusable lyric search %j', async (value) => {
    lyricSearch = value;
    expect(await fetchKaraokeFromKugou('Song', 'Artist')).toBeNull();
  });
  it.each([null, {}, { content: 123 }, { content: '' }, { content: '@@@' }, { content: untimedKrc }])('returns null for unsupported download %j', async (value) => {
    lyric = value;
    expect(await fetchKaraokeFromKugou('Song', 'Artist')).toBeNull();
  });
  it('contains download transport rejection', async () => {
    const handler = netFetch.getMockImplementation()!;
    netFetch.mockImplementation((url, options) => url.includes('/download') ? Promise.reject(new Error('offline')) : handler(url, options));
    expect(await fetchKaraokeFromKugou('Song', 'Artist')).toBeNull();
  });
  it.each([['Song (Live)', 'Artist'], ['Song', 'Artist / Guest']])('retries cleaned inputs %s / %s', async (title, artist) => {
    netFetch.mockResolvedValueOnce({ ok: true, status: 200, body: '{}' });
    expect(await fetchKaraokeFromKugou(title, artist)).toEqual(expected);
    expect(new URL(netFetch.mock.calls[1][0]).searchParams.get('keyword')).toBe('Song Artist');
  });
});
