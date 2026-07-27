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
 * @file mediaHandlers.test.ts
 * @description media IPC handlers 单元测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleMock, getAllWindowsMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
  getAllWindowsMock: vi.fn(),
}));

const {
  existsSyncMock,
  readFileSyncMock,
  writeFileSyncMock,
  broadcastSettingChangeMock,
} = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
  broadcastSettingChangeMock: vi.fn(),
}));

const {
  playMock,
  pauseMock,
  nextMock,
  previousMock,
  seekMock,
} = vi.hoisted(() => ({
  playMock: vi.fn(),
  pauseMock: vi.fn(),
  nextMock: vi.fn(),
  previousMock: vi.fn(),
  seekMock: vi.fn(),
}));

const {
  getMuteMock,
  setMuteMock,
} = vi.hoisted(() => ({
  getMuteMock: vi.fn(),
  setMuteMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
  },
  BrowserWindow: {
    getAllWindows: getAllWindowsMock,
  },
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
  writeFileSync: writeFileSyncMock,
}));

vi.mock('../../../utils/broadcast', () => ({
  broadcastSettingChange: broadcastSettingChangeMock,
}));

vi.mock('@eisland/windows-volume-helper', () => ({
  getMute: getMuteMock,
  setMute: setMuteMock,
}));

vi.mock('@eisland/windows-smtc-helper', () => ({
  play: playMock,
  pause: pauseMock,
  next: nextMock,
  previous: previousMock,
  seek: seekMock,
}));

import { registerMediaIpcHandlers } from '../media';
import { registerMusicIpcHandlers } from '../music';

