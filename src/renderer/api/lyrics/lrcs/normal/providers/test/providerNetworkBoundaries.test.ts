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
 * @description 酷狗、LRCLIB、网易真实 Provider 网络失败、字段校验与清洗查询回退边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchLyricsFromKugou } from '../kugou';
import { fetchLyricsFromLrclib } from '../lrclib';
import { fetchLyricsFromNetease } from '../netease';

const netFetch = vi.fn<(url: string, options?: { body?: string }) => Promise<{ ok: boolean; status: number; body: string }>>();
const response = (value: unknown) => ({ ok: value !== null, status: value === null ? 503 : 200, body: JSON.stringify(value) });
const lrc = '[00:01.00]Hello';
const encoded = Buffer.from(lrc).toString('base64');
const track = { data: { info: [{ hash: 'hash', duration: 3 }] } };
const candidates = { candidates: [{ id: '1', accesskey: 'key' }] };
const expected = [{ time_ms: 1000, text: 'Hello' }];

beforeEach(() => {
  netFetch.mockReset().mockResolvedValue({ ok: false, status: 503, body: '' });
  vi.stubGlobal('window', { api: { netFetch } });
  vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null) });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('real Kugou network and decoding boundaries', () => {
  it.each([null, {}, { data: {} }, { data: { info: [] } }])('rejects empty song search %j', async (payload) => {
    netFetch.mockResolvedValueOnce(response(payload));
    expect(await fetchLyricsFromKugou('Song', 'Artist')).toBeNull();
  });

  it.each([null, {}, { candidates: [] }, { candidates: [{ id: null, accesskey: 'key' }] }, { candidates: [{ id: '', accesskey: 'key' }] }, { candidates: [{ id: '1', accesskey: 42 }] }])('rejects unavailable lyric candidate %j', async (payload) => {
    netFetch.mockResolvedValueOnce(response(track)).mockResolvedValueOnce(response(payload));
    expect(await fetchLyricsFromKugou('Song', 'Artist')).toBeNull();
  });

  it.each([null, {}, { content: 42 }, { content: '' }, { content: '@@@' }, { content: ' ' }, { content: Buffer.from('untimed').toString('base64') }])('rejects invalid lyric download %j', async (payload) => {
    netFetch.mockResolvedValueOnce(response(track)).mockResolvedValueOnce(response(candidates)).mockResolvedValueOnce(response(payload));
    expect(await fetchLyricsFromKugou('Song', 'Artist')).toBeNull();
  });

  it('supports numeric candidate IDs and missing optional hash or duration', async () => {
    netFetch.mockResolvedValueOnce(response({ data: { info: [{ hash: 42, duration: '3' }] } }))
      .mockResolvedValueOnce(response({ candidates: [{ id: 1, accesskey: 'key' }] }))
      .mockResolvedValueOnce(response({ content: encoded }));
    expect(await fetchLyricsFromKugou('Song', 'Artist')).toEqual(expected);
    expect(netFetch.mock.calls[1][0]).not.toContain('duration=');
    expect(netFetch.mock.calls[1][0]).toContain('hash=');
    expect(netFetch.mock.calls[2][0]).toContain('id=1&accesskey=key');
  });

  it.each([['Song (Live)', 'Artist'], ['Song', 'Artist feat. Guest']])('retries actual cleaned metadata %s / %s', async (title, artist) => {
    netFetch.mockResolvedValueOnce(response(null)).mockResolvedValueOnce(response(track)).mockResolvedValueOnce(response(candidates))
      .mockResolvedValueOnce(response({ content: encoded }));
    expect(await fetchLyricsFromKugou(title, artist)).toEqual(expected);
    expect(netFetch.mock.calls[1][0]).toContain(encodeURIComponent('Song Artist'));
  });

  it('catches a rejected native bridge request', async () => {
    netFetch.mockRejectedValueOnce(new Error('network unavailable'));
    expect(await fetchLyricsFromKugou('Song', 'Artist')).toBeNull();
  });
});

