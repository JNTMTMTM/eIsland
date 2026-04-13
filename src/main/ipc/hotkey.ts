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
 * @file hotkey.ts
 * @description 快捷键相关 IPC 处理模块
 * @description 处理各类快捷键的获取、设置和挂起/恢复的 IPC 请求
 * @author 鸡哥
 */

import { ipcMain } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';

interface RegisterHotkeyIpcHandlersOptions {
  storeDir: string;
  hideHotkeyStoreKey: string;
  quitHotkeyStoreKey: string;
  nextSongHotkeyStoreKey: string;
  playPauseSongHotkeyStoreKey: string;
  resetPositionHotkeyStoreKey: string;
  getCurrentHideHotkey: () => string;
  getCurrentQuitHotkey: () => string;
  getCurrentScreenshotHotkey: () => string;
  getCurrentNextSongHotkey: () => string;
  getCurrentPlayPauseSongHotkey: () => string;
  getCurrentResetPositionHotkey: () => string;
  readHideHotkeyConfig: () => string;
  readQuitHotkeyConfig: () => string;
  readScreenshotHotkeyConfig: () => string;
  readNextSongHotkeyConfig: () => string;
  readPlayPauseSongHotkeyConfig: () => string;
  readResetPositionHotkeyConfig: () => string;
  registerHideHotkey: (accelerator: string) => boolean;
  registerQuitHotkey: (accelerator: string) => boolean;
  registerNextSongHotkey: (accelerator: string) => boolean;
  registerPlayPauseSongHotkey: (accelerator: string) => boolean;
  registerResetPositionHotkey: (accelerator: string) => boolean;
  suspendIslandHotkeys: () => void;
  resumeIslandHotkeys: () => void;
}

function currentOrStored(current: () => string, stored: () => string): string {
  return current() || stored();
}

