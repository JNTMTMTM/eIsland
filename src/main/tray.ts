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
 * @file tray.ts
 * @description 系统托盘模块：托盘图标加载、托盘实例创建及右键菜单配置
 * @author 鸡哥
 */

import { Tray, Menu, nativeImage, BrowserWindow, app, shell } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import { openCountdownWindow } from './window/countdownWindow';

let tray: Tray | null = null;
let cachedMainWindow: BrowserWindow | null = null;

/**
 * 托盘图标路径常量
 * @description 开发环境从项目根目录加载，生产环境从 extraResources 打包目录加载
 */
const TRAY_ICON_PATH = is.dev
  ? join(__dirname, '../../resources/icon/eisland_16x16.ico')
  : join(process.resourcesPath, 'icon/eisland_16x16.ico');

/**
 * 创建系统托盘
 * @description 初始化托盘图标、右键菜单，提供退出和显示窗口功能
 */
function createTray(mainWindow: BrowserWindow | null): Tray {
  cachedMainWindow = mainWindow;
  const icon = nativeImage.createFromPath(TRAY_ICON_PATH);
  tray = new Tray(icon);
  const logDir = join(app.getPath('userData'), 'logs');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示灵动岛',
      click: () => {
        mainWindow?.show();
      }
    },
    {
      label: '隐藏灵动岛',
      click: () => {
        mainWindow?.hide();
      }
    },
    {
      label: '打开配置界面',
      click: () => {
        openCountdownWindow();
      }
    },
    {
      label: '窗口置顶',
      type: 'checkbox',
      checked: mainWindow?.isAlwaysOnTop() ?? false,
      click: (menuItem) => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.setAlwaysOnTop(Boolean(menuItem.checked));
      }
    },
    { type: 'separator' },
    {
      label: '打开日志文件夹',
      click: async () => {
        await shell.openPath(logDir);
      }
    },
    {
      label: '重启灵动岛',
      click: () => {
        app.relaunch();
        app.quit();
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('eIsland');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  return tray;
}

/**
 * 销毁系统托盘
 * @description 应用退出时调用，释放托盘资源
 */
function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

/**
 * 切换系统托盘图标显示/隐藏
 * @description 隐藏时销毁托盘；显示时重建托盘
 */
function toggleTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  } else {
    createTray(cachedMainWindow);
  }
}

export { createTray, destroyTray, toggleTray };
