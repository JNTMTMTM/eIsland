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
 * @file extension.test.ts
 * @description 扩展IPC列表、安装/卸载失败及多窗口进度广播。
 * @author 鸡哥
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerExtensionIpcHandlers } from '../extension';
import type { ExtensionProgressData } from '../../../../shared/extensionTypes';

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  list: vi.fn(),
  install: vi.fn<(id: string, source: string, url: string | undefined, callback: (progress: ExtensionProgressData) => void) => Promise<void>>(),
  uninstall: vi.fn(),
  windows: [] as {
    isDestroyed: () => boolean;
    webContents: {
      send: ReturnType<typeof vi.fn>;
    };
  }[]
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, callback: (...args: unknown[]) => unknown) => mocks.handlers.set(channel, callback)
  },
  BrowserWindow: {
    getAllWindows: () => mocks.windows
  }
}));

vi.mock('../../../extensions/extensionManager', () => ({
  getExtensionStatusList: mocks.list,
  installExtension: mocks.install,
  uninstallExtension: mocks.uninstall
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.install.mockReset();
  mocks.install.mockResolvedValue();
  mocks.handlers.clear();
  mocks.windows = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
  registerExtensionIpcHandlers();
});

describe('扩展IPC', () => {
  it('列表转发源地址，失败返回空列表', async () => {
    const list = [{
      id: 'volume-helper'
    }];
    mocks.list.mockResolvedValueOnce(list);
    expect(await Promise.resolve(mocks.handlers.get('extension:list')?.({}, 'github', 'https://mirror'))).toBe(list);
    expect(mocks.list).toHaveBeenCalledWith('github', 'https://mirror');
    mocks.list.mockRejectedValueOnce(new Error('offline'));
    expect(await Promise.resolve(mocks.handlers.get('extension:list')?.({}))).toEqual([]);
  });

  it.each([undefined, 'github'])('安装源%s使用约定默认值并广播到未销毁窗口', async (source) => {
    const alive = {
      isDestroyed: () => false,
      webContents: {
        send: vi.fn()
      }
    };
    const closed = {
      isDestroyed: () => true,
      webContents: {
        send: vi.fn()
      }
    };
    mocks.windows = [alive, closed];
    const progress = {
      id: 'volume-helper',
      progress: 50,
      transferred: 5,
      total: 10
    };
    mocks.install.mockImplementationOnce((id, updateSource, url, callback) => {
      void id;
      void updateSource;
      void url;
      callback(progress);
      return Promise.resolve();
    });
    expect(await Promise.resolve(mocks.handlers.get('extension:install')?.({}, 'volume-helper', source, 'https://mirror'))).toEqual({
      success: true
    });
    expect(mocks.install).toHaveBeenCalledWith('volume-helper', source ?? 'cloudflare-r2', 'https://mirror', expect.any(Function));
    expect(alive.webContents.send).toHaveBeenCalledWith('extension:install-progress', progress);
    expect(closed.webContents.send).not.toHaveBeenCalled();
  });

  it.each([new Error('denied'), 'failed'])('安装和卸载失败转换为错误信息', async (error) => {
    mocks.install.mockRejectedValueOnce(error);

    mocks.uninstall.mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- 验证第三方同步依赖抛出字符串时的错误规范化。
      throw error;
    });
    const message = error instanceof Error ? error.message : error;
    expect(await Promise.resolve(mocks.handlers.get('extension:install')?.({}, 'x'))).toEqual({
      success: false,
      error: message
    });
    expect(mocks.handlers.get('extension:uninstall')?.({}, 'x')).toEqual({
      success: false,
      error: message
    });
  });

  it('卸载成功保留ID', () => {
    expect(mocks.handlers.get('extension:uninstall')?.({}, 'volume-helper')).toEqual({
      success: true
    });
    expect(mocks.uninstall).toHaveBeenCalledWith('volume-helper');
  });
});
