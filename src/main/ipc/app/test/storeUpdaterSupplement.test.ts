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
 * @file storeUpdaterSupplement.test.ts
 * @description 存储严格读取、非法比较键、更新拒绝与引导重置 IPC 回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerStoreIpcHandlers } from '../store';
import { registerUpdaterIpcHandlers } from '../updater';
import type { AppUpdater } from 'electron-updater';

type HandlerFixture = (...arguments_: unknown[]) => unknown;
const boundary = vi.hoisted(() => ({
  handlers: new Map<string, HandlerFixture>(),
  read: vi.fn<() => string>(),
  write: vi.fn<() => void>(),
  reset: vi.fn<() => boolean>(),
  check: vi.fn<() => Promise<null>>(),
  download: vi.fn<() => Promise<void>>(),
  feed: vi.fn(),
  install: vi.fn(),
}));
vi.mock('electron', () => ({ ipcMain: { handle: (channel: string, handler: HandlerFixture) => boundary.handlers.set(channel, handler) } }));
vi.mock('fs', () => ({ existsSync: () => true, readFileSync: boundary.read, writeFileSync: boundary.write }));
vi.mock('../../../utils/broadcast', () => ({ broadcastSettingChange: vi.fn() }));
vi.mock('../../../config/storeConfig', () => ({ deleteFirstLaunchConfig: boundary.reset }));

beforeEach(() => {
  vi.resetAllMocks();
  boundary.handlers.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('存储与更新 IPC 缺失错误契约', () => {
  it('严格读取损坏 JSON 重新抛出，普通读取保持 null', () => {
    boundary.read.mockReturnValue('{broken');
    registerStoreIpcHandlers({ storeDir: 'fixture-store' });
    const read = boundary.handlers.get('store:read');
    expect(() => read?.({}, 'fixture', true)).toThrow(SyntaxError);
    expect(read?.({}, 'fixture')).toBeNull();
  });
  it.each(['', '../fixture', null])('读写非法 key %s 在磁盘访问前拒绝', (key) => {
    registerStoreIpcHandlers({ storeDir: 'fixture-store' });
    expect(boundary.handlers.get('store:read')?.({}, key)).toBeNull();
    expect(boundary.handlers.get('store:write')?.({ sender: { id: 1 } }, key, {})).toBe(false);
    expect(boundary.read).not.toHaveBeenCalled();
    expect(boundary.write).not.toHaveBeenCalled();
  });
  it.each([true, false])('引导重置返回底层配置删除结果 %s', (value) => {
    boundary.reset.mockReturnValue(value);
    const updater = { setFeedURL: boundary.feed, checkForUpdates: boundary.check, downloadUpdate: boundary.download, quitAndInstall: boundary.install };
    registerUpdaterIpcHandlers({ updater: updater as unknown as AppUpdater, getVersion: () => 'fixture-version', isPackaged: () => false });
    expect(boundary.handlers.get('guide:reset')?.()).toBe(value);
    expect(boundary.reset).toHaveBeenCalledOnce();
  });
  it('更新检查以非 Error 值拒绝时下载入口返回 false', async () => {
    boundary.check.mockRejectedValueOnce('provider failure');
    const updater = { setFeedURL: boundary.feed, checkForUpdates: boundary.check, downloadUpdate: boundary.download, quitAndInstall: boundary.install };
    registerUpdaterIpcHandlers({ updater: updater as unknown as AppUpdater, getVersion: () => 'fixture-version', isPackaged: () => false });
    await expect(boundary.handlers.get('updater:download')?.({})).resolves.toBe(false);
    expect(boundary.download).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('[Updater:download] ERROR:', 'provider failure');
  });
});
