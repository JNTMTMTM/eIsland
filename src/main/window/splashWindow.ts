/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
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
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * @file splashWindow.ts
 * @description 启动画面窗口服务模块
 * @description 管理应用启动画面的创建、显示和关闭，在主窗口加载期间提供视觉反馈
 * @author 鸡哥
 */

import { BrowserWindow } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';

let splashWindow: BrowserWindow | null = null;

/**
 * 创建并显示启动画面窗口
 * @description 创建一个无边框、居中的启动画面窗口，显示应用图标和加载动画
 */
function showSplashWindow(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.show();
    return;
  }

  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    icon: is.dev
      ? join(__dirname, '../../resources/icon/eisland_256x256.ico')
      : join(process.resourcesPath, 'icon/eisland_256x256.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  splashWindow.setAlwaysOnTop(true, 'screen-saver');
  splashWindow.center();
  splashWindow.removeMenu();

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    splashWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/splash.html');
  } else {
    splashWindow.loadFile(join(__dirname, '../renderer/splash.html'));
  }

  splashWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.show();
    }
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

/**
 * 关闭启动画面窗口
 * @description 带有淡出动画效果地关闭启动画面窗口
 */
function closeSplashWindow(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    const win = splashWindow;
    win.webContents.executeJavaScript('startFadeOut()').catch(() => {});
    setTimeout(() => {
      if (win && !win.isDestroyed()) {
        win.close();
      }
    }, 300);
    splashWindow = null;
  }
}

/**
 * 获取启动画面窗口实例
 */
function getSplashWindow(): BrowserWindow | null {
  return splashWindow;
}

export { showSplashWindow, closeSplashWindow, getSplashWindow };
