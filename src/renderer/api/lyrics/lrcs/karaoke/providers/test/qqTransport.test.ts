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
 * @description QQ 逐字歌词的真实分页、备用搜索、独立密文解密及 XML 下载边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchKaraokeFromQQMusic } from '../qqmusic';

// 使用 QQMusicDecoder 官方 C# 加密入口独立生成固定密文，避免测试复制被测解密算法。
// https://github.com/WXRIW/QQMusicDecoder/blob/master/QQMusicDecoder/DESHelper.cs
const cipher = 'D6A2BE95D6447372A98925F6DC680E047092AA6F26860A3A399AB1398EB9B8A4';
const untimedCipher = '8FE1DB631378FCC5F411328AF1BA94C2';
const mixedCipher = 'D6A2BE95D6447372A98925F6DC680E0410850A742519975A3FD1120F4E9299D053AD9A872EA13321';
const song = { id: 1, mid: 'mid', title: 'Song', singer: [{ title: 'Artist' }] };
const payload = (list: unknown[]) => ({ req_1: { data: { body: { song: { list } } } } });
const expected = [{ time_ms: 1000, duration_ms: 500, text: 'Hello', syllables: [{ start_offset_ms: 0, duration_ms: 500, text: 'Hello' }] }];
interface RequestOptions { body?: string }
interface SearchRequest { req_1: { param: { page_num: string; query: string } } }
const netFetch = vi.fn<(url: string, options?: RequestOptions) => Promise<{ ok: boolean; status: number; body: string }>>();
let primary: unknown;
let secondary: unknown;
let fallback: unknown;
let xml: string | null;

beforeEach(() => {
  vi.resetAllMocks();
  primary = payload([song]); secondary = null; fallback = null; xml = `<![CDATA[${  cipher  }]]>`;
  netFetch.mockImplementation((url, options) => {
    let value: unknown;
    if (url.includes('musicu.fcg')) {
      const request = JSON.parse(options?.body ?? '{}') as SearchRequest;
      value = request.req_1.param.page_num === '1' ? primary : secondary;
    } else if (url.includes('search_for_qq_cp')) value = fallback;
    else return Promise.resolve({ ok: xml !== null, status: xml === null ? 503 : 200, body: xml ?? '' });
    return Promise.resolve({ ok: value !== null, status: value === null ? 503 : 200, body: JSON.stringify(value) });
  });
  vi.stubGlobal('window', { api: { netFetch } });
  vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null) });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('QQ real QRC search and encrypted download', () => {
  it('decrypts an independently encrypted single syllable and sends numeric song id', async () => {
    expect(await fetchKaraokeFromQQMusic('Song', 'Artist')).toEqual(expected);
    expect(new URLSearchParams(netFetch.mock.calls[1][1]?.body).get('musicid')).toBe('1');
  });
  it('uses page two after an empty first page', async () => {
    primary = payload([]); secondary = payload([song]);
    expect(await fetchKaraokeFromQQMusic('Song', 'Artist')).toEqual(expected);
    expect(JSON.parse(netFetch.mock.calls[1][1]?.body ?? '{}')).toMatchObject({ req_1: { param: { page_num: '2' } } });
  });
  it.each([null, {}, { req_1: {} }, { req_1: { data: {} } }, { req_1: { data: { body: {} } } }, { req_1: { data: { body: { song: {} } } } }, payload([])])('uses backup after incomplete primary data %j', async (value) => {
    primary = value;
    fallback = { data: { song: { list: [{ songid: 1, songmid: 'mid', songname: 'Song', singer: [{ name: 'Artist' }], albumname: 'Album', interval: 2 }] } } };
    expect(await fetchKaraokeFromQQMusic('Song', 'Artist')).toEqual(expected);
    expect(netFetch.mock.calls[2][0]).toContain('search_for_qq_cp');
  });
  it.each([null, {}, { data: {} }, { data: { song: {} } }, { data: { song: { list: [] } } }])('returns null for an empty backup %j', async (value) => {
    primary = null; fallback = value;
    expect(await fetchKaraokeFromQQMusic('Song', 'Artist')).toBeNull();
  });
  it('normalizes optional primary fields before choosing a complete candidate', async () => {
    primary = payload([{}, { name: 'Other', singer: [{}, { name: 'Nobody' }], album: { name: 'Fallback' }, interval: 1 }, { ...song, title: undefined, name: 'Song', singer: [{ name: 'Artist' }], album: { title: 'Album' }, interval: 2 }]);
    expect(await fetchKaraokeFromQQMusic('Song', 'Artist')).toEqual(expected);
  });
  it('normalizes backup missing fields before choosing a complete candidate', async () => {
    primary = null; fallback = { data: { song: { list: [{}, { songname: 'Other', singer: [{}] }, { songid: 1, songname: 'Song', singer: [{ name: 'Artist' }] }] } } };
    expect(await fetchKaraokeFromQQMusic('Song', 'Artist')).toEqual(expected);
  });
  it('skips download for a matched candidate without an id', async () => {
    primary = payload([{ ...song, id: undefined }]);
    expect(await fetchKaraokeFromQQMusic('Song', 'Artist')).toBeNull();
    expect(netFetch).toHaveBeenCalledTimes(1);
  });
  it('continues real query alternatives after search transport rejection', async () => {
    netFetch.mockRejectedValueOnce(new Error('offline'));
    expect(await fetchKaraokeFromQQMusic('Song', 'Artist')).toEqual(expected);
  });
  it.each([null, '', '<xml/>', '<![CDATA[ZZ]]>', '<![CDATA[A]]>', '<![CDATA[0000000000000000]]>', `<![CDATA[${  untimedCipher  }]]>`])('returns null for invalid XML or unusable encrypted payload %s', async (value) => {
    xml = value;
    expect(await fetchKaraokeFromQQMusic('Song', 'Artist')).toBeNull();
  });
  it('filters untimed lines after successful independent decryption', async () => {
    xml = `<![CDATA[${  mixedCipher  }]]>`;
    expect(await fetchKaraokeFromQQMusic('Song', 'Artist')).toEqual(expected);
  });
});
