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
 * @file hideScreenshotSupplement.test.ts
 * @description 隐藏进程异步检测失败与截图保留热键列表空项的 IPC 回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerHideProcessIpcHandlers } from '../hideProcess';
import { registerScreenshotHotkeyIpcHandlers } from '../screenshotHotkey';

type HandlerFixture = (...arguments_: unknown[]) => unknown;
const io = vi.hoisted(() => ({
  handlers: new Map<string, HandlerFixture>(), write: vi.fn(), broadcast: vi.fn(),
}));
vi.mock('electron', () => ({ ipcMain: { handle: (channel: string, handler: HandlerFixture) => io.handlers.set(channel, handler) } }));
vi.mock('fs', () => ({ writeFileSync: io.write }));
vi.mock('../../../utils/broadcast', () => ({ broadcastSettingChange: io.broadcast }));
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

beforeEach(() => {
  vi.resetAllMocks();
  io.handlers.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
  vi.restoreAllMocks();
});

describe('隐藏检测异步失败与截图保留列表空项', () => {
  it('非 Windows 保存名单与全屏开关但不调用 Windows 检测', async () => {
    Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });
    const check = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    registerHideProcessIpcHandlers({
      storeDir: 'fixture-store', hideProcessListStoreKey: 'processes', autoHideFullscreenWindowsStoreKey: 'fullscreen',
      getConfiguredHideProcessList: () => [], setConfiguredHideProcessList: vi.fn(), setAutoHideProcessList: vi.fn(),
      getAutoHideFullscreenWindows: () => false, setAutoHideFullscreenWindows: vi.fn(),
      sanitizeProcessNameList: (list) => list, checkAutoHideProcessList: check,
    });
    await expect(io.handlers.get('hide-process-list:set')?.({}, ['fixture.exe'])).resolves.toBe(true);
    await expect(io.handlers.get('hide-process-list:auto-hide-fullscreen:set')?.({ sender: { id: 1 } }, true)).resolves.toBe(true);
    expect(io.write).toHaveBeenCalledTimes(2);
    expect(check).not.toHaveBeenCalled();
  });
  it('全屏开关持久化失败返回 false 并记录错误', async () => {
    const failure = new Error('disk unavailable');
    io.write.mockImplementation(() => { throw failure; });
    registerHideProcessIpcHandlers({
      storeDir: 'fixture-store', hideProcessListStoreKey: 'processes', autoHideFullscreenWindowsStoreKey: 'fullscreen',
      getConfiguredHideProcessList: () => [], setConfiguredHideProcessList: vi.fn(), setAutoHideProcessList: vi.fn(),
      getAutoHideFullscreenWindows: () => false, setAutoHideFullscreenWindows: vi.fn(),
      sanitizeProcessNameList: (list) => list, checkAutoHideProcessList: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    });
    await expect(io.handlers.get('hide-process-list:auto-hide-fullscreen:set')?.({ sender: { id: 1 } }, true)).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith('[HideProcessList] auto hide fullscreen persist error:', failure);
  });
  it('截图注册失败返回 false 且不写文件', () => {
    registerScreenshotHotkeyIpcHandlers({
      storeDir: 'fixture-store', screenshotHotkeyStoreKey: 'screenshot',
      getCurrentScreenshotHotkey: () => 'Ctrl+A', readScreenshotHotkeyConfig: () => 'Ctrl+B',
      getReservedHotkeys: () => [], registerScreenshotHotkey: () => false,
    });
    expect(io.handlers.get('screenshot-hotkey:set')?.({}, '')).toBe(false);
    expect(io.write).not.toHaveBeenCalled();
  });
  it.each(['hide-process-list:set', 'hide-process-list:auto-hide-fullscreen:set'])('%s 检测 Promise 拒绝不撤销成功持久化', async (channel) => {
    const configured = vi.fn();
    const runtime = vi.fn();
    const fullscreen = vi.fn();
    const check = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('native unavailable'));
    registerHideProcessIpcHandlers({
      storeDir: 'fixture-store', hideProcessListStoreKey: 'processes', autoHideFullscreenWindowsStoreKey: 'fullscreen',
      getConfiguredHideProcessList: () => [], setConfiguredHideProcessList: configured, setAutoHideProcessList: runtime,
      getAutoHideFullscreenWindows: () => false, setAutoHideFullscreenWindows: fullscreen,
      sanitizeProcessNameList: (list) => list, checkAutoHideProcessList: check,
    });
    const value = channel === 'hide-process-list:set' ? ['fixture.exe'] : true;
    await expect(io.handlers.get(channel)?.({ sender: { id: 1 } }, value)).resolves.toBe(true);
    expect(io.write).toHaveBeenCalledOnce();
    expect(check).toHaveBeenCalledOnce();
    if (channel === 'hide-process-list:set') {
      expect(configured).toHaveBeenCalledExactlyOnceWith(['fixture.exe']);
      expect(runtime).toHaveBeenCalledExactlyOnceWith(['fixture.exe']);
    } else {
      expect(fullscreen).toHaveBeenCalledExactlyOnceWith(true);
      expect(io.broadcast).toHaveBeenCalledWith(1, 'store:fullscreen', true);
    }
  });
  it('保留快捷键中的空值不阻止合法新快捷键注册', () => {
    const register = vi.fn<(accelerator: string) => boolean>().mockReturnValue(true);
    registerScreenshotHotkeyIpcHandlers({
      storeDir: 'fixture-store', screenshotHotkeyStoreKey: 'screenshot',
      getCurrentScreenshotHotkey: () => 'Ctrl+A', readScreenshotHotkeyConfig: () => 'Ctrl+B',
      getReservedHotkeys: () => ['', 'Ctrl+C'], registerScreenshotHotkey: register,
    });
    expect(io.handlers.get('screenshot-hotkey:set')?.({}, 'Ctrl+D')).toBe(true);
    expect(register).toHaveBeenCalledExactlyOnceWith('Ctrl+D');
    expect(io.write).toHaveBeenCalledWith(expect.stringContaining('screenshot.json'), '"Ctrl+D"', 'utf-8');
  });
});
