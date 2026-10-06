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
 * @file autoHidePollingSupplement.test.ts
 * @description 自动隐藏定时检测错误隔离及轮询恢复测试。
 * @author 鸡哥
 */

import { afterEach, expect, it, vi } from 'vitest';
import { createAutoHideWatcher } from '../autoHideWatcher';
import type { BrowserWindow } from 'electron';
vi.mock('electron', () => ({}));
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
it('定时轮询失败被隔离，下一次成功检测仍隐藏窗口', async () => {
  vi.useFakeTimers();
  const fullscreen = vi.fn<() => Promise<boolean>>().mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('native scan failed'))
    .mockResolvedValueOnce(true);
  const hide = vi.fn();
  const window = { hide, isDestroyed: () => false, isVisible: () => true };
  const watcher = createAutoHideWatcher({ getMainWindow: () => window as unknown as BrowserWindow, defaultWindowTitleList: [], defaultAutoHideFullscreenWindows: true, isAnyFullscreenWindow: fullscreen, pollIntervalMs: 50 });
  watcher.start();
  await vi.advanceTimersByTimeAsync(50);
  expect(hide).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(50);
  expect(hide).toHaveBeenCalledOnce();
  expect(watcher.getHiddenByAutoHideProcess()).toBe(true);
  watcher.stop();
  expect(vi.getTimerCount()).toBe(0);
});
