/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file qishuiBusinessService.ts
 * @description 汽水音乐非扫码业务接口。认证会话由 qishuiAuthService 维护，本模块只消费已保存会话。
 * @author 鸡哥
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { registerQishuiAudioSource } from './qishuiAudio';

const PC_API_BASE = 'https://api.qishui.com';
const OPEN_API_BASE = 'https://open.douyin.com';
const OPEN_API_SEARCH_PATH = '/api/luna/v1/platform/feed/related-media/';
const OPEN_API_FEED_PATH = '/api/luna/v1/platform/feed/song-tab/';
const PUBLIC_SEARCH_URL = 'https://api-vehicle.volcengine.com/v2/search/type';
const PUBLIC_CONTENT_URL = 'https://api-vehicle.volcengine.com/v2/custom/contents';
const PUBLIC_ENABLED = process.env.QISHUI_PUBLIC_ENABLED !== '0';
const PC_UA = 'LunaPC/3.3.0(359450208)';
const WEB_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) SodaMusic/3.3.0 Chrome/136.0.7103.59 Safari/537.36';
const PUBLIC_HEADERS = {
  Accept: 'application/json,text/plain,*/*',
  'User-Agent': 'eIsland/26.7 Qishui public catalog bridge',
};

export interface QishuiBusinessStatus {
  provider: 'qishui';
  configured: boolean;
  loggedIn: boolean;
  webSession: boolean;
  publicCatalog: boolean;
  capabilities: Record<string, boolean>;
  message: string;
}

export interface QishuiRequestOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  quality?: string;
}

interface QishuiSessionConfig {
  cookie?: string;
  msToken?: string;
  deviceId?: string;
  installId?: string;
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function cookiePairs(value: unknown): string {
  const pairs = new Map<string, string>();
  const source = Array.isArray(value) ? value : [value];
  source.forEach((item) => {
    if (item && typeof item === 'object') {
      Object.entries(item).forEach(([key, raw]) => {
        if (raw !== null && raw !== undefined && typeof raw !== 'object') pairs.set(key, text(raw));
      });
      return;
    }
    text(item).split(';').forEach((part) => {
      const index = part.indexOf('=');
      if (index > 0) pairs.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
    });
  });
  return [...pairs.entries()].filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join('; ');
}

function hasSession(cookie: string): boolean {
  return /(?:^|;\s*)(?:sessionid|sessionid_ss|sid_guard|sid_tt|uid_tt|uid_tt_ss)=/i.test(cookie);
}

function sessionFile(): string {
  return join(app.getPath('userData'), 'music-providers', 'qishui.json');
}

function readSession(): QishuiSessionConfig {
  try {
    const file = sessionFile();
    if (!existsSync(file)) return {};
    const value = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) as QishuiSessionConfig;
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function readOpenApiToken(): string {
  const environmentToken = text(
    process.env.QISHUI_ACCESS_TOKEN
      || process.env.DOUYIN_ACCESS_TOKEN
      || process.env.DOUYIN_OPEN_ACCESS_TOKEN,
  ).replace(/^bearer\s+/i, '');
  if (environmentToken) return environmentToken;
  try {
    const file = join(app.getPath('userData'), 'music-providers', 'qishui-token');
    return existsSync(file)
      ? readFileSync(file, 'utf8').trim().replace(/^bearer\s+/i, '').replace(/^(?:access-token|access_token)\s*[:=]\s*/i, '')
      : '';
  } catch {
    return '';
  }
}

function pcParams(extra: Record<string, unknown> = {}): Record<string, string> {
  const now = Date.now();
  return Object.fromEntries(Object.entries({
    aid: '386088', app_name: 'luna_pc', region: 'cn', geo_region: 'cn', os_region: 'cn', sim_region: '',
    device_id: String(now), cdid: '', iid: String(now + 1), version_name: '3.3.0', version_code: '30030000',
    channel: 'official', build_mode: 'master', network_carrier: '', ac: 'wifi', tz_name: 'Asia/Shanghai',
    resolution: '', device_platform: 'windows', device_type: 'Windows', os_version: 'Windows 11', fp: String(now),
    ...extra,
  }).filter(([, value]) => value !== null && value !== undefined).map(([key, value]) => [key, text(value)]));
}

function withParams(base: string, params: Record<string, unknown>): string {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') url.searchParams.set(key, text(value));
  });
  return url.toString();
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  const body = await response.text();
  if (!response.ok) throw new Error(`QISHUI_HTTP_${response.status}`);
  try {
    const payload = JSON.parse(body) as T;
    const value = record(payload);
    const code = Number(value.status_code ?? value.error_code ?? 0);
    if (Number.isFinite(code) && code !== 0) throw new Error(`QISHUI_API_${code}`);
    return payload;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('QISHUI_API_')) throw error;
    throw new Error('QISHUI_INVALID_JSON');
  }
}

