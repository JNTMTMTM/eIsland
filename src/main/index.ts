/**
 * @file index.ts
 * @description Electron 主进程入口，负责任务栏窗口创建、透明窗口配置及系统级交互
 * @author 鸡哥
 */

import { app, BrowserWindow, shell, screen, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { createTray } from './tray';

/** 防止 Electron 创建多个实例 */
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

/** 灵动岛尺寸常量 */
const ISLAND_WIDTH = 240;
const ISLAND_HEIGHT = 42;
const EXPANDED_WIDTH = 500;
const EXPANDED_HEIGHT = 60;

/** 记录窗口初始中心 X 坐标 */
let initialCenterX = 0;

/**
 * 创建 Electron BrowserWindow 实例，配置透明无边框灵动岛窗口
 * @description 窗口固定尺寸、始终置顶、跳过任务栏，并初始化鼠标穿透行为
 */
function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const { x: workX, y: workY } = primaryDisplay.workArea;

  /** 计算初始中心 X 坐标，用于展开/收缩时保持居中 */
  initialCenterX = workX + (screenWidth - ISLAND_WIDTH) / 2 + ISLAND_WIDTH / 2;

  mainWindow = new BrowserWindow({
    width: ISLAND_WIDTH,
    height: ISLAND_HEIGHT,
    x: workX + (screenWidth - ISLAND_WIDTH) / 2,
    y: workY,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  /**
   * 初始化：透明像素区域设为可穿透，使鼠标事件传递到下层窗口
   * forward: true 仍转发鼠标事件，但不会阻塞（实际由渲染进程按需控制）
   */
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  /**
   * 窗口失焦时强制背景重绘，防止 Windows DWM 缓存白色回退背景
   */
  mainWindow.on('blur', () => {
    if (mainWindow) {
      mainWindow.setBackgroundColor('#00000000');
      mainWindow.webContents.executeJavaScript(`
        document.body.style.background = 'transparent';
        document.documentElement.style.background = 'transparent';
      `);
    }
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

/** 注册 IPC 处理器，供渲染进程动态切换鼠标穿透状态及调整窗口大小 */
function registerIpcHandlers(): void {
  ipcMain.on('window:enable-mouse-passthrough', () => {
    if (mainWindow) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  });

  ipcMain.on('window:disable-mouse-passthrough', () => {
    if (mainWindow) {
      mainWindow.setIgnoreMouseEvents(false);
    }
  });

  /**
   * 展开窗口 - 基于初始中心点，向两边均匀扩展
   * @description 窗口宽度从 180px 扩展到 320px，高度从 42px 扩展到 120px
   */
  ipcMain.on('window:expand', () => {
    if (mainWindow) {
      mainWindow.setBounds({
        x: Math.round(initialCenterX - EXPANDED_WIDTH / 2),
        y: mainWindow.getBounds().y,
        width: EXPANDED_WIDTH,
        height: EXPANDED_HEIGHT
      });
    }
  });

  /**
   * 收缩窗口 - 基于初始中心点，收缩回原始尺寸
   * @description 窗口恢复到 180x42 的 idle 状态
   */
  ipcMain.on('window:collapse', () => {
    if (mainWindow) {
      mainWindow.setBounds({
        x: Math.round(initialCenterX - ISLAND_WIDTH / 2),
        y: mainWindow.getBounds().y,
        width: ISLAND_WIDTH,
        height: ISLAND_HEIGHT
      });
    }
  });

  /**
   * 获取鼠标当前位置（屏幕坐标）
   * @returns 包含 x、y 坐标的对象
   */
  ipcMain.handle('window:get-mouse-position', () => {
    const point = screen.getCursorScreenPoint();
    return { x: point.x, y: point.y };
  });

  /**
   * 获取窗口边界信息
   * @returns 窗口边界对象，包含 x、y、width、height
   */
  ipcMain.handle('window:get-bounds', () => {
    if (mainWindow) {
      return mainWindow.getBounds();
    }
    return null;
  });

  /**
   * 退出应用
   */
  ipcMain.on('app:quit', () => {
    app.quit();
  });
}

/** 单实例锁回调 */
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

/**
 * 应用就绪入口，初始化窗口、注册 IPC 处理器并响应 macOS dock 点击重建窗口
 */
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.eisland.app');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  registerIpcHandlers();
  createWindow();
  createTray(mainWindow);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
