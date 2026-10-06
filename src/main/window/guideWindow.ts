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
 * @file guideWindow.ts
 * @description 引导配置窗口服务模块
 * @description 管理首次启动引导窗口的创建和关闭，splash 动画结束后显示，
 *   用户完成配置后通过 IPC 通知关闭，随后显示主窗口
 * @author 鸡哥
 */

import { BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';

let guideWindow: BrowserWindow | null = null;

/** 引导完成回调（由 renderer 的 guide:complete IPC 触发） */
let guideCompleteResolve: (() => void) | null = null;

/** 引导窗口尺寸 */
const GUIDE_WIDTH = 860;
const GUIDE_HEIGHT = 500;

/**
 * 显示引导配置窗口
 * @description 创建引导窗口，窗口独立运行，不阻塞调用方。
 *              当用户完成配置（renderer 发送 guide:complete）后 Promise resolve。
 * @returns Promise<void> 引导完成后 resolve
 */
function showGuideWindow(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (guideWindow && !guideWindow.isDestroyed()) {
      guideWindow.focus();
      resolve();
      return;
    }

    guideCompleteResolve = resolve;

    guideWindow = new BrowserWindow({
      width: GUIDE_WIDTH,
      height: GUIDE_HEIGHT,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      movable: true,
      thickFrame: false,
      hasShadow: false,
      center: true,
      title: '',
      icon: is.dev
        ? join(__dirname, '../../resources/icon/eisland_256x256.ico')
        : join(process.resourcesPath, 'icon/eisland_256x256.ico'),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    guideWindow.removeMenu();

    /** 监听 renderer 侧引导完成事件 */
    const handleGuideComplete = (): void => {
      if (guideCompleteResolve) {
        guideCompleteResolve();
        guideCompleteResolve = null;
      }
      if (guideWindow && !guideWindow.isDestroyed()) {
        guideWindow.close();
      }
    };

    ipcMain.once('guide:complete', handleGuideComplete);

    guideWindow.on('closed', () => {
      ipcMain.removeListener('guide:complete', handleGuideComplete);
      guideWindow = null;
      /** 窗口被意外关闭时也 resolve，不阻塞主窗口 */
      if (guideCompleteResolve) {
        guideCompleteResolve();
        guideCompleteResolve = null;
      }
    });

    guideWindow.once('ready-to-show', () => {
      if (guideWindow && !guideWindow.isDestroyed()) {
        guideWindow.show();
      }
    });

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      guideWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/html/DynamicIslandGuide.html');
    } else {
      guideWindow.loadFile(join(__dirname, '../renderer/html/DynamicIslandGuide.html'));
    }
  });
}

/**
 * 获取引导窗口实例
 */
function getGuideWindow(): BrowserWindow | null {
  return guideWindow;
}

export { showGuideWindow, getGuideWindow };
