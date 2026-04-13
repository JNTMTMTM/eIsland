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
 * @file screenshotHotkey.ts
 * @description 截图快捷键 IPC 处理模块
 * @description 处理截图快捷键的获取、设置和持久化
 * @author 鸡哥
 */

import { ipcMain } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';

interface RegisterScreenshotHotkeyIpcHandlersOptions {
  storeDir: string;
  screenshotHotkeyStoreKey: string;
  getCurrentScreenshotHotkey: () => string;
  readScreenshotHotkeyConfig: () => string;
  getReservedHotkeys: () => string[];
  registerScreenshotHotkey: (accelerator: string) => boolean;
}

/**
 * 注册截图快捷键 IPC 处理器
 * @description 注册截图快捷键获取和设置的 IPC 事件处理器
 * @param options - 配置选项，包含存储目录、键名和热键服务函数
 */
export function registerScreenshotHotkeyIpcHandlers(options: RegisterScreenshotHotkeyIpcHandlersOptions): void {
  ipcMain.handle('screenshot-hotkey:get', () => {
    return options.getCurrentScreenshotHotkey() || options.readScreenshotHotkeyConfig();
  });

  ipcMain.handle('screenshot-hotkey:set', (_event, accelerator: string) => {
    const reserved = options.getReservedHotkeys();
    if (accelerator && reserved.some((key) => key && key === accelerator)) {
      return false;
    }

    const success = options.registerScreenshotHotkey(accelerator);
    if (success) {
      const filePath = join(options.storeDir, `${options.screenshotHotkeyStoreKey}.json`);
      try {
        writeFileSync(filePath, JSON.stringify(accelerator, null, 2), 'utf-8');
      } catch (err) {
        console.error('[ScreenshotHotkey] persist error:', err);
      }
    }
    return success;
  });
}
