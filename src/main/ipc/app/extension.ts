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
 * @file extension.ts
 * @description 可选扩展管理 IPC 处理器
 * @author 鸡哥
 */

import { BrowserWindow, ipcMain } from 'electron';
import {
  getExtensionStatusList,
  installExtension,
  uninstallExtension,
} from '../../extensions/extensionManager';
import type { UpdateSourceKey } from './types';

/**
 * 注册扩展管理 IPC 处理器
 */
export function registerExtensionIpcHandlers(): void {
  /** 获取所有扩展状态 */
  ipcMain.handle('extension:list', () => {
    try {
      return getExtensionStatusList();
    } catch (err) {
      console.error('[Extension:list] ERROR:', err);
      return [];
    }
  });

  /** 安装扩展 */
  ipcMain.handle('extension:install', async (_event, extId: string, source?: UpdateSourceKey, resolvedUrl?: string) => {
    try {
      await installExtension(
        extId,
        source ?? 'cloudflare-r2',
        resolvedUrl,
        (progressData) => {
          // 向所有窗口广播进度
          for (const win of BrowserWindow.getAllWindows()) {
            if (!win.isDestroyed()) {
              win.webContents.send('extension:install-progress', progressData);
            }
          }
        },
      );
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Extension:install] ERROR:', message);
      return { success: false, error: message };
    }
  });

  /** 卸载扩展 */
  ipcMain.handle('extension:uninstall', (_event, extId: string) => {
    try {
      uninstallExtension(extId);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Extension:uninstall] ERROR:', message);
      return { success: false, error: message };
    }
  });
}
