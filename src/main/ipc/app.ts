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
 * @file app.ts
 * @description 应用相关 IPC 处理模块
 * @description 处理应用退出、重启、日志管理和文件操作等 IPC 请求
 * @author 鸡哥
 */

import { app, ipcMain, shell } from 'electron';
import { basename } from 'path';
import { clearLogsCacheFiles, ensureLogsDir } from '../log/mainLog';

/**
 * 注册应用相关 IPC 处理器
 * @description 注册应用级别的 IPC 事件处理器，包括退出、重启、日志管理等
 */
export function registerAppIpcHandlers(): void {
  ipcMain.on('app:quit', () => {
    app.quit();
  });

  ipcMain.handle('app:restart', () => {
    try {
      app.relaunch();
      app.exit(0);
      return true;
    } catch (err) {
      console.error('[App] restart error:', err);
      return false;
    }
  });

  ipcMain.handle('app:open-logs-folder', async () => {
    try {
      const logDir = ensureLogsDir();
      const result = await shell.openPath(logDir);
      return result === '';
    } catch (err) {
      console.error('[App] open logs folder error:', err);
      return false;
    }
  });

  ipcMain.handle('app:clear-logs-cache', async () => {
    try {
      const result = clearLogsCacheFiles();
      if (!result.success) {
        return { success: false, freedBytes: 0 };
      }
      console.log(`[App] cleared logs cache: ${result.fileCount} files, ${(result.freedBytes / 1024).toFixed(1)} KB freed`);
      return { success: true, freedBytes: result.freedBytes };
    } catch (err) {
      console.error('[App] clear logs cache error:', err);
      return { success: false, freedBytes: 0 };
    }
  });

  ipcMain.handle('app:get-file-icon', async (_event, filePath: string) => {
    try {
      let iconPath = filePath;
      if (process.platform === 'win32' && filePath.toLowerCase().endsWith('.lnk')) {
        try {
          const result = shell.readShortcutLink(filePath);
          if (result.target) iconPath = result.target;
        } catch {
          // ignore
        }
      }
      const icon = await app.getFileIcon(iconPath, { size: 'large' });
      return icon.toPNG().toString('base64');
    } catch (err) {
      console.error('[App] get-file-icon error:', err);
      return null;
    }
  });

  ipcMain.handle('app:open-file', async (_event, filePath: string) => {
    try {
      await shell.openPath(filePath);
      return true;
    } catch (err) {
      console.error('[App] open-file error:', err);
      return false;
    }
  });

  ipcMain.handle('app:resolve-shortcut', (_event, lnkPath: string) => {
    try {
      if (process.platform === 'win32') {
        const result = shell.readShortcutLink(lnkPath);
        return { target: result.target, name: basename(lnkPath, '.lnk') };
      }
      return null;
    } catch (err) {
      console.error('[App] resolve-shortcut error:', err);
      return null;
    }
  });
}
