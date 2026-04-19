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
 * @file hotkeyService.ts
 * @description 全局快捷键服务模块
 * @description 管理应用全局快捷键的注册、注销和冲突检测
 * @author 鸡哥
 */

import { app, BrowserWindow, globalShortcut } from 'electron';

interface CreateHotkeyServiceOptions {
  getMainWindow: () => BrowserWindow | null;
  setHiddenByAutoHideProcess: (hidden: boolean) => void;
  readHideHotkeyConfig: () => string;
  readQuitHotkeyConfig: () => string;
  readScreenshotHotkeyConfig: () => string;
  readNextSongHotkeyConfig: () => string;
  readPlayPauseSongHotkeyConfig: () => string;
  readResetPositionHotkeyConfig: () => string;
  readToggleTrayHotkeyConfig: () => string;
  readShowSettingsWindowHotkeyConfig: () => string;
  readOpenClipboardHistoryHotkeyConfig: () => string;
  onScreenshotHotkey: () => void;
  onNextSongHotkey: () => void;
  onPlayPauseSongHotkey: () => void;
  onResetPositionHotkey: () => void;
  onToggleTrayHotkey: () => void;
  onShowSettingsWindowHotkey: () => void;
  onOpenClipboardHistoryHotkey: () => void;
}

interface HotkeyService {
  getCurrentHideHotkey: () => string;
  getCurrentQuitHotkey: () => string;
  getCurrentScreenshotHotkey: () => string;
  getCurrentNextSongHotkey: () => string;
  getCurrentPlayPauseSongHotkey: () => string;
  getCurrentResetPositionHotkey: () => string;
  getCurrentToggleTrayHotkey: () => string;
  getCurrentShowSettingsWindowHotkey: () => string;
  getCurrentOpenClipboardHistoryHotkey: () => string;
  registerHideHotkey: (accelerator: string) => boolean;
  registerQuitHotkey: (accelerator: string) => boolean;
  registerScreenshotHotkey: (accelerator: string) => boolean;
  registerNextSongHotkey: (accelerator: string) => boolean;
  registerPlayPauseSongHotkey: (accelerator: string) => boolean;
  registerResetPositionHotkey: (accelerator: string) => boolean;
  registerToggleTrayHotkey: (accelerator: string) => boolean;
  registerShowSettingsWindowHotkey: (accelerator: string) => boolean;
  registerOpenClipboardHistoryHotkey: (accelerator: string) => boolean;
  suspendIslandHotkeys: () => void;
  resumeIslandHotkeys: () => void;
}

/**
 * 创建全局快捷键服务
 * @description 初始化并返回全局快捷键管理服务
 * @param options - 服务配置选项，包含窗口获取和回调函数
 * @returns 快捷键服务对象，包含注册和管理方法
 */