function sessionHeaders(session: QishuiSessionConfig, pcApp = false): HeadersInit {
  const cookie = cookiePairs(session.cookie);
  return {
    Accept: 'application/json,text/plain,*/*',
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': pcApp ? PC_UA : WEB_UA,
    ...(cookie ? { Cookie: cookie } : {}),
    ...(pcApp ? {
      Referer: 'https://www.qishui.com/',
      'x-luna-background-type': 'foreground',
      'x-luna-is-background-req': '0',
      'x-luna-is-local-user': '1',
    } : {}),
  };
}

async function pcGet<T>(path: string, params: Record<string, unknown>, session: QishuiSessionConfig): Promise<T> {
  return requestJson<T>(withParams(PC_API_BASE + path, pcParams(params)), { headers: sessionHeaders(session, true) });
}

async function pcPost<T>(path: string, params: Record<string, unknown>, body: unknown, session: QishuiSessionConfig): Promise<T> {
  return requestJson<T>(withParams(PC_API_BASE + path, pcParams(params)), {
    method: 'POST',
    headers: sessionHeaders(session, true),
    body: JSON.stringify(body ?? {}),
  });
}

async function openApiPost(path: string, body: unknown): Promise<unknown> {
  const token = readOpenApiToken();
  if (!token) throw new Error('QISHUI_TOKEN_REQUIRED');
  return requestJson(OPEN_API_BASE + path, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'eIsland/26.7 Qishui OpenAPI bridge',
      'access-token': token,
    },
    body: JSON.stringify(body),
  });
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function unwrapList(payload: unknown): unknown[] {
  const root = record(payload);
  const data = record(root.data);
  for (const source of [root, data]) {
    for (const key of ['list', 'items', 'songs', 'tracks', 'media_list', 'result']) {
      if (Array.isArray(source[key])) return source[key];
    }
  }
  const groups = Array.isArray(root.result_groups) ? root.result_groups : [];
  return groups.flatMap((group) => {
    const value = record(group);
    return Array.isArray(value.data) ? value.data : [];
  });
}

function mapTrack(raw: unknown): Record<string, unknown> {
  const item = record(raw);
  const entity = Object.keys(record(item.entity)).length ? record(item.entity) : item;
  const track = Object.keys(record(entity.track)).length ? record(entity.track) : entity;
  const artists = Array.isArray(track.artists) ? track.artists.map(record) : [];
  const authorInfo = record(item.author_info);
  const album = record(track.album);
  const lyricInfo = record(track.lyric_info);
  const rawDuration = Number(track.duration_ms || track.duration || item.duration || 0) || 0;
  const durationIsMilliseconds = Boolean(track.duration_ms) || rawDuration > 10_000;
  const duration = durationIsMilliseconds ? rawDuration : rawDuration * 1000;
  const id = text(track.id || track.media_id || item.item_id || item.id);
  const artistNames = artists.map((artist) => text(artist.name || artist.nick_name)).filter(Boolean);
  const fallbackArtist = text(track.artist_name || item.author_name || authorInfo.name);
  const normalizedArtists = artistNames.length ? artistNames : fallbackArtist ? [fallbackArtist] : [];
  return {
    provider: 'qishui',
    id,
    providerSongId: id,
    name: text(track.name || track.title || item.title),
    artist: normalizedArtists.join(' / '),
    artists: normalizedArtists.map((name) => ({ name })),
    album: text(album.name || track.album_name || item.album_name || item.collection_name),
    cover: text(track.cover_url || track.url_cover || item.cover_url || item.cover),
    duration,
    lyric: text(lyricInfo.content || record(item.lyric_info).content),
  };
}

interface QishuiStream {
  url: string;
  auth: string;
  quality: string;
  bitrate: number;
  duration: number;
}

