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
 * @file mainWindow.test.ts
 * @description 验证主窗口首次展开的水平位置、启动裁剪和逻辑鼠标边界。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserWindow, Rectangle } from 'electron';

const mocks = vi.hoisted(() => ({
  createWindow: vi.fn(),
  on: vi.fn(),
  handle: vi.fn(),
  shapeMode: 'notch',
}));

vi.mock('electron', () => ({
  BrowserWindow: mocks.createWindow,
  ipcMain: { on: mocks.on, handle: mocks.handle },
  screen: {
    getPrimaryDisplay: () => ({ id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1080 } }),
    getAllDisplays: () => [{ id: 2, workArea: { x: -1920, y: 80, width: 1920, height: 1080 } }],
    getCursorScreenPoint: () => ({ x: 960, y: 20 }),
  },
  shell: { openExternal: vi.fn() },
}));
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }));
vi.mock('../../utils/broadcast', () => ({ broadcastSettingChange: vi.fn() }));
vi.mock('../../config/storeConfig', () => ({
  readIslandShapeModeConfig: () => mocks.shapeMode,
  PILL_ISLAND_HEIGHT: 52,
  PILL_EXPANDED_HEIGHT: 72,
  PILL_NOTIFICATION_HEIGHT: 100,
  PILL_LYRICS_HEIGHT: 52,
  PILL_LYRICS_TRANSLATION_HEIGHT: 72,
  PILL_EXPANDED_FULL_HEIGHT: 164,
  PILL_SETTINGS_HEIGHT: 416,
}));

import { createMainWindowService } from '../mainWindow';
import { registerWindowIpcHandlers } from '../../ipc/window/window';