describe('media ipc handlers', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

  beforeEach(() => {
    handlers.clear();
    handleMock.mockReset();
    getAllWindowsMock.mockReset();
    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
    writeFileSyncMock.mockReset();
    broadcastSettingChangeMock.mockReset();
    getMuteMock.mockReset();
    setMuteMock.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    });
  });

  it('handles media keys with whitelist guard', () => {
    playMock.mockClear();
    pauseMock.mockClear();
    nextMock.mockClear();
    previousMock.mockClear();

    registerMediaIpcHandlers({
      getMainWindow: () => null,
      isWhitelisted: () => false,
      getPendingSourceSwitchId: () => '',
      setPendingSourceSwitchId: vi.fn(),
      getPendingSourceSwitchEntry: () => null,
      clearPendingSourceSwitchEntry: vi.fn(),
      getCurrentDeviceId: () => 'device-1',
      setCurrentDeviceId: vi.fn(),
      getSmtcSessionRuntime: () => new Map(),
    });

    handlers.get('media:play-pause')?.({});
    handlers.get('media:next')?.({});
    handlers.get('media:prev')?.({});

    // 无播放会话时 isPlaying=false，应调用 play()
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(nextMock).not.toHaveBeenCalled();
    expect(previousMock).not.toHaveBeenCalled();
  });

  it('reads and toggles the default playback device mute state', () => {
    getMuteMock
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(null);
    setMuteMock
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    registerMediaIpcHandlers({
      getMainWindow: () => null,
      isWhitelisted: () => true,
      getPendingSourceSwitchId: () => '',
      setPendingSourceSwitchId: vi.fn(),
      getPendingSourceSwitchEntry: () => null,
      clearPendingSourceSwitchEntry: vi.fn(),
      getCurrentDeviceId: () => 'device-1',
      setCurrentDeviceId: vi.fn(),
      getSmtcSessionRuntime: () => new Map(),
    });

    expect(handlers.get('media:get-muted')?.({})).toBe(false);
    expect(handlers.get('media:toggle-muted')?.({})).toBe(true);
    expect(setMuteMock).toHaveBeenNthCalledWith(1, true);
    expect(handlers.get('media:toggle-muted')?.({})).toBeNull();
    expect(setMuteMock).toHaveBeenNthCalledWith(2, false);
    expect(handlers.get('media:toggle-muted')?.({})).toBeNull();
  });

  it('returns current info and applies source switch updates', () => {
    const setPendingSourceSwitchId = vi.fn();
    const clearPendingSourceSwitchEntry = vi.fn();
    let currentDeviceId = 'device-1';
    const setCurrentDeviceId = vi.fn((id: string) => {
      currentDeviceId = id;
    });
    const sessionRuntime = new Map<string, { payload: unknown; hasTitle: boolean }>([
      ['device-2', { payload: { title: 'Hello' }, hasTitle: true }],
      ['device-1', { payload: { title: 'NoTitle' }, hasTitle: false }],
    ]);

    const aliveWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: { send: vi.fn() },
    };
    const deadWindow = {
      isDestroyed: vi.fn(() => true),
      webContents: { send: vi.fn() },
    };
    getAllWindowsMock.mockReturnValue([aliveWindow, deadWindow]);

    registerMediaIpcHandlers({
      getMainWindow: () => null,
      isWhitelisted: () => true,
      getPendingSourceSwitchId: () => 'device-2',
      setPendingSourceSwitchId,
      getPendingSourceSwitchEntry: () => ({ some: 'entry' }),
      clearPendingSourceSwitchEntry,
      getCurrentDeviceId: () => currentDeviceId,
      setCurrentDeviceId,
      getSmtcSessionRuntime: () => sessionRuntime,
    });

    expect(handlers.get('media:current-info:get')?.({})).toBeNull();

    handlers.get('media:accept-source-switch')?.({});

    expect(setCurrentDeviceId).toHaveBeenCalledWith('device-2');
    expect(setPendingSourceSwitchId).toHaveBeenCalledWith('');
    expect(clearPendingSourceSwitchEntry).toHaveBeenCalled();
    expect(aliveWindow.webContents.send).toHaveBeenCalledWith('nowplaying:info', { title: 'Hello' });
    expect(deadWindow.webContents.send).not.toHaveBeenCalled();

    handlers.get('media:reject-source-switch')?.({});
    expect(setPendingSourceSwitchId).toHaveBeenCalledTimes(2);
    expect(clearPendingSourceSwitchEntry).toHaveBeenCalledTimes(2);
  });

  it('handles music persistence and fallback branches', async () => {
    const setWhitelist = vi.fn();
    const setSmtcUnsubscribeMs = vi.fn();
    const sanitizeSmtcUnsubscribeMs = vi.fn((v: unknown) => Number(v) || 3000);

    registerMusicIpcHandlers({
      storeDir: 'C:/store',
      whitelistStoreKey: 'whitelist',
      lyricsSourceStoreKey: 'lyricsSource',
      lyricsKaraokeStoreKey: 'lyricsKaraoke',
      lyricsClockStoreKey: 'lyricsClock',
      lyricsCalibrateEnabledStoreKey: 'lyricsCalibrateEnabled',
      lyricsCalibrateDelayStoreKey: 'lyricsCalibrateDelay',
      lyricsEnabledStoreKey: 'lyricsEnabled',
      lyricsTranslationEnabledStoreKey: 'lyricsTranslationEnabled',
      smtcUnsubscribeStoreKey: 'smtcUnsubscribe',
      defaultLyricsKaraoke: true,
      defaultLyricsClock: false,
      defaultLyricsCalibrateEnabled: true,
      defaultLyricsCalibrateDelay: 20,
      getWhitelist: () => ['A', 'B'],
      setWhitelist,
      readLyricsSourceConfig: () => 'netease',
      getSmtcUnsubscribeMs: () => 2500,
      setSmtcUnsubscribeMs,
      sanitizeSmtcUnsubscribeMs,
      detectAllSources: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ sourceAppId: 'spotify', isPlaying: true, hasTitle: true, thumbnail: null }])
        .mockRejectedValueOnce(new Error('boom')),
    });

    const event = { sender: { id: 42 } };
    expect(handlers.get('music:whitelist:get')?.(event)).toEqual(['A', 'B']);
    expect(handlers.get('music:whitelist:set')?.(event, ['C'])).toBe(true);
    expect(setWhitelist).toHaveBeenCalledWith(['C']);
    expect(writeFileSyncMock).toHaveBeenCalled();
    expect(broadcastSettingChangeMock).toHaveBeenCalledWith(
      event.sender.id,
      'store:music-whitelist',
      ['C'],
    );

    writeFileSyncMock.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    expect(handlers.get('music:lyrics-source:set')?.({}, 'qqmusic')).toBe(false);

    existsSyncMock.mockReturnValue(false);
    expect(handlers.get('music:lyrics-karaoke:get')?.({})).toBe(true);

    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue('false');
    expect(handlers.get('music:lyrics-clock:get')?.({})).toBe(false);

    expect(handlers.get('music:smtc-unsubscribe-ms:get')?.({})).toBe(2500);
    expect(handlers.get('music:smtc-unsubscribe-ms:set')?.({}, 1234)).toBe(true);
    expect(sanitizeSmtcUnsubscribeMs).toHaveBeenCalledWith(1234);
    expect(setSmtcUnsubscribeMs).toHaveBeenCalledWith(1234);

    const detect = handlers.get('music:detect-source-app-id');
    await expect(detect?.({})).resolves.toEqual({ ok: false, sources: [], message: '当前无播放程序' });
    await expect(detect?.({})).resolves.toEqual({
      ok: true,
      sources: [{ sourceAppId: 'spotify', isPlaying: true, hasTitle: true, thumbnail: null }],
      message: '',
    });
    await expect(detect?.({})).resolves.toEqual({ ok: false, sources: [], message: '读取会话异常' });
  });
});
