/**
 * @file tray.ts
 * @description Electron 系统托盘服务，创建托盘图标、上下文菜单，处理托盘交互事件
 * @author 鸡哥
 */

import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import log from 'electron-log/main';

let tray: Tray | null = null;

function createTrayIcon(): Electron.NativeImage {
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 1;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      if (dist <= r) {
        canvas[idx] = 0;
        canvas[idx + 1] = 120;
        canvas[idx + 2] = 215;
        canvas[idx + 3] = 255;
      } else {
        canvas[idx] = 0;
        canvas[idx + 1] = 0;
        canvas[idx + 2] = 0;
        canvas[idx + 3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

/**
 * 创建系统托盘图标、上下文菜单，绑定点击/双击事件
 * @param mainWindow - Electron 主窗口引用，用于响应托盘交互
 */
export function createTray(mainWindow: BrowserWindow): void {
  const trayIcon = createTrayIcon();
  tray = new Tray(trayIcon);
  tray.setToolTip('eIsland');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show eIsland',
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('navigate', '/settings');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  tray.on('double-click', () => {
    mainWindow.show();
  });

  log.info('System tray created');
}

/**
 * 销毁系统托盘，释放资源
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
    log.info('System tray destroyed');
  }
}

/**
 * 获取当前系统托盘实例
 * @returns Tray 实例或 null（未创建时）
 */
export function getTray(): Tray | null {
  return tray;
}
