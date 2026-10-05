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
 * @file qishuiBusinessService.test.ts
 * @description 汽水歌曲映射、请求降级、个人库、歌词及会员播放边界测试。
 * @author 鸡哥
 */

import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
type Api = typeof import('../qishuiBusinessService');
const io = vi.hoisted(() => ({ files: new Map<string, string>(), read: vi.fn<(file: string) => string>(), audio: vi.fn<(url: string, auth: string) => string>() }));
vi.mock('electron', () => ({ app: { getPath: () => 'C:/userData' } }));
vi.mock('fs', () => ({ existsSync: (file: string) => io.files.has(file), readFileSync: io.read }));
vi.mock('../qishuiAudio', () => ({ registerQishuiAudioSource: io.audio }));
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const config = join('C:/userData', 'music-providers', 'qishui.json');
const tokenFile = join('C:/userData', 'music-providers', 'qishui-token');
let api: Api;
/**
 * 构造来自模拟上游接口的 JSON 响应。
 * @param value - 响应载荷
 * @param status - HTTP 状态码
 * @returns 内存响应对象
 */
function response(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status }); }
/**
 * 保存虚拟登录态，确保测试不会读取真实凭据。
 */
function login(): void { io.files.set(config, JSON.stringify({ cookie: 'sessionid=fake-session; msToken=fake-token' })); }
/**
 * 获取已记录请求 URL，检查真实模块生成的参数。
 * @param index - 请求序号
 * @returns 请求的解析 URL
 */
function requestUrl(index = 0): URL { return new URL(fetchMock.mock.calls[index][0]); }
/**
 * 构造默认音频接口响应。
 * @param streams - 模拟音频条目
 * @param membership - 用户会员信息
 */