function persistHotkey(storeDir: string, key: string, accelerator: string, label: string): void {
  const filePath = join(storeDir, `${key}.json`);
  try {
    writeFileSync(filePath, JSON.stringify(accelerator, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[${label}] persist error:`, err);
  }
}

/**
 * 注册快捷键相关 IPC 处理器
 * @description 注册各类快捷键（隐藏、退出、截图、切歌等）的 IPC 事件处理器
 * @param options - 配置选项，包含存储目录、键名和热键服务函数
 */
export function registerHotkeyIpcHandlers(options: RegisterHotkeyIpcHandlersOptions): void {
  ipcMain.handle('hotkey:get', () => {
    return currentOrStored(options.getCurrentHideHotkey, options.readHideHotkeyConfig);
  });

  ipcMain.handle('hotkey:set', (_event, accelerator: string) => {
    const currentQuit = currentOrStored(options.getCurrentQuitHotkey, options.readQuitHotkeyConfig);
    const currentSS = currentOrStored(options.getCurrentScreenshotHotkey, options.readScreenshotHotkeyConfig);
    const currentNextSong = currentOrStored(options.getCurrentNextSongHotkey, options.readNextSongHotkeyConfig);
    const currentPlayPauseSong = currentOrStored(options.getCurrentPlayPauseSongHotkey, options.readPlayPauseSongHotkeyConfig);
    const currentResetPos = currentOrStored(options.getCurrentResetPositionHotkey, options.readResetPositionHotkeyConfig);

    if (accelerator && ((currentQuit && accelerator === currentQuit)
      || (currentSS && accelerator === currentSS)
      || (currentNextSong && accelerator === currentNextSong)
      || (currentPlayPauseSong && accelerator === currentPlayPauseSong)
      || (currentResetPos && accelerator === currentResetPos))) {
      return false;
    }

    const success = options.registerHideHotkey(accelerator);
    if (success) {
      persistHotkey(options.storeDir, options.hideHotkeyStoreKey, accelerator, 'Hotkey');
    }
    return success;
  });

  ipcMain.handle('next-song-hotkey:get', () => {
    return currentOrStored(options.getCurrentNextSongHotkey, options.readNextSongHotkeyConfig);
  });

  ipcMain.handle('next-song-hotkey:set', (_event, accelerator: string) => {
    const currentHide = currentOrStored(options.getCurrentHideHotkey, options.readHideHotkeyConfig);
    const currentQuit = currentOrStored(options.getCurrentQuitHotkey, options.readQuitHotkeyConfig);
    const currentSS = currentOrStored(options.getCurrentScreenshotHotkey, options.readScreenshotHotkeyConfig);
    const currentResetPos = currentOrStored(options.getCurrentResetPositionHotkey, options.readResetPositionHotkeyConfig);
    const currentPlayPauseSong = currentOrStored(options.getCurrentPlayPauseSongHotkey, options.readPlayPauseSongHotkeyConfig);

    if (accelerator && ((currentHide && accelerator === currentHide)
      || (currentQuit && accelerator === currentQuit)
      || (currentSS && accelerator === currentSS)
      || (currentResetPos && accelerator === currentResetPos)
      || (currentPlayPauseSong && accelerator === currentPlayPauseSong))) {
      return false;
    }

    const success = options.registerNextSongHotkey(accelerator);
    if (success) {
      persistHotkey(options.storeDir, options.nextSongHotkeyStoreKey, accelerator, 'NextSongHotkey');
    }
    return success;
  });

  ipcMain.handle('play-pause-song-hotkey:get', () => {
    return currentOrStored(options.getCurrentPlayPauseSongHotkey, options.readPlayPauseSongHotkeyConfig);
  });

  ipcMain.handle('play-pause-song-hotkey:set', (_event, accelerator: string) => {
    const currentHide = currentOrStored(options.getCurrentHideHotkey, options.readHideHotkeyConfig);
    const currentQuit = currentOrStored(options.getCurrentQuitHotkey, options.readQuitHotkeyConfig);
    const currentSS = currentOrStored(options.getCurrentScreenshotHotkey, options.readScreenshotHotkeyConfig);
    const currentResetPos = currentOrStored(options.getCurrentResetPositionHotkey, options.readResetPositionHotkeyConfig);
    const currentNextSong = currentOrStored(options.getCurrentNextSongHotkey, options.readNextSongHotkeyConfig);

    if (accelerator && ((currentHide && accelerator === currentHide)
      || (currentQuit && accelerator === currentQuit)
      || (currentSS && accelerator === currentSS)
      || (currentResetPos && accelerator === currentResetPos)
      || (currentNextSong && accelerator === currentNextSong))) {
      return false;
    }

    const success = options.registerPlayPauseSongHotkey(accelerator);
    if (success) {
      persistHotkey(options.storeDir, options.playPauseSongHotkeyStoreKey, accelerator, 'PlayPauseSongHotkey');
    }
    return success;
  });

  ipcMain.handle('reset-position-hotkey:get', () => {
    return currentOrStored(options.getCurrentResetPositionHotkey, options.readResetPositionHotkeyConfig);
  });

  ipcMain.handle('reset-position-hotkey:set', (_event, accelerator: string) => {
    const currentHide = currentOrStored(options.getCurrentHideHotkey, options.readHideHotkeyConfig);
    const currentQuit = currentOrStored(options.getCurrentQuitHotkey, options.readQuitHotkeyConfig);
    const currentSS = currentOrStored(options.getCurrentScreenshotHotkey, options.readScreenshotHotkeyConfig);
    const currentNextSong = currentOrStored(options.getCurrentNextSongHotkey, options.readNextSongHotkeyConfig);
    const currentPlayPauseSong = currentOrStored(options.getCurrentPlayPauseSongHotkey, options.readPlayPauseSongHotkeyConfig);

    if (accelerator && ((currentHide && accelerator === currentHide)
      || (currentQuit && accelerator === currentQuit)
      || (currentSS && accelerator === currentSS)
      || (currentNextSong && accelerator === currentNextSong)
      || (currentPlayPauseSong && accelerator === currentPlayPauseSong))) {
      return false;
    }

    const success = options.registerResetPositionHotkey(accelerator);
    if (success) {
      persistHotkey(options.storeDir, options.resetPositionHotkeyStoreKey, accelerator, 'ResetPositionHotkey');
    }
    return success;
  });

  ipcMain.handle('quit-hotkey:get', () => {
    return currentOrStored(options.getCurrentQuitHotkey, options.readQuitHotkeyConfig);
  });

  ipcMain.handle('quit-hotkey:set', (_event, accelerator: string) => {
    const currentHide = currentOrStored(options.getCurrentHideHotkey, options.readHideHotkeyConfig);
    const currentSS = currentOrStored(options.getCurrentScreenshotHotkey, options.readScreenshotHotkeyConfig);
    const currentNextSong = currentOrStored(options.getCurrentNextSongHotkey, options.readNextSongHotkeyConfig);
    const currentPlayPauseSong = currentOrStored(options.getCurrentPlayPauseSongHotkey, options.readPlayPauseSongHotkeyConfig);
    const currentResetPos = currentOrStored(options.getCurrentResetPositionHotkey, options.readResetPositionHotkeyConfig);

    if (accelerator && ((currentHide && accelerator === currentHide)
      || (currentSS && accelerator === currentSS)
      || (currentNextSong && accelerator === currentNextSong)
      || (currentPlayPauseSong && accelerator === currentPlayPauseSong)
      || (currentResetPos && accelerator === currentResetPos))) {
      return false;
    }

    const success = options.registerQuitHotkey(accelerator);
    if (success) {
      persistHotkey(options.storeDir, options.quitHotkeyStoreKey, accelerator, 'QuitHotkey');
    }
    return success;
  });

  ipcMain.handle('hotkey:suspend', () => {
    options.suspendIslandHotkeys();
    return true;
  });

  ipcMain.handle('hotkey:resume', () => {
    options.resumeIslandHotkeys();
    return true;
  });
}
