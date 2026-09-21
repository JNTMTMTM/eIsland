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
import { isDeepStrictEqual } from 'node:util';
import { broadcastSettingChange } from '../../utils/broadcast';
import type { RegisterStoreIpcHandlersOptions } from './types';

/** 合法的 store key：不含路径分隔符和 traversal 片段 */
function isValidStoreKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0 && !/[\\/]/.test(key) && !key.includes('..');
}

/**
 * 注册通用存储 IPC 处理器
 * @description 注册通用键值存储读写 IPC 事件处理器
 * @param options - 配置选项，包含存储目录
 */
export function registerStoreIpcHandlers(options: RegisterStoreIpcHandlersOptions): void {
  // 同步读改写单个闹钟，避免两个界面的开关操作用旧列表覆盖其他字段。
  ipcMain.handle('alarm:set-enabled', (_event, id: number, enabled: boolean) => {
    if (!Number.isSafeInteger(id) || id < 0 || typeof enabled !== 'boolean') return false;
    try {
      const filePath = join(options.storeDir, 'alarms.json');
      if (!existsSync(filePath)) return false;
      const alarms: unknown = JSON.parse(readFileSync(filePath, 'utf-8'));
      if (!Array.isArray(alarms)) return false;
      const alarm = alarms.find((item) => item && typeof item === 'object' && item.id === id);
      if (!alarm) return false;
      alarm.enabled = enabled;
      writeFileSync(filePath, JSON.stringify(alarms, null, 2), 'utf-8');
      broadcastSettingChange(-1, 'store:alarms', alarms);
      return true;
    } catch (err) {
      console.error('[Alarm] update enabled error:', err);
      return false;
    }
  });

  ipcMain.handle('store:read', (_event, key: string, strict = false) => {
    try {
      if (!isValidStoreKey(key)) return null;
      const filePath = join(options.storeDir, `${key}.json`);
      if (!existsSync(filePath)) return null;
      const raw = readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[Store] read '${key}' error:`, err);
      if (strict) throw err;
      return null;
    }
  });

  // 同步比较并写入，两个渲染窗口基于同一快照的修改只能有一个成功。
  ipcMain.handle('store:compare-and-swap', (_event, key: string, expected: unknown, data: unknown) => {
    try {
      if (!isValidStoreKey(key)) return 'error';
      const filePath = join(options.storeDir, `${key}.json`);
      const current: unknown = existsSync(filePath) ? JSON.parse(readFileSync(filePath, 'utf-8')) : null;
      if (!isDeepStrictEqual(current, expected)) return 'conflict';
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      // 包含发起窗口，确保各窗口按主进程提交顺序接收更新。
      broadcastSettingChange(-1, `store:${key}`, data);
      return 'updated';
    } catch (err) {
      console.error(`[Store] compare-and-swap '${key}' error:`, err);
      return 'error';
    }
  });

  ipcMain.handle('store:write', (event, key: string, data: unknown) => {
    try {
      if (!isValidStoreKey(key)) return false;
      const filePath = join(options.storeDir, `${key}.json`);
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      broadcastSettingChange(event.sender.id, `store:${key}`, data);
      return true;
    } catch (err) {
      console.error(`[Store] write '${key}' error:`, err);
      return false;
    }
  });
}
