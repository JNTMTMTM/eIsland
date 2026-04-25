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
 * @file updaterService.ts
 * @description 自动更新服务模块
 * @description 初始化 electron-updater，处理更新检查和下载进度
 * @author 鸡哥
 */

import { BrowserWindow } from 'electron';
import type { AppUpdater, UpdateInfo } from 'electron-updater';

interface InitUpdaterServiceOptions {
  updater: AppUpdater;
  getMainWindow: () => BrowserWindow | null;
  getAppPath: () => string;
  isPackaged: () => boolean;
  shouldAutoPromptUpdate?: () => boolean;
  autoCheckDelayMs?: number;
}

/**
 * 初始化自动更新服务
 * @description 配置 electron-updater，注册更新事件处理器，启动自动检查
 * @param options - 服务配置选项，包含更新器实例和窗口获取函数
 */
export function initUpdaterService(options: InitUpdaterServiceOptions): void {
  const { updater } = options;

  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowPrerelease = false;
  updater.forceDevUpdateConfig = true;
  updater.logger = console;

  console.log(`[Updater] initialized, allowPrerelease=${updater.allowPrerelease}, forceDevUpdateConfig=${updater.forceDevUpdateConfig}`);
  console.log('[Updater] appPath:', options.getAppPath());
  console.log('[Updater] isPackaged:', options.isPackaged());

  const emitToRenderer = (channel: string, payload: unknown): void => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (win.isDestroyed()) return;
      try {
        win.webContents.send(channel, payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes('Object has been destroyed')) {
          console.error('[Updater] renderer emit error:', err);
        }
      }
    });
  };

  updater.on('checking-for-update', () => {
    console.log('[Updater] checking-for-update...');
  });

  updater.on('update-available', (info: UpdateInfo) => {
    console.log('[Updater] update-available:', info.version);
    emitToRenderer('updater:update-available', {
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
    });
  });

  updater.on('update-not-available', (info: UpdateInfo) => {
    console.log('[Updater] update-not-available, current:', info.version);
    emitToRenderer('updater:update-not-available', {
      version: info.version,
    });
  });

  updater.on('download-progress', (progress) => {
    console.log(`[Updater] download-progress: ${progress.percent.toFixed(1)}%  ${(progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s  ${progress.transferred}/${progress.total}`);
    emitToRenderer('updater:download-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  updater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('[Updater] update-downloaded:', info.version);
    emitToRenderer('updater:update-downloaded', { version: info.version });
  });

  updater.on('error', (err) => {
    console.error('[Updater] error:', err.message);
  });

  setTimeout(() => {
    const enabled = options.shouldAutoPromptUpdate ? options.shouldAutoPromptUpdate() : true;
    if (!enabled) {
      console.log('[Updater] startup auto-check skipped by setting (update-auto-prompt-enabled=false)');
      return;
    }
    console.log('[Updater] startup auto-check requested, waiting renderer pre-check flow...');
    emitToRenderer('updater:startup-auto-check-request', {
      requestedAt: Date.now(),
    });
  }, options.autoCheckDelayMs ?? 5000);
}
