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
 * @file qishuiBusiness.ts
 * @description 汽水音乐非扫码业务 IPC 的跨进程类型。
 * @author 鸡哥
 */

export interface QishuiBusinessRequestOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  quality?: string;
}

export interface QishuiSong {
  provider: 'qishui';
  id: string;
  providerSongId: string;
  name: string;
  artist: string;
  artists?: Array<{ name: string }>;
  album: string;
  cover: string;
  duration: number;
  lyric?: string;
}

export interface QishuiBusinessStatus {
  provider: 'qishui';
  configured: boolean;
  loggedIn: boolean;
  webSession: boolean;
  publicCatalog: boolean;
  capabilities: Record<string, boolean>;
  message: string;
}

export interface QishuiSongsResult {
  provider: 'qishui';
  songs: QishuiSong[];
  configured?: boolean;
  loggedIn?: boolean;
  publicCatalog?: boolean;
  offset?: number;
  limit?: number;
  nextOffset?: number;
  hasMore?: boolean;
  error?: string;
}

export interface QishuiLyricsResult {
  provider: 'qishui';
  id: string;
  auth: string;
  lyric: string;
  tlyric: string;
}

export interface QishuiSongUrlResult {
  provider: 'qishui';
  playable: boolean;
  playbackMode: 'direct-url' | 'recommend-match';
  url: string;
  reason?: string;
  loggedIn?: boolean;
  encrypted?: boolean;
  membershipKnown?: boolean;
  vipLevel?: 'unknown' | 'free' | 'vip' | 'svip';
  requiredTier?: 'free' | 'vip' | 'svip';
  quality?: string;
  br?: number;
  duration?: number;
}

export interface QishuiBusinessApi {
  status(): Promise<QishuiBusinessStatus>;
  search(keyword: string, options?: QishuiBusinessRequestOptions): Promise<QishuiSongsResult>;
  feed(limit?: number): Promise<QishuiSongsResult>;
  playlists(): Promise<Record<string, unknown>>;
  playlistTracks(id: string, options?: QishuiBusinessRequestOptions): Promise<Record<string, unknown>>;
  lyrics(id: string): Promise<QishuiLyricsResult>;
  songUrl(id: string, quality?: string): Promise<QishuiSongUrlResult>;
  comments(id: string, options?: QishuiBusinessRequestOptions): Promise<Record<string, unknown>>;
  createComment(id: string, content: string): Promise<Record<string, unknown>>;
  checkLiked(ids: string[]): Promise<Record<string, unknown>>;
  like(id: string, liked: boolean): Promise<Record<string, unknown>>;
  collectPlaylist(id: string, collected: boolean): Promise<Record<string, unknown>>;
  collectAlbum(id: string, collected: boolean): Promise<Record<string, unknown>>;
  addSong(playlistId: string, trackId: string): Promise<Record<string, unknown>>;
  recentPlay(id: string): Promise<Record<string, unknown>>;
}