export function createHotkeyService(options: CreateHotkeyServiceOptions): HotkeyService {
  let currentHideHotkey = '';
  let currentQuitHotkey = '';
  let currentScreenshotHotkey = '';
  let currentNextSongHotkey = '';
  let currentPlayPauseSongHotkey = '';
  let currentResetPositionHotkey = '';
  let currentToggleTrayHotkey = '';
  let currentShowSettingsWindowHotkey = '';
  let currentOpenClipboardHistoryHotkey = '';

  function registerHideHotkey(accelerator: string): boolean {
    const previousHotkey = currentHideHotkey || options.readHideHotkeyConfig();
    if (previousHotkey) {
      try {
        globalShortcut.unregister(previousHotkey);
      } catch {
        // ignore
      }
    }

    currentHideHotkey = '';
    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        const mainWindow = options.getMainWindow();
        if (!mainWindow || mainWindow.isDestroyed()) return;

        options.setHiddenByAutoHideProcess(false);
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
      });

      if (success) {
        currentHideHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[Hotkey] register error:', err);
      return false;
    }
  }

  function registerOpenClipboardHistoryHotkey(accelerator: string): boolean {
    if (currentOpenClipboardHistoryHotkey) {
      try {
        globalShortcut.unregister(currentOpenClipboardHistoryHotkey);
      } catch {
        // ignore
      }
      currentOpenClipboardHistoryHotkey = '';
    }

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        options.onOpenClipboardHistoryHotkey();
      });

      if (success) {
        currentOpenClipboardHistoryHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[OpenClipboardHistoryHotkey] register error:', err);
      return false;
    }
  }

  function registerShowSettingsWindowHotkey(accelerator: string): boolean {
    if (currentShowSettingsWindowHotkey) {
      try {
        globalShortcut.unregister(currentShowSettingsWindowHotkey);
      } catch {
        // ignore
      }
      currentShowSettingsWindowHotkey = '';
    }

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        options.onShowSettingsWindowHotkey();
      });

      if (success) {
        currentShowSettingsWindowHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[ShowSettingsWindowHotkey] register error:', err);
      return false;
    }
  }

  function registerQuitHotkey(accelerator: string): boolean {
    if (currentQuitHotkey) {
      try {
        globalShortcut.unregister(currentQuitHotkey);
      } catch {
        // ignore
      }
      currentQuitHotkey = '';
    }

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        app.quit();
      });

      if (success) {
        currentQuitHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[QuitHotkey] register error:', err);
      return false;
    }
  }

  function registerScreenshotHotkey(accelerator: string): boolean {
    if (currentScreenshotHotkey) {
      try {
        globalShortcut.unregister(currentScreenshotHotkey);
      } catch {
        // ignore
      }
      currentScreenshotHotkey = '';
    }

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        options.onScreenshotHotkey();
      });

      if (success) {
        currentScreenshotHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[ScreenshotHotkey] register error:', err);
      return false;
    }
  }

  function registerNextSongHotkey(accelerator: string): boolean {
    if (currentNextSongHotkey) {
      try {
        globalShortcut.unregister(currentNextSongHotkey);
      } catch {
        // ignore
      }
      currentNextSongHotkey = '';
    }

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        options.onNextSongHotkey();
      });

      if (success) {
        currentNextSongHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[NextSongHotkey] register error:', err);
      return false;
    }
  }

  function registerPlayPauseSongHotkey(accelerator: string): boolean {
    if (currentPlayPauseSongHotkey) {
      try {
        globalShortcut.unregister(currentPlayPauseSongHotkey);
      } catch {
        // ignore
      }
      currentPlayPauseSongHotkey = '';
    }

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        options.onPlayPauseSongHotkey();
      });

      if (success) {
        currentPlayPauseSongHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[PlayPauseSongHotkey] register error:', err);
      return false;
    }
  }

  function registerResetPositionHotkey(accelerator: string): boolean {
    if (currentResetPositionHotkey) {
      try {
        globalShortcut.unregister(currentResetPositionHotkey);
      } catch {
        // ignore
      }
      currentResetPositionHotkey = '';
    }

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        options.onResetPositionHotkey();
      });

      if (success) {
        currentResetPositionHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[ResetPositionHotkey] register error:', err);
      return false;
    }
  }

  function registerToggleTrayHotkey(accelerator: string): boolean {
    if (currentToggleTrayHotkey) {
      try {
        globalShortcut.unregister(currentToggleTrayHotkey);
      } catch {
        // ignore
      }
      currentToggleTrayHotkey = '';
    }

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        options.onToggleTrayHotkey();
      });

      if (success) {
        currentToggleTrayHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[ToggleTrayHotkey] register error:', err);
      return false;
    }
  }

  function suspendIslandHotkeys(): void {
    const hideHotkey = currentHideHotkey || options.readHideHotkeyConfig();
    const quitHotkey = currentQuitHotkey || options.readQuitHotkeyConfig();
    const screenshotHotkey = currentScreenshotHotkey || options.readScreenshotHotkeyConfig();
    const nextSongHotkey = currentNextSongHotkey || options.readNextSongHotkeyConfig();
    const playPauseSongHotkey =
      currentPlayPauseSongHotkey || options.readPlayPauseSongHotkeyConfig();
    const resetPositionHotkey =
      currentResetPositionHotkey || options.readResetPositionHotkeyConfig();
    const toggleTrayHotkey =
      currentToggleTrayHotkey || options.readToggleTrayHotkeyConfig();
    const showSettingsWindowHotkey =
      currentShowSettingsWindowHotkey || options.readShowSettingsWindowHotkeyConfig();
    const openClipboardHistoryHotkey =
      currentOpenClipboardHistoryHotkey || options.readOpenClipboardHistoryHotkeyConfig();

    [
      hideHotkey,
      quitHotkey,
      screenshotHotkey,
      nextSongHotkey,
      playPauseSongHotkey,
      resetPositionHotkey,
      toggleTrayHotkey,
      showSettingsWindowHotkey,
      openClipboardHistoryHotkey,
    ].forEach((hotkey) => {
      if (!hotkey) return;
      try {
        globalShortcut.unregister(hotkey);
      } catch {
        // ignore
      }
    });
  }

  function resumeIslandHotkeys(): void {
    const hideHotkey = currentHideHotkey || options.readHideHotkeyConfig();
    const quitHotkey = currentQuitHotkey || options.readQuitHotkeyConfig();
    const screenshotHotkey = currentScreenshotHotkey || options.readScreenshotHotkeyConfig();
    const nextSongHotkey = currentNextSongHotkey || options.readNextSongHotkeyConfig();
    const playPauseSongHotkey =
      currentPlayPauseSongHotkey || options.readPlayPauseSongHotkeyConfig();
    const resetPositionHotkey =
      currentResetPositionHotkey || options.readResetPositionHotkeyConfig();

    if (hideHotkey) registerHideHotkey(hideHotkey);
    if (quitHotkey) registerQuitHotkey(quitHotkey);
    if (screenshotHotkey) registerScreenshotHotkey(screenshotHotkey);
    if (nextSongHotkey) registerNextSongHotkey(nextSongHotkey);
    if (playPauseSongHotkey) registerPlayPauseSongHotkey(playPauseSongHotkey);
    if (resetPositionHotkey) registerResetPositionHotkey(resetPositionHotkey);
    const toggleTrayHotkey =
      currentToggleTrayHotkey || options.readToggleTrayHotkeyConfig();
    const showSettingsWindowHotkey =
      currentShowSettingsWindowHotkey || options.readShowSettingsWindowHotkeyConfig();
    const openClipboardHistoryHotkey =
      currentOpenClipboardHistoryHotkey || options.readOpenClipboardHistoryHotkeyConfig();
    if (toggleTrayHotkey) registerToggleTrayHotkey(toggleTrayHotkey);
    if (showSettingsWindowHotkey) registerShowSettingsWindowHotkey(showSettingsWindowHotkey);
    if (openClipboardHistoryHotkey) registerOpenClipboardHistoryHotkey(openClipboardHistoryHotkey);
  }

  return {
    getCurrentHideHotkey: () => currentHideHotkey,
    getCurrentQuitHotkey: () => currentQuitHotkey,
    getCurrentScreenshotHotkey: () => currentScreenshotHotkey,
    getCurrentNextSongHotkey: () => currentNextSongHotkey,
    getCurrentPlayPauseSongHotkey: () => currentPlayPauseSongHotkey,
    getCurrentResetPositionHotkey: () => currentResetPositionHotkey,
    getCurrentToggleTrayHotkey: () => currentToggleTrayHotkey,
    getCurrentShowSettingsWindowHotkey: () => currentShowSettingsWindowHotkey,
    getCurrentOpenClipboardHistoryHotkey: () => currentOpenClipboardHistoryHotkey,
    registerHideHotkey,
    registerQuitHotkey,
    registerScreenshotHotkey,
    registerNextSongHotkey,
    registerPlayPauseSongHotkey,
    registerResetPositionHotkey,
    registerToggleTrayHotkey,
    registerShowSettingsWindowHotkey,
    registerOpenClipboardHistoryHotkey,
    suspendIslandHotkeys,
    resumeIslandHotkeys,
  };
}
