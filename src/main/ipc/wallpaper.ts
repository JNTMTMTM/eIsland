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
 * @file wallpaper.ts
 * @description 壁纸相关 IPC 处理模块
 * @description 处理壁纸选择、加载和缓存清理的 IPC 请求
 * @author 鸡哥
 */

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * 注册壁纸相关 IPC 处理器
 * @description 注册壁纸选择、加载和缓存清理的 IPC 事件处理器
 */
export function registerWallpaperIpcHandlers(): void {
  const wallpaperCacheDir = join(app.getPath('userData'), 'wallpapers');
  const resolveDialogWindow = (event: Electron.IpcMainInvokeEvent): BrowserWindow | null => {
    return BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
  };

  ipcMain.handle('dialog:open-image', async (event) => {
    const win = resolveDialogWindow(event);
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: '选择图片',
      filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    try {
      if (!existsSync(wallpaperCacheDir)) mkdirSync(wallpaperCacheDir, { recursive: true });
      const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
      const destName = `custom-bg-${Date.now()}.${ext}`;
      const destPath = join(wallpaperCacheDir, destName);
      try {
        readdirSync(wallpaperCacheDir)
          .filter((f) => f.startsWith('custom-bg-'))
          .forEach((f) => unlinkSync(join(wallpaperCacheDir, f)));
      } catch {
        // ignore
      }
      copyFileSync(filePath, destPath);
      return destPath;
    } catch {
      return null;
    }
  });

  ipcMain.handle('dialog:open-video', async (event) => {
    const win = resolveDialogWindow(event);
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: '选择视频',
      filters: [{ name: '视频', extensions: ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    try {
      if (!existsSync(wallpaperCacheDir)) mkdirSync(wallpaperCacheDir, { recursive: true });
      const ext = filePath.split('.').pop()?.toLowerCase() || 'mp4';
      const destName = `custom-bg-${Date.now()}.${ext}`;
      const destPath = join(wallpaperCacheDir, destName);
      try {
        readdirSync(wallpaperCacheDir)
          .filter((f) => f.startsWith('custom-bg-'))
          .forEach((f) => unlinkSync(join(wallpaperCacheDir, f)));
      } catch {
        // ignore
      }
      copyFileSync(filePath, destPath);
      return destPath;
    } catch {
      return null;
    }
  });

  ipcMain.handle('wallpaper:load-file', async (_event, filePath: string) => {
    try {
      if (!filePath || typeof filePath !== 'string') return null;
      if (!existsSync(filePath)) return null;
      const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
      };
      const mime = mimeMap[ext] || 'image/png';
      const buf = readFileSync(filePath);
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  });

  ipcMain.handle('wallpaper:clear-cache', async () => {
    try {
      if (!existsSync(wallpaperCacheDir)) return;
      readdirSync(wallpaperCacheDir)
        .filter((f) => f.startsWith('custom-bg-'))
        .forEach((f) => unlinkSync(join(wallpaperCacheDir, f)));
    } catch {
      // ignore
    }
  });
}