describe('real LRCLIB ordered search fallback', () => {
  it('continues after original and cleaned searches reject, then tries keyword and direct metadata requests', async () => {
    netFetch.mockRejectedValueOnce(new Error('original unavailable'))
      .mockRejectedValueOnce(new Error('cleaned unavailable'))
      .mockRejectedValueOnce(new Error('keyword unavailable'))
      .mockResolvedValueOnce(response({ syncedLyrics: lrc }));
    expect(await fetchLyricsFromLrclib('Song (Live)', 'Artist feat. Guest')).toEqual(expected);
    expect(netFetch).toHaveBeenCalledTimes(4);
    expect(netFetch.mock.calls[3][0]).toContain('/api/get?track_name=Song&artist_name=Artist');
  });

  it('returns null when the final direct request also rejects', async () => {
    netFetch.mockRejectedValue(new Error('network unavailable'));
    expect(await fetchLyricsFromLrclib('Song (Live)', 'Artist')).toBeNull();
    expect(netFetch).toHaveBeenCalledTimes(4);
  });

  it.each([['Song (Live)', 'Artist'], ['Song', 'Artist feat. Guest']])('uses cleaned search after unusable synced payload %s / %s', async (title, artist) => {
    netFetch.mockResolvedValueOnce(response([{ syncedLyrics: 'untimed' }])).mockResolvedValueOnce(response([{ syncedLyrics: lrc }]));
    expect(await fetchLyricsFromLrclib(title, artist)).toEqual(expected);
    expect(netFetch).toHaveBeenCalledTimes(2);
  });

  it('returns null after keyword and direct payloads contain no synced lyric', async () => {
    netFetch.mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([{ syncedLyrics: 'untimed' }])).mockResolvedValueOnce(response({ syncedLyrics: 'untimed' }));
    expect(await fetchLyricsFromLrclib('Song', 'Artist')).toBeNull();
    expect(netFetch).toHaveBeenCalledTimes(3);
    expect(netFetch.mock.calls[1][0]).toContain('/api/search?q=');
    expect(netFetch.mock.calls[2][0]).toContain('/api/get?');
  });

  it('continues to keyword search after an empty cleaned result', async () => {
    netFetch.mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([{ syncedLyrics: lrc }]));
    expect(await fetchLyricsFromLrclib('Song (Live)', 'Artist')).toEqual(expected);
    expect(netFetch.mock.calls[2][0]).toContain('/api/search?q=Song%20Artist');
  });
});

describe('real Netease metadata and transport boundaries', () => {
  it('catches a rejected network request and returns null', async () => {
    netFetch.mockRejectedValueOnce(new Error('network unavailable'));
    expect(await fetchLyricsFromNetease('Song', 'Artist')).toBeNull();
  });
  it('rejects a malformed numeric song identifier', async () => {
    netFetch.mockResolvedValueOnce(response({ result: { songs: [{ id: 'not-a-number' }] } }));
    expect(await fetchLyricsFromNetease('Song', 'Artist')).toBeNull();
    expect(netFetch).toHaveBeenCalledTimes(1);
  });
  it('returns null when the lyric endpoint is unavailable', async () => {
    netFetch.mockResolvedValueOnce(response({ result: { songs: [{ id: 1 }] } })).mockResolvedValueOnce(response(null));
    expect(await fetchLyricsFromNetease('Song', 'Artist')).toBeNull();
  });
  it('returns null after nonempty YRC and LRC text fail real timestamp parsing', async () => {
    netFetch.mockResolvedValueOnce(response({ result: { songs: [{ id: 1 }] } })).mockResolvedValueOnce(response({ yrc: { lyric: 'untimed' }, lrc: { lyric: 'untimed' } }));
    expect(await fetchLyricsFromNetease('Song', 'Artist')).toBeNull();
  });
  it('retries when only the artist requires cleaning', async () => {
    netFetch.mockResolvedValueOnce(response(null)).mockResolvedValueOnce(response({ result: { songs: [{ id: '1' }] } })).mockResolvedValueOnce(response({ lrc: { lyric: lrc } }));
    expect(await fetchLyricsFromNetease('Song', 'Artist feat. Guest')).toEqual(expected);
    expect(new URLSearchParams(netFetch.mock.calls[1][1]?.body).get('s')).toBe('Song Artist');
  });
});
