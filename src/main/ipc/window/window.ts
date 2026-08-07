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
 * @file window.ts
 * @description 窗口控制相关 IPC 处理模块
 * @description 处理窗口尺寸调整、位置调整和鼠标穿透等 IPC 请求
 * @author 鸡哥
 */

import { BrowserWindow, ipcMain, screen } from 'electron';
import { broadcastSettingChange } from '../../utils/broadcast';
import {
  readIslandShapeModeConfig,
  PILL_ISLAND_HEIGHT,
  PILL_EXPANDED_HEIGHT,
  PILL_NOTIFICATION_HEIGHT,
  PILL_LYRICS_HEIGHT,
  PILL_LYRICS_TRANSLATION_HEIGHT,
  PILL_EXPANDED_FULL_HEIGHT,
  PILL_SETTINGS_HEIGHT,
} from '../../config/storeConfig';

interface WindowIpcSizeOptions {
  expandedWidth: number;
  expandedHeight: number;
  notificationWidth: number;
  notificationHeight: number;
  lyricsWidth: number;
  lyricsHeight: number;
  lyricsTranslationHeight: number;
  expandedFullWidth: number;
  expandedFullHeight: number;
  settingsWidth: number;
  settingsHeight: number;
  islandWidth: number;
  islandHeight: number;
}

interface RegisterWindowIpcHandlersOptions {
  getMainWindow: () => BrowserWindow | null;
  getInitialCenterX: () => number;
  setHiddenByAutoHideProcess: (hidden: boolean) => void;
  getIslandPositionOffset: () => { x: number; y: number };
  getIslandDisplaySelection: () => string;
  sanitizeIslandDisplaySelection: (selection: unknown) => string;
  setIslandDisplaySelection: (selection: string) => void;
  sanitizeIslandPositionOffset: (offset: { x?: number; y?: number }) => { x: number; y: number };
  applyIslandPositionOffset: (offset: { x: number; y: number }) => void;
  writeIslandPositionOffsetConfig: (offset: { x: number; y: number }) => boolean;
  writeIslandDisplaySelectionConfig: (selection: string) => boolean;
  sizes: WindowIpcSizeOptions;
}

/**
 * 注册窗口控制相关 IPC 处理器
 * @description 注册窗口尺寸调整、位置调整和鼠标穿透的 IPC 事件处理器
 * @param options - 配置选项，包含窗口获取和位置管理函数
 */
/** 鼠标穿透锁定状态 */
let mousePassthroughLocked = false;

/**
 * 切换鼠标穿透锁定状态
 * @description 锁定时窗口始终穿透鼠标事件，解锁后恢复正常行为
 * @param getMainWindow - 获取主窗口函数
 */
export function toggleMousePassthroughLock(getMainWindow: () => BrowserWindow | null): void {
  mousePassthroughLocked = !mousePassthroughLocked;
  const win = getMainWindow();
  if (!win || win.isDestroyed()) return;
  if (mousePassthroughLocked) {
    win.setIgnoreMouseEvents(true, { forward: true });
  } else {
    win.setIgnoreMouseEvents(false);
  }
  win.webContents.send('window:passthrough-lock-changed', mousePassthroughLocked);
}

/**
 * 注册窗口控制相关 IPC 处理器
 * @description 注册窗口尺寸调整、位置调整和鼠标穿透的 IPC 事件处理器
 * @param options - 配置选项，包含窗口获取和位置管理函数
 */