function streamFrom(value: unknown): QishuiStream | null {
  const item = record(value);
  const urls = Array.isArray(item.url_list) ? item.url_list : [];
  const url = text(item.main_play_url || item.url || item.play_url || item.playable_url || item.backup_play_url || urls[0]);
  if (!url) return null;
  return {
    url,
    auth: text(item.play_auth || item.spade_a),
    quality: text(item.quality || item.definition || item.format),
    bitrate: Number(item.bitrate || item.bit_rate || 0) || 0,
    duration: Number(item.duration || 0) || 0,
  };
}

function collectStreams(payload: unknown): QishuiStream[] {
  const root = record(payload);
  const data = Object.keys(record(root.data)).length ? record(root.data) : root;
  const track = Object.keys(record(data.track)).length ? record(data.track) : data;
  const audio = Object.keys(record(track.audio_info)).length ? record(track.audio_info) : record(data.audio_info);
  const player = Object.keys(record(data.track_player)).length ? record(data.track_player) : record(data.trackPlayer);
  const candidates = [audio.play_info_list, audio.bit_rates, track.bit_rates]
    .flatMap((value) => Array.isArray(value) ? value : []);
  const playerAuth = text(player.spade_a || player.play_auth);
  return candidates.map(streamFrom).filter((stream): stream is QishuiStream => Boolean(stream)).map((stream) => ({
    ...stream,
    auth: stream.auth || playerAuth,
  }));
}

type QishuiMembership = 'unknown' | 'free' | 'vip' | 'svip';

function requiredTier(stream: QishuiStream): Exclude<QishuiMembership, 'unknown'> {
  const value = `${stream.quality} ${stream.bitrate}`.toLowerCase();
  if (/hi.?res|master|atmos|dolby|spatial/.test(value)) return 'svip';
  if (/lossless|flac|320|exhigh/.test(value) || stream.bitrate >= 300_000) return 'vip';
  return 'free';
}

function membershipFrom(value: unknown): QishuiMembership {
  const source = JSON.stringify(value ?? {}).toLowerCase();
  if (/"is_?svip"\s*:\s*true|"svip(level|type)?"\s*:\s*[1-9]/.test(source)) return 'svip';
  if (/"is_?vip"\s*:\s*true|"vip(level|type)?"\s*:\s*[1-9]/.test(source)) return 'vip';
  if (/"is_?vip"\s*:\s*false|"vip(level|type)?"\s*:\s*0/.test(source)) return 'free';
  return 'unknown';
}

function canPlayTier(tier: Exclude<QishuiMembership, 'unknown'>, membership: QishuiMembership): boolean {
  if (tier === 'free') return true;
  if (tier === 'vip') return membership === 'vip' || membership === 'svip';
  return membership === 'svip';
}

/**
 * 获取汽水业务能力和当前会话状态。
 * @returns 不包含 Cookie 或 Token 的脱敏业务状态
 */
export function getQishuiBusinessStatus(): QishuiBusinessStatus {
  const session = readSession();
  const cookie = cookiePairs(session.cookie);
  const loggedIn = hasSession(cookie);
  const tokenConfigured = Boolean(readOpenApiToken());
  return {
    provider: 'qishui',
    configured: loggedIn || tokenConfigured || PUBLIC_ENABLED,
    loggedIn,
    webSession: loggedIn,
    publicCatalog: PUBLIC_ENABLED,
    capabilities: {
      search: PUBLIC_ENABLED || tokenConfigured || loggedIn,
      feed: tokenConfigured || loggedIn,
      playlists: loggedIn,
      playback: loggedIn,
      lyrics: PUBLIC_ENABLED || loggedIn,
      likeWrite: loggedIn,
      playlistWrite: loggedIn,
      comments: loggedIn,
    },
    message: loggedIn ? '汽水音乐业务会话已连接。' : '汽水音乐未登录，仅可使用公开目录匹配。',
  };
}

/**
 * 搜索汽水歌曲，按 PC 会话、OpenAPI、公共目录顺序降级。
 * @param keyword - 搜索关键词
 * @param options - 分页参数
 * @returns 标准化歌曲搜索结果
 */
