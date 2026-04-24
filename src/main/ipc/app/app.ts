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

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { readdir } from 'fs/promises';
import { basename } from 'path';
import { clearLogsCacheFiles, ensureLogsDir } from '../../log/mainLog';
import { openStandaloneWindow, closeStandaloneWindow } from '../../window/standaloneWindow';

interface LocalFileSearchItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

async function searchLocalFiles(rootDir: string, keyword: string, limit: number): Promise<LocalFileSearchItem[]> {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword || !rootDir.trim()) return [];

  const maxCount = Math.max(1, Math.min(500, Math.floor(limit || 120)));
  const queue: Array<{ dir: string; depth: number }> = [{ dir: rootDir, depth: 0 }];
  const results: LocalFileSearchItem[] = [];
  const maxDepth = 8;

  while (queue.length > 0 && results.length < maxCount) {
    const current = queue.shift();
    if (!current) break;
    let entries: Array<{ name: string | Buffer; isDirectory: () => boolean }>;
    try {
      entries = await readdir(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (results.length >= maxCount) break;
      const entryName = typeof entry.name === 'string' ? entry.name : entry.name.toString('utf8');
      const entryPath = `${current.dir}${current.dir.endsWith('\\') ? '' : '\\'}${entryName}`;
      const lowerName = entryName.toLowerCase();
      if (lowerName.includes(normalizedKeyword)) {
        results.push({
          name: entryName,
          path: entryPath,
          isDirectory: entry.isDirectory(),
        });
      }
      if (entry.isDirectory() && current.depth < maxDepth) {
        if (entryName === '.git' || entryName === 'node_modules' || entryName === '.idea' || entryName === '.vscode') {
          continue;
        }
        queue.push({ dir: entryPath, depth: current.depth + 1 });
      }
    }
  }

  return results;
}

/**
 * 注册应用相关 IPC 处理器
 * @description 注册应用级别的 IPC 事件处理器，包括退出、重启、日志管理等
 */
export function registerAppIpcHandlers(): void {
  ipcMain.on('app:quit', () => {
    app.quit();
  });

  ipcMain.handle('app:pick-local-search-directory', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const result = await dialog.showOpenDialog(win, {
        title: '选择搜索目录',
        properties: ['openDirectory'],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0] || null;
    } catch (err) {
      console.error('[App] pick local search directory error:', err);
      return null;
    }
  });

  ipcMain.handle('app:search-local-files', async (_event, rootDir: string, keyword: string, limit?: number) => {
    try {
      return await searchLocalFiles(rootDir, keyword, typeof limit === 'number' ? limit : 120);
    } catch (err) {
      console.error('[App] search local files error:', err);
      return [];
    }
  });

  ipcMain.handle('app:pick-feedback-screenshot-file', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const result = await dialog.showOpenDialog(win, {
        title: '选择截图文件',
        defaultPath: app.getPath('pictures'),
        filters: [{ name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
        properties: ['openFile'],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0] || null;
    } catch (err) {
      console.error('[App] pick feedback screenshot file error:', err);
      return null;
    }
  });

  ipcMain.handle('app:pick-feedback-log-file', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
      if (!win) return null;
      const logDir = ensureLogsDir();
      const result = await dialog.showOpenDialog(win, {
        title: '选择日志文件',
        defaultPath: logDir,
        filters: [{ name: '日志文件', extensions: ['log'] }],
        properties: ['openFile'],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      const selectedPath = result.filePaths[0] || '';
      if (!selectedPath.toLowerCase().endsWith('.log')) {
        return null;
      }
      return selectedPath;
    } catch (err) {
      console.error('[App] pick feedback log file error:', err);
      return null;
    }
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

  ipcMain.handle('app:open-standalone-window', () => {
    try {
      openStandaloneWindow();
      return true;
    } catch (err) {
      console.error('[App] open-standalone-window error:', err);
      return false;
    }
  });

  ipcMain.handle('app:close-standalone-window', () => {
    try {
      closeStandaloneWindow();
      return true;
    } catch (err) {
      console.error('[App] close-standalone-window error:', err);
      return false;
    }
  });

  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.close();
  });
}
