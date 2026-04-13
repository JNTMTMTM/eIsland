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
 * @file hideProcess.ts
 * @description 隐藏进程名单 IPC 处理模块
 * @description 处理隐藏进程名单的读取、设置和持久化
 * @author 鸡哥
 */

import { ipcMain } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';

interface RegisterHideProcessIpcHandlersOptions {
  storeDir: string;
  hideProcessListStoreKey: string;
  getConfiguredHideProcessList: () => string[];
  setConfiguredHideProcessList: (list: string[]) => void;
  getAutoHideProcessList: () => string[];
  setAutoHideProcessList: (list: string[]) => void;
  sanitizeProcessNameList: (list: string[]) => string[];
  normalizeProcessName: (name: string) => string;
  checkAutoHideProcessList: () => Promise<void>;
}

/**
 * 注册隐藏进程名单 IPC 处理器
 * @description 注册隐藏进程名单获取和设置的 IPC 事件处理器
 * @param options - 配置选项，包含存储目录、键名和状态管理函数
 */
export function registerHideProcessIpcHandlers(options: RegisterHideProcessIpcHandlersOptions): void {
  ipcMain.handle('hide-process-list:get', () => {
    return options.getConfiguredHideProcessList();
  });

  ipcMain.handle('hide-process-list:set', async (_event, list: string[]) => {
    try {
      const next = options.sanitizeProcessNameList(Array.isArray(list) ? list : []);
      const nextNormalized = new Set(next.map(options.normalizeProcessName));

      const currentRuntime = options.getAutoHideProcessList();
      const nextRuntime = currentRuntime.filter((name) => nextNormalized.has(options.normalizeProcessName(name)));
      options.setAutoHideProcessList(nextRuntime);

      options.setConfiguredHideProcessList(next);
      const filePath = join(options.storeDir, `${options.hideProcessListStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf-8');

      if (process.platform === 'win32') {
        await options.checkAutoHideProcessList().catch(() => {});
      }

      return true;
    } catch (err) {
      console.error('[HideProcessList] persist error:', err);
      return false;
    }
  });
}
