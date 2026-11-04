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
 * @file theme.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  handleMock,
  existsSyncMock,
  readFileSyncMock,
  writeFileSyncMock,
  broadcastSettingChangeMock,
} = vi.hoisted(() => ({
  handleMock: vi.fn(),
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

import { registerThemeIpcHandlers } from '../theme';

describe('registerThemeIpcHandlers', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

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

    registerThemeIpcHandlers({
      storeDir: 'C:/store',
      themeModeStoreKey: 'theme-mode',
    });
  });

  it('registers get/set handlers', () => {
    expect(handleMock).toHaveBeenCalledTimes(2);
    expect(handlers.has('theme:mode:get')).toBe(true);
    expect(handlers.has('theme:mode:set')).toBe(true);
  });

  it('returns dark when persisted file is missing', () => {
    existsSyncMock.mockReturnValue(false);

    const getHandler = handlers.get('theme:mode:get');
    expect(getHandler).toBeTypeOf('function');
    expect(getHandler?.()).toBe('dark');
  });

  it('normalizes invalid mode to dark and broadcasts change', () => {
    const setHandler = handlers.get('theme:mode:set');
    const event = { sender: { id: 42 } };

    const result = setHandler?.(event, 'invalid-mode');

    expect(result).toBe(true);
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    expect(writeFileSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('theme-mode.json'),
      JSON.stringify('dark', null, 2),
      'utf-8'
    );
    expect(broadcastSettingChangeMock).toHaveBeenCalledWith(42, 'theme:mode', 'dark');
  });

  it('returns false when persisting throws', () => {
    const setHandler = handlers.get('theme:mode:set');
    const event = { sender: { id: 1 } };
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    writeFileSyncMock.mockImplementation(() => {
      throw new Error('write failed');
    });

    const result = setHandler?.(event, 'light');
    expect(result).toBe(false);
    consoleErrorSpy.mockRestore();
  });

  it('returns dark for invalid persisted value', () => {
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(JSON.stringify('invalid'));

    const getHandler = handlers.get('theme:mode:get');
    expect(getHandler?.()).toBe('dark');
  });

  it('returns persisted valid mode and falls back on read error', () => {
    existsSyncMock.mockReturnValueOnce(true);
    readFileSyncMock.mockReturnValueOnce(JSON.stringify('system'));

    const getHandler = handlers.get('theme:mode:get');
    expect(getHandler?.()).toBe('system');

    existsSyncMock.mockReturnValueOnce(true);
    readFileSyncMock.mockImplementationOnce(() => {
      throw new Error('read failed');
    });
    expect(getHandler?.()).toBe('dark');
  });

  it('keeps valid mode when set to light', () => {
    const setHandler = handlers.get('theme:mode:set');

    expect(setHandler?.({ sender: { id: 8 } }, 'light')).toBe(true);
    expect(writeFileSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('theme-mode.json'),
      JSON.stringify('light', null, 2),
      'utf-8'
    );
    expect(broadcastSettingChangeMock).toHaveBeenCalledWith(8, 'theme:mode', 'light');
  });
});