export async function searchQishui(keyword: string, options: QishuiRequestOptions = {}): Promise<Record<string, unknown>> {
  const query = text(keyword);
  const limit = Math.max(1, Math.min(50, Number(options.limit) || 12));
  const offset = Math.max(0, Number(options.offset) || 0);
  const session = readSession();
  if (!query) return { provider: 'qishui', songs: [], offset, limit, hasMore: false };
  if (hasSession(cookiePairs(session.cookie))) {
    try {
      const payload = await pcGet('/luna/pc/search/track', { q: query, cursor: offset, count: limit, search_method: 'input' }, session);
      const songs = unwrapList(payload).map(mapTrack).filter((song) => song.id && song.name);
      return { provider: 'qishui', configured: true, loggedIn: true, songs, offset, limit, nextOffset: offset + songs.length, hasMore: songs.length >= limit };
    } catch {
      // 公共目录继续兜底。
    }
  }
  if (readOpenApiToken()) {
    try {
      const payload = await openApiPost(OPEN_API_SEARCH_PATH, {
        search_query: query,
        played_media: [],
        count: limit,
        common_params: { trigger_name: 'eisland_search', scene: 'search', source: 'eisland' },
      });
      const songs = unwrapList(payload).map(mapTrack).filter((song) => song.id && song.name);
      return {
        provider: 'qishui', configured: true, loggedIn: false, songs,
        offset, limit, nextOffset: offset + songs.length, hasMore: songs.length >= limit,
      };
    } catch {
      // 公共目录继续兜底。
    }
  }
  if (!PUBLIC_ENABLED) return { provider: 'qishui', configured: false, songs: [], error: 'QISHUI_SEARCH_UNAVAILABLE' };
  const payload = await requestJson<any>(withParams(PUBLIC_SEARCH_URL, {
    keyword: query, search_type: 'music', limit: Math.min(100, Math.max(36, (offset + limit) * 3)), real_offset: 0, search_source: 'qishui',
  }), { headers: PUBLIC_HEADERS });
  const songs = unwrapList(payload).map(mapTrack).filter((song) => song.id && song.name).slice(offset, offset + limit);
  return { provider: 'qishui', configured: true, loggedIn: false, publicCatalog: true, songs, offset, limit, nextOffset: offset + songs.length, hasMore: songs.length >= limit };
}

/**
 * 获取汽水推荐歌曲。
 * @param limit - 返回歌曲数量，范围 1 到 18
 * @returns PC 会话或 OpenAPI 推荐结果
 */
export async function getQishuiFeed(limit = 8): Promise<Record<string, unknown>> {
  const normalizedLimit = Math.max(1, Math.min(18, Number(limit) || 8));
  const session = readSession();
  if (hasSession(cookiePairs(session.cookie))) {
    for (const path of ['/luna/feed/song-tab', '/luna/pc/feed/song-tab']) {
      try {
        const payload = await pcGet(path, { cursor: 0, cnt: normalizedLimit, count: normalizedLimit }, session);
        const songs = unwrapList(payload).map(mapTrack).filter((song) => song.id);
        if (songs.length) return { provider: 'qishui', configured: true, loggedIn: true, songs };
      } catch {
        // 继续尝试下一条官方链路。
      }
    }
  }
  if (readOpenApiToken()) {
    const payload = await openApiPost(OPEN_API_FEED_PATH, {
      count: normalizedLimit,
      played_media: [],
      common_params: { trigger_name: 'eisland_feed', scene: 'feed', source: 'eisland' },
    });
    return {
      provider: 'qishui',
      configured: true,
      loggedIn: false,
      songs: unwrapList(payload).map(mapTrack).filter((song) => song.id).slice(0, normalizedLimit),
    };
  }
  return { provider: 'qishui', configured: false, songs: [], error: 'QISHUI_TOKEN_REQUIRED' };
}

/**
 * 获取当前汽水账号的歌单、喜欢歌曲和最近播放。
 * @returns 登录态下的个人音乐库数据
 */
