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
 * @file windowHandlers.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleMock, onMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
  onMock: vi.fn(),
}));

const { broadcastSettingChangeMock } = vi.hoisted(() => ({
  broadcastSettingChangeMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
    on: onMock,
  },
  screen: {
    getCursorScreenPoint: vi.fn(() => ({ x: 10, y: 20 })),
    getPrimaryDisplay: vi.fn(() => ({ id: 1, workArea: { y: 0, width: 1920, height: 1080 } })),
    getAllDisplays: vi.fn(() => [{ id: 1, workArea: { width: 1920, height: 1080 } }]),
  },
  BrowserWindow: class {},
}));

vi.mock('../../../utils/broadcast', () => ({
  broadcastSettingChange: broadcastSettingChangeMock,
}));

vi.mock('../../../config/storeConfig', () => ({
  readIslandShapeModeConfig: () => 'notch',
  PILL_ISLAND_HEIGHT: 52,
  PILL_EXPANDED_HEIGHT: 72,
  PILL_NOTIFICATION_HEIGHT: 100,
  PILL_LYRICS_HEIGHT: 52,
  PILL_LYRICS_TRANSLATION_HEIGHT: 72,
  PILL_EXPANDED_FULL_HEIGHT: 164,
  PILL_SETTINGS_HEIGHT: 416,
}));

import { registerWindowIpcHandlers, toggleMousePassthroughLock } from '../window';

describe('window ipc handlers', () => {
  const handleHandlers = new Map<string, (...args: unknown[]) => unknown>();
  const onHandlers = new Map<string, (...args: unknown[]) => unknown>();
  const win = {
    isDestroyed: vi.fn(() => false),
    setIgnoreMouseEvents: vi.fn(),
    getBounds: vi.fn(() => ({ x: 100, y: 200, width: 300, height: 100 })),
    setBounds: vi.fn(),
    hide: vi.fn(),
    webContents: { send: vi.fn() },
  };

  beforeEach(() => {
    handleHandlers.clear();
    onHandlers.clear();
    handleMock.mockReset();
    onMock.mockReset();
    broadcastSettingChangeMock.mockReset();
    win.isDestroyed.mockReset();
    win.isDestroyed.mockReturnValue(false);
    win.setIgnoreMouseEvents.mockReset();
    win.getBounds.mockReset();
    win.getBounds.mockReturnValue({ x: 100, y: 200, width: 300, height: 100 });
    win.setBounds.mockReset();
    win.hide.mockReset();
    win.webContents.send.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handleHandlers.set(channel, handler);
    });
    onMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      onHandlers.set(channel, handler);
    });
  });

  it('toggles passthrough lock state', () => {
    toggleMousePassthroughLock(() => win as never);
    expect(win.setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true });

    toggleMousePassthroughLock(() => win as never);
    expect(win.setIgnoreMouseEvents).toHaveBeenLastCalledWith(false);
  });

  it('registers handlers and resizes window on expand/collapse', () => {
    registerWindowIpcHandlers({
      getMainWindow: () => win as never,
      getInitialCenterX: () => 500,
      setHiddenByAutoHideProcess: vi.fn(),
      getIslandPositionOffset: () => ({ x: 1, y: 2 }),
      getIslandDisplaySelection: () => 'primary',
      sanitizeIslandDisplaySelection: () => 'primary',
      setIslandDisplaySelection: vi.fn(),
      sanitizeIslandPositionOffset: () => ({ x: 3, y: 4 }),
      applyIslandPositionOffset: vi.fn(),
      writeIslandPositionOffsetConfig: vi.fn(() => true),
      writeIslandDisplaySelectionConfig: vi.fn(() => true),
      sizes: {
        expandedWidth: 600,
        expandedHeight: 200,
        notificationWidth: 500,
        notificationHeight: 200,
        lyricsWidth: 700,
        lyricsHeight: 240,
        lyricsTranslationHeight: 300,
        expandedFullWidth: 900,
        expandedFullHeight: 400,
        settingsWidth: 1000,
        settingsHeight: 600,
        islandWidth: 300,
        islandHeight: 100,
      },
    });

    onHandlers.get('window:expand')?.();
    onHandlers.get('window:collapse')?.();
    expect(win.setBounds).toHaveBeenCalledTimes(2);

    expect(handleHandlers.get('window:get-mouse-position')?.()).toEqual({ x: 10, y: 20 });
    expect(handleHandlers.get('window:get-bounds')?.()).toEqual({ x: 100, y: 200, width: 300, height: 100 });
    expect(handleHandlers.get('window:island-displays:list')?.()).toEqual([{ id: '1', width: 1920, height: 1080, isPrimary: true }]);
  });

  it('broadcasts island display and position updates', () => {
    const setIslandDisplaySelection = vi.fn();
    const applyIslandPositionOffset = vi.fn();

    registerWindowIpcHandlers({
      getMainWindow: () => win as never,
      getInitialCenterX: () => 500,
      setHiddenByAutoHideProcess: vi.fn(),
      getIslandPositionOffset: () => ({ x: 1, y: 2 }),
      getIslandDisplaySelection: () => 'primary',
      sanitizeIslandDisplaySelection: () => 'display-2',
      setIslandDisplaySelection,
      sanitizeIslandPositionOffset: () => ({ x: 8, y: 9 }),
      applyIslandPositionOffset,
      writeIslandPositionOffsetConfig: vi.fn(() => true),
      writeIslandDisplaySelectionConfig: vi.fn(() => true),
      sizes: {
        expandedWidth: 600,
        expandedHeight: 200,
        notificationWidth: 500,
        notificationHeight: 200,
        lyricsWidth: 700,
        lyricsHeight: 240,
        lyricsTranslationHeight: 300,
        expandedFullWidth: 900,
        expandedFullHeight: 400,
        settingsWidth: 1000,
        settingsHeight: 600,
        islandWidth: 300,
        islandHeight: 100,
      },
    });

    const setDisplay = handleHandlers.get('window:island-display:set');
    const setPosition = handleHandlers.get('window:island-position:set');

    expect(setDisplay?.({ sender: { id: 1 } }, 'x')).toBe(true);
    expect(setPosition?.({ sender: { id: 2 } }, { x: 1 })).toBe(true);

    expect(setIslandDisplaySelection).toHaveBeenCalledWith('display-2');
    expect(applyIslandPositionOffset).toHaveBeenCalledWith({ x: 8, y: 9 });
    expect(broadcastSettingChangeMock).toHaveBeenCalledWith(1, 'island:display', 'display-2');
    expect(broadcastSettingChangeMock).toHaveBeenCalledWith(2, 'island:position', { x: 8, y: 9 });
  });
});
