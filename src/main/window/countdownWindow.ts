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
 * @file countdownWindow.ts
 * @description 倒数日/TODOs/设置 独立窗口服务模块
 * @author 鸡哥
 */

import { BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';

let countdownWindow: BrowserWindow | null = null;

/**
 * 打开倒数日独立窗口（若已打开则聚焦）
 */
function openCountdownWindow(): void {
  if (countdownWindow && !countdownWindow.isDestroyed()) {
    countdownWindow.focus();
    return;
  }

  countdownWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 720,
    minHeight: 480,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    resizable: true,
    icon: is.dev
      ? join(__dirname, '../../resources/icon/eisland_256x256.ico')
      : join(process.resourcesPath, 'icon/eisland_256x256.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  countdownWindow.on('ready-to-show', () => {
    countdownWindow?.show();
  });

  countdownWindow.on('closed', () => {
    countdownWindow = null;
  });

  countdownWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    countdownWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/countdown.html');
  } else {
    countdownWindow.loadFile(join(__dirname, '../renderer/countdown.html'));
  }
}

/**
 * 关闭倒数日独立窗口
 */
function closeCountdownWindow(): void {
  if (countdownWindow && !countdownWindow.isDestroyed()) {
    countdownWindow.close();
  }
}

/**
 * 获取倒数日独立窗口实例
 */
function getCountdownWindow(): BrowserWindow | null {
  return countdownWindow;
}

export { openCountdownWindow, closeCountdownWindow, getCountdownWindow };
