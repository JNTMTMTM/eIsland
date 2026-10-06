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
 * @file qishuiBusinessSupplement.test.ts
 * @description 汽水空上游载荷、令牌文件变化、空歌词及分页默认值边界测试。
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

describe('汽水业务剩余上游与会话边界', () => {
  it('Token 文件读取失败不会暴露凭据或启用推荐', async () => {
    io.files.set(tokenFile, 'fixture-token'); io.read.mockImplementation(() => { throw new Error('denied'); });
    expect(api.getQishuiBusinessStatus().capabilities.feed).toBe(false);
    expect(await api.getQishuiFeed()).toMatchObject({ error: 'QISHUI_TOKEN_REQUIRED' });
  });
  it('两次读取之间 Token 被清空时拒绝 OpenAPI 请求', async () => {
    io.files.set(tokenFile, 'fixture-token'); io.read.mockReturnValueOnce('fixture-token').mockReturnValueOnce('');
    await expect(api.getQishuiFeed()).rejects.toThrow('QISHUI_TOKEN_REQUIRED'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('推荐 limit 为零时使用默认 8，空分组忽略无效数据', async () => {
    login(); fetchMock.mockImplementation(() => Promise.resolve(response({ result_groups: [null, { data: 3 }, { data: [] }] })));
    expect(await api.getQishuiFeed(0)).toMatchObject({ configured: false, songs: [] });
    expect(requestUrl().searchParams.get('cnt')).toBe('8'); expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('空用户资料和默认歌单参数保持空曲目且不请求创建歌单', async () => {
    login(); fetchMock.mockImplementation(() => Promise.resolve(response(null)));
    expect(await api.getQishuiPlaylists()).toMatchObject({ playlists: [], likedTracks: [], recentTracks: [] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    fetchMock.mockClear();
    expect(await api.getQishuiPlaylistTracks('playlist')).toMatchObject({ tracks: [], total: 0, hasMore: false });
    expect(requestUrl().searchParams.get('count')).toBe('50'); expect(requestUrl().searchParams.has('cursor')).toBe(false);
  });
  it('缺少地址的流被过滤，顶层音频信息使用 format 音质并接受空会员资料', async () => {
    login(); fetchMock.mockResolvedValueOnce(response({ audio_info: { bit_rates: [null, { bitrate: 1 }, { url: 'https://audio.invalid/free', format: 'aac' }] } })).mockResolvedValueOnce(response(null));
    expect(await api.getQishuiSongUrl('song')).toMatchObject({ playable: true, quality: 'aac', encrypted: false });
    expect(io.audio).toHaveBeenCalledExactlyOnceWith('https://audio.invalid/free', '');
  });
  it('空歌曲与空资料维持 unknown 会员且没有地址', async () => {
    login(); fetchMock.mockImplementation(() => Promise.resolve(response(null)));
    expect(await api.getQishuiSongUrl('song')).toMatchObject({ playable: false, reason: 'source_unavailable', vipLevel: 'unknown' });
  });
  it('播放会员 fixture 正常继续使用主流程的代理', async () => {
    login(); playback([{ main_play_url: 'https://audio.invalid/free', quality: 'normal' }], {});
    expect(await api.getQishuiSongUrl('song')).toMatchObject({ playable: true });
    expect(io.audio).toHaveBeenCalledWith('https://audio.invalid/free', 'fake-encryption');
  });
  it('SEO 和公共歌词都返回 null 时不虚构鉴权来源', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(response(null)));
    expect(await api.getQishuiLyrics('song')).toMatchObject({ auth: 'none', lyric: '', tlyric: '' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('登录歌词返回 null 且公共目录禁用时仍保留 none', async () => {
    login(); vi.stubEnv('QISHUI_PUBLIC_ENABLED', '0'); vi.resetModules(); api = await import('../qishuiBusinessService');
    fetchMock.mockRejectedValueOnce(new Error('SEO unavailable')).mockResolvedValueOnce(response(null));
    expect(await api.getQishuiLyrics('song')).toMatchObject({ auth: 'none', lyric: '', tlyric: '' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it.each([[null], [{ content: 3 }], { empty: '', number: 3 }])('无效翻译 %s 不产生文本', async (translations) => {
    fetchMock.mockImplementation(() => Promise.resolve(response({ lyric_info: { translations, content: 'original' } })));
    expect(await api.getQishuiLyrics('song')).toMatchObject({ lyric: 'original', tlyric: '' });
  });
  it('无登录态的喜欢列表为空，评论默认分页不会发送空游标或 Cookie', async () => {
    expect(await api.qishuiBusiness.checkLiked(['song'])).toMatchObject({ liked: { song: false } });
    fetchMock.mockImplementation(() => Promise.resolve(response({ list: [] })));
    expect(await api.qishuiBusiness.comments('song')).toMatchObject({ comments: [] });
    expect(requestUrl().searchParams.has('cursor')).toBe(false);
    expect(requestUrl().searchParams.get('count')).toBe('20');
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty('Cookie');
  });
});
