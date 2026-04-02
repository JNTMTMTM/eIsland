/**
 * @file tray.ts
 * @description 系统托盘模块：托盘图标加载、托盘实例创建及右键菜单配置
 * @author 鸡哥
 */

import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import { join } from 'path';

let tray: Tray | null = null;

/**
 * 托盘图标路径常量
 */
const TRAY_ICON_PATH = join(__dirname, '../../resources/icon/eisland_16x16.ico');

/**
 * 创建系统托盘
 * @description 初始化托盘图标、右键菜单，提供退出和显示窗口功能
 */
function createTray(mainWindow: BrowserWindow | null): Tray {
  const icon = nativeImage.createFromPath(TRAY_ICON_PATH);
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
 * 销毁系统托盘
 * @description 应用退出时调用，释放托盘资源
 */
function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

export { createTray, destroyTray };
