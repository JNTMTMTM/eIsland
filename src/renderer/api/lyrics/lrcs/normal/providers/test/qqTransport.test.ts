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
 * @file qqTransport.test.ts
 * @description QQ 音乐真实分页搜索、备用搜索、JSONP 与 Base64 歌词解析边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchLyricsFromQQMusic, fetchLyricsWithTranslationFromQQMusic } from '../qqmusic';

const encode = (text: string): string => Buffer.from(text).toString('base64');
const song = { id: 1, mid: 'mid', title: 'Song', singer: [{ title: 'Artist' }] };
const payload = (list: unknown[]) => ({ req_1: { data: { body: { song: { list } } } } });
const jsonp = (value: unknown, closing = true): string => `MusicJsonCallback_lrc(${  JSON.stringify(value)  }${closing ? ')' : ''}`;
const expected = [{ time_ms: 1000, text: '你好' }];
let primary: unknown;
let secondary: unknown;
let fallback: unknown;
let lyrics: string | null;
interface RequestOptions { body?: string }
interface SearchRequest { req_1: { param: { page_num: string; query: string; search_type: number } } }
const netFetch = vi.fn<(url: string, options?: RequestOptions) => Promise<{ ok: boolean; status: number; body: string }>>();

beforeEach(() => {
  vi.resetAllMocks();
  primary = payload([song]);
  secondary = null;
  fallback = null;
  lyrics = jsonp({ lyric: encode('[00:01.00]你好') });
  netFetch.mockImplementation((url: string, options?: { body?: string }) => {
    let value: unknown;
    if (url.includes('musicu.fcg')) {
      const request = JSON.parse(options?.body ?? '{}') as SearchRequest;
      value = request.req_1.param.page_num === '1' ? primary : secondary;
    } else if (url.includes('search_for_qq_cp')) value = fallback;
    else return Promise.resolve({ ok: lyrics !== null, status: lyrics === null ? 503 : 200, body: lyrics ?? '' });
    return Promise.resolve({ ok: value !== null, status: value === null ? 503 : 200, body: JSON.stringify(value) });
  });
  vi.stubGlobal('window', { api: { netFetch } });
  vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null) });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('real QQ Music search transport', () => {
  it('parses UTF-8 lyrics and keeps the original search and form request fields', async () => {
    expect(await fetchLyricsFromQQMusic('Song', 'Artist')).toEqual(expected);
    const request = JSON.parse(netFetch.mock.calls[0][1]?.body ?? '{}') as SearchRequest;
    expect(request.req_1.param).toMatchObject({ query: 'Song Artist', page_num: '1', search_type: 0 });
    const form = new URLSearchParams(netFetch.mock.calls[1][1]?.body);
    expect(form.get('songmid')).toBe('mid');
    expect(form.get('callback')).toBe('MusicJsonCallback_lrc');
  });

  it('uses page two after the primary page is empty', async () => {
    primary = payload([]);
    secondary = payload([song]);
    expect(await fetchLyricsFromQQMusic('Song', 'Artist')).toEqual(expected);
    const request = JSON.parse(netFetch.mock.calls[1][1]?.body ?? '{}') as SearchRequest;
    expect(request.req_1.param.page_num).toBe('2');
  });

  it.each([null, {}, { req_1: {} }, { req_1: { data: {} } }, { req_1: { data: { body: {} } } }, { req_1: { data: { body: { song: {} } } } }, payload([])])('uses the real backup search after missing primary data %j', async (data) => {
    primary = data;
    fallback = { data: { song: { list: [{ songid: 1, songmid: 'mid', songname: 'Song', singer: [{ name: 'Artist' }], albumname: 'Album', interval: 3 }] } } };
    expect(await fetchLyricsFromQQMusic('Song', 'Artist')).toEqual(expected);
    expect(netFetch.mock.calls[2][0]).toContain('search_for_qq_cp');
  });

  it.each([null, {}, { data: {} }, { data: { song: {} } }, { data: { song: { list: [] } } }])('returns null when the backup response is also empty %j', async (data) => {
    primary = null;
    fallback = data;
    expect(await fetchLyricsFromQQMusic('Song', 'Artist')).toBeNull();
  });

  it('normalizes optional primary fields and ignores incomplete candidates', async () => {
    primary = payload([{}, { name: 'Other', singer: [{}, { name: 'Nobody' }], album: { name: 'Fallback' }, interval: 1 },
      { ...song, title: undefined, name: 'Song', singer: [{ name: 'Artist' }], album: { title: 'Album' }, interval: 2 }]);
    expect(await fetchLyricsFromQQMusic('Song', 'Artist')).toEqual(expected);
  });

  it('normalizes backup missing fields and preserves a valid later candidate', async () => {
    primary = null;
    fallback = { data: { song: { list: [{}, { songname: 'Other', singer: [{}] }, { songid: 1, songmid: 'mid', songname: 'Song', singer: [{ name: 'Artist' }] }] } } };
    expect(await fetchLyricsFromQQMusic('Song', 'Artist')).toEqual(expected);
  });

  it('returns null for a matched song without its lyric mid', async () => {
    primary = payload([{ ...song, mid: undefined }]);
    expect(await fetchLyricsFromQQMusic('Song', 'Artist')).toBeNull();
    expect(netFetch).toHaveBeenCalledTimes(1);
  });

  it('continues search queries after a network rejection', async () => {
    netFetch.mockRejectedValueOnce(new Error('network'));
    expect(await fetchLyricsFromQQMusic('Song', 'Artist')).toEqual(expected);
    expect(netFetch).toHaveBeenCalledTimes(3);
  });
});

describe('real QQ Music JSONP lyric validation', () => {
  it.each([null, '', 'wrong({})', 'MusicJsonCallback_lrc(', 'MusicJsonCallback_lrc({)', jsonp({}), jsonp({ lyric: 42 }), jsonp({ lyric: '' }), jsonp({ lyric: '@@@' }), jsonp({ lyric: encode('untimed') })])('returns null for unusable lyric transport %s', async (raw) => {
    lyrics = raw;
    expect(await fetchLyricsFromQQMusic('Song', 'Artist')).toBeNull();
  });

  it('supports a JSONP prefix with no final closing parenthesis', async () => {
    lyrics = jsonp({ lyric: encode('[00:01.00]你好') }, false);
    expect(await fetchLyricsFromQQMusic('Song', 'Artist')).toEqual(expected);
  });

  it.each([null, '', 42, '@@@', encode('untimed'), encode('[00:01.00]Hello')])('keeps translation status for transport value %s', async (trans) => {
    lyrics = jsonp({ trans, lyric: encode('[00:01.00]你好') });
    const result = await fetchLyricsWithTranslationFromQQMusic('Song', 'Artist');
    expect(result?.lyrics).toEqual(expected);
    if (trans === encode('[00:01.00]Hello')) expect(result?.translation).toEqual({ status: 'available', lines: [{ time_ms: 1000, text: 'Hello' }] });
    else if (trans === encode('untimed')) expect(result?.translation.status).toBe('not-fetched');
    else expect(result?.translation.status).toBe('not-provided');
  });
});
