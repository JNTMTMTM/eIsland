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
 * @file broadcast.test.ts
 * @description 跨窗口设置广播工具单元测试
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetAllWindows,
  mockHandle,
} = vi.hoisted(() => ({
  mockGetAllWindows: vi.fn(),
  mockHandle: vi.fn(),
}));

vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: mockGetAllWindows },
  ipcMain: { handle: mockHandle },
}));

import { broadcastSettingChange, registerSettingsPreviewHandler } from '../broadcast';

/** Helper: create a fake BrowserWindow-like object */
function createFakeWindow(id: number, destroyed = false) {
  return {
    isDestroyed: () => destroyed,
    webContents: {
      id,
      send: vi.fn(),
    },
  };
}

describe('broadcastSettingChange', () => {
  it('sends settings:changed to all windows except the sender', () => {
    const sender = createFakeWindow(1);
    const other = createFakeWindow(2);
    const another = createFakeWindow(3);
    mockGetAllWindows.mockReturnValue([sender, other, another]);

    broadcastSettingChange(1, 'theme', 'dark');

    expect(sender.webContents.send).not.toHaveBeenCalled();
    expect(other.webContents.send).toHaveBeenCalledWith('settings:changed', 'theme', 'dark');
    expect(another.webContents.send).toHaveBeenCalledWith('settings:changed', 'theme', 'dark');
  });

  it('skips destroyed windows', () => {
    const alive = createFakeWindow(1);
    const destroyed = createFakeWindow(2, true);
    mockGetAllWindows.mockReturnValue([alive, destroyed]);

    broadcastSettingChange(99, 'lang', 'zh-CN');

    expect(alive.webContents.send).toHaveBeenCalledWith('settings:changed', 'lang', 'zh-CN');
    expect(destroyed.webContents.send).not.toHaveBeenCalled();
  });

  it('broadcasts to all windows when senderWebContentsId is -1', () => {
    const win1 = createFakeWindow(1);
    const win2 = createFakeWindow(2);
    mockGetAllWindows.mockReturnValue([win1, win2]);

    broadcastSettingChange(-1, 'opacity', 0.8);

    expect(win1.webContents.send).toHaveBeenCalledWith('settings:changed', 'opacity', 0.8);
    expect(win2.webContents.send).toHaveBeenCalledWith('settings:changed', 'opacity', 0.8);
  });

  it('does nothing when there are no windows', () => {
    mockGetAllWindows.mockReturnValue([]);

    expect(() => broadcastSettingChange(1, 'theme', 'light')).not.toThrow();
  });

  it('passes complex values unchanged', () => {
    const win = createFakeWindow(10);
    mockGetAllWindows.mockReturnValue([win]);

    const complexValue = { nested: { key: [1, 2, 3] } };
    broadcastSettingChange(99, 'config', complexValue);

    expect(win.webContents.send).toHaveBeenCalledWith('settings:changed', 'config', complexValue);
  });

  it('handles when all windows are destroyed', () => {
    const d1 = createFakeWindow(1, true);
    const d2 = createFakeWindow(2, true);
    mockGetAllWindows.mockReturnValue([d1, d2]);

    expect(() => broadcastSettingChange(1, 'theme', 'dark')).not.toThrow();
    expect(d1.webContents.send).not.toHaveBeenCalled();
    expect(d2.webContents.send).not.toHaveBeenCalled();
  });
});

describe('registerSettingsPreviewHandler', () => {
  it('registers an IPC handler on settings:preview channel', () => {
    registerSettingsPreviewHandler();

    expect(mockHandle).toHaveBeenCalledWith('settings:preview', expect.any(Function));
  });

  it('handler delegates to broadcastSettingChange with sender id excluded', () => {
    registerSettingsPreviewHandler();

    const handler = mockHandle.mock.calls[0][1];
    const senderWin = createFakeWindow(5);
    const otherWin = createFakeWindow(6);
    mockGetAllWindows.mockReturnValue([senderWin, otherWin]);

    const result = handler({ sender: { id: 5 } }, 'volume', 42);

    expect(senderWin.webContents.send).not.toHaveBeenCalled();
    expect(otherWin.webContents.send).toHaveBeenCalledWith('settings:changed', 'volume', 42);
    expect(result).toBe(true);
  });

  it('handler returns true', () => {
    registerSettingsPreviewHandler();

    const handler = mockHandle.mock.calls[0][1];
    mockGetAllWindows.mockReturnValue([]);

    const result = handler({ sender: { id: 1 } }, 'test', 'val');
    expect(result).toBe(true);
  });
});
