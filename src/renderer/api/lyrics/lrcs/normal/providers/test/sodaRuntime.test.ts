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
 * @file sodaRuntime.test.ts
 * @description 汽水音乐真实歌曲评分、授权状态与行级歌词和翻译响应边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchLyricsFromSodaMusic, fetchLyricsWithTranslationFromSodaMusic } from '../sodaMusic';

const qishuiSearch = vi.fn<(query: string, options: { limit: number }) => Promise<{ songs?: unknown; loggedIn?: boolean; publicCatalog?: boolean }>>();
const qishuiLyrics = vi.fn<(id: string) => Promise<unknown>>();
const song = { id: 'id', providerSongId: 'provider', name: 'Song', artists: [{ name: 'Artist' }], album: 'Album', duration: 1000 };
const expected = [{ time_ms: 1000, text: 'Hello' }];

beforeEach(() => {
  vi.resetAllMocks();
  qishuiSearch.mockResolvedValue({ songs: [song], loggedIn: true });
  qishuiLyrics.mockResolvedValue({ auth: 'login', lyric: '[1000,500]<0,500,0>Hello' });
  vi.stubGlobal('window', { api: { qishuiSearch, qishuiLyrics } });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('SodaMusic real normal provider boundaries', () => {
  it.each([{ loggedIn: true }, { publicCatalog: true }, {}])('keeps real matching for auth state %j', async (auth) => {
    qishuiSearch.mockResolvedValue({ ...auth, songs: [song] });
    expect(await fetchLyricsFromSodaMusic('Song', 'Artist')).toEqual(expected);
    expect(qishuiSearch).toHaveBeenCalledWith('Song Artist', { limit: 18 });
    expect(qishuiLyrics).toHaveBeenCalledWith('provider');
  });
  it.each([{}, { songs: null }, { songs: [] }, { songs: 'invalid' }])('returns null for missing songs %j', async (value) => {
    qishuiSearch.mockResolvedValue(value);
    expect(await fetchLyricsFromSodaMusic('Song', 'Artist')).toBeNull();
    expect(qishuiLyrics).not.toHaveBeenCalled();
  });
  it('normalizes optional candidate fields and keeps a later valid song', async () => {
    qishuiSearch.mockResolvedValue({ songs: [{}, { name: 'Other' }, { id: 'other', artists: [{}] }, { id: 'empty', name: 'Other', artists: [] }, { id: 'id', name: 'Song', artist: 'Artist', artists: [{}] }] });
    expect(await fetchLyricsFromSodaMusic('Song', 'Artist')).toEqual(expected);
    expect(qishuiLyrics).toHaveBeenCalledWith('id');
  });
  it('rejects title-only candidates below the minimum score', async () => {
    qishuiSearch.mockResolvedValue({ songs: [{ id: 'id', name: 'Song' }] });
    expect(await fetchLyricsFromSodaMusic('Song', '')).toBeNull();
    expect(qishuiLyrics).not.toHaveBeenCalled();
  });
  it.each([null, {}, { auth: 123 }, { lyric: 123 }, { lyric: '' }, { lyric: 'untimed' }])('returns null for invalid detail %j', async (detail) => {
    qishuiLyrics.mockResolvedValue(detail);
    expect(await fetchLyricsFromSodaMusic('Song', 'Artist')).toBeNull();
  });
  it('uses unknown authorization when valid lyrics omit auth', async () => {
    qishuiLyrics.mockResolvedValue({ lyric: '[1000,500]<0,500,0>Hello' });
    expect(await fetchLyricsFromSodaMusic('Song', 'Artist')).toEqual(expected);
  });
  it('contains search failures inside the real multi-query matcher', async () => {
    qishuiSearch.mockRejectedValue(new Error('offline'));
    expect(await fetchLyricsFromSodaMusic('Song', 'Artist')).toBeNull();
    expect(qishuiLyrics).not.toHaveBeenCalled();
  });
  it('propagates detail rejection to the caller', async () => {
    qishuiLyrics.mockRejectedValue(new Error('offline'));
    await expect(fetchLyricsFromSodaMusic('Song', 'Artist')).rejects.toThrow('offline');
  });
  it.each([undefined, 123, '', 'untimed', '[00:01.00]你好'])('keeps translation status for detail value %s', async (tlyric) => {
    qishuiLyrics.mockResolvedValue({ tlyric, lyric: '[1000,500]<0,500,0>Hello' });
    const result = await fetchLyricsWithTranslationFromSodaMusic('Song', 'Artist');
    expect(result?.lyrics).toEqual(expected);
    let status = 'not-provided';
    if (tlyric === '[00:01.00]你好') status = 'available';
    else if (tlyric === 'untimed') status = 'not-fetched';
    expect(result?.translation.status).toBe(status);
  });
});
