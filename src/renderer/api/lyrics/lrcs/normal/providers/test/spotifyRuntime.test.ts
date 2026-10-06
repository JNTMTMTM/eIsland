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
 * @file spotifyRuntime.test.ts
 * @description Spotify 真实认证、令牌缓存、搜索回退和同步歌词响应边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface RequestOptions { method?: string; headers?: Record<string, string>; body?: string }
const netFetch = vi.fn<(url: string, options?: RequestOptions) => Promise<{ ok: boolean; status: number; body: string }>>();
const searchPayload = (items: unknown[]) => ({ data: { searchV2: { topResultsV2: { itemsV2: items } } } });
const track = { item: { data: { id: 'track/id', name: 'Song', artists: { items: [{ profile: { name: 'Artist' } }] } } } };
const expected = [{ time_ms: 1000, text: '你好' }];
let access: unknown;
let client: unknown;
let search: unknown;
let lyrics: unknown;
let fetchLyrics: typeof import('../spotify').fetchLyricsFromSpotify;

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(59000);
  access = { accessToken: 'access', clientId: 'client' };
  client = { granted_token: { token: 'token' } };
  search = searchPayload([track]);
  lyrics = { lyrics: { syncType: 'LINE_SYNCED', lines: [{ startTimeMs: '1000', words: '你好' }] } };
  netFetch.mockImplementation((url) => {
    let value: unknown = lyrics;
    if (url.includes('/api/token')) value = access;
    else if (url.includes('clienttoken.spotify')) value = client;
    else if (url.includes('pathfinder')) value = search;
    return Promise.resolve({ ok: value !== null, status: value === null ? 503 : 200, body: JSON.stringify(value) });
  });
  vi.stubGlobal('window', { api: { netFetch } });
  vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null) });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  fetchLyrics = (await import('../spotify')).fetchLyricsFromSpotify;
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Spotify real authentication and token lifetime', () => {
  it('sends TOTP and client identity before authenticated search and lyric requests', async () => {
    expect(await fetchLyrics('Song', 'Artist')).toEqual(expected);
    expect(netFetch).toHaveBeenCalledTimes(4);
    const tokenUrl = new URL(netFetch.mock.calls[0][0]);
    expect(tokenUrl.searchParams.get('totp')).toMatch(/^\d{6}$/);
    expect(tokenUrl.searchParams.get('totpServer')).toBe(tokenUrl.searchParams.get('totp'));
    expect(tokenUrl.searchParams.get('totpVer')).toBe('61');
    expect(JSON.parse(netFetch.mock.calls[1][1]?.body ?? '{}')).toMatchObject({ client_data: { client_id: 'client', js_sdk_data: { os: 'windows' } } });
    expect(netFetch.mock.calls[2][1]?.headers).toMatchObject({ Authorization: 'Bearer access', 'Client-Token': 'token' });
    expect(JSON.parse(netFetch.mock.calls[2][1]?.body ?? '{}')).toMatchObject({ variables: { query: 'Song Artist' }, operationName: 'searchSuggestions' });
    expect(netFetch.mock.calls[3][0]).toContain('track%2Fid');
  });
  it.each([null, {}, { accessToken: 'access' }, { clientId: 'client' }, { accessToken: '', clientId: 'client' }])('stops authentication after invalid access fields %j', async (value) => {
    access = value;
    expect(await fetchLyrics('Song', 'Artist')).toBeNull();
    expect(netFetch).toHaveBeenCalledTimes(1);
  });
  it.each([null, {}, { granted_token: {} }, { granted_token: { token: '' } }])('stops authentication after invalid client fields %j', async (value) => {
    client = value;
    expect(await fetchLyrics('Song', 'Artist')).toBeNull();
    expect(netFetch).toHaveBeenCalledTimes(2);
  });
  it('contains authentication transport rejection and permits a later retry', async () => {
    netFetch.mockRejectedValueOnce(new Error('offline'));
    expect(await fetchLyrics('Song', 'Artist')).toBeNull();
    expect(console.error).toHaveBeenCalledWith('[Spotify] Token 初始化异常:', expect.any(Error));
    expect(await fetchLyrics('Song', 'Artist')).toEqual(expected);
  });
  it('reuses tokens until the exact 30-minute expiry and then refreshes them', async () => {
    expect(await fetchLyrics('Song', 'Artist')).toEqual(expected);
    vi.setSystemTime(59000 + 30 * 60 * 1000 - 1);
    expect(await fetchLyrics('Song', 'Artist')).toEqual(expected);
    expect(netFetch.mock.calls.filter(([url]) => url.includes('/api/token'))).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(await fetchLyrics('Song', 'Artist')).toEqual(expected);
    expect(netFetch.mock.calls.filter(([url]) => url.includes('/api/token'))).toHaveLength(2);
  });
  it('returns null if tokens expire after search and refresh fails before fetching lyrics', async () => {
    const handler = netFetch.getMockImplementation()!;
    netFetch.mockImplementation((url, options) => {
      const response = handler(url, options);
      if (url.includes('pathfinder')) { vi.advanceTimersByTime(30 * 60 * 1000); access = null; }
      return response;
    });
    expect(await fetchLyrics('Song', 'Artist')).toBeNull();
    expect(netFetch.mock.calls.filter(([url]) => url.includes('/api/token'))).toHaveLength(2);
    expect(netFetch.mock.calls.some(([url]) => url.includes('color-lyrics'))).toBe(false);
  });
});

