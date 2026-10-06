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
 * @file lifecycleUpdaterSupplement.test.ts
 * @description 生命周期非最小化窗口、帧率配置和更新器事件错误隔离边界测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAppLifecycleHandlers } from '../appLifecycle';
import { applyChromiumPerformanceFlags } from '../chromiumFlags';
import { initUpdaterService } from '../updaterService';
import type { AppUpdater } from 'electron-updater';
import type { App, BrowserWindow } from 'electron';
const io = vi.hoisted(() => ({ handlers: new Map<string, () => void>(), windows: vi.fn(), frameRate: vi.fn<() => boolean>() }));
vi.mock('electron', () => ({ app: { on: (event: string, handler: () => void) => io.handlers.set(event, handler) }, BrowserWindow: { getAllWindows: io.windows } }));
vi.mock('../../config/storeConfig', () => ({ readDisableFrameRateLimitConfig: io.frameRate }));
class UpdaterFixture extends EventEmitter {
  autoDownload = true;

  autoInstallOnAppQuit = true;

  allowPrerelease = true;

  forceDevUpdateConfig = false;

  logger: unknown = null;
}
const win = { isDestroyed: vi.fn<() => boolean>(), isMinimized: vi.fn<() => boolean>(), restore: vi.fn(), focus: vi.fn(), webContents: { send: vi.fn() } };
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); io.handlers.clear(); io.windows.mockReturnValue([win]);
  win.isDestroyed.mockReturnValue(false); win.isMinimized.mockReturnValue(false);
  vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });
/**
 * 初始化真实更新服务。
 * @param options - 是否自动提示的配置
 * @param options.shouldAutoPromptUpdate - 下载更新前是否请求 Renderer 预检查
 * @returns 模拟外部更新器
 */
function init(options: { shouldAutoPromptUpdate?: () => boolean } = {}): UpdaterFixture {
  const updater = new UpdaterFixture();
  initUpdaterService({ updater: updater as unknown as AppUpdater, getMainWindow: () => win as unknown as BrowserWindow,
    getAppPath: () => 'C:/fixture', isPackaged: () => true, ...options });
  return updater;
}
describe('应用生命周期与帧率开关', () => {
  it('未最小化窗口仅 focus，已销毁窗口无动作', () => {
    registerAppLifecycleHandlers({ getMainWindow: () => win as unknown as BrowserWindow, onWillQuit: vi.fn(), onWindowAllClosed: vi.fn() });
    io.handlers.get('second-instance')?.(); expect(win.focus).toHaveBeenCalledOnce(); expect(win.restore).not.toHaveBeenCalled();
    win.isDestroyed.mockReturnValue(true); io.handlers.get('second-instance')?.(); expect(win.focus).toHaveBeenCalledOnce();
  });
  it('允许取消帧率限制时只额外写入对应 Chromium 开关', () => {
    io.frameRate.mockReturnValue(true); const appendSwitch = vi.fn();
    applyChromiumPerformanceFlags({ commandLine: { appendSwitch } } as unknown as App);
    expect(appendSwitch).toHaveBeenCalledWith('disable-frame-rate-limit');
    expect(appendSwitch.mock.calls.filter(([name]) => name === 'disable-frame-rate-limit')).toHaveLength(1);
  });
});
describe('更新器事件与 Renderer 失败隔离', () => {
  it('记录检查及错误事件，传播未更新、下载完成与空发布说明', () => {
    const updater = init();
    updater.emit('checking-for-update'); updater.emit('error', new Error('upstream failed'));
    updater.emit('update-not-available', { version: '1.2.3' }); updater.emit('update-downloaded', { version: '2.0.0' });
    updater.emit('update-available', { version: '2.0.0', releaseNotes: [{ version: '2.0.0', note: 'structured' }] });
    expect(console.error).toHaveBeenCalledWith('[Updater] error:', 'upstream failed');
    expect(win.webContents.send).toHaveBeenCalledWith('updater:update-not-available', { version: '1.2.3' });
    expect(win.webContents.send).toHaveBeenCalledWith('updater:update-downloaded', { version: '2.0.0' });
    expect(win.webContents.send).toHaveBeenCalledWith('updater:update-available', { version: '2.0.0', releaseNotes: '' });
  });
  it.each([new Error('renderer failed'), 'renderer failed', new Error('Object has been destroyed')])('发送失败 %s 不终止更新事件', (failure) => {
    const updater = init();
    win.webContents.send.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- 叶窗口边界验证错误文本转换兼容任意异常值。
      throw failure;
    });
    expect(() => updater.emit('update-downloaded', { version: '2.0.0' })).not.toThrow();
    if (failure instanceof Error && failure.message.includes('destroyed')) expect(console.error).not.toHaveBeenCalled();
    else expect(console.error).toHaveBeenCalledWith('[Updater] renderer emit error:', failure);
  });
  it('省略自动提示策略默认请求 Renderer 预检查，使用五秒延迟', () => {
    init(); vi.advanceTimersByTime(4999); expect(win.webContents.send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(win.webContents.send).toHaveBeenCalledWith('updater:startup-auto-check-request', { requestedAt: Date.now() });
  });
});
