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
 * @file broadcast.ts
 * @description 跨窗口设置同步广播工具
 * @author 鸡哥
 */

import { BrowserWindow, ipcMain } from 'electron';

/**
 * 向除发送者以外的所有窗口广播设置变更
 * @param senderWebContentsId - 发起变更的 webContents ID（-1 表示无发送者，广播给所有窗口）
 * @param channel - 设置变更频道标识
 * @param value - 新值
 */
export function broadcastSettingChange(senderWebContentsId: number, channel: string, value: unknown): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed() && win.webContents.id !== senderWebContentsId) {
      win.webContents.send('settings:changed', channel, value);
    }
  });
}

/**
 * 注册 settings:preview IPC 处理器
 * @description 仅广播不持久化，用于拖动条等实时预览场景
 */
export function registerSettingsPreviewHandler(): void {
  ipcMain.handle('settings:preview', (event, channel: string, value: unknown) => {
    broadcastSettingChange(event.sender.id, channel, value);
    return true;
  });
}