describe('Spotify real search and lyric response boundaries', () => {
  it.each([null, {}, { data: {} }, { data: { searchV2: {} } }, { data: { searchV2: { topResultsV2: {} } } }, searchPayload([]), searchPayload([null]), searchPayload([{}]), searchPayload([{ item: {} }]), searchPayload([{ item: { data: {} } }])])('returns null for incomplete search results %j', async (value) => {
    search = value;
    expect(await fetchLyrics('Song', 'Artist')).toBeNull();
    expect(netFetch).toHaveBeenCalledTimes(3);
  });
  it.each([{ id: 'track' }, { id: 'track', artists: {} }, { id: 'track', artists: { items: [{}, { profile: {} }, { profile: { name: 'Artist' } }] } }])('uses optional artist and title defaults %j', async (data) => {
    search = searchPayload([{ item: { data } }]);
    expect(await fetchLyrics('Song', 'Artist')).toEqual(expected);
  });
  it.each([null, {}, { lyrics: {} }, { lyrics: { syncType: 'UNSYNCED', lines: [] } }, { lyrics: { syncType: 'LINE_SYNCED' } }, { lyrics: { syncType: 'LINE_SYNCED', lines: [] } }, { lyrics: { syncType: 'LINE_SYNCED', lines: [{}, { words: '' }] } }])('returns null for unsupported or empty lyrics %j', async (value) => {
    lyrics = value;
    expect(await fetchLyrics('Song', 'Artist')).toBeNull();
  });
  it('drops empty words and defaults missing timestamps to zero', async () => {
    lyrics = { lyrics: { syncType: 'LINE_SYNCED', lines: [{}, { words: '' }, { words: 'Zero' }, { startTimeMs: '2000', words: 'Later' }] } };
    expect(await fetchLyrics('Song', 'Artist')).toEqual([{ time_ms: 0, text: 'Zero' }, { time_ms: 2000, text: 'Later' }]);
  });
  it.each(['pathfinder', 'color-lyrics'])('contains transport rejection from %s', async (failingUrl) => {
    const handler = netFetch.getMockImplementation()!;
    netFetch.mockImplementation((url, options) => url.includes(failingUrl) ? Promise.reject(new Error('offline')) : handler(url, options));
    expect(await fetchLyrics('Song', 'Artist')).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[Spotify] 未预期异常'), expect.any(Error));
  });
  it.each([['Song (Live)', 'Artist', 'Song Artist'], ['Song', 'Artist / Guest', 'Song Artist']])('retries a cleaned query after raw failure for %s / %s', async (title, artist, query) => {
    const handler = netFetch.getMockImplementation()!;
    let searches = 0;
    netFetch.mockImplementation((url, options) => {
      if (url.includes('pathfinder') && ++searches === 1) return Promise.resolve({ ok: true, status: 200, body: '{}' });
      return handler(url, options);
    });
    expect(await fetchLyrics(title, artist)).toEqual(expected);
    const requests = netFetch.mock.calls.filter(([url]) => url.includes('pathfinder'));
    expect(requests).toHaveLength(2);
    const request = JSON.parse(requests[1][1]?.body ?? '{}') as { variables: { query: string } };
    expect(request.variables.query).toBe(query);
    expect(netFetch.mock.calls.filter(([url]) => url.includes('/api/token'))).toHaveLength(1);
  });
});