export function registerWindowIpcHandlers(options: RegisterWindowIpcHandlersOptions): void {
  let pendingResizeTimer: ReturnType<typeof setTimeout> | null = null;
  let logicalWindowSize: { width: number; height: number } | null = null;

  const withWindow = (fn: (win: BrowserWindow) => void): void => {
    const win = options.getMainWindow();
    if (!win || win.isDestroyed()) return;
    try {
      fn(win);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('Object has been destroyed')) {
        console.error('[WindowIPC] handler error:', err);
      }
    }
  };

  const applyWindowGeometry = (
    win: BrowserWindow,
    targetBounds: Electron.Rectangle,
    visibleWidth: number,
    visibleHeight: number,
  ): void => {
    const currentBounds = win.getBounds();
    const backingWidth = Math.max(currentBounds.width, targetBounds.width, visibleWidth);
    const backingX = Math.round(targetBounds.x - (backingWidth - targetBounds.width) / 2);
    logicalWindowSize = { width: visibleWidth, height: visibleHeight };

    win.setBounds({
      x: backingX,
      y: targetBounds.y,
      width: backingWidth,
      height: visibleHeight,
    });
    win.setShape([{
      x: Math.round((backingWidth - visibleWidth) / 2),
      y: 0,
      width: visibleWidth,
      height: visibleHeight,
    }]);
    win.webContents.invalidate();
  };

  const resizeWindow = (getTargetBounds: (win: BrowserWindow) => Electron.Rectangle, delayMs = 0): void => {
    const safeDelayMs = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0;
    if (pendingResizeTimer) {
      clearTimeout(pendingResizeTimer);
      pendingResizeTimer = null;
    }

    if (safeDelayMs > 0) {
      withWindow((win) => {
        const targetBounds = getTargetBounds(win);
        const currentBounds = win.getBounds();
        const currentSize = logicalWindowSize ?? currentBounds;
        const currentCenterX = currentBounds.x + currentBounds.width / 2;
        applyWindowGeometry(
          win,
          {
            ...targetBounds,
            x: Math.round(currentCenterX - targetBounds.width / 2),
            y: currentBounds.y,
          },
          Math.max(currentSize.width, targetBounds.width),
          Math.max(currentSize.height, targetBounds.height),
        );
      });
      pendingResizeTimer = setTimeout(() => {
        pendingResizeTimer = null;
        withWindow((win) => {
          const targetBounds = getTargetBounds(win);
          applyWindowGeometry(win, targetBounds, targetBounds.width, targetBounds.height);
        });
      }, safeDelayMs);
      return;
    }

    withWindow((win) => {
      const targetBounds = getTargetBounds(win);
      applyWindowGeometry(win, targetBounds, targetBounds.width, targetBounds.height);
    });
  };

  /** 获取当前窗口水平中心点（pill 模式用当前窗口中心，notch 模式用初始中心） */
  const getEffectiveCenterX = (win: BrowserWindow): number => {
    const shapeMode = readIslandShapeModeConfig();
    if (shapeMode === 'pill') {
      const bounds = win.getBounds();
      return bounds.x + bounds.width / 2;
    }
    return options.getInitialCenterX();
  };

  /** 获取当前窗口 y 坐标（notch 模式始终贴顶，pill 模式保持当前 y） */
  const getEffectiveY = (win: BrowserWindow): number => {
    const shapeMode = readIslandShapeModeConfig();
    if (shapeMode === 'notch') {
      const selection = options.getIslandDisplaySelection();
      let targetDisplay = screen.getPrimaryDisplay();
      if (selection !== 'primary') {
        const targetId = Number(selection);
        if (Number.isFinite(targetId)) {
          const found = screen.getAllDisplays().find((d) => d.id === targetId);
          if (found) targetDisplay = found;
        }
      }
      return targetDisplay.workArea.y;
    }
    return win.getBounds().y;
  };

  /** 根据当前形态模式返回对应高度（pill 模式各状态加高） */
  const getHeight = (notchHeight: number, pillHeight: number): number => {
    return readIslandShapeModeConfig() === 'pill' ? pillHeight : notchHeight;
  };

  ipcMain.on('window:enable-mouse-passthrough', () => {
    withWindow((win) => {
      win.setIgnoreMouseEvents(true, { forward: true });
    });
  });

  ipcMain.on('window:disable-mouse-passthrough', () => {
    if (mousePassthroughLocked) return;
    withWindow((win) => {
      win.setIgnoreMouseEvents(false);
    });
  });

  ipcMain.on('window:expand', (_event, delayMs = 0) => {
    resizeWindow((win) => {
      const centerX = getEffectiveCenterX(win);
      return {
        x: Math.round(centerX - options.sizes.expandedWidth / 2),
        y: getEffectiveY(win),
        width: options.sizes.expandedWidth,
        height: getHeight(options.sizes.expandedHeight, PILL_EXPANDED_HEIGHT),
      };
    }, delayMs);
  });

  ipcMain.on('window:expand-notification', (_event, delayMs = 0) => {
    resizeWindow((win) => {
      const centerX = getEffectiveCenterX(win);
      return {
        x: Math.round(centerX - options.sizes.notificationWidth / 2),
        y: getEffectiveY(win),
        width: options.sizes.notificationWidth,
        height: getHeight(options.sizes.notificationHeight, PILL_NOTIFICATION_HEIGHT),
      };
    }, delayMs);
  });

  ipcMain.on('window:expand-lyrics', (_event, delayMs = 0) => {
    resizeWindow((win) => {
      const centerX = getEffectiveCenterX(win);
      return {
        x: Math.round(centerX - options.sizes.lyricsWidth / 2),
        y: getEffectiveY(win),
        width: options.sizes.lyricsWidth,
        height: getHeight(options.sizes.lyricsHeight, PILL_LYRICS_HEIGHT),
      };
    }, delayMs);
  });

  ipcMain.on('window:expand-lyrics-translation', (_event, delayMs = 0) => {
    resizeWindow((win) => {
      const centerX = getEffectiveCenterX(win);
      return {
        x: Math.round(centerX - options.sizes.lyricsWidth / 2),
        y: getEffectiveY(win),
        width: options.sizes.lyricsWidth,
        height: getHeight(options.sizes.lyricsTranslationHeight, PILL_LYRICS_TRANSLATION_HEIGHT),
      };
    }, delayMs);
  });

  ipcMain.on('window:expand-full', (_event, delayMs = 0) => {
    resizeWindow((win) => {
      const centerX = getEffectiveCenterX(win);
      return {
        x: Math.round(centerX - options.sizes.expandedFullWidth / 2),
        y: getEffectiveY(win),
        width: options.sizes.expandedFullWidth,
        height: getHeight(options.sizes.expandedFullHeight, PILL_EXPANDED_FULL_HEIGHT),
      };
    }, delayMs);
  });

  ipcMain.on('window:expand-settings', (_event, delayMs = 0) => {
    resizeWindow((win) => {
      const centerX = getEffectiveCenterX(win);
      return {
        x: Math.round(centerX - options.sizes.settingsWidth / 2),
        y: getEffectiveY(win),
        width: options.sizes.settingsWidth,
        height: getHeight(options.sizes.settingsHeight, PILL_SETTINGS_HEIGHT),
      };
    }, delayMs);
  });

  ipcMain.on('window:collapse', (_event, delayMs = 0) => {
    resizeWindow((win) => {
      const centerX = getEffectiveCenterX(win);
      return {
        x: Math.round(centerX - options.sizes.islandWidth / 2),
        y: getEffectiveY(win),
        width: options.sizes.islandWidth,
        height: getHeight(options.sizes.islandHeight, PILL_ISLAND_HEIGHT),
      };
    }, delayMs);
  });

  ipcMain.on('window:hide', () => {
    withWindow((win) => {
      options.setHiddenByAutoHideProcess(false);
      win.hide();
    });
  });

  ipcMain.handle('window:get-mouse-position', () => {
    const point = screen.getCursorScreenPoint();
    return { x: point.x, y: point.y };
  });

  ipcMain.on('window:move-delta', (_event, dx: number, dy: number) => {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    withWindow((win) => {
      const bounds = win.getBounds();
      win.setBounds({
        x: Math.round(bounds.x + dx),
        y: Math.round(bounds.y + dy),
        width: bounds.width,
        height: bounds.height,
      });
    });
  });

  ipcMain.handle('window:get-bounds', () => {
    const win = options.getMainWindow();
    if (win && !win.isDestroyed()) {
      const bounds = win.getBounds();
      if (!logicalWindowSize) return bounds;
      return {
        x: Math.round(bounds.x + (bounds.width - logicalWindowSize.width) / 2),
        y: bounds.y,
        width: logicalWindowSize.width,
        height: logicalWindowSize.height,
      };
    }
    return null;
  });

  ipcMain.handle('window:island-displays:list', () => {
    const primaryId = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((display) => ({
      id: String(display.id),
      width: display.workArea.width,
      height: display.workArea.height,
      isPrimary: display.id === primaryId,
    }));
  });

  ipcMain.handle('window:island-display:get', () => {
    return options.getIslandDisplaySelection();
  });

  ipcMain.handle('window:island-display:set', (event, selection: unknown) => {
    const nextSelection = options.sanitizeIslandDisplaySelection(selection);
    options.setIslandDisplaySelection(nextSelection);
    const result = options.writeIslandDisplaySelectionConfig(nextSelection);
    broadcastSettingChange(event.sender.id, 'island:display', nextSelection);
    return result;
  });

  ipcMain.handle('window:island-position:get', () => {
    return { ...options.getIslandPositionOffset() };
  });

  ipcMain.handle('window:island-position:set', (event, offset: { x?: number; y?: number }) => {
    const nextOffset = options.sanitizeIslandPositionOffset(offset);
    options.applyIslandPositionOffset(nextOffset);
    const result = options.writeIslandPositionOffsetConfig(nextOffset);
    broadcastSettingChange(event.sender.id, 'island:position', nextOffset);
    return result;
  });
}
