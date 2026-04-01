/**
 * @file tray.ts
 * @description 系统托盘模块：托盘图标加载、托盘实例创建及右键菜单配置
 * @author 鸡哥
 */

import { Tray, Menu, nativeImage, NativeImage, BrowserWindow, app } from 'electron';
import { join } from 'path';

let tray: Tray | null = null;

/**
 * 托盘图标路径常量
 */
const TRAY_ICON_PATH = join(__dirname, '../../resources/icon/eisland_16x16.ico');

/**
 * 创建托盘图标
 * @description 从 resources 目录加载 ICO 文件
 */
function createTrayIcon(): NativeImage {
  return nativeImage.createFromPath(TRAY_ICON_PATH);
}

/**
 * 创建系统托盘
 * @description 初始化托盘图标、右键菜单，提供退出和显示窗口功能
 */
function createTray(mainWindow: BrowserWindow | null): Tray {
  const icon = createTrayIcon();
  tray = new Tray(icon);

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
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('eIsland');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });

  return tray;
}

/**
 * 获取托盘实例
 */
function getTray(): Tray | null {
  return tray;
}

export { createTray, getTray, createTrayIcon };
