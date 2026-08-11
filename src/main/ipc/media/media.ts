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
import { play, pause, next, previous, seek, getTimestamp } from '@eisland/windows-smtc-helper';
import { getMute, setMute } from '@eisland/windows-volume-helper';

interface MediaSessionRuntimeEntry {
  payload: unknown;
  hasTitle: boolean;
}

interface RegisterMediaIpcHandlersOptions {
  getMainWindow: () => BrowserWindow | null;
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
  ipcMain.handle('media:current-info:get', () => {
    const entry = options.getSmtcSessionRuntime()?.get(options.getCurrentDeviceId());
    return entry?.hasTitle ? entry.payload : null;
  });

  ipcMain.handle('media:play-pause', () => {
    const entry = options.getSmtcSessionRuntime()?.get(options.getCurrentDeviceId());
    const isPlaying = Boolean(entry && (entry.payload as Record<string, unknown>)?.isPlaying);
    if (isPlaying) pause(); else play();
  });

  ipcMain.handle('media:next', () => {
    if (!options.isWhitelisted()) return;
    next();
  });

  ipcMain.handle('media:prev', () => {
    if (!options.isWhitelisted()) return;
    previous();
  });

  ipcMain.handle('media:accept-source-switch', () => {
    const pendingSourceSwitchId = options.getPendingSourceSwitchId();
    const pendingSourceSwitchEntry = options.getPendingSourceSwitchEntry();
    if (pendingSourceSwitchId && pendingSourceSwitchEntry) {
      options.setCurrentDeviceId(pendingSourceSwitchId);
      options.setPendingSourceSwitchId('');
      options.clearPendingSourceSwitchEntry();
      const entry = options.getSmtcSessionRuntime()?.get(options.getCurrentDeviceId());
      const payload = entry?.hasTitle ? entry.payload : null;
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('nowplaying:info', payload);
        }
      });
    }
  });

  ipcMain.handle('media:reject-source-switch', () => {
    options.setPendingSourceSwitchId('');
    options.clearPendingSourceSwitchEntry();
  });

  ipcMain.handle('media:seek', (_event, positionMs: number) => {
    if (!options.isWhitelisted()) return;
    seek(positionMs / 1000);
  });

  ipcMain.handle('media:get-volume', () => 0.5);

  ipcMain.handle('media:set-volume', (_event, _volume: number) => {
    // SMTC 不支持应用级音量控制
  });

  ipcMain.handle('media:get-muted', () => getMute());

  ipcMain.handle('media:toggle-muted', () => {
    const muted = getMute();
    if (muted === null) return null;

    const nextMuted = !muted;
    return setMute(nextMuted) ? nextMuted : null;
  });

  ipcMain.handle('smtc:get-timestamp', () => {
    return getTimestamp();
  });
}
