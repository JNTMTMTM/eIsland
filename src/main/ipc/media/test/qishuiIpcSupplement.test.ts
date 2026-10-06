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
 * @file qishuiIpcSupplement.test.ts
 * @description 汽水业务 IPC 全路由、参数规范化、默认状态与必填错误码测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerQishuiBusinessIpcHandlers } from '../qishui';

type HandlerFixture = (...arguments_: unknown[]) => unknown;
const boundary = vi.hoisted(() => ({
  handlers: new Map<string, HandlerFixture>(),
  status: vi.fn(), search: vi.fn(), feed: vi.fn(), playlists: vi.fn(), playlistTracks: vi.fn(),
  lyrics: vi.fn(), songUrl: vi.fn(), comments: vi.fn(), createComment: vi.fn(), checkLiked: vi.fn(),
  like: vi.fn(), collectPlaylist: vi.fn(), collectAlbum: vi.fn(), addSong: vi.fn(), recentPlay: vi.fn(),
}));
vi.mock('electron', () => ({ ipcMain: { handle: (channel: string, handler: HandlerFixture) => boundary.handlers.set(channel, handler) } }));
vi.mock('../../../music/providers/qishuiBusinessService', () => ({ qishuiBusiness: boundary }));

beforeEach(() => {
  vi.resetAllMocks();
  boundary.handlers.clear();
  registerQishuiBusinessIpcHandlers();
});
describe('汽水业务 IPC 路由、规范化与必填约束', () => {
  it.each([
    ['status', 'status', [], []],
    ['search', 'search', [' keyword ', { limit: 1 }], ['keyword', { limit: 1 }]],
    ['feed', 'feed', [12], [12]],
    ['playlists', 'playlists', [], []],
    ['playlist-tracks', 'playlistTracks', [' playlist ', { limit: 1 }], ['playlist', { limit: 1 }]],
    ['lyrics', 'lyrics', [' track '], ['track']],
    ['song-url', 'songUrl', [' track ', 'high'], ['track', 'high']],
    ['song-url', 'songUrl', [' track ', undefined], ['track', '']],
    ['comments', 'comments', [' track ', { limit: 1 }], ['track', { limit: 1 }]],
    ['create-comment', 'createComment', [' track ', ' text '], ['track', 'text']],
    ['check-liked', 'checkLiked', [['1']], [['1']]],
    ['check-liked', 'checkLiked', [null], [[]]],
    ['like', 'like', [' track ', true], ['track', true]],
    ['like', 'like', [' track ', false], ['track', false]],
    ['collect-playlist', 'collectPlaylist', [' playlist ', undefined], ['playlist', true]],
    ['collect-playlist', 'collectPlaylist', [' playlist ', false], ['playlist', false]],
    ['collect-album', 'collectAlbum', [' album ', undefined], ['album', true]],
    ['collect-album', 'collectAlbum', [' album ', false], ['album', false]],
    ['add-song', 'addSong', [' playlist ', ' track '], ['playlist', 'track']],
    ['recent-play', 'recentPlay', [' track '], ['track']],
  ] as const)('频道 %s 转发规范化参数到 %s', (channel, method, arguments_, expected) => {
    const handler = boundary.handlers.get(`qishui:${channel}`);
    boundary[method].mockReturnValue({ fixture: method });
    expect(handler?.({}, ...arguments_)).toEqual({ fixture: method });
    expect(boundary[method]).toHaveBeenCalledExactlyOnceWith(...expected);
  });
  it.each([
    ['search', [null], 'QISHUI_KEYWORD_REQUIRED'],
    ['playlist-tracks', ['  '], 'QISHUI_PLAYLIST_ID_REQUIRED'],
    ['lyrics', [undefined], 'QISHUI_TRACK_ID_REQUIRED'],
    ['create-comment', ['track', ' '], 'QISHUI_COMMENT_REQUIRED'],
    ['collect-album', [''], 'QISHUI_ALBUM_ID_REQUIRED'],
    ['add-song', ['playlist', null], 'QISHUI_TRACK_ID_REQUIRED'],
  ] as const)('频道 %s 拒绝缺失值且保留具体错误码', (channel, arguments_, code) => {
    expect(() => boundary.handlers.get(`qishui:${channel}`)?.({}, ...arguments_)).toThrow(code);
  });
});
