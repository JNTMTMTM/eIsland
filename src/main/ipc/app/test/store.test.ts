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
 * @file store.test.ts
 * @description store IPC 处理模块单元测试
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
}));

const { existsSyncMock, readFileSyncMock, writeFileSyncMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
}));

const { joinMock } = vi.hoisted(() => ({
  joinMock: vi.fn(),
}));

const { broadcastSettingChangeMock } = vi.hoisted(() => ({
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

vi.mock('path', () => ({
  join: joinMock,
}));

vi.mock('../../../utils/broadcast', () => ({
  broadcastSettingChange: broadcastSettingChangeMock,
}));

import { registerStoreIpcHandlers } from '../store';

describe('registerStoreIpcHandlers', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

  beforeEach(() => {
    handlers.clear();
    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
    writeFileSyncMock.mockReset();
    broadcastSettingChangeMock.mockReset();
    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    });
    joinMock.mockImplementation((...segments: string[]) => segments.join('/'));
  });

  describe('registration', () => {
    it('registers store:read and store:write handlers', () => {
      registerStoreIpcHandlers({ storeDir: 'C:/store' });

      expect(handleMock).toHaveBeenCalledWith('store:read', expect.any(Function));
      expect(handleMock).toHaveBeenCalledWith('store:write', expect.any(Function));
      expect(handlers.has('store:read')).toBe(true);
      expect(handlers.has('store:write')).toBe(true);
    });
  });

  describe('store:read', () => {
    it('returns parsed JSON when file exists', () => {
      registerStoreIpcHandlers({ storeDir: 'C:/store' });

      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify({ theme: 'dark', fontSize: 14 }));

      const result = handlers.get('store:read')!({}, 'settings');

      expect(joinMock).toHaveBeenCalledWith('C:/store', 'settings.json');
      expect(existsSyncMock).toHaveBeenCalledWith('C:/store/settings.json');
      expect(readFileSyncMock).toHaveBeenCalledWith('C:/store/settings.json', 'utf-8');
      expect(result).toEqual({ theme: 'dark', fontSize: 14 });
    });

    it('returns null when file does not exist', () => {
      registerStoreIpcHandlers({ storeDir: 'C:/store' });

      existsSyncMock.mockReturnValue(false);

      const result = handlers.get('store:read')!({}, 'nonexistent');

      expect(joinMock).toHaveBeenCalledWith('C:/store', 'nonexistent.json');
      expect(existsSyncMock).toHaveBeenCalledWith('C:/store/nonexistent.json');
      expect(readFileSyncMock).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('returns null and logs error when readFileSync throws', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      registerStoreIpcHandlers({ storeDir: 'C:/store' });

      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const result = handlers.get('store:read')!({}, 'locked');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[Store] read 'locked' error:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('returns null and logs error when JSON.parse fails', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      registerStoreIpcHandlers({ storeDir: 'C:/store' });

      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue('not valid json{{');

      const result = handlers.get('store:read')!({}, 'corrupt');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[Store] read 'corrupt' error:",
        expect.any(SyntaxError),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('store:write', () => {
    it('writes JSON data and broadcasts the change', () => {
      registerStoreIpcHandlers({ storeDir: 'C:/store' });

      const event = { sender: { id: 42 } };
      const result = handlers.get('store:write')!(event, 'settings', { theme: 'light' });

      expect(joinMock).toHaveBeenCalledWith('C:/store', 'settings.json');
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        'C:/store/settings.json',
        JSON.stringify({ theme: 'light' }, null, 2),
        'utf-8',
      );
      expect(broadcastSettingChangeMock).toHaveBeenCalledWith(42, 'store:settings', {
        theme: 'light',
      });
      expect(result).toBe(true);
    });

    it('serializes arrays correctly', () => {
      registerStoreIpcHandlers({ storeDir: '/data' });

      const event = { sender: { id: 1 } };
      handlers.get('store:write')!(event, 'list', [1, 2, 3]);

      expect(writeFileSyncMock).toHaveBeenCalledWith(
        '/data/list.json',
        JSON.stringify([1, 2, 3], null, 2),
        'utf-8',
      );
    });

    it('serializes primitive values correctly', () => {
      registerStoreIpcHandlers({ storeDir: '/data' });

      const event = { sender: { id: 1 } };
      handlers.get('store:write')!(event, 'count', 42);

      expect(writeFileSyncMock).toHaveBeenCalledWith(
        '/data/count.json',
        '42',
        'utf-8',
      );
    });

    it('returns false and logs error when writeFileSync throws', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      registerStoreIpcHandlers({ storeDir: 'C:/store' });

      writeFileSyncMock.mockImplementation(() => {
        throw new Error('ENOSPC: no space left on device');
      });

      const event = { sender: { id: 5 } };
      const result = handlers.get('store:write')!(event, 'bigdata', { x: 'y' });

      expect(result).toBe(false);
      expect(broadcastSettingChangeMock).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[Store] write 'bigdata' error:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('broadcasts with the correct sender webContents id', () => {
      registerStoreIpcHandlers({ storeDir: 'C:/store' });

      const event = { sender: { id: 999 } };
      handlers.get('store:write')!(event, 'prefs', { lang: 'zh' });

      expect(broadcastSettingChangeMock).toHaveBeenCalledWith(999, 'store:prefs', {
        lang: 'zh',
      });
    });
  });

  describe('path construction', () => {
    it('uses join to build file paths with custom storeDir', () => {
      registerStoreIpcHandlers({ storeDir: '/home/user/.config/eisland/store' });

      existsSyncMock.mockReturnValue(false);

      handlers.get('store:read')!({}, 'theme');

      expect(joinMock).toHaveBeenCalledWith('/home/user/.config/eisland/store', 'theme.json');
    });
  });
});
