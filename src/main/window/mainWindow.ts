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
 * @file mainWindow.ts
 * @description 主窗口服务模块
 * @description 管理灵动岛主窗口的创建、位置控制和事件处理
 * @author 鸡哥
 */

import { BrowserWindow, screen, shell } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';

interface WindowSizeOptions {
  islandWidth: number;
  islandHeight: number;
}

interface CreateMainWindowServiceOptions {
  getMainWindow: () => BrowserWindow | null;
  setMainWindow: (window: BrowserWindow | null) => void;
  getIslandPositionOffset: () => { x: number; y: number };
  getIslandDisplaySelection: () => string;
  setIslandPositionOffset: (offset: { x: number; y: number }) => void;
  sanitizeIslandPositionOffset: (offset: { x?: number; y?: number }) => { x: number; y: number };
  sizes: WindowSizeOptions;
}

interface MainWindowService {
  createWindow: () => void;
  getInitialCenterX: () => number;
  applyIslandPositionOffset: (offset: { x: number; y: number }) => void;
}

/**
 * 创建主窗口服务
 * @description 初始化并返回主窗口管理服务，负责窗口创建、位置控制和生命周期管理
 * @param options - 服务配置选项，包含主窗口获取/设置函数、位置偏移管理、尺寸配置
 * @returns 主窗口服务对象，包含 createWindow、getInitialCenterX、applyIslandPositionOffset 方法
 */
export function createMainWindowService(options: CreateMainWindowServiceOptions): MainWindowService {
  let initialCenterX = 0;

  function getTargetDisplay(): Electron.Display {
    const selection = options.getIslandDisplaySelection();
    if (selection !== 'primary') {
      const targetId = Number(selection);
      if (Number.isFinite(targetId)) {
        const target = screen.getAllDisplays().find((display) => display.id === targetId);
        if (target) return target;
      }
    }
    return screen.getPrimaryDisplay();
  }

  function getInitialIslandBounds(): Electron.Rectangle {
    const targetDisplay = getTargetDisplay();
    const { x: workX, y: workY, width: workWidth } = targetDisplay.workArea;
    const centeredX = Math.round(workX + (workWidth - options.sizes.islandWidth) / 2);
    const offset = options.getIslandPositionOffset();
    const x = centeredX + offset.x;
    const y = Math.round(workY + offset.y);
    return {
      x,
      y,
      width: options.sizes.islandWidth,
      height: options.sizes.islandHeight,
    };
  }

  function applyIslandPositionOffset(offset: { x: number; y: number }): void {
    const normalized = options.sanitizeIslandPositionOffset(offset);
    options.setIslandPositionOffset(normalized);

    const nextBaseBounds = getInitialIslandBounds();
    initialCenterX = nextBaseBounds.x + options.sizes.islandWidth / 2;

    const mainWindow = options.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:island-position:changed', {
        ...normalized,
      });
    }

    if (!mainWindow || mainWindow.isDestroyed()) return;
    const bounds = mainWindow.getBounds();
    const targetX = Math.round(initialCenterX - bounds.width / 2);

    mainWindow.setBounds({
      x: targetX,
      y: nextBaseBounds.y,
      width: bounds.width,
      height: bounds.height,
    });
  }

  function createWindow(): void {
    const initialBounds = getInitialIslandBounds();
    initialCenterX = initialBounds.x + options.sizes.islandWidth / 2;

    const mainWindow = new BrowserWindow({
      width: options.sizes.islandWidth,
      height: options.sizes.islandHeight,
      x: initialBounds.x,
      y: initialBounds.y,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      icon: is.dev
        ? join(__dirname, '../../resources/icon/eisland_256x256.ico')
        : join(process.resourcesPath, 'icon/eisland_256x256.ico'),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false,
        enableWebSQL: false,
        v8CacheOptions: 'bypassHeatCheck',
      },
    });

    options.setMainWindow(mainWindow);

    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setBounds(initialBounds, false);

    mainWindow.on('ready-to-show', () => {
      mainWindow.setBounds(initialBounds, false);
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    });

    mainWindow.on('blur', () => {
      mainWindow.setBackgroundColor('#00000000');
      mainWindow.webContents.executeJavaScript(`
        document.body.style.background = 'transparent';
        document.documentElement.style.background = 'transparent';
      `);
    });

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
  }

  return {
    createWindow,
    getInitialCenterX: () => initialCenterX,
    applyIslandPositionOffset,
  };
}
