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
 * @file updater.ts
 * @description 自动更新相关 IPC 处理模块
 * @description 处理检查更新、下载更新和安装更新的 IPC 请求
 * @author 鸡哥
 */

import { ipcMain } from 'electron';
import type { AppUpdater } from 'electron-updater';

type UpdateSourceKey = 'cloudflare-r2' | 'tencent-cos' | 'aliyun-oss' | 'github';

interface RegisterUpdaterIpcHandlersOptions {
  updater: AppUpdater;
  getVersion: () => string;
  isPackaged: () => boolean;
}

const DEFAULT_UPDATE_SOURCE: UpdateSourceKey = 'cloudflare-r2';
const R2_UPDATE_URL = 'https://pub-4c1e73c3c2004901aecd6ca014cb16bd.r2.dev';
const COS_UPDATE_URL = 'https://download-cos.eisland.pyisland.com';
const OSS_UPDATE_URL = 'https://download-oss.eisland.pyisland.com/';
const GITHUB_OWNER = 'JNTMTMTM';
const GITHUB_REPO = 'eIsland';

function normalizeUpdateSource(value: unknown): UpdateSourceKey {
  if (value === 'github') return 'github';
  if (value === 'tencent-cos') return 'tencent-cos';
  if (value === 'aliyun-oss') return 'aliyun-oss';
  return DEFAULT_UPDATE_SOURCE;
}

function applyUpdateSource(updater: AppUpdater, source: UpdateSourceKey): void {
  if (source === 'github') {
    updater.setFeedURL({
      provider: 'github',
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      private: false,
    });
    return;
  }
  if (source === 'tencent-cos') {
    updater.setFeedURL({
      provider: 'generic',
      url: COS_UPDATE_URL,
    });
    return;
  }
  if (source === 'aliyun-oss') {
    updater.setFeedURL({
      provider: 'generic',
      url: OSS_UPDATE_URL,
    });
    return;
  }
  updater.setFeedURL({
    provider: 'generic',
    url: R2_UPDATE_URL,
  });
}

/**
 * 注册自动更新相关 IPC 处理器
 * @description 注册检查更新、下载更新、安装更新和版本查询的 IPC 事件处理器
 * @param options - 配置选项，包含更新器和版本信息获取函数
 */
export function registerUpdaterIpcHandlers(options: RegisterUpdaterIpcHandlersOptions): void {
  ipcMain.handle('updater:check', async (_event, sourceRaw?: string) => {
    try {
      const source = normalizeUpdateSource(sourceRaw);
      applyUpdateSource(options.updater, source);
      const current = options.getVersion();
      console.log('[Updater:check] currentVersion:', current);
      console.log('[Updater:check] app.isPackaged:', options.isPackaged());
      console.log('[Updater:check] source:', source);
      console.log('[Updater:check] calling checkForUpdates...');
      const result = await options.updater.checkForUpdates();
      console.log('[Updater:check] result:', JSON.stringify(result?.updateInfo ?? null));
      if (!result || !result.updateInfo) {
        console.log('[Updater:check] no updateInfo returned');
        return { available: false };
      }
      const latest = result.updateInfo.version;
      console.log(`[Updater:check] latest=${latest} current=${current} available=${latest !== current}`);
      return {
        available: latest !== current,
        version: latest,
        releaseNotes: result.updateInfo.releaseNotes || '',
        currentVersion: current,
      };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error('[Updater:check] ERROR:', e.message);
      console.error('[Updater:check] stack:', e.stack);
      return { available: false, error: e.message };
    }
  });

  ipcMain.handle('updater:download', async (_event, sourceRaw?: string) => {
    try {
      const source = normalizeUpdateSource(sourceRaw);
      applyUpdateSource(options.updater, source);
      console.log('[Updater:download] source:', source);
      console.log('[Updater:download] step 1 - checkForUpdates...');
      const checkResult = await options.updater.checkForUpdates();
      console.log('[Updater:download] checkResult:', JSON.stringify(checkResult?.updateInfo ?? null));
      if (!checkResult || !checkResult.updateInfo) {
        console.error('[Updater:download] checkForUpdates returned no info, aborting download');
        return false;
      }
      console.log('[Updater:download] step 2 - downloadUpdate...');
      await options.updater.downloadUpdate();
      console.log('[Updater:download] download finished successfully');
      return true;
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error('[Updater:download] ERROR:', e.message);
      console.error('[Updater:download] stack:', e.stack);
      return false;
    }
  });

  ipcMain.handle('updater:install', () => {
    options.updater.quitAndInstall(false, true);
    return true;
  });

  ipcMain.handle('updater:version', () => {
    return options.getVersion();
  });
}
