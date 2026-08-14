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
 * @file qishui.ts
 * @description 汽水音乐非扫码业务 IPC 处理器。
 * @author 鸡哥
 */

import { ipcMain } from 'electron';
import type { QishuiBusinessRequestOptions } from '../../../shared/qishuiBusiness';
import { qishuiBusiness } from '../../music/providers/qishuiBusinessService';

function required(value: unknown, code: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(code);
  return normalized;
}

/** 注册汽水音乐业务 IPC；扫码登录由 musicProviderAuth 独立维护。 */
export function registerQishuiBusinessIpcHandlers(): void {
  ipcMain.handle('qishui:status', () => qishuiBusiness.status());
  ipcMain.handle('qishui:search', (_event, keyword: string, options?: QishuiBusinessRequestOptions) => {
    return qishuiBusiness.search(required(keyword, 'QISHUI_KEYWORD_REQUIRED'), options);
  });
  ipcMain.handle('qishui:feed', (_event, limit?: number) => qishuiBusiness.feed(limit));
  ipcMain.handle('qishui:playlists', () => qishuiBusiness.playlists());
  ipcMain.handle('qishui:playlist-tracks', (_event, id: string, options?: QishuiBusinessRequestOptions) => {
    return qishuiBusiness.playlistTracks(required(id, 'QISHUI_PLAYLIST_ID_REQUIRED'), options);
  });
  ipcMain.handle('qishui:lyrics', (_event, id: string) => qishuiBusiness.lyrics(required(id, 'QISHUI_TRACK_ID_REQUIRED')));
  ipcMain.handle('qishui:song-url', (_event, id: string, quality?: string) => {
    return qishuiBusiness.songUrl(required(id, 'QISHUI_TRACK_ID_REQUIRED'), String(quality ?? ''));
  });
  ipcMain.handle('qishui:comments', (_event, id: string, options?: QishuiBusinessRequestOptions) => {
    return qishuiBusiness.comments(required(id, 'QISHUI_TRACK_ID_REQUIRED'), options);
  });
  ipcMain.handle('qishui:create-comment', (_event, id: string, content: string) => {
    return qishuiBusiness.createComment(
      required(id, 'QISHUI_TRACK_ID_REQUIRED'),
      required(content, 'QISHUI_COMMENT_REQUIRED'),
    );
  });
  ipcMain.handle('qishui:check-liked', (_event, ids: string[]) => qishuiBusiness.checkLiked(Array.isArray(ids) ? ids : []));
  ipcMain.handle('qishui:like', (_event, id: string, liked: boolean) => {
    return qishuiBusiness.like(required(id, 'QISHUI_TRACK_ID_REQUIRED'), liked !== false);
  });
  ipcMain.handle('qishui:collect-playlist', (_event, id: string, collected: boolean) => {
    return qishuiBusiness.collectPlaylist(required(id, 'QISHUI_PLAYLIST_ID_REQUIRED'), collected !== false);
  });
  ipcMain.handle('qishui:collect-album', (_event, id: string, collected: boolean) => {
    return qishuiBusiness.collectAlbum(required(id, 'QISHUI_ALBUM_ID_REQUIRED'), collected !== false);
  });
  ipcMain.handle('qishui:add-song', (_event, playlistId: string, trackId: string) => {
    return qishuiBusiness.addSong(
      required(playlistId, 'QISHUI_PLAYLIST_ID_REQUIRED'),
      required(trackId, 'QISHUI_TRACK_ID_REQUIRED'),
    );
  });
  ipcMain.handle('qishui:recent-play', (_event, id: string) => {
    return qishuiBusiness.recentPlay(required(id, 'QISHUI_TRACK_ID_REQUIRED'));
  });
}