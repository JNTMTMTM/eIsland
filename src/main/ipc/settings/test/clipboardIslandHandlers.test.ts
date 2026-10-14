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
 * @file clipboardIslandHandlers.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
}));

const {
  clipboardReadTextMock,
  clipboardWriteTextMock,
  shellOpenExternalMock,
  appSetLoginItemSettingsMock,
} = vi.hoisted(() => ({
  clipboardReadTextMock: vi.fn(),
  clipboardWriteTextMock: vi.fn(),
  shellOpenExternalMock: vi.fn(),
  appSetLoginItemSettingsMock: vi.fn(),
}));

const {
  writeFileSyncMock,
  existsSyncMock,
  readFileSyncMock,
} = vi.hoisted(() => ({
  writeFileSyncMock: vi.fn(),
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
}));

const { broadcastSettingChangeMock } = vi.hoisted(() => ({
  broadcastSettingChangeMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: handleMock },
  clipboard: {
    readText: clipboardReadTextMock,
    writeText: clipboardWriteTextMock,
  },
  shell: {
    openExternal: shellOpenExternalMock,
  },
  app: {
    setLoginItemSettings: appSetLoginItemSettingsMock,
  },
}));

vi.mock('fs', () => ({
  writeFileSync: writeFileSyncMock,
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
}));

vi.mock('../../../utils/broadcast', () => ({
  broadcastSettingChange: broadcastSettingChangeMock,
}));

import { registerClipboardIpcHandlers } from '../clipboard';
import { registerIslandIpcHandlers } from '../island';

