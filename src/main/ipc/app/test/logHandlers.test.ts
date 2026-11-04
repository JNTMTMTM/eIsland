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
 * @file logHandlers.test.ts
 * @description log IPC handlers 单元测试。
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { onMock } = vi.hoisted(() => ({
  onMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    on: onMock,
  },
}));

import { registerLogIpcHandlers } from '../log';

describe('registerLogIpcHandlers', () => {
  const onHandlers = new Map<string, (...args: unknown[]) => unknown>();

  beforeEach(() => {
    onHandlers.clear();
    onMock.mockReset();
    onMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      onHandlers.set(channel, handler);
    });
  });

  it('maps warn and error levels to main log writer', () => {
    const writeMainLog = vi.fn();
    registerLogIpcHandlers({ writeMainLog });

    const handler = onHandlers.get('log:write');
    handler?.({}, 'warn', 'warn-message');
    handler?.({}, 'error', 'error-message');

    expect(writeMainLog).toHaveBeenNthCalledWith(1, 'warn', 'warn-message');
    expect(writeMainLog).toHaveBeenNthCalledWith(2, 'error', 'error-message');
  });

  it('falls back unknown level to info', () => {
    const writeMainLog = vi.fn();
    registerLogIpcHandlers({ writeMainLog });

    const handler = onHandlers.get('log:write');
    handler?.({}, 'debug', 'debug-message');

    expect(writeMainLog).toHaveBeenCalledWith('info', 'debug-message');
  });
});