function playback(streams: Record<string, unknown>[], membership: unknown): void {
  fetchMock.mockResolvedValueOnce(response({ data: { track: { audio_info: { play_info_list: streams } }, track_player: { spade_a: 'fake-encryption' } } })).mockResolvedValueOnce(response(membership));
}
beforeEach(async () => {
  vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.stubEnv('QISHUI_PUBLIC_ENABLED', '1');
  vi.stubEnv('QISHUI_ACCESS_TOKEN', ''); vi.stubEnv('DOUYIN_ACCESS_TOKEN', ''); vi.stubEnv('DOUYIN_OPEN_ACCESS_TOKEN', '');
  io.files.clear(); io.read.mockReset(); io.read.mockImplementation((file) => io.files.get(file) ?? '');
  io.audio.mockReset(); io.audio.mockReturnValue('http://127.0.0.1/mock-audio');
  fetchMock.mockReset(); fetchMock.mockRejectedValue(new Error('unexpected request')); vi.stubGlobal('fetch', fetchMock);
  vi.resetModules(); api = await import('../qishuiBusinessService');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('Qishui status and authentication inputs', () => {
  it('reports public-only capabilities without exposing credentials', () => {
    expect(api.getQishuiBusinessStatus()).toMatchObject({ configured: true, loggedIn: false, webSession: false, publicCatalog: true, capabilities: { search: true, feed: false, playback: false, lyrics: true, comments: false } });
    login(); const status = api.getQishuiBusinessStatus();
    expect(status).toMatchObject({ loggedIn: true, capabilities: { feed: true, playlists: true, playback: true, comments: true } });
    expect(JSON.stringify(status)).not.toContain('fake-session');
  });
  it('normalizes BOM JSON and cookie arrays/objects while ignoring empty or nested values', () => {
    io.files.set(config, `\uFEFF${  JSON.stringify({ cookie: ['sessionid=old; x=1', { sessionid: 'new', empty: '', nested: {} }] })}`);
    expect(api.getQishuiBusinessStatus().loggedIn).toBe(true);
    io.files.set(config, '{bad'); expect(api.getQishuiBusinessStatus().loggedIn).toBe(false);
    io.files.set(config, 'null'); expect(api.getQishuiBusinessStatus().loggedIn).toBe(false);
    io.read.mockImplementationOnce(() => { throw new Error('denied'); }); expect(api.getQishuiBusinessStatus().loggedIn).toBe(false);
  });
  it('supports environment-token precedence and token-file prefixes', async () => {
    vi.stubEnv('QISHUI_PUBLIC_ENABLED', '0'); vi.resetModules(); api = await import('../qishuiBusinessService');
    expect(api.getQishuiBusinessStatus().configured).toBe(false);
    io.files.set(tokenFile, 'access_token: file-token'); expect(api.getQishuiBusinessStatus()).toMatchObject({ configured: true, loggedIn: false, publicCatalog: false, capabilities: { feed: true, playback: false } });
    vi.stubEnv('QISHUI_ACCESS_TOKEN', 'Bearer preferred'); vi.stubEnv('DOUYIN_ACCESS_TOKEN', 'other');
    fetchMock.mockImplementation(() => Promise.resolve(response({ list: [] }))); await api.getQishuiFeed();
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ 'access-token': 'preferred' });
    vi.stubEnv('QISHUI_ACCESS_TOKEN', ''); vi.stubEnv('DOUYIN_ACCESS_TOKEN', ''); io.files.set(tokenFile, 'Bearer file-token');
    await api.getQishuiFeed(); expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ 'access-token': 'file-token' });
  });
});
describe('Qishui search mapping and request fallback', () => {
  it('maps item_id and author_info from public search results', async () => {
    fetchMock.mockResolvedValue(response({ data: { list: [{ item_id: '7564609082470172682', title: '顽疾(Live)', author_info: { name: '薛之谦' }, cover_url: 'https://example.com/cover.jpg', duration: 290, collection_name: '音乐缘计划' }] } }));
    const result = await api.searchQishui('顽疾', { limit: 18 });
    expect(result.songs).toEqual([expect.objectContaining({ id: '7564609082470172682', providerSongId: '7564609082470172682', name: '顽疾(Live)', artist: '薛之谦', artists: [{ name: '薛之谦' }], album: '音乐缘计划', duration: 290_000 })]);
  });
  it('handles empty search and bounds pagination without making a network call', async () => {
    expect(await api.searchQishui('  ', { limit: 500, offset: -5 })).toMatchObject({ songs: [], limit: 50, offset: 0, hasMore: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('uses PC credentials and normalizes nested tracks, duplicate cookies and duration units', async () => {
    io.files.set(config, JSON.stringify({ cookie: ['sessionid=old', { sessionid: 'new', empty: '' }] }));
    fetchMock.mockResolvedValue(response({ data: { tracks: [{ entity: { track: { id: '1', name: 'Song', artists: [{ nick_name: 'A' }, { name: 'B' }], album: { name: 'Album' }, duration_ms: 12000, lyric_info: { content: 'lyrics' } } } }, { id: '', name: 'invalid' }] } }));
    const result = await api.searchQishui(' Song ', { limit: 1, offset: 2 });
    expect(result).toMatchObject({ loggedIn: true, hasMore: true, nextOffset: 3 });
    expect(result.songs).toEqual([expect.objectContaining({ id: '1', artist: 'A / B', duration: 12000, lyric: 'lyrics' })]);
    expect(requestUrl().pathname).toBe('/luna/pc/search/track'); expect(requestUrl().searchParams.get('q')).toBe('Song');
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Cookie: 'sessionid=new', 'User-Agent': 'LunaPC/3.3.0(359450208)' });
  });
  it('falls back from failed PC and OpenAPI requests to paginated public groups', async () => {
    login(); vi.stubEnv('DOUYIN_OPEN_ACCESS_TOKEN', 'fallback-token');
    fetchMock.mockResolvedValueOnce(response({}, 503)).mockResolvedValueOnce(response({ status_code: 42 })).mockResolvedValueOnce(response({ result_groups: [{ data: [{ id: '0', name: 'zero' }, { id: '1', name: 'one' }, { id: '2', name: 'two' }] }] }));
    const result = await api.searchQishui('song', { limit: 1, offset: 1 });
    expect(result).toMatchObject({ publicCatalog: true, loggedIn: false, nextOffset: 2, songs: [expect.objectContaining({ id: '1' })] });
    expect(fetchMock).toHaveBeenCalledTimes(3); expect(fetchMock.mock.calls[1][1]?.method).toBe('POST');
    expect(requestUrl(2).searchParams.get('real_offset')).toBe('0');
  });
  it('returns successful OpenAPI search and an unavailable result when all catalog modes are disabled', async () => {
    vi.stubEnv('QISHUI_ACCESS_TOKEN', 'token'); fetchMock.mockResolvedValue(response({ items: [{ id: 'song', title: 'Open' }] }));
    expect(await api.searchQishui('open')).toMatchObject({ configured: true, loggedIn: false, songs: [expect.objectContaining({ name: 'Open' })] });
    vi.stubEnv('QISHUI_ACCESS_TOKEN', ''); vi.stubEnv('QISHUI_PUBLIC_ENABLED', '0'); vi.resetModules(); api = await import('../qishuiBusinessService');
    expect(await api.searchQishui('song')).toMatchObject({ configured: false, error: 'QISHUI_SEARCH_UNAVAILABLE' });
  });
});
describe('Qishui feed and personal library', () => {
  it('tries both PC feed routes before an OpenAPI fallback', async () => {
    login(); vi.stubEnv('QISHUI_ACCESS_TOKEN', 'token');
    fetchMock.mockResolvedValueOnce(response({ list: [] })).mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({ songs: [{ id: 'one', name: 'One' }, { id: 'two', name: 'Two' }] }));
    expect(await api.getQishuiFeed(1)).toMatchObject({ loggedIn: false, songs: [expect.objectContaining({ id: 'one' })] });
    expect(requestUrl().pathname).toBe('/luna/feed/song-tab'); expect(requestUrl(1).pathname).toBe('/luna/pc/feed/song-tab');
    expect(JSON.parse(fetchMock.mock.calls[2][1]?.body as string) as unknown).toMatchObject({ count: 1 });
  });
  it('returns a successful PC feed early and provides token-required feedback when logged out', async () => {
    login(); fetchMock.mockResolvedValue(response({ songs: [{ id: 'one', name: 'One' }] }));
    expect(await api.getQishuiFeed(50)).toMatchObject({ loggedIn: true }); expect(fetchMock).toHaveBeenCalledOnce(); expect(requestUrl().searchParams.get('cnt')).toBe('18');
    io.files.clear(); expect(await api.getQishuiFeed()).toMatchObject({ error: 'QISHUI_TOKEN_REQUIRED', songs: [] });
    expect(await api.getQishuiPlaylists()).toMatchObject({ loggedIn: false, playlists: [] });
    expect(await api.getQishuiPlaylistTracks('x')).toMatchObject({ error: 'QISHUI_COOKIE_REQUIRED', tracks: [] });
  });
  it.each([[new Response('{}', { status: 502 }), 'QISHUI_HTTP_502'], [new Response('{broken'), 'QISHUI_INVALID_JSON'], [response({ error_code: 9 }), 'QISHUI_API_9']])('propagates malformed or failed token feed requests', async (upstream, message) => {
    vi.stubEnv('QISHUI_ACCESS_TOKEN', 'token'); fetchMock.mockResolvedValue(upstream); await expect(api.getQishuiFeed()).rejects.toThrow(message);
  });
  it('collects created playlists, liked tracks and recent history and checks liked IDs', async () => {
    login(); fetchMock.mockImplementation((url) => {
      const endpoint = new URL(url).pathname;
      const fixtures: Record<string, unknown> = {
        '/luna/pc/me': { data: { user_id: 'user' } },
        '/luna/pc/user/playlist': { list: [{ id: 'created' }] },
        '/luna/pc/me/collection/mixed': { list: [{ id: 'liked', name: 'Liked' }, { playlist_id: 'collected', type: 'playlist' }] },
      };
      const value = fixtures[endpoint] ?? { list: [{ id: 'recent', name: 'Recent' }] };
      return Promise.resolve(response(value));
    });
    const library = await api.getQishuiPlaylists(); expect(library).toMatchObject({ loggedIn: true, playlists: [expect.objectContaining({ id: 'created' }), expect.objectContaining({ playlist_id: 'collected' })], likedTracks: [expect.objectContaining({ id: 'liked' })], recentTracks: [expect.objectContaining({ id: 'recent' })] });
    expect(await api.qishuiBusiness.checkLiked(['liked', 'other'])).toMatchObject({ liked: { liked: true, other: false }, complete: true });
  });
  it('skips created-playlist lookup without a user ID and forwards stripped playlist IDs', async () => {
    login(); fetchMock.mockImplementation(() => Promise.resolve(response({ list: [] }))); await api.getQishuiPlaylists(); expect(fetchMock).toHaveBeenCalledTimes(3);
    fetchMock.mockClear(); fetchMock.mockResolvedValue(response({ data: { songs: [{ id: 'one', name: 'One' }] } }));
    expect(await api.getQishuiPlaylistTracks('qishui:playlist', { cursor: 'next', limit: 1 })).toMatchObject({ playlistId: 'qishui:playlist', total: 1, hasMore: true });
    expect(requestUrl().searchParams.get('playlist_id')).toBe('playlist'); expect(requestUrl().searchParams.get('cursor')).toBe('next');
  });
});
describe('Qishui lyric response variants', () => {
  it.each([['translated', 'translated'], [[{ content: 'translated' }], 'translated'], [{ empty: '', en: ' translated ' }, 'translated'], [[], '']])('normalizes translation %s', async (translation, expected) => {
    fetchMock.mockResolvedValue(response({ data: { track: { lyric_info: { lyric_entity: { content: '[00:01]line' }, translations: translation } } } }));
    expect(await api.getQishuiLyrics('song')).toMatchObject({ auth: 'seo_track', lyric: '[00:01]line', tlyric: expected });
  });
  it('falls back from SEO to login and then public content when authenticated requests fail', async () => {
    login(); fetchMock.mockRejectedValueOnce(new Error('SEO unavailable')).mockResolvedValueOnce(response({ track: { lyric: { text: 'logged lyric', translation: 'translated' } } }));
    expect(await api.getQishuiLyrics('song')).toMatchObject({ auth: 'login', lyric: 'logged lyric' });
    fetchMock.mockReset(); fetchMock.mockRejectedValueOnce(new Error('SEO unavailable')).mockRejectedValueOnce(new Error('login unavailable')).mockResolvedValueOnce(response({ lyric_info: { content: 'public lyric' } }));
    expect(await api.getQishuiLyrics('song')).toMatchObject({ auth: 'public', lyric: 'public lyric' }); expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it('returns empty lyrics when SEO fails and public catalog is disabled', async () => {
    vi.stubEnv('QISHUI_PUBLIC_ENABLED', '0'); vi.resetModules(); api = await import('../qishuiBusinessService');
    expect(await api.getQishuiLyrics('song')).toMatchObject({ auth: 'none', lyric: '', tlyric: '' }); expect(fetchMock).toHaveBeenCalledOnce();
  });
});
describe('Qishui membership playback boundaries', () => {
  it('requires login before contacting playback APIs', async () => {
    expect(await api.getQishuiSongUrl('song')).toMatchObject({ playable: false, reason: 'login_required', url: '' }); expect(fetchMock).not.toHaveBeenCalled(); expect(io.audio).not.toHaveBeenCalled();
  });
  it.each([[[], {}, 'source_unavailable'], [[{ url: 'https://audio.test', quality: 'flac' }], {}, 'membership_unknown'], [[{ url: 'https://audio.test', quality: 'lossless' }], { is_vip: false }, 'vip_required'], [[{ url: 'https://audio.test', quality: 'hi-res' }], { is_vip: true }, 'svip_required']])('blocks inaccessible streams with %s', async (streams, membership, reason) => {
    login(); playback(streams, membership);
    expect(await api.getQishuiSongUrl('song')).toMatchObject({ reason, playable: false, url: '' }); expect(io.audio).not.toHaveBeenCalled();
  });
  it.each([['normal', {}, 'free'], ['flac', { viplevel: 1 }, 'vip'], ['master', { is_svip: true }, 'svip']])('plays authorized %s through the mocked audio proxy', async (quality, membership, requiredTier) => {
    login(); playback([{ quality, url_list: ['https://audio.test/song'], bit_rate: 128000, duration: 180 }], membership);
    expect(await api.getQishuiSongUrl('song')).toMatchObject({ requiredTier, playable: true, encrypted: true, url: 'http://127.0.0.1/mock-audio', br: 128000, duration: 180 });
    expect(io.audio).toHaveBeenCalledWith('https://audio.test/song', 'fake-encryption');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });
  it('falls back from POST to GET and chooses accessible requested quality without bypassing membership', async () => {
    login(); fetchMock.mockRejectedValueOnce(new Error('POST unavailable')).mockResolvedValueOnce(response({ track: { bit_rates: [{ url: 'https://audio.test/high', definition: 'flac', play_auth: 'high-auth' }, { url: 'https://audio.test/free', definition: 'normal' }] } })).mockRejectedValueOnce(new Error('profile unavailable'));
    const result = await api.getQishuiSongUrl('song', 'flac'); expect(result).toMatchObject({ playable: true, quality: 'normal', vipLevel: 'unknown', encrypted: false });
    expect(io.audio).toHaveBeenCalledWith('https://audio.test/free', ''); expect(fetchMock.mock.calls[1][1]?.method).toBeUndefined();
  });
});
interface WriteCase { name: string; invoke: (module: Api) => Promise<Record<string, unknown>>; endpoint: string; body: unknown; }
const writeCases: WriteCase[] = [
  { name: 'like', invoke: (module) => module.qishuiBusiness.like('song', true), endpoint: '/luna/pc/me/collection/media', body: { media: [{ type: 'track', id: 'song' }] } },
  { name: 'unlike', invoke: (module) => module.qishuiBusiness.like('song', false), endpoint: '/luna/pc/me/collection/media/delete', body: { media: [{ type: 'track', id: 'song' }] } },
  { name: 'collect playlist', invoke: (module) => module.qishuiBusiness.collectPlaylist('list', true), endpoint: '/luna/pc/me/collection/playlist', body: { playlist_ids: ['list'] } },
  { name: 'remove playlist', invoke: (module) => module.qishuiBusiness.collectPlaylist('list', false), endpoint: '/luna/pc/me/collection/playlist/delete', body: { playlist_ids: ['list'] } },
  { name: 'collect album', invoke: (module) => module.qishuiBusiness.collectAlbum('album', true), endpoint: '/luna/pc/me/collection/album', body: { album_ids: ['album'] } },
  { name: 'remove album', invoke: (module) => module.qishuiBusiness.collectAlbum('album', false), endpoint: '/luna/pc/me/collection/album/delete', body: { album_ids: ['album'] } },
  { name: 'append song', invoke: (module) => module.qishuiBusiness.addSong('list', 'song'), endpoint: '/luna/pc/playlist/media/append', body: { playlist_id: 'list', media: [{ id: 'song', type: 'track' }] } },
  { name: 'recent play', invoke: (module) => module.qishuiBusiness.recentPlay('song'), endpoint: '/luna/pc/me/recently-played-media', body: { media: [{ type: 'track', id: 'song' }] } },
  { name: 'create comment', invoke: (module) => module.qishuiBusiness.createComment('song', 'comment'), endpoint: '/luna/pc/comments/create', body: { group_id: 'song', text: 'comment', group_type: 0 } },
];
describe('Qishui write and comment routing', () => {
  it.each(writeCases)('routes $name with authentication and the expected body', async ({ invoke, endpoint, body }) => {
    await expect(invoke(api)).rejects.toThrow('QISHUI_COOKIE_REQUIRED'); expect(fetchMock).not.toHaveBeenCalled();
    login(); fetchMock.mockResolvedValue(response({})); expect(await invoke(api)).toMatchObject({ ok: true, provider: 'qishui' });
    expect(requestUrl().pathname).toBe(endpoint); expect(fetchMock.mock.calls[0][1]?.method).toBe('POST'); expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as unknown).toEqual(body);
  });
  it('forwards comment pagination through the PC endpoint', async () => {
    login(); fetchMock.mockResolvedValue(response({ items: [{ id: 'comment', text: 'hello' }] }));
    expect(await api.qishuiBusiness.comments('song', { offset: 3, limit: 10 })).toMatchObject({ comments: [{ id: 'comment', text: 'hello' }], loggedIn: true });
    expect(requestUrl().searchParams.get('cursor')).toBe('3'); expect(requestUrl().searchParams.get('group_id')).toBe('song');
  });
});
