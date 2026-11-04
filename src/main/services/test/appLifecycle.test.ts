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
 * @file appLifecycle.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { appOnMock } = vi.hoisted(() => ({
  appOnMock: vi.fn(),
}));

vi.mock('electron', () => ({
  app: { on: appOnMock },
  BrowserWindow: class {},
}));

import { registerAppLifecycleHandlers } from '../appLifecycle';

describe('registerAppLifecycleHandlers', () => {
  type MainWindow = Exclude<ReturnType<Parameters<typeof registerAppLifecycleHandlers>[0]['getMainWindow']>, null>;
  const handlers = new Map<string, () => void>();

  beforeEach(() => {
    handlers.clear();
    appOnMock.mockReset();
    appOnMock.mockImplementation((event: string, handler: () => void) => {
      handlers.set(event, handler);
    });
  });

  it('restores and focuses minimized main window on second-instance', () => {
    const restore = vi.fn();
    const focus = vi.fn();

    registerAppLifecycleHandlers({
      getMainWindow: () => ({
        isDestroyed: () => false,
        isMinimized: () => true,
        restore,
        focus,
      } as unknown as MainWindow),
      onWillQuit: vi.fn(),
      onWindowAllClosed: vi.fn(),
    });

    handlers.get('second-instance')?.();

    expect(restore).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('ignores second-instance when window is missing or destroyed', () => {
    registerAppLifecycleHandlers({
      getMainWindow: () => null,
      onWillQuit: vi.fn(),
      onWindowAllClosed: vi.fn(),
    });

    expect(() => handlers.get('second-instance')?.()).not.toThrow();
  });

  it('delegates will-quit and window-all-closed callbacks', () => {
    const onWillQuit = vi.fn();
    const onWindowAllClosed = vi.fn();

    registerAppLifecycleHandlers({
      getMainWindow: () => null,
      onWillQuit,
      onWindowAllClosed,
    });

    handlers.get('will-quit')?.();
    handlers.get('window-all-closed')?.();

    expect(onWillQuit).toHaveBeenCalledTimes(1);
    expect(onWindowAllClosed).toHaveBeenCalledTimes(1);
  });
});
