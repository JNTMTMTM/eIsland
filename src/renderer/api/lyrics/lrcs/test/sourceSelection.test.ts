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
 * @file sourceSelection.test.ts
 * @description 使用真实歌词 Provider 与解析器验证设置选源、SMTC 会话识别和回退，仅替换网络及客户端桥接边界。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchLyrics, fetchLyricsWithTranslation } from '../index';
import { fetchKaraokeLyrics } from '../karaoke';

const LRC = '[00:01.00]Hello';
const KRC = '[1000,500]<0,500,0>Hello';
const expected = [{ time_ms: 1000, text: 'Hello' }];
const b64 = (value: string): string => Buffer.from(value).toString('base64');
const response = (body: unknown) => ({ ok: true, status: 200, body: JSON.stringify(body) });
const setting = vi.fn();
const detect = vi.fn();
const qishuiSearch = vi.fn();
const qishuiLyrics = vi.fn();
const netFetch = vi.fn();

let socketHasLyrics = true;

class LyricsSocket {
  onopen: (() => void) | null = null;

  onmessage: ((event: { data: string }) => void) | null = null;

  onerror: (() => void) | null = null;

  onclose: (() => void) | null = null;

  /** 模拟本地客户端在连接成功后推送歌词，不接触 Provider 的私有状态。 */
  constructor() {
    queueMicrotask(() => {
      if (!socketHasLyrics) {
        this.onclose?.();
        return;
      }
      this.onopen?.();
      this.onmessage?.({ data: JSON.stringify({ type: 'lyrics', data: { lyricsData: KRC } }) });
    });
  }

