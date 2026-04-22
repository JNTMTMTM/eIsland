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
 * @file theme.ts
 * @description 主题相关 IPC 处理模块
 * @description 处理主题模式获取和设置的 IPC 请求
 * @author 鸡哥
 */

import { ipcMain } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { broadcastSettingChange } from '../../utils/broadcast';

interface RegisterThemeIpcHandlersOptions {
  storeDir: string;
  themeModeStoreKey: string;
}

/**
 * 注册主题相关 IPC 处理器
 * @description 注册主题模式获取和设置的 IPC 事件处理器
 * @param options - 配置选项，包含存储目录和键名
 */
export function registerThemeIpcHandlers(options: RegisterThemeIpcHandlersOptions): void {
  ipcMain.handle('theme:mode:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.themeModeStoreKey}.json`);
      if (!existsSync(filePath)) return 'dark';
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return data === 'dark' || data === 'light' || data === 'system' ? data : 'dark';
    } catch {
      return 'dark';
    }
  });

  ipcMain.handle('theme:mode:set', (event, mode: string) => {
    try {
      const safe = mode === 'dark' || mode === 'light' || mode === 'system' ? mode : 'dark';
      const filePath = join(options.storeDir, `${options.themeModeStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(safe, null, 2), 'utf-8');
      broadcastSettingChange(event.sender.id, 'theme:mode', safe);
      return true;
    } catch (err) {
      console.error('[Theme] persist error:', err);
      return false;
    }
  });
}
