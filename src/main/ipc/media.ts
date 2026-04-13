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
 * @file media.ts
 * @description 媒体控制相关 IPC 处理模块
 * @description 处理播放控制、音源切换等媒体相关的 IPC 请求
 * @author 鸡哥
 */

import { BrowserWindow, ipcMain } from 'electron';

interface MediaSessionRuntimeEntry {
  payload: unknown;
  hasTitle: boolean;
}

interface RegisterMediaIpcHandlersOptions {
  getMainWindow: () => BrowserWindow | null;
  sendMediaVirtualKey: (vkCode: number) => void;
  isWhitelisted: () => boolean;
  getPendingSourceSwitchId: () => string;
  setPendingSourceSwitchId: (id: string) => void;
  getPendingSourceSwitchEntry: () => unknown;
  clearPendingSourceSwitchEntry: () => void;
  getCurrentDeviceId: () => string;
  setCurrentDeviceId: (id: string) => void;
  getSmtcSessionRuntime: () => Map<string, MediaSessionRuntimeEntry> | null;
}

/**
 * 注册媒体控制相关 IPC 处理器
 * @description 注册播放、暂停、切歌、音源切换等媒体控制的 IPC 事件处理器
 * @param options - 配置选项，包含窗口获取和媒体控制函数
 */
export function registerMediaIpcHandlers(options: RegisterMediaIpcHandlersOptions): void {
  ipcMain.handle('media:play-pause', () => {
    options.sendMediaVirtualKey(0xB3);
  });

  ipcMain.handle('media:next', () => {
    if (!options.isWhitelisted()) return;
    options.sendMediaVirtualKey(0xB0);
  });

  ipcMain.handle('media:prev', () => {
    if (!options.isWhitelisted()) return;
    options.sendMediaVirtualKey(0xB1);
  });

  ipcMain.handle('media:accept-source-switch', () => {
    const pendingSourceSwitchId = options.getPendingSourceSwitchId();
    const pendingSourceSwitchEntry = options.getPendingSourceSwitchEntry();
    if (pendingSourceSwitchId && pendingSourceSwitchEntry) {
      options.setCurrentDeviceId(pendingSourceSwitchId);
      options.setPendingSourceSwitchId('');
      options.clearPendingSourceSwitchEntry();
      const mainWindow = options.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        const entry = options.getSmtcSessionRuntime()?.get(options.getCurrentDeviceId());
        if (entry?.hasTitle) {
          mainWindow.webContents.send('nowplaying:info', entry.payload);
        }
      }
    }
  });

  ipcMain.handle('media:reject-source-switch', () => {
    options.setPendingSourceSwitchId('');
    options.clearPendingSourceSwitchEntry();
  });

  ipcMain.handle('media:seek', (_event, _positionMs: number) => {
    // SMTCMonitor 暂不支持 seek 操作
  });

  ipcMain.handle('media:get-volume', () => 0.5);

  ipcMain.handle('media:set-volume', (_event, _volume: number) => {
    // SMTCMonitor 暂不支持设置音量
  });
}
