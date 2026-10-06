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
 * @file windowMock.ts
 * @description 窗口模块测试使用的隔离 Electron 窗口事件与调用记录工具。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { vi } from 'vitest';
/**
 * 创建只记录调用的窗口替身，事件使用真实 EventEmitter。
 * @returns 无原生窗口或系统副作用的测试窗口。
 */
export default function mockWindow() {
  const emitter = new EventEmitter();
  const state = { destroyed: false, visible: false };
  const window = Object.assign(emitter, {
    state,
    webContents: Object.assign(new EventEmitter(), {
      send: vi.fn<(channel: string, data?: unknown) => void>(),
      setWindowOpenHandler: vi.fn<(handler: (details: { url: string }) => { action: string }) => void>(),
    }),
    isDestroyed: () => state.destroyed,
    isVisible: () => state.visible,
    show: vi.fn(() => { state.visible = true; }),
    showInactive: vi.fn(() => { state.visible = true; }),
    hide: vi.fn(() => { state.visible = false; emitter.emit('hide'); }),
    focus: vi.fn(),
    center: vi.fn(),
    removeMenu: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    setBounds: vi.fn(),
    setIgnoreMouseEvents: vi.fn(),
    setOpacity: vi.fn(),
    loadFile: vi.fn<(path: string) => Promise<void>>(() => Promise.resolve()),
    loadURL: vi.fn<(url: string) => Promise<void>>(() => Promise.resolve()),
    close: vi.fn(() => { state.destroyed = true; emitter.emit('closed'); }),
    destroy: vi.fn(() => { state.destroyed = true; emitter.emit('closed'); }),
  });
  return window;
}