describe('main window first expansion', () => {
  let bounds: Rectangle;
  let mainWindow: BrowserWindow | null;
  let displaySelection: string;
  let offset: { x: number; y: number };
  const events = new Map<string, () => void | Promise<void>>();
  const ipcEvents = new Map<string, (...args: unknown[]) => void>();
  const ipcHandlers = new Map<string, () => unknown>();
  const win = {
    isDestroyed: () => false,
    getBounds: () => ({ ...bounds }),
    setBounds: vi.fn((next: Rectangle) => { bounds = { ...next }; }),
    setShape: vi.fn(),
    setIgnoreMouseEvents: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    show: vi.fn(),
    on: (event: string, callback: () => void | Promise<void>) => { events.set(event, callback); },
    loadFile: vi.fn(),
    webContents: { send: vi.fn(), invalidate: vi.fn(), setWindowOpenHandler: vi.fn() },
  };
  const sizes = {
    islandWidth: 260, islandHeight: 42, backingWidth: 860,
    expandedWidth: 500, expandedHeight: 62,
    notificationWidth: 500, notificationHeight: 90,
    lyricsWidth: 500, lyricsHeight: 42, lyricsTranslationHeight: 62,
    expandedFullWidth: 860, expandedFullHeight: 154,
    settingsWidth: 860, settingsHeight: 406,
  };

  /**
   * 按实际启动顺序注册 IPC、创建窗口并等待首次显示。
   * @returns 主窗口服务，供位置变更断言使用。
   */
  async function startWindow(): Promise<ReturnType<typeof createMainWindowService>> {
    const service = createMainWindowService({
      getMainWindow: () => mainWindow,
      setMainWindow: (value) => { mainWindow = value; },
      getIslandPositionOffset: () => offset,
      getIslandDisplaySelection: () => displaySelection,
      setIslandPositionOffset: (value) => { offset = value; },
      sanitizeIslandPositionOffset: (value) => ({ x: value.x ?? 0, y: value.y ?? 0 }),
      sizes,
    });
    registerWindowIpcHandlers({
      getMainWindow: () => mainWindow,
      getInitialCenterX: service.getInitialCenterX,
      setHiddenByAutoHideProcess: vi.fn(),
      getIslandPositionOffset: () => offset,
      getIslandDisplaySelection: () => displaySelection,
      sanitizeIslandDisplaySelection: () => displaySelection,
      setIslandDisplaySelection: vi.fn(),
      sanitizeIslandPositionOffset: (value) => ({ x: value.x ?? 0, y: value.y ?? 0 }),
      applyIslandPositionOffset: service.applyIslandPositionOffset,
      writeIslandPositionOffsetConfig: () => true,
      writeIslandDisplaySelectionConfig: () => true,
      sizes,
    });
    service.createWindow();
    await events.get('ready-to-show')?.();
    return service;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('ELECTRON_RENDERER_URL', undefined);
    vi.clearAllMocks();
    mocks.shapeMode = 'notch';
    displaySelection = 'primary';
    offset = { x: 0, y: 0 };
    mainWindow = null;
    events.clear();
    ipcEvents.clear();
    ipcHandlers.clear();
    mocks.createWindow.mockImplementation(function (initial: Rectangle) {
      bounds = { x: initial.x, y: initial.y, width: initial.width, height: initial.height };
      return win;
    });
    mocks.on.mockImplementation((channel: string, handler: (...args: unknown[]) => void) => {
      ipcEvents.set(channel, handler);
    });
    mocks.handle.mockImplementation((channel: string, handler: () => unknown) => {
      ipcHandlers.set(channel, handler);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it.each(['notch', 'pill'])('keeps the first idle frame centered during %s hover expansion', async (mode) => {
    mocks.shapeMode = mode;
    await startWindow();
    const initial = { ...bounds };
    const idleCenterInFrame = initial.width / 2;

    ipcEvents.get('window:expand')?.();

    // Windows 在新尺寸首帧到达前复用旧画面；旧帧中心也必须留在原屏幕坐标。
    expect(bounds.x + idleCenterInFrame).toBe(initial.x + initial.width / 2);
    expect(bounds.width).toBe(initial.width);
    expect(ipcHandlers.get('window:get-bounds')?.()).toEqual({
      x: 710, y: mode === 'pill' ? 46 : 0, width: 500, height: mode === 'pill' ? 72 : 62,
    });

    ipcEvents.get('window:collapse')?.({}, 700);
    vi.advanceTimersByTime(700);
    ipcEvents.get('window:expand')?.();
    expect(bounds.x).toBe(initial.x);
    expect(bounds.width).toBe(initial.width);
  });

  it.each(['notch', 'pill'])('clips the backing window to the idle hit area before showing in %s mode', async (mode) => {
    mocks.shapeMode = mode;
    await startWindow();
    const height = mode === 'pill' ? 52 : 42;
    const idleBounds = { x: 830, y: mode === 'pill' ? 46 : 0, width: 260, height };

    expect(bounds.width).toBe(860);
    expect(win.setShape).toHaveBeenLastCalledWith([{ x: 300, y: 0, width: 260, height }]);
    expect(win.setShape.mock.invocationCallOrder[0]).toBeLessThan(win.show.mock.invocationCallOrder[0]);
    expect(ipcHandlers.get('window:get-bounds')?.()).toEqual(idleBounds);
    expect(ipcHandlers.get('window:get-mouse-window-state')?.()).toEqual({
      mousePosition: { x: 960, y: 20 }, bounds: idleBounds,
    });
  });

  it('preserves the chosen display and position offset on first expansion', async () => {
    displaySelection = '2';
    offset = { x: 35, y: 20 };
    const service = await startWindow();
    const initial = { ...bounds };
    expect(service.getInitialCenterX()).toBe(-925);
    ipcEvents.get('window:expand')?.();
    expect(bounds.x).toBe(initial.x);
    expect(ipcHandlers.get('window:get-bounds')?.()).toEqual({ x: -1175, y: 80, width: 500, height: 62 });
  });

  it('keeps the dragged pill center when expanding for the first time', async () => {
    mocks.shapeMode = 'pill';
    await startWindow();
    ipcEvents.get('window:move-delta')?.({}, 100, 60);
    const dragged = { ...bounds };
    ipcEvents.get('window:expand')?.();
    expect(bounds.x).toBe(dragged.x);
    expect(bounds.y).toBe(dragged.y);
    expect(ipcHandlers.get('window:get-bounds')?.()).toEqual({ x: 810, y: 106, width: 500, height: 72 });
  });

  it('does not expose the backing width during a delayed first resize', async () => {
    await startWindow();
    const initial = { ...bounds };
    ipcEvents.get('window:expand')?.({}, 700);
    expect(win.setShape).toHaveBeenLastCalledWith([{ x: 180, y: 0, width: 500, height: 62 }]);
    expect(bounds.x).toBe(initial.x);
    vi.advanceTimersByTime(700);
    expect(bounds.x).toBe(initial.x);
    expect(ipcHandlers.get('window:get-bounds')?.()).toEqual({ x: 710, y: 0, width: 500, height: 62 });
  });

  it.each(['window:expand-full', 'window:expand-settings'])('also reserves width for the first %s transition', async (channel) => {
    await startWindow();
    const initial = { ...bounds };
    ipcEvents.get(channel)?.();
    expect(bounds.x).toBe(initial.x);
    expect(bounds.width).toBe(initial.width);
    expect(win.setShape).toHaveBeenLastCalledWith([{
      x: 0, y: 0, width: 860, height: channel === 'window:expand-full' ? 154 : 406,
    }]);
  });
});
