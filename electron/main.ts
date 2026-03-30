/**
 * @file main.ts
 * @description Electron 主进程入口，负责窗口创建、系统托盘、全局快捷键、应用生命周期管理
 * @author 鸡哥
 */

//         ┏┓　　　┏┓+ +
// 　　　┏┛┻━━━┛┻┓ + +
// 　　　┃　　　　　　　┃ 　
// 　　　┃　　　━　　　┃ ++ + + +
// 　　 ████━████ ┃+
// 　　　┃　　　　　　　┃ +
// 　　　┃　　　┻　　　┃
// 　　　┃　　　　　　　┃ + +
// 　　　┗━┓　　　┏━┛
// 　　　　　┃　　　┃　　　　　　　　　　　
// 　　　　　┃　　　┃ + + + +
// 　　　　　┃　　　┃　　　　Codes are far away from bugs with the animal protecting　　　
// 　　　　　┃　　　┃ + 　　　　神兽保佑,代码无bug　　
// 　　　　　┃　　　┃
// 　　　　　┃　　　┃　　+　　　　　　　　　
// 　　　　　┃　 　　┗━━━┓ + +
// 　　　　　┃ 　　　　　　　┣┓
// 　　　　　┃ 　　　　　　　┏┛
// 　　　　　┗┓┓┏━┳┓┏┛ + + + +
// 　　　　　　┃┫┫　┃┫┫
// 　　　　　　┗┻┛　┗┻┛+ + + +

import { app, shell, BrowserWindow, globalShortcut, screen } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import log from 'electron-log/main';
import { initDatabase, closeDatabase } from './store/database';
import { registerIpcHandlers } from './services/ipc';
import { createTray, destroyTray } from './services/tray';

log.initialize();
log.info('Application starting...');

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  log.info('Creating main window...');

  const COMPACT_WIDTH = 400;
  const COMPACT_HEIGHT = 80;

  mainWindow = new BrowserWindow({
    width: COMPACT_WIDTH,
    height: COMPACT_HEIGHT,
    minWidth: 200,
    minHeight: 60,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const display = screen.getPrimaryDisplay();
  const { width: screenWidth } = display.workAreaSize;
  const x = Math.round((screenWidth - COMPACT_WIDTH) / 2);
  mainWindow.setPosition(x, 0);
  log.info(`Window positioned at x=${x}, y=0`);

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
    log.info('Main window ready and shown');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
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

app.whenReady().then(() => {
  log.info('App ready, initializing...');

  electronApp.setAppUserModelId('com.eisland.app');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  initDatabase();
  log.info('Database initialized');

  registerIpcHandlers();
  log.info('IPC handlers registered');

  createWindow();

  createTray(mainWindow!);

  globalShortcut.register('CommandOrControl+Shift+D', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    globalShortcut.unregisterAll();
    destroyTray();
    closeDatabase();
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  destroyTray();
  closeDatabase();
  log.info('Application quitting...');
});

/**
 * 获取 Electron 主窗口实例
 * @returns BrowserWindow 或 null（未创建或已关闭时）
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
