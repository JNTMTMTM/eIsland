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
 * @file store.ts
 * @description 通用存储 IPC 处理模块
 * @description 处理通用键值存储的读取和写入操作
 * @author 鸡哥
 */

import { ipcMain } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface RegisterStoreIpcHandlersOptions {
  storeDir: string;
}

/**
 * 注册通用存储 IPC 处理器
 * @description 注册通用键值存储读写 IPC 事件处理器
 * @param options - 配置选项，包含存储目录
 */
export function registerStoreIpcHandlers(options: RegisterStoreIpcHandlersOptions): void {
  ipcMain.handle('store:read', (_event, key: string) => {
    try {
      const filePath = join(options.storeDir, `${key}.json`);
      if (!existsSync(filePath)) return null;
      const raw = readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[Store] read '${key}' error:`, err);
      return null;
    }
  });

  ipcMain.handle('store:write', (_event, key: string, data: unknown) => {
    try {
      const filePath = join(options.storeDir, `${key}.json`);
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`[Store] write '${key}' error:`, err);
      return false;
    }
  });
}
