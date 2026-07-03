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
 * @file splashWindow.ts
 * @description 启动动画窗口服务模块 - 应用启动时展示灵动岛风格入场动画
 * @author 鸡哥
 */

import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';

let splashWindow: BrowserWindow | null = null;

const SPLASH_WIDTH = 360;
const SPLASH_HEIGHT = 180;

/**
 * 创建并显示启动动画窗口
 * @description 在屏幕顶部中央显示灵动岛风格的启动动画
 */
function showSplashWindow(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.show();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;

  const x = Math.floor(workArea.x + workArea.width / 2 - SPLASH_WIDTH / 2);
  const y = Math.floor(workArea.y + 20);

  splashWindow = new BrowserWindow({
    x,
    y,
    width: SPLASH_WIDTH,
    height: SPLASH_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    type: 'toolbar',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  splashWindow.setIgnoreMouseEvents(true);
  splashWindow.setAlwaysOnTop(true, 'screen-saver');
  splashWindow.removeMenu();

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    splashWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/splash.html');
  } else {
    splashWindow.loadFile(join(__dirname, '../renderer/splash.html'));
  }

  splashWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.showInactive();
    }
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

/**
 * 关闭启动动画窗口（先播放淡出动画再关闭）
 * @description 播放 400ms 淡出动画后销毁窗口
 */
function closeSplashWindow(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    const win = splashWindow;
    win.webContents.executeJavaScript('startFadeOut()').catch(() => {});
    setTimeout(() => {
      if (win && !win.isDestroyed()) {
        win.close();
      }
    }, 450);
    splashWindow = null;
  }
}

/**
 * 获取启动窗口实例
 */
function getSplashWindow(): BrowserWindow | null {
  return splashWindow;
}

export { showSplashWindow, closeSplashWindow, getSplashWindow };
