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

interface WindowIpcSizeOptions {
  expandedWidth: number;
  expandedHeight: number;
  notificationWidth: number;
  notificationHeight: number;
  lyricsWidth: number;
  lyricsHeight: number;
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

  ipcMain.on('window:expand', () => {
    withWindow((win) => {
      win.setBounds({
        x: Math.round(options.getInitialCenterX() - options.sizes.expandedWidth / 2),
        y: win.getBounds().y,
        width: options.sizes.expandedWidth,
        height: options.sizes.expandedHeight,
      });
    });
  });

  ipcMain.on('window:expand-notification', () => {
    withWindow((win) => {
      win.setBounds({
        x: Math.round(options.getInitialCenterX() - options.sizes.notificationWidth / 2),
        y: win.getBounds().y,
        width: options.sizes.notificationWidth,
        height: options.sizes.notificationHeight,
      });
    });
  });

  ipcMain.on('window:expand-lyrics', () => {
    withWindow((win) => {
      win.setBounds({
        x: Math.round(options.getInitialCenterX() - options.sizes.lyricsWidth / 2),
        y: win.getBounds().y,
        width: options.sizes.lyricsWidth,
        height: options.sizes.lyricsHeight,
      });
    });
  });

  ipcMain.on('window:expand-full', () => {
    withWindow((win) => {
      win.setBounds({
        x: Math.round(options.getInitialCenterX() - options.sizes.expandedFullWidth / 2),
        y: win.getBounds().y,
        width: options.sizes.expandedFullWidth,
        height: options.sizes.expandedFullHeight,
      });
    });
  });

  ipcMain.on('window:expand-settings', () => {
    withWindow((win) => {
      win.setBounds({
        x: Math.round(options.getInitialCenterX() - options.sizes.settingsWidth / 2),
        y: win.getBounds().y,
        width: options.sizes.settingsWidth,
        height: options.sizes.settingsHeight,
      });
    });
  });

  ipcMain.on('window:collapse', () => {
    withWindow((win) => {
      win.setBounds({
        x: Math.round(options.getInitialCenterX() - options.sizes.islandWidth / 2),
        y: win.getBounds().y,
        width: options.sizes.islandWidth,
        height: options.sizes.islandHeight,
      });
    });
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

  ipcMain.handle('window:get-bounds', () => {
    const win = options.getMainWindow();
    if (win && !win.isDestroyed()) {
      return win.getBounds();
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