export async function getQishuiPlaylists(): Promise<Record<string, unknown>> {
  const session = readSession();
  if (!hasSession(cookiePairs(session.cookie))) return { provider: 'qishui', loggedIn: false, playlists: [] };
  const profile = await pcGet('/luna/pc/me', {}, session);
  const profileData = (profile && typeof profile === 'object' ? profile : {}) as Record<string, any>;
  const user = profileData.data && typeof profileData.data === 'object' ? profileData.data : profileData;
  const userId = text(user.user_id || user.userId || user.uid || user.id);
  const [created, collected, recent] = await Promise.all([
    userId ? pcGet('/luna/pc/user/playlist', { user_id: userId, cursor: '', count: 50 }, session) : Promise.resolve(null),
    pcGet('/luna/pc/me/collection/mixed', { cursor: '', count: 50 }, session),
    pcGet('/luna/pc/me/recently-played-media', { cursor: '', count: 50 }, session),
  ]);
  const createdPlaylists = unwrapList(created);
  const collectedItems = unwrapList(collected);
  const likedTracks = collectedItems.map(mapTrack).filter((song) => song.id && song.name);
  return {
    provider: 'qishui', loggedIn: true,
    profile: user,
    playlists: [
      ...createdPlaylists.map((item) => ({ provider: 'qishui', type: 'playlist', ...record(item) })),
      ...collectedItems.filter((item) => {
        const value = record(item);
        return Boolean(value.playlist_id || value.playlist || value.type === 'playlist');
      }).map((item) => ({ provider: 'qishui', type: 'playlist', ...record(item) })),
    ],
    likedTracks,
    recentTracks: unwrapList(recent).map(mapTrack),
  };
}

/**
 * 获取指定汽水歌单的曲目。
 * @param id - 汽水歌单 ID
 * @param options - 游标和数量参数
 * @returns 标准化歌单曲目结果
 */
export async function getQishuiPlaylistTracks(id: string, options: QishuiRequestOptions = {}): Promise<Record<string, unknown>> {
  const session = readSession();
  if (!hasSession(cookiePairs(session.cookie))) return { provider: 'qishui', tracks: [], error: 'QISHUI_COOKIE_REQUIRED' };
  const payload = await pcGet('/luna/pc/playlist/detail', { playlist_id: text(id).replace(/^qishui:/i, ''), cursor: options.cursor || '', count: options.limit || 50 }, session);
  const tracks = unwrapList(payload).map(mapTrack).filter((song) => song.id);
  return { provider: 'qishui', loggedIn: true, playlistId: id, tracks, total: tracks.length, hasMore: tracks.length >= (options.limit || 50) };
}

/**
 * 获取汽水原文歌词和翻译歌词。
 * @param id - 汽水歌曲 ID
 * @returns 规范化后的歌词文本
 */
export async function getQishuiLyrics(id: string): Promise<Record<string, unknown>> {
  const session = readSession();
  let payload: unknown = null;
  try {
    payload = await requestJson(withParams('https://beta-luna.douyin.com/luna/h5/seo_track', {
      track_id: id,
      device_platform: 'web',
    }), { headers: PUBLIC_HEADERS });
  } catch {
    if (hasSession(cookiePairs(session.cookie))) {
      try {
        payload = await pcGet('/luna/pc/track_v2', { track_id: id, media_type: 'track' }, session);
      } catch {
        payload = null;
      }
    }
  }
  if (!payload && PUBLIC_ENABLED) {
    payload = await requestJson(withParams(PUBLIC_CONTENT_URL, {
      sources: 'qishui',
      need_author: true,
      need_album: true,
      need_ugc: true,
      need_stat: true,
      item_ids: id,
    }), { headers: PUBLIC_HEADERS });
  }
  const root = record(payload);
  const data = Object.keys(record(root.data)).length ? record(root.data) : root;
  const track = Object.keys(record(data.track)).length ? record(data.track) : data;
  const lyric = record(track.lyric_info || track.lyric || data.lyric_info || data.lyric);
  const lyricEntity = record(lyric.lyric_entity);
  return {
    provider: 'qishui',
    id,
    lyric: text(lyric.content || lyric.lyric_text || lyric.text || lyricEntity.content),
    tlyric: text(lyric.translated_lyric || lyric.translation || lyric.tlyric),
  };
}

/**
 * 获取受会员边界保护的汽水播放地址。
 * @param id - 汽水歌曲 ID
 * @param quality - 可选目标音质
 * @returns 临时主进程代理地址或不可播放原因
 */
