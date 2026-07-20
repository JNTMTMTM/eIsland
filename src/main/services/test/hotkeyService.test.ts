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
 * @file hotkeyService.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { registerMock, unregisterMock, appQuitMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
  unregisterMock: vi.fn(),
  appQuitMock: vi.fn(),
}));

vi.mock('electron', () => ({
  app: { quit: appQuitMock },
  BrowserWindow: class {},
  globalShortcut: {
    register: registerMock,
    unregister: unregisterMock,
  },
}));

import { createHotkeyService } from '../hotkeyService';

describe('createHotkeyService', () => {
  const options = {
    getMainWindow: vi.fn(),
    setHiddenByAutoHideProcess: vi.fn(),
    readHideHotkeyConfig: () => 'Ctrl+H',
    readQuitHotkeyConfig: () => 'Ctrl+Q',
    readScreenshotHotkeyConfig: () => 'Ctrl+Shift+S',
    readNextSongHotkeyConfig: () => 'Ctrl+Alt+Right',
    readPlayPauseSongHotkeyConfig: () => 'Ctrl+Alt+P',
    readResetPositionHotkeyConfig: () => 'Ctrl+Alt+R',
    readToggleTrayHotkeyConfig: () => 'Ctrl+Alt+T',
    readShowSettingsWindowHotkeyConfig: () => 'Ctrl+Alt+O',
    readOpenClipboardHistoryHotkeyConfig: () => 'Ctrl+Alt+V',
    readTogglePassthroughHotkeyConfig: () => 'Ctrl+Alt+X',
    readToggleUiLockHotkeyConfig: () => 'Ctrl+Alt+L',
    readAgentVoiceInputHotkeyConfig: () => 'Ctrl+Alt+A',
    readToggleShapeModeHotkeyConfig: () => 'Ctrl+Alt+S',
    onScreenshotHotkey: vi.fn(),
    onNextSongHotkey: vi.fn(),
    onPlayPauseSongHotkey: vi.fn(),
    onResetPositionHotkey: vi.fn(),
    onToggleTrayHotkey: vi.fn(),
    onShowSettingsWindowHotkey: vi.fn(),
    onOpenClipboardHistoryHotkey: vi.fn(),
    onTogglePassthroughHotkey: vi.fn(),
    onToggleUiLockHotkey: vi.fn(),
    onAgentVoiceInputHotkeyHold: vi.fn(),
    onAgentVoiceInputHotkeyRelease: vi.fn(),
    onToggleShapeModeHotkey: vi.fn(),
  };

  beforeEach(() => {
    registerMock.mockReset();
    unregisterMock.mockReset();
    appQuitMock.mockReset();
    options.getMainWindow.mockReset();
    options.setHiddenByAutoHideProcess.mockReset();
    options.onScreenshotHotkey.mockReset();
    options.onOpenClipboardHistoryHotkey.mockReset();
    registerMock.mockReturnValue(true);
  });

  it('registers hide hotkey and toggles window visibility', () => {
    const show = vi.fn();
    const hide = vi.fn();
    const setAlwaysOnTop = vi.fn();
    const win = {
      isDestroyed: () => false,
      isVisible: () => false,
      show,
      hide,
      setAlwaysOnTop,
    };
    options.getMainWindow.mockReturnValue(win as unknown as ReturnType<typeof options.getMainWindow>);

    const service = createHotkeyService(options);
    expect(service.registerHideHotkey('Ctrl+Shift+H')).toBe(true);

    const callback = registerMock.mock.calls[0]?.[1] as (() => void);
    callback();

    expect(options.setHiddenByAutoHideProcess).toHaveBeenCalledWith(false);
    expect(show).toHaveBeenCalledTimes(1);
    expect(setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver');
    expect(hide).not.toHaveBeenCalled();
  });

  it('registers quit hotkey and calls app.quit', () => {
    const service = createHotkeyService(options);
    expect(service.registerQuitHotkey('Ctrl+Shift+Q')).toBe(true);

    const call = registerMock.mock.calls.find(([accelerator]) => accelerator === 'Ctrl+Shift+Q');
    const callback = call?.[1] as (() => void);
    callback();

    expect(appQuitMock).toHaveBeenCalledTimes(1);
  });

  it('suspends and resumes configured hotkeys', () => {
    const service = createHotkeyService(options);

    service.suspendIslandHotkeys();

    expect(unregisterMock).toHaveBeenCalledWith('Ctrl+H');
    expect(unregisterMock).toHaveBeenCalledWith('Ctrl+Q');

    service.resumeIslandHotkeys();

    expect(registerMock).toHaveBeenCalledWith('Ctrl+H', expect.any(Function));
    expect(registerMock).toHaveBeenCalledWith('Ctrl+Q', expect.any(Function));
    expect(registerMock).toHaveBeenCalledWith('Ctrl+Alt+V', expect.any(Function));
  });
});
