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
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { ipcMain } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { broadcastSettingChange } from '../../utils/broadcast';

interface RegisterHideProcessIpcHandlersOptions {
  storeDir: string;
  hideProcessListStoreKey: string;
  autoHideFullscreenWindowsStoreKey: string;
  getConfiguredHideProcessList: () => string[];
  setConfiguredHideProcessList: (list: string[]) => void;
  setAutoHideProcessList: (list: string[]) => void;
  getAutoHideFullscreenWindows: () => boolean;
  setAutoHideFullscreenWindows: (enabled: boolean) => void;
  sanitizeProcessNameList: (list: string[]) => string[];
  checkAutoHideProcessList: () => Promise<void>;
}

/**
 * 注册隐藏进程名单 IPC 处理器
 * @description 注册隐藏进程名单获取和设置的 IPC 事件处理器
 * @param options - 配置选项，包含存储目录、键名和状态管理函数
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */
export function registerHideProcessIpcHandlers(options: RegisterHideProcessIpcHandlersOptions): void {
  ipcMain.handle('hide-process-list:get', () => {
    return options.getConfiguredHideProcessList();
  });

  ipcMain.handle('hide-process-list:set', async (_event, list: string[]) => {
    try {
      const next = options.sanitizeProcessNameList(Array.isArray(list) ? list : []);
      options.setAutoHideProcessList([...next]);

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

  ipcMain.handle('hide-process-list:auto-hide-fullscreen:get', () => {
    return options.getAutoHideFullscreenWindows();
  });

  ipcMain.handle('hide-process-list:auto-hide-fullscreen:set', async (event, enabled: boolean) => {
    try {
      const next = enabled === true;
      options.setAutoHideFullscreenWindows(next);
      const filePath = join(options.storeDir, `${options.autoHideFullscreenWindowsStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf-8');
      broadcastSettingChange(event.sender.id, `store:${options.autoHideFullscreenWindowsStoreKey}`, next);

      if (process.platform === 'win32') {
        await options.checkAutoHideProcessList().catch(() => {});
      }

      return true;
    } catch (err) {
      console.error('[HideProcessList] auto hide fullscreen persist error:', err);
      return false;
    }
  });
}
