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
 * @file qishui.test.ts
 * @description 汽水非扫码业务 IPC 参数校验与转发测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleMock, businessMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
  businessMock: {
    status: vi.fn(),
    search: vi.fn(),
    feed: vi.fn(),
    playlists: vi.fn(),
    playlistTracks: vi.fn(),
    lyrics: vi.fn(),
    songUrl: vi.fn(),
    comments: vi.fn(),
    createComment: vi.fn(),
    checkLiked: vi.fn(),
    like: vi.fn(),
    collectPlaylist: vi.fn(),
    collectAlbum: vi.fn(),
    addSong: vi.fn(),
    recentPlay: vi.fn(),
  },
}));

vi.mock('electron', () => ({ ipcMain: { handle: handleMock } }));
vi.mock('../../../music/providers/qishuiBusinessService', () => ({ qishuiBusiness: businessMock }));

import { registerQishuiBusinessIpcHandlers } from '../qishui';

describe('qishui business ipc', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

  beforeEach(() => {
    handlers.clear();
    handleMock.mockReset();
    Object.values(businessMock).forEach((mock) => mock.mockReset());
    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    });
    registerQishuiBusinessIpcHandlers();
  });

  it('registers every non-QR business channel', () => {
    expect([...handlers.keys()]).toEqual([
      'qishui:status', 'qishui:search', 'qishui:feed', 'qishui:playlists',
      'qishui:playlist-tracks', 'qishui:lyrics', 'qishui:song-url', 'qishui:comments',
      'qishui:create-comment', 'qishui:check-liked', 'qishui:like',
      'qishui:collect-playlist', 'qishui:collect-album', 'qishui:add-song', 'qishui:recent-play',
    ]);
  });

  it('normalizes required values before forwarding', () => {
    handlers.get('qishui:search')?.({}, '  track  ', { limit: 8 });
    handlers.get('qishui:add-song')?.({}, ' playlist ', ' track ');

    expect(businessMock.search).toHaveBeenCalledWith('track', { limit: 8 });
    expect(businessMock.addSong).toHaveBeenCalledWith('playlist', 'track');
  });

  it('rejects missing required identifiers', () => {
    expect(() => handlers.get('qishui:lyrics')?.({}, '  ')).toThrow('QISHUI_TRACK_ID_REQUIRED');
    expect(() => handlers.get('qishui:create-comment')?.({}, 'track', '')).toThrow('QISHUI_COMMENT_REQUIRED');
  });
});