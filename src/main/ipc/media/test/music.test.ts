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
 * @file music.test.ts
 * @description music IPC handlers 单元测试
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { join } from 'path';

const { handleMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
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

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
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

import { registerMusicIpcHandlers } from '../music';

describe('registerMusicIpcHandlers', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

  /** Helper to register handlers and capture them by channel name. */
  function register(overrides: Partial<Parameters<typeof registerMusicIpcHandlers>[0]> = {}) {
    const defaults: Parameters<typeof registerMusicIpcHandlers>[0] = {
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
      getWhitelist: () => ['app-a', 'app-b'],
      setWhitelist: vi.fn(),
      readLyricsSourceConfig: () => 'netease',
      getSmtcUnsubscribeMs: () => 2500,
      setSmtcUnsubscribeMs: vi.fn(),
      sanitizeSmtcUnsubscribeMs: vi.fn((v: unknown) => Number(v) || 3000),
      detectAllSources: vi.fn().mockResolvedValue([]),
    };
    registerMusicIpcHandlers({ ...defaults, ...overrides });
  }

  beforeEach(() => {
    handlers.clear();
    handleMock.mockReset();
    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
    writeFileSyncMock.mockReset();
    broadcastSettingChangeMock.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    });
  });

  const event = { sender: { id: 42 } };

  /** Convenience: call a captured handler by channel name. */
  function call(channel: string, ...args: unknown[]) {
    return handlers.get(channel)?.(event, ...args);
  }

  // ---------------------------------------------------------------
  // whitelist:get
  // ---------------------------------------------------------------
  describe('music:whitelist:get', () => {
    it('returns the whitelist from getWhitelist', () => {
      register({ getWhitelist: () => ['spotify', 'vlc'] });
      expect(call('music:whitelist:get')).toEqual(['spotify', 'vlc']);
    });

    it('returns an empty array when getWhitelist returns empty', () => {
      register({ getWhitelist: () => [] });
      expect(call('music:whitelist:get')).toEqual([]);
    });
  });

  // ---------------------------------------------------------------
  // whitelist:set
  // ---------------------------------------------------------------
  describe('music:whitelist:set', () => {
    it('calls setWhitelist and persists to disk', () => {
      const setWhitelist = vi.fn();
      register({ setWhitelist });

      const result = call('music:whitelist:set', ['new-app']);

      expect(result).toBe(true);
      expect(setWhitelist).toHaveBeenCalledWith(['new-app']);
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        join('C:/store', 'whitelist.json'),
        JSON.stringify(['new-app'], null, 2),
        'utf-8',
      );
      expect(broadcastSettingChangeMock).toHaveBeenCalledWith(
        event.sender.id,
        'store:music-whitelist',
        ['new-app'],
      );
    });

    it('returns false and logs error when write fails', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      writeFileSyncMock.mockImplementation(() => {
        throw new Error('disk full');
      });

      register();
      const result = call('music:whitelist:set', ['app']);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[Whitelist] persist error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  // lyrics-source:get
  // ---------------------------------------------------------------
  describe('music:lyrics-source:get', () => {
    it('returns the value from readLyricsSourceConfig', () => {
      register({ readLyricsSourceConfig: () => 'qqmusic' });
      expect(call('music:lyrics-source:get')).toBe('qqmusic');
    });
  });

  // ---------------------------------------------------------------
  // lyrics-source:set
  // ---------------------------------------------------------------
  describe('music:lyrics-source:set', () => {
    it('writes the source to disk and returns true', () => {
      register();
      const result = call('music:lyrics-source:set', 'kugou');

      expect(result).toBe(true);
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        join('C:/store', 'lyricsSource.json'),
        JSON.stringify('kugou', null, 2),
        'utf-8',
      );
    });

    it('returns false when write fails', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      writeFileSyncMock.mockImplementation(() => {
        throw new Error('permission denied');
      });

      register();
      expect(call('music:lyrics-source:set', 'netease')).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[LyricsSource] persist error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  // lyrics-karaoke:get
  // ---------------------------------------------------------------
  describe('music:lyrics-karaoke:get', () => {
    it('returns parsed boolean from file when file exists', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('true');
      register();
      expect(call('music:lyrics-karaoke:get')).toBe(true);
    });

    it('returns false from file when file contains false', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('false');
      register();
      expect(call('music:lyrics-karaoke:get')).toBe(false);
    });

    it('returns default when file does not exist', () => {
      existsSyncMock.mockReturnValue(false);
      register({ defaultLyricsKaraoke: true });
      expect(call('music:lyrics-karaoke:get')).toBe(true);
    });

    it('returns default when file content is not a boolean', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('"not-a-bool"');
      register({ defaultLyricsKaraoke: false });
      expect(call('music:lyrics-karaoke:get')).toBe(false);
    });

    it('returns default when file content is a number', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('42');
      register({ defaultLyricsKaraoke: true });
      expect(call('music:lyrics-karaoke:get')).toBe(true);
    });

    it('returns default when read throws', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockImplementation(() => {
        throw new Error('read error');
      });
      register({ defaultLyricsKaraoke: true });
      expect(call('music:lyrics-karaoke:get')).toBe(true);
    });

    it('returns default when JSON.parse throws', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('{invalid json');
      register({ defaultLyricsKaraoke: false });
      expect(call('music:lyrics-karaoke:get')).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // lyrics-karaoke:set
  // ---------------------------------------------------------------
  describe('music:lyrics-karaoke:set', () => {
    it('writes the boolean to disk and returns true', () => {
      register();
      const result = call('music:lyrics-karaoke:set', true);

      expect(result).toBe(true);
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        join('C:/store', 'lyricsKaraoke.json'),
        JSON.stringify(true, null, 2),
        'utf-8',
      );
    });

    it('persists false value correctly', () => {
      register();
      call('music:lyrics-karaoke:set', false);

      expect(writeFileSyncMock).toHaveBeenCalledWith(
        join('C:/store', 'lyricsKaraoke.json'),
        JSON.stringify(false, null, 2),
        'utf-8',
      );
    });

    it('returns false when write fails', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      writeFileSyncMock.mockImplementation(() => {
        throw new Error('write error');
      });

      register();
      expect(call('music:lyrics-karaoke:set', true)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[LyricsKaraoke] persist error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  // lyrics-clock:get
  // ---------------------------------------------------------------
  describe('music:lyrics-clock:get', () => {
    it('returns parsed boolean from file when file exists', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('true');
      register();
      expect(call('music:lyrics-clock:get')).toBe(true);
    });

    it('returns default when file does not exist', () => {
      existsSyncMock.mockReturnValue(false);
      register({ defaultLyricsClock: true });
      expect(call('music:lyrics-clock:get')).toBe(true);
    });

    it('returns default when file content is not a boolean', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('123');
      register({ defaultLyricsClock: false });
      expect(call('music:lyrics-clock:get')).toBe(false);
    });

    it('returns default when read throws', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockImplementation(() => {
        throw new Error('read error');
      });
      register({ defaultLyricsClock: true });
      expect(call('music:lyrics-clock:get')).toBe(true);
    });

    it('returns default when JSON.parse throws', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('<<<bad>>>');
      register({ defaultLyricsClock: false });
      expect(call('music:lyrics-clock:get')).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // lyrics-clock:set
  // ---------------------------------------------------------------
  describe('music:lyrics-clock:set', () => {
    it('writes the boolean to disk and returns true', () => {
      register();
      const result = call('music:lyrics-clock:set', true);

      expect(result).toBe(true);
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        join('C:/store', 'lyricsClock.json'),
        JSON.stringify(true, null, 2),
        'utf-8',
      );
    });

    it('returns false when write fails', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      writeFileSyncMock.mockImplementation(() => {
        throw new Error('disk error');
      });

      register();
      expect(call('music:lyrics-clock:set', false)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[LyricsClock] persist error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  // smtc-unsubscribe-ms:get
  // ---------------------------------------------------------------
  describe('music:smtc-unsubscribe-ms:get', () => {
    it('returns the value from getSmtcUnsubscribeMs', () => {
      register({ getSmtcUnsubscribeMs: () => 5000 });
      expect(call('music:smtc-unsubscribe-ms:get')).toBe(5000);
    });
  });

  // ---------------------------------------------------------------
  // smtc-unsubscribe-ms:set
  // ---------------------------------------------------------------
  describe('music:smtc-unsubscribe-ms:set', () => {
    it('sanitizes, sets, and persists the value', () => {
      const sanitizeSmtcUnsubscribeMs = vi.fn((v: unknown) => Number(v) * 2);
      const setSmtcUnsubscribeMs = vi.fn();
      register({ sanitizeSmtcUnsubscribeMs, setSmtcUnsubscribeMs });

      const result = call('music:smtc-unsubscribe-ms:set', 1000);

      expect(result).toBe(true);
      expect(sanitizeSmtcUnsubscribeMs).toHaveBeenCalledWith(1000);
      expect(setSmtcUnsubscribeMs).toHaveBeenCalledWith(2000);
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        join('C:/store', 'smtcUnsubscribe.json'),
        JSON.stringify(2000, null, 2),
        'utf-8',
      );
    });

    it('returns false when write fails', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      writeFileSyncMock.mockImplementation(() => {
        throw new Error('write error');
      });

      register();
      expect(call('music:smtc-unsubscribe-ms:set', 1000)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[SMTCUnsubscribe] persist error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  // detect-source-app-id
  // ---------------------------------------------------------------
  describe('music:detect-source-app-id', () => {
    it('returns ok with sources when sources are found', async () => {
      const sources = [
        { sourceAppId: 'spotify', isPlaying: true, hasTitle: true, thumbnail: 'thumb.png' },
        { sourceAppId: 'vlc', isPlaying: false, hasTitle: false, thumbnail: null },
      ];
      register({ detectAllSources: vi.fn().mockResolvedValue(sources) });

      const result = await call('music:detect-source-app-id');
      expect(result).toEqual({ ok: true, sources, message: '' });
    });

    it('returns ok:false with empty sources when no sources found', async () => {
      register({ detectAllSources: vi.fn().mockResolvedValue([]) });

      const result = await call('music:detect-source-app-id');
      expect(result).toEqual({ ok: false, sources: [], message: '当前无播放程序' });
    });

    it('returns ok:false with error message when detectAllSources throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      register({ detectAllSources: vi.fn().mockRejectedValue(new Error('boom')) });

      const result = await call('music:detect-source-app-id');
      expect(result).toEqual({ ok: false, sources: [], message: '读取会话异常' });
      expect(consoleSpy).toHaveBeenCalledWith('[Music] detect sources failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  // ipcMain.handle registration
  // ---------------------------------------------------------------
  describe('channel registration', () => {
    it('registers exactly 15 IPC channels', () => {
      register();
      expect(handleMock).toHaveBeenCalledTimes(19);
    });

    it('registers all expected channels', () => {
      const expectedChannels = [
        'music:whitelist:get',
        'music:whitelist:set',
        'music:lyrics-source:get',
        'music:lyrics-source:set',
        'music:lyrics-karaoke:get',
        'music:lyrics-karaoke:set',
        'music:lyrics-clock:get',
        'music:lyrics-clock:set',
        'music:lyrics-calibrate-enabled:get',
        'music:lyrics-calibrate-enabled:set',
        'music:lyrics-calibrate-delay:get',
        'music:lyrics-calibrate-delay:set',
        'music:smtc-unsubscribe-ms:get',
        'music:smtc-unsubscribe-ms:set',
        'music:detect-source-app-id',
      ];
      register();
      expectedChannels.forEach((ch) => {
        expect(handlers.has(ch)).toBe(true);
      });
    });
  });

  // ---------------------------------------------------------------
  // Edge cases for store paths
  // ---------------------------------------------------------------
  describe('store path construction', () => {
    it('uses correct file paths for each setting', () => {
      register({
        storeDir: '/custom/dir',
        whitelistStoreKey: 'wl',
        lyricsSourceStoreKey: 'ls',
        lyricsKaraokeStoreKey: 'lk',
        lyricsClockStoreKey: 'lc',
        smtcUnsubscribeStoreKey: 'su',
      });

      call('music:whitelist:set', []);
      expect(writeFileSyncMock).toHaveBeenLastCalledWith(join('/custom/dir', 'wl.json'), expect.any(String), 'utf-8');

      call('music:lyrics-source:set', 'test');
      expect(writeFileSyncMock).toHaveBeenLastCalledWith(join('/custom/dir', 'ls.json'), expect.any(String), 'utf-8');

      call('music:lyrics-karaoke:set', true);
      expect(writeFileSyncMock).toHaveBeenLastCalledWith(join('/custom/dir', 'lk.json'), expect.any(String), 'utf-8');

      call('music:lyrics-clock:set', false);
      expect(writeFileSyncMock).toHaveBeenLastCalledWith(join('/custom/dir', 'lc.json'), expect.any(String), 'utf-8');

      call('music:smtc-unsubscribe-ms:set', 100);
      expect(writeFileSyncMock).toHaveBeenLastCalledWith(join('/custom/dir', 'su.json'), expect.any(String), 'utf-8');
    });
  });
});
