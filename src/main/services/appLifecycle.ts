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
 * @file appLifecycle.ts
 * @description 应用生命周期管理模块
 * @description 处理应用实例、窗口事件和应用退出等生命周期事件
 * @author 鸡哥
 */

import { app, BrowserWindow } from 'electron';

interface RegisterAppLifecycleHandlersOptions {
  getMainWindow: () => BrowserWindow | null;
  onWillQuit: () => void;
  onWindowAllClosed: () => void;
}

/**
 * 注册应用生命周期处理器
 * @description 注册多实例、应用退出和窗口关闭等生命周期事件处理器
 * @param options - 配置选项，包含窗口获取和回调函数
 */
export function registerAppLifecycleHandlers(options: RegisterAppLifecycleHandlersOptions): void {
  app.on('second-instance', () => {
    const mainWindow = options.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.on('will-quit', () => {
    options.onWillQuit();
  });

  app.on('window-all-closed', () => {
    options.onWindowAllClosed();
  });
}