export async function getQishuiSongUrl(id: string, quality = ''): Promise<Record<string, unknown>> {
  const session = readSession();
  if (!hasSession(cookiePairs(session.cookie))) {
    return { provider: 'qishui', playable: false, playbackMode: 'recommend-match', reason: 'login_required', url: '' };
  }
  let payload: unknown;
  try {
    payload = await pcPost('/luna/pc/track_v2', {}, {
      track_id: id,
      media_type: 'track',
      queue_type: 'favorite_track_playlist',
      scene_name: 'library',
    }, session);
  } catch {
    payload = await pcGet('/luna/pc/track_v2', { track_id: id, media_type: 'track' }, session);
  }
  const profile = await pcGet('/luna/pc/me', {}, session).catch(() => null);
  const membership = membershipFrom(profile || payload);
  const streams = collectStreams(payload);
  const requested = text(quality).toLowerCase();
  const ordered = requested
    ? [...streams].sort((left, right) => Number(right.quality.toLowerCase() === requested) - Number(left.quality.toLowerCase() === requested))
    : streams;
  const stream = ordered.find((candidate) => canPlayTier(requiredTier(candidate), membership));
  if (!stream) {
    const blockedTier = ordered[0] ? requiredTier(ordered[0]) : 'free';
    const reason = !ordered.length
      ? 'source_unavailable'
      : membership === 'unknown'
        ? 'membership_unknown'
        : blockedTier === 'svip' ? 'svip_required' : 'vip_required';
    return {
      provider: 'qishui',
      playable: false,
      playbackMode: 'recommend-match',
      loggedIn: true,
      membershipKnown: membership !== 'unknown',
      vipLevel: membership,
      requiredTier: blockedTier,
      reason,
      url: '',
    };
  }
  return {
    provider: 'qishui',
    playable: true,
    playbackMode: 'direct-url',
    loggedIn: true,
    membershipKnown: membership !== 'unknown',
    vipLevel: membership,
    requiredTier: requiredTier(stream),
    url: registerQishuiAudioSource(stream.url, stream.auth),
    encrypted: Boolean(stream.auth),
    quality: stream.quality,
    br: stream.bitrate,
    duration: stream.duration,
    requestedQuality: quality,
    source: 'qishui-pc-track-v2',
  };
}

async function writeQishui(path: string, body: unknown): Promise<Record<string, unknown>> {
  const session = readSession();
  if (!hasSession(cookiePairs(session.cookie))) throw new Error('QISHUI_COOKIE_REQUIRED');
  await pcPost(path, {}, body, session);
  return { provider: 'qishui', ok: true };
}

export const qishuiBusiness = {
  status: getQishuiBusinessStatus,
  search: searchQishui,
  feed: getQishuiFeed,
  playlists: getQishuiPlaylists,
  playlistTracks: getQishuiPlaylistTracks,
  lyrics: getQishuiLyrics,
  songUrl: getQishuiSongUrl,
  comments: async (id: string, options: QishuiRequestOptions = {}) => {
    const session = readSession();
    const payload = await pcGet<any>('/luna/pc/comments', {
      group_id: id, cursor: options.cursor || options.offset || '', count: options.limit || 20, group_type: 0,
    }, session);
    return { provider: 'qishui', id, comments: unwrapList(payload), loggedIn: true };
  },
  createComment: async (id: string, content: string) => {
    const result = await writeQishui('/luna/pc/comments/create', { group_id: id, text: content, group_type: 0 });
    return { ...result, id, created: true };
  },
  checkLiked: async (ids: string[]) => {
    const collection = await getQishuiPlaylists();
    const likedTracks = Array.isArray(collection.likedTracks) ? collection.likedTracks : [];
    const known = new Set(likedTracks.map((item) => {
      const track = record(item);
      return text(track.providerSongId || track.id);
    }));
    return {
      provider: 'qishui',
      ids,
      liked: Object.fromEntries(ids.map((id) => [id, known.has(id)])),
      complete: true,
    };
  },
  like: (id: string, liked: boolean) => writeQishui(liked ? '/luna/pc/me/collection/media' : '/luna/pc/me/collection/media/delete', { media: [{ type: 'track', id }] }),
  collectPlaylist: (id: string, collected: boolean) => writeQishui(collected ? '/luna/pc/me/collection/playlist' : '/luna/pc/me/collection/playlist/delete', { playlist_ids: [id] }),
  collectAlbum: (id: string, collected: boolean) => writeQishui(collected ? '/luna/pc/me/collection/album' : '/luna/pc/me/collection/album/delete', { album_ids: [id] }),
  addSong: (playlistId: string, trackId: string) => writeQishui('/luna/pc/playlist/media/append', { playlist_id: playlistId, media: [{ id: trackId, type: 'track' }] }),
  recentPlay: (id: string) => writeQishui('/luna/pc/me/recently-played-media', { media: [{ type: 'track', id }] }),
};