  /** 模拟连接关闭事件。 */
  close(): void {
    this.onclose?.();
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  socketHasLyrics = true;
  setting.mockResolvedValue('auto');
  detect.mockResolvedValue({ ok: true, sources: [] });
  qishuiSearch.mockResolvedValue({ loggedIn: false, publicCatalog: true, songs: [{ id: 'song', name: 'Song', artist: 'Artist' }] });
  qishuiLyrics.mockResolvedValue({ auth: 'public', lyric: KRC, tlyric: '[00:01.00]你好' });
  netFetch.mockImplementation((url: string) => {
    if (url.includes('/api/search/get/web')) return response({ result: { songs: [{ id: 1 }] } });
    if (url.includes('/api/song/lyric/v1')) return response({ lrc: { lyric: LRC } });
    if (url.includes('musicu.fcg')) return response({ req_1: { data: { body: { song: { list: [{ id: 1, mid: 'mid', title: 'Song', singer: [{ name: 'Artist' }] }] } } } } });
    if (url.includes('fcg_query_lyric_new')) return { ok: true, status: 200, body: `MusicJsonCallback_lrc(${  JSON.stringify({ lyric: b64(LRC) })  })` };
    if (url.includes('mobilecdn.kugou.com')) return response({ data: { info: [{ hash: 'hash', duration: 1 }] } });
    if (url.includes('lyrics.kugou.com/search')) return response({ candidates: [{ id: '1', accesskey: 'key' }] });
    if (url.includes('lyrics.kugou.com/download')) return response({ content: b64(LRC) });
    if (url.includes('itunes.apple.com/search')) return response({ results: [{ trackId: 1, trackName: 'Song', artistName: 'Artist' }] });
    if (url.includes('syllable-lyrics')) return response({ data: [{ attributes: { ttmlLocalizations: '<tt><p in="00:01.00">Hello</p></tt>' } }] });
    if (url.includes('open.spotify.com/api/token')) return response({ accessToken: 'token', clientId: 'client' });
    if (url.includes('clienttoken.spotify.com')) return response({ granted_token: { token: 'client-token' } });
    if (url.includes('pathfinder/v2/query')) return response({ data: { searchV2: { topResultsV2: { itemsV2: [{ item: { data: { id: 'song', name: 'Song' } } }] } } } });
    if (url.includes('color-lyrics')) return response({ lyrics: { syncType: 'LINE_SYNCED', lines: [{ startTimeMs: '1000', words: 'Hello' }] } });
    if (url.includes('lrclib.net/api/search')) return response([{ syncedLyrics: LRC }]);
    return { ok: false, status: 404, body: '' };
  });
  vi.stubGlobal('window', { api: { netFetch, qishuiSearch, qishuiLyrics, musicLyricsSourceGet: setting, musicDetectSourceAppId: detect } });
  vi.stubGlobal('WebSocket', LyricsSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('real provider source selection', () => {
  it.each(['netease', 'qqmusic', 'kugou', 'sodamusic', 'applemusic', 'spotify', 'moekoe', 'lrclib'])('loads the %s-only source through real parsing', async (provider) => {
    setting.mockResolvedValue(`${provider  }-only`);
    const result = await fetchLyricsWithTranslation('Song', 'Artist');
    expect(result?.lyrics).toEqual(expected);
    const expectedStatus = new Map([['netease', 'not-provided'], ['qqmusic', 'not-provided'], ['sodamusic', 'available']]).get(provider) ?? 'unsupported';
    expect(result?.translation.status).toBe(expectedStatus);
    expect(detect).not.toHaveBeenCalled();
  });

  it.each(['cloudmusic.exe', 'QQMusic.exe', 'kugou.exe', '汽水音乐.exe', 'qishui.exe', 'Soda Music.exe', 'AppleMusicWin.exe', 'AppleInc.AppleMusic', 'Spotify.exe', 'MoeKoe.exe', 'unknown.exe', ''])('loads a provider for process %s', async (appId) => {
    expect(await fetchLyrics('Song', 'Artist', appId)).toEqual(expected);
    expect(detect).not.toHaveBeenCalled();
  });

  it('retains the playing titled source ahead of an inactive or untitled source', async () => {
    detect.mockResolvedValue({ ok: true, sources: [
      { isPlaying: false, hasTitle: true, sourceAppId: 'cloudmusic.exe' },
      { isPlaying: true, hasTitle: false, sourceAppId: 'kugou.exe' },
      { isPlaying: true, hasTitle: true, sourceAppId: 'qishui.exe' },
    ] });
    expect(await fetchLyrics('Song', 'Artist')).toEqual(expected);
    expect(qishuiSearch).toHaveBeenCalled();
    expect(netFetch).not.toHaveBeenCalled();
  });

  it('uses the first inactive source when no playing titled source exists', async () => {
    detect.mockResolvedValue({ ok: true, sources: [{ isPlaying: false, hasTitle: true, sourceAppId: 'QQMusic.exe' }] });
    expect(await fetchLyrics('Song', 'Artist')).toEqual(expected);
    expect(netFetch.mock.calls[0][0]).toContain('musicu.fcg');
  });

  it.each([null, {}, { ok: false }, { ok: true }, { ok: true, sources: [] }, { ok: true, sources: [{}] }])('falls back from incomplete SMTC payload %j', async (payload) => {
    detect.mockResolvedValue(payload);
    expect(await fetchLyrics('Song', 'Artist')).toEqual(expected);
    expect(netFetch.mock.calls[0][0]).toContain('/api/search/get/web');
  });

  it('recovers to automatic selection after settings and detection reject', async () => {
    setting.mockRejectedValue(new Error('settings unavailable'));
    detect.mockRejectedValue(new Error('SMTC unavailable'));
    expect(await fetchLyrics('Song', 'Artist')).toEqual(expected);
  });

  it('uses LRCLIB after a forced provider has no results', async () => {
    setting.mockResolvedValue('sodamusic-only');
    qishuiSearch.mockResolvedValue({ songs: [] });
    expect(await fetchLyrics('Song', 'Artist')).toEqual(expected);
    expect(netFetch.mock.calls[0][0]).toContain('lrclib.net');
  });

  it('continues to another real provider when the primary bridge rejects', async () => {
    qishuiLyrics.mockRejectedValue(new Error('bridge unavailable'));
    expect(await fetchLyrics('Song', 'Artist', 'qishui.exe')).toEqual(expected);
    expect(qishuiLyrics).toHaveBeenCalled();
    expect(netFetch.mock.calls[0][0]).toContain('/api/search/get/web');
  });

  it.each(['kugou.exe', 'unknown.exe'])('returns null after all real providers fail for %s', async (appId) => {
    netFetch.mockResolvedValue({ ok: false, status: 503, body: '' });
    qishuiSearch.mockResolvedValue({ songs: [] });
    socketHasLyrics = false;
    expect(await fetchLyrics('Song', 'Artist', appId)).toBeNull();
  });

  it('returns null for empty LRCLIB content', async () => {
    setting.mockResolvedValue('lrclib-only');
    netFetch.mockResolvedValue(response([]));
    expect(await fetchLyrics('Song', 'Artist')).toBeNull();
  });
});

describe('karaoke real source detection fallback', () => {
  it('falls back through real providers for an unknown process identifier', async () => {
    expect((await fetchKaraokeLyrics('Song', 'Artist', 'unknown.exe'))?.[0].text).toBe('Hello');
    expect(detect).not.toHaveBeenCalled();
  });
  it.each([null, {}, { ok: false }, { ok: true }, { ok: true, sources: [] }, { ok: true, sources: [{}] }])('falls back from incomplete SMTC payload %j', async (payload) => {
    detect.mockResolvedValue(payload);
    expect((await fetchKaraokeLyrics('Song', 'Artist'))?.[0].text).toBe('Hello');
  });
  it('recovers when detection rejects', async () => {
    detect.mockRejectedValue(new Error('SMTC unavailable'));
    expect((await fetchKaraokeLyrics('Song', 'Artist'))?.[0].text).toBe('Hello');
  });
});
