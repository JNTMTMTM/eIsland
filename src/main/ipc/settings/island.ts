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
 * @file island.ts
 * @description 灵动岛相关 IPC 处理模块
 * @description 处理透明度、鼠标移开行为、开机自启和导航顺序等 IPC 请求
 * @author 鸡哥
 */

import { app, ipcMain } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { broadcastSettingChange } from '../../utils/broadcast';

interface RegisterIslandIpcHandlersOptions {
  storeDir: string;
  islandOpacityStoreKey: string;
  expandMouseleaveIdleStoreKey: string;
  maxExpandMouseleaveIdleStoreKey: string;
  autostartModeStoreKey: string;
  navOrderStoreKey: string;
}

/**
 * 注册灵动岛相关 IPC 处理器
 * @description 注册透明度、鼠标移开行为、开机自启和导航顺序的 IPC 事件处理器
 * @param options - 配置选项，包含存储目录和键名
 */
export function registerIslandIpcHandlers(options: RegisterIslandIpcHandlersOptions): void {
  ipcMain.handle('island:opacity:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.islandOpacityStoreKey}.json`);
      if (!existsSync(filePath)) return 100;
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      const val = typeof data === 'number' ? data : 100;
      return Math.max(10, Math.min(100, Math.round(val)));
    } catch {
      return 100;
    }
  });

  ipcMain.handle('island:opacity:set', (event, opacity: number) => {
    try {
      const safe = Math.max(10, Math.min(100, Math.round(opacity)));
      const filePath = join(options.storeDir, `${options.islandOpacityStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(safe, null, 2), 'utf-8');
      broadcastSettingChange(event.sender.id, 'island:opacity', safe);
      return true;
    } catch (err) {
      console.error('[Opacity] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('island:expand-mouseleave-idle:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.expandMouseleaveIdleStoreKey}.json`);
      if (!existsSync(filePath)) return false;
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return typeof data === 'boolean' ? data : false;
    } catch {
      return false;
    }
  });

  ipcMain.handle('island:expand-mouseleave-idle:set', (event, enabled: boolean) => {
    try {
      const filePath = join(options.storeDir, `${options.expandMouseleaveIdleStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(enabled, null, 2), 'utf-8');
      broadcastSettingChange(event.sender.id, 'island:expand-mouseleave-idle', enabled);
      return true;
    } catch (err) {
      console.error('[ExpandMouseleaveIdle] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('island:maxexpand-mouseleave-idle:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.maxExpandMouseleaveIdleStoreKey}.json`);
      if (!existsSync(filePath)) return false;
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return typeof data === 'boolean' ? data : false;
    } catch {
      return false;
    }
  });

  ipcMain.handle('island:maxexpand-mouseleave-idle:set', (event, enabled: boolean) => {
    try {
      const filePath = join(options.storeDir, `${options.maxExpandMouseleaveIdleStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(enabled, null, 2), 'utf-8');
      broadcastSettingChange(event.sender.id, 'island:maxexpand-mouseleave-idle', enabled);
      return true;
    } catch (err) {
      console.error('[MaxExpandMouseleaveIdle] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('island:spring-animation:get', () => {
    try {
      const filePath = join(options.storeDir, 'spring-animation.json');
      if (!existsSync(filePath)) return true; // Default to true
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return typeof data === 'boolean' ? data : true;
    } catch {
      return true;
    }
  });

  ipcMain.handle('island:spring-animation:set', (event, enabled: boolean) => {
    try {
      const filePath = join(options.storeDir, 'spring-animation.json');
      writeFileSync(filePath, JSON.stringify(enabled, null, 2), 'utf-8');
      broadcastSettingChange(event.sender.id, 'island:spring-animation', enabled);
      return true;
    } catch (err) {
      console.error('[SpringAnimation] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('island:animation-speed:get', () => {
    try {
      const filePath = join(options.storeDir, 'animation-speed.json');
      if (!existsSync(filePath)) return 'medium';
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return data === 'slow' || data === 'medium' || data === 'fast' ? data : 'medium';
    } catch {
      return 'medium';
    }
  });

  ipcMain.handle('island:animation-speed:set', (event, speed: string) => {
    try {
      const valid = speed === 'slow' || speed === 'medium' || speed === 'fast' ? speed : 'medium';
      const filePath = join(options.storeDir, 'animation-speed.json');
      writeFileSync(filePath, JSON.stringify(valid, null, 2), 'utf-8');
      broadcastSettingChange(event.sender.id, 'island:animation-speed', valid);
      return true;
    } catch (err) {
      console.error('[AnimationSpeed] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('island:autostart:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.autostartModeStoreKey}.json`);
      if (!existsSync(filePath)) return 'disabled';
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return ['disabled', 'enabled', 'high-priority'].includes(data) ? data : 'disabled';
    } catch {
      return 'disabled';
    }
  });

  ipcMain.handle('island:autostart:set', (event, mode: string) => {
    try {
      const safeMode = ['disabled', 'enabled', 'high-priority'].includes(mode) ? mode : 'disabled';
      const filePath = join(options.storeDir, `${options.autostartModeStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(safeMode, null, 2), 'utf-8');

      if (safeMode === 'disabled') {
        app.setLoginItemSettings({ openAtLogin: false });
      } else {
        app.setLoginItemSettings({
          openAtLogin: true,
          args: safeMode === 'high-priority' ? ['--high-priority'] : [],
        });
      }
      broadcastSettingChange(event.sender.id, 'island:autostart', safeMode);
      return true;
    } catch (err) {
      console.error('[Autostart] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('island:nav-order:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.navOrderStoreKey}.json`);
      if (!existsSync(filePath)) return { visibleOrder: [], hiddenOrder: [] };
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);

      if (Array.isArray(data)) {
        return {
          visibleOrder: data.filter((v: unknown) => typeof v === 'string'),
          hiddenOrder: [],
        };
      }

      const visibleRaw = (data as Record<string, unknown>)?.visibleOrder;
      const hiddenRaw = (data as Record<string, unknown>)?.hiddenOrder;
      return {
        visibleOrder: Array.isArray(visibleRaw) ? visibleRaw.filter((v: unknown) => typeof v === 'string') : [],
        hiddenOrder: Array.isArray(hiddenRaw) ? hiddenRaw.filter((v: unknown) => typeof v === 'string') : [],
      };
    } catch {
      return { visibleOrder: [], hiddenOrder: [] };
    }
  });

  ipcMain.handle('island:nav-order:set', (_event, payload: { visibleOrder?: string[]; hiddenOrder?: string[] }) => {
    try {
      const filePath = join(options.storeDir, `${options.navOrderStoreKey}.json`);
      const visibleOrder = Array.isArray(payload?.visibleOrder) ? payload.visibleOrder.filter((v: unknown) => typeof v === 'string') : [];
      const hiddenOrder = Array.isArray(payload?.hiddenOrder) ? payload.hiddenOrder.filter((v: unknown) => typeof v === 'string') : [];
      const safe = { visibleOrder, hiddenOrder };
      writeFileSync(filePath, JSON.stringify(safe, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[NavOrder] persist error:', err);
      return false;
    }
  });
}