describe('settings ipc handlers', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

  beforeEach(() => {
    handlers.clear();
    handleMock.mockReset();
    clipboardReadTextMock.mockReset();
    clipboardWriteTextMock.mockReset();
    shellOpenExternalMock.mockReset();
    appSetLoginItemSettingsMock.mockReset();
    writeFileSyncMock.mockReset();
    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
    broadcastSettingChangeMock.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    });
  });

  it('registers clipboard handlers and supports read/write/open url', async () => {
    const options = {
      storeDir: 'C:/store',
      monitorEnabledStoreKey: 'm',
      detectModeStoreKey: 'd',
      blacklistStoreKey: 'b',
      defaultDetectMode: 'https-only' as const,
      getMonitorEnabled: vi.fn(() => false),
      setMonitorEnabled: vi.fn(),
      getDetectMode: vi.fn(() => 'https-only' as const),
      setDetectMode: vi.fn(),
      getBlacklist: vi.fn(() => []),
      setBlacklist: vi.fn(),
      startWatcher: vi.fn(),
      stopWatcher: vi.fn(),
    };

    registerClipboardIpcHandlers(options);

    clipboardReadTextMock.mockResolvedValue('abc');
    const read = handlers.get('clipboard:read-text');
    const write = handlers.get('clipboard:write-text');
    const open = handlers.get('clipboard:open-url');

    await expect(read?.()).resolves.toBe('abc');
    await expect(write?.({}, 'hi')).resolves.toBe(true);
    expect(clipboardWriteTextMock).toHaveBeenCalledWith('hi');
    clipboardReadTextMock.mockRejectedValueOnce(new Error('read denied'));
    await expect(read?.()).resolves.toBe('');
    clipboardWriteTextMock.mockRejectedValueOnce(new Error('write denied'));
    await expect(write?.({}, 'hi')).resolves.toBe(false);

    shellOpenExternalMock.mockResolvedValue(undefined);
    await expect(open?.({}, 'https://example.com')).resolves.toBe(true);
    await expect(open?.({}, 'file:///abc')).resolves.toBe(false);
  });

  it('handles clipboard blacklist and monitor toggle persistence', () => {
    const state = {
      blacklist: ['example.com'],
      enabled: false,
    };

    registerClipboardIpcHandlers({
      storeDir: 'C:/store',
      monitorEnabledStoreKey: 'm',
      detectModeStoreKey: 'd',
      blacklistStoreKey: 'b',
      defaultDetectMode: 'https-only',
      getMonitorEnabled: () => state.enabled,
      setMonitorEnabled: (v) => { state.enabled = v; },
      getDetectMode: () => 'https-only',
      setDetectMode: vi.fn(),
      getBlacklist: () => state.blacklist,
      setBlacklist: (next) => { state.blacklist = next; },
      startWatcher: vi.fn(),
      stopWatcher: vi.fn(),
    });

    const setList = handlers.get('clipboard:url-blacklist:set');
    const setMonitor = handlers.get('clipboard:url-monitor:set');

    expect(setList?.({ sender: { id: 3 } }, ['https://a.com', 'a.com', ''])).toBe(true);
    expect(writeFileSyncMock).toHaveBeenCalled();
    expect(broadcastSettingChangeMock).toHaveBeenCalledWith(3, 'clipboard:url-blacklist', ['a.com']);

    expect(setMonitor?.({ sender: { id: 4 } }, true)).toBe(true);
    expect(state.enabled).toBe(true);
  });

  it('registers island handlers and normalizes read/write values', () => {
    registerIslandIpcHandlers({
      storeDir: 'C:/store',
      islandOpacityStoreKey: 'op',
      expandMouseleaveIdleStoreKey: 'exp',
      maxExpandMouseleaveIdleStoreKey: 'max',
      idleClickExpandStoreKey: 'idle',
      autostartModeStoreKey: 'auto',
      navOrderStoreKey: 'nav',
    });

    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(JSON.stringify(150));

    const getOpacity = handlers.get('island:opacity:get');
    const setOpacity = handlers.get('island:opacity:set');
    const getNav = handlers.get('island:nav-order:get');

    expect(getOpacity?.()).toBe(100);
    expect(setOpacity?.({ sender: { id: 7 } }, 5)).toBe(true);
    expect(writeFileSyncMock).toHaveBeenCalled();
    expect(broadcastSettingChangeMock).toHaveBeenCalledWith(7, 'island:opacity', 10);

    readFileSyncMock.mockReturnValue(JSON.stringify(['a', 'b']));
    expect(getNav?.()).toEqual({ visibleOrder: ['a', 'b'], hiddenOrder: [] });
  });

  it('handles island autostart modes and nav-order set sanitize/failure branches', () => {
    registerIslandIpcHandlers({
      storeDir: 'C:/store',
      islandOpacityStoreKey: 'op',
      expandMouseleaveIdleStoreKey: 'exp',
      maxExpandMouseleaveIdleStoreKey: 'max',
      idleClickExpandStoreKey: 'idle',
      autostartModeStoreKey: 'auto',
      navOrderStoreKey: 'nav',
    });

    const getAutostart = handlers.get('island:autostart:get');
    const setAutostart = handlers.get('island:autostart:set');
    const setNav = handlers.get('island:nav-order:set');

    existsSyncMock.mockReturnValueOnce(false);
    expect(getAutostart?.()).toBe('disabled');

    existsSyncMock.mockReturnValueOnce(true);
    readFileSyncMock.mockReturnValueOnce(JSON.stringify('enabled'));
    expect(getAutostart?.()).toBe('enabled');

    expect(setAutostart?.({ sender: { id: 9 } }, 'invalid-mode')).toBe(true);
    expect(appSetLoginItemSettingsMock).toHaveBeenNthCalledWith(1, { openAtLogin: false });
    expect(broadcastSettingChangeMock).toHaveBeenCalledWith(9, 'island:autostart', 'disabled');

    expect(setAutostart?.({ sender: { id: 9 } }, 'high-priority')).toBe(true);
    expect(appSetLoginItemSettingsMock).toHaveBeenNthCalledWith(2, {
      openAtLogin: true,
      args: ['--high-priority'],
    });

    expect(setNav?.({}, { visibleOrder: ['a', 1, 'b'], hiddenOrder: ['x', null] })).toBe(true);
    expect(writeFileSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('nav.json'),
      JSON.stringify({ visibleOrder: ['a', 'b'], hiddenOrder: ['x'] }, null, 2),
      'utf-8',
    );

    writeFileSyncMock.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    expect(setNav?.({}, { visibleOrder: ['a'] })).toBe(false);
  });
});
