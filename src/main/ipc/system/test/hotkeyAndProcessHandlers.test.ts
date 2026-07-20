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
 * @file hotkeyAndProcessHandlers.test.ts
 * @description hotkey 与 hide-process IPC handlers 单元测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
}));

const { writeFileSyncMock } = vi.hoisted(() => ({
  writeFileSyncMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
  },
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

vi.mock('fs', () => ({
  writeFileSync: writeFileSyncMock,
}));

import { registerHotkeyIpcHandlers } from '../hotkey';
import { registerScreenshotHotkeyIpcHandlers } from '../screenshotHotkey';
import { registerHideProcessIpcHandlers } from '../hideProcess';

describe('system hotkey and hide-process ipc handlers', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

  const createHotkeyOptions = () => {
    const registerHideHotkey = vi.fn(() => true);
    const registerQuitHotkey = vi.fn(() => true);
    const registerNextSongHotkey = vi.fn(() => true);
    const registerPlayPauseSongHotkey = vi.fn(() => true);
    const registerResetPositionHotkey = vi.fn(() => true);
    const registerToggleTrayHotkey = vi.fn(() => true);
    const registerShowSettingsWindowHotkey = vi.fn(() => true);
    const registerOpenClipboardHistoryHotkey = vi.fn(() => true);
    const registerTogglePassthroughHotkey = vi.fn(() => true);
    const registerToggleUiLockHotkey = vi.fn(() => true);
    const registerAgentVoiceInputHotkey = vi.fn(() => true);
    const registerToggleShapeModeHotkey = vi.fn(() => true);
    const suspendIslandHotkeys = vi.fn();
    const resumeIslandHotkeys = vi.fn();

    return {
      options: {
        storeDir: 'C:/store',
        hideHotkeyStoreKey: 'hide',
        quitHotkeyStoreKey: 'quit',
        nextSongHotkeyStoreKey: 'next',
        playPauseSongHotkeyStoreKey: 'pp',
        resetPositionHotkeyStoreKey: 'reset',
        toggleTrayHotkeyStoreKey: 'tray',
        showSettingsWindowHotkeyStoreKey: 'settings',
        openClipboardHistoryHotkeyStoreKey: 'clipboard',
        togglePassthroughHotkeyStoreKey: 'passthrough',
        toggleUiLockHotkeyStoreKey: 'uilock',
        agentVoiceInputHotkeyStoreKey: 'agentVoice',
        toggleShapeModeHotkeyStoreKey: 'shapeMode',
        getCurrentHideHotkey: () => 'Ctrl+Alt+H',
        getCurrentQuitHotkey: () => 'Ctrl+Alt+Q',
        getCurrentScreenshotHotkey: () => 'Ctrl+Shift+S',
        getCurrentNextSongHotkey: () => 'Ctrl+Alt+N',
        getCurrentPlayPauseSongHotkey: () => 'Ctrl+Alt+P',
        getCurrentResetPositionHotkey: () => 'Ctrl+Alt+R',
        getCurrentToggleTrayHotkey: () => 'Ctrl+Alt+T',
        getCurrentShowSettingsWindowHotkey: () => 'Ctrl+Alt+W',
        getCurrentOpenClipboardHistoryHotkey: () => 'Ctrl+Alt+C',
        getCurrentTogglePassthroughHotkey: () => 'Ctrl+Alt+M',
        getCurrentToggleUiLockHotkey: () => 'Ctrl+Alt+L',
        getCurrentAgentVoiceInputHotkey: () => 'Ctrl+Alt+V',
        getCurrentToggleShapeModeHotkey: () => '',
        readToggleShapeModeHotkeyConfig: () => '',
        readHideHotkeyConfig: () => 'Alt+1',
        readQuitHotkeyConfig: () => 'Alt+2',
        readScreenshotHotkeyConfig: () => 'Alt+3',
        readNextSongHotkeyConfig: () => 'Alt+4',
        readPlayPauseSongHotkeyConfig: () => 'Alt+5',
        readResetPositionHotkeyConfig: () => 'Alt+6',
        readToggleTrayHotkeyConfig: () => 'Alt+7',
        readShowSettingsWindowHotkeyConfig: () => 'Alt+8',
        readOpenClipboardHistoryHotkeyConfig: () => 'Alt+9',
        readTogglePassthroughHotkeyConfig: () => 'Alt+0',
        readToggleUiLockHotkeyConfig: () => 'Ctrl+Alt+L',
        readAgentVoiceInputHotkeyConfig: () => 'Ctrl+Alt+V',
        registerHideHotkey,
        registerQuitHotkey,
        registerNextSongHotkey,
        registerPlayPauseSongHotkey,
        registerResetPositionHotkey,
        registerToggleTrayHotkey,
        registerShowSettingsWindowHotkey,
        registerOpenClipboardHistoryHotkey,
        registerTogglePassthroughHotkey,
        registerToggleUiLockHotkey,
        registerAgentVoiceInputHotkey,
        registerToggleShapeModeHotkey,
        suspendIslandHotkeys,
        resumeIslandHotkeys,
      },
      refs: {
        registerHideHotkey,
        registerQuitHotkey,
        registerNextSongHotkey,
        registerPlayPauseSongHotkey,
        registerResetPositionHotkey,
        registerToggleTrayHotkey,
        registerShowSettingsWindowHotkey,
        registerOpenClipboardHistoryHotkey,
        registerTogglePassthroughHotkey,
        registerToggleUiLockHotkey,
        registerAgentVoiceInputHotkey,
        registerToggleShapeModeHotkey,
        suspendIslandHotkeys,
        resumeIslandHotkeys,
      },
    };
  };

  beforeEach(() => {
    handlers.clear();
    handleMock.mockReset();
    writeFileSyncMock.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    });
  });

  it('registers hotkey handlers and enforces conflict checks', () => {
    const { options, refs } = createHotkeyOptions();
    registerHotkeyIpcHandlers(options);

    expect(handlers.get('hotkey:get')?.({})).toBe('Ctrl+Alt+H');

    const setHide = handlers.get('hotkey:set');
    expect(setHide?.({}, 'Ctrl+Alt+Q')).toBe(false);
    expect(refs.registerHideHotkey).not.toHaveBeenCalled();

    expect(setHide?.({}, 'Ctrl+Shift+H')).toBe(true);
    expect(refs.registerHideHotkey).toHaveBeenCalledWith('Ctrl+Shift+H');
    expect(writeFileSyncMock).toHaveBeenCalled();

    const setUiLock = handlers.get('toggle-ui-lock-hotkey:set');
    expect(setUiLock?.({}, 'Ctrl+Alt+M')).toBe(false);
    expect(refs.registerToggleUiLockHotkey).not.toHaveBeenCalled();

    const setAgentVoice = handlers.get('agent-voice-input-hotkey:set');
    expect(setAgentVoice?.({}, 'Ctrl+Shift+V')).toBe(true);
    expect(refs.registerAgentVoiceInputHotkey).toHaveBeenCalledWith('Ctrl+Shift+V');

    expect(handlers.get('hotkey:suspend')?.({})).toBe(true);
    expect(handlers.get('hotkey:resume')?.({})).toBe(true);
    expect(refs.suspendIslandHotkeys).toHaveBeenCalledTimes(1);
    expect(refs.resumeIslandHotkeys).toHaveBeenCalledTimes(1);
  });

  it('handles additional hotkey channels set/get and non-persist on register failure', () => {
    const { options, refs } = createHotkeyOptions();
    registerHotkeyIpcHandlers(options);

    expect(handlers.get('open-clipboard-history-hotkey:get')?.({})).toBe('Ctrl+Alt+C');
    expect(handlers.get('toggle-tray-hotkey:get')?.({})).toBe('Ctrl+Alt+T');

    const setClipboard = handlers.get('open-clipboard-history-hotkey:set');
    expect(setClipboard?.({}, 'Ctrl+Alt+H')).toBe(false);
    expect(refs.registerOpenClipboardHistoryHotkey).not.toHaveBeenCalled();

    expect(setClipboard?.({}, 'Ctrl+Shift+C')).toBe(true);
    expect(refs.registerOpenClipboardHistoryHotkey).toHaveBeenCalledWith('Ctrl+Shift+C');

    refs.registerToggleTrayHotkey.mockReturnValueOnce(false);
    const writesBefore = writeFileSyncMock.mock.calls.length;
    const setTray = handlers.get('toggle-tray-hotkey:set');
    expect(setTray?.({}, 'Ctrl+Shift+T')).toBe(false);
    expect(refs.registerToggleTrayHotkey).toHaveBeenCalledWith('Ctrl+Shift+T');
    expect(writeFileSyncMock.mock.calls.length).toBe(writesBefore);

    const setQuit = handlers.get('quit-hotkey:set');
    expect(setQuit?.({}, 'Ctrl+Shift+Q')).toBe(true);
    expect(refs.registerQuitHotkey).toHaveBeenCalledWith('Ctrl+Shift+Q');
  });

  it('handles screenshot hotkey get/set with reserved guard', () => {
    const registerScreenshotHotkey = vi.fn(() => true);
    registerScreenshotHotkeyIpcHandlers({
      storeDir: 'C:/store',
      screenshotHotkeyStoreKey: 'screenshot',
      getCurrentScreenshotHotkey: () => '',
      readScreenshotHotkeyConfig: () => 'Ctrl+Shift+S',
      getReservedHotkeys: () => ['Ctrl+Alt+Q', 'Ctrl+Shift+S'],
      registerScreenshotHotkey,
    });

    expect(handlers.get('screenshot-hotkey:get')?.({})).toBe('Ctrl+Shift+S');

    const setShot = handlers.get('screenshot-hotkey:set');
    expect(setShot?.({}, 'Ctrl+Alt+Q')).toBe(false);
    expect(registerScreenshotHotkey).not.toHaveBeenCalled();

    expect(setShot?.({}, 'Ctrl+Shift+A')).toBe(true);
    expect(registerScreenshotHotkey).toHaveBeenCalledWith('Ctrl+Shift+A');
    expect(writeFileSyncMock).toHaveBeenCalled();

    writeFileSyncMock.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    expect(setShot?.({}, 'Ctrl+Shift+B')).toBe(true);
  });

  it('prefers current screenshot hotkey over stored config', () => {
    registerScreenshotHotkeyIpcHandlers({
      storeDir: 'C:/store',
      screenshotHotkeyStoreKey: 'screenshot',
      getCurrentScreenshotHotkey: () => 'Ctrl+Alt+S',
      readScreenshotHotkeyConfig: () => 'Ctrl+Shift+S',
      getReservedHotkeys: () => [],
      registerScreenshotHotkey: vi.fn(() => true),
    });

    expect(handlers.get('screenshot-hotkey:get')?.({})).toBe('Ctrl+Alt+S');
  });

  it('handles hide-process list read/set success and error branches', async () => {
    const setConfiguredHideProcessList = vi.fn();
    const setAutoHideProcessList = vi.fn();
    const setAutoHideFullscreenWindows = vi.fn();
    const sanitizeProcessNameList = vi.fn((list: string[]) => list.filter(Boolean).map((x) => x.toLowerCase()));
    const checkAutoHideProcessList = vi.fn(async () => {});

    registerHideProcessIpcHandlers({
      storeDir: 'C:/store',
      hideProcessListStoreKey: 'hideList',
      autoHideFullscreenWindowsStoreKey: 'autoHideFullscreen',
      getConfiguredHideProcessList: () => ['wechat.exe'],
      setConfiguredHideProcessList,
      setAutoHideProcessList,
      getAutoHideFullscreenWindows: () => false,
      setAutoHideFullscreenWindows,
      sanitizeProcessNameList,
      checkAutoHideProcessList,
    });

    expect(handlers.get('hide-process-list:get')?.({})).toEqual(['wechat.exe']);

    const setList = handlers.get('hide-process-list:set');
    await expect(setList?.({}, ['A.EXE', '', 'B.EXE'])).resolves.toBe(true);
    expect(sanitizeProcessNameList).toHaveBeenCalledWith(['A.EXE', '', 'B.EXE']);
    expect(setAutoHideProcessList).toHaveBeenCalledWith(['a.exe', 'b.exe']);
    expect(setConfiguredHideProcessList).toHaveBeenCalledWith(['a.exe', 'b.exe']);
    expect(writeFileSyncMock).toHaveBeenCalled();
    if (process.platform === 'win32') {
      expect(checkAutoHideProcessList).toHaveBeenCalled();
    }

    writeFileSyncMock.mockImplementationOnce(() => {
      throw new Error('persist failed');
    });
    await expect(setList?.({}, ['X.EXE'])).resolves.toBe(false);

    expect(handlers.get('hide-process-list:auto-hide-fullscreen:get')?.({})).toBe(false);
    const setFullscreen = handlers.get('hide-process-list:auto-hide-fullscreen:set');
    await expect(setFullscreen?.({ sender: { id: 1 } }, true)).resolves.toBe(true);
    expect(setAutoHideFullscreenWindows).toHaveBeenCalledWith(true);
  });

  it('normalizes invalid hide-process payload to empty list', async () => {
    const sanitizeProcessNameList = vi.fn(() => []);

    registerHideProcessIpcHandlers({
      storeDir: 'C:/store',
      hideProcessListStoreKey: 'hideList',
      autoHideFullscreenWindowsStoreKey: 'autoHideFullscreen',
      getConfiguredHideProcessList: () => [],
      setConfiguredHideProcessList: vi.fn(),
      setAutoHideProcessList: vi.fn(),
      getAutoHideFullscreenWindows: () => false,
      setAutoHideFullscreenWindows: vi.fn(),
      sanitizeProcessNameList,
      checkAutoHideProcessList: vi.fn(async () => {}),
    });

    const setList = handlers.get('hide-process-list:set');
    await expect(setList?.({}, null as never)).resolves.toBe(true);
    expect(sanitizeProcessNameList).toHaveBeenCalledWith([]);
  });
});
