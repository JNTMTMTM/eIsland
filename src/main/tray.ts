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
 * @file tray.ts
 * @description 系统托盘模块：托盘图标加载、托盘实例创建、菜单动作及右键菜单（自绘窗口 / Linux 原生菜单）
 * @author 鸡哥
 */

import { join } from 'path';
import { Tray, Menu, nativeImage, BrowserWindow, app, shell } from 'electron';
import { is } from '@electron-toolkit/utils';
import { tray as zhCNLabels } from '../../i18n/zh-CN.json';
import { tray as enUSLabels } from '../../i18n/en-US.json';
import { tray as zhTWLabels } from '../../i18n/zh-TW.json';
import { tray as jaJPLabels } from '../../i18n/ja-JP.json';
import { openStandaloneWindow } from './window/standaloneWindow';
import { restoreIslandAlwaysOnTop, setIslandAlwaysOnTop } from './window/islandAlwaysOnTop';
import { hideIsland, showIsland } from './window/islandVisibility';
import { readAppLanguageConfig, readStandaloneWindowModeEnabledConfig } from './config/storeConfig';
import { destroyTrayMenuWindow, hideTrayMenuWindow, scheduleTrayMenuPreload, showTrayMenuWindow } from './window/trayMenuWindow';
import type { TrayMenuAction, TrayMenuState } from '../shared/trayMenu';

interface TrayOptions {
  onVisibilityChange?: (visible: boolean) => void;
  onOpenSettings?: () => void;
  onAlwaysOnTopChange?: () => void;
}

/** 托盘菜单文案，按界面语言选取 */
const TRAY_LABELS = {
  'zh-CN': zhCNLabels,
  'en-US': enUSLabels,
  'zh-TW': zhTWLabels,
  'ja-JP': jaJPLabels,
};

let tray: Tray | null = null;
let cachedGetMainWindow: () => BrowserWindow | null = () => null;
let cachedOptions: TrayOptions = {};
let buildCurrentMenu: (() => Electron.Menu) | null = null;

/**
 * 托盘图标路径常量
 * @description 开发环境从项目根目录加载，生产环境从 extraResources 打包目录加载
 */
const TRAY_ICON_PATH = is.dev
  ? join(__dirname, '../../resources/icon/eisland_16x16.ico')
  : join(process.resourcesPath, 'icon/eisland_16x16.ico');

/**
 * 刷新托盘菜单
 * @description Linux 托盘无法在弹出前重建菜单，菜单依赖的状态变化后需重新设置；其他平台每次弹出时已重建
 */
function refreshTrayMenu(): void {
  if (process.platform !== 'linux' || !tray || !buildCurrentMenu) return;
  tray.setContextMenu(buildCurrentMenu());
}

/**
 * 创建系统托盘
 * @description 初始化托盘图标与右键菜单：Windows/macOS 弹出自绘菜单窗口（含用户信息卡片），Linux 使用原生菜单
 * @param getMainWindow - 读取托盘控制的主窗口，主窗口重建后仍指向新窗口。
 * @param options - 手动可见性与现有设置入口的回调。
 * @returns 当前托盘实例。
 */
function createTray(getMainWindow: () => BrowserWindow | null, options: TrayOptions = {}): Tray {
  tray?.destroy();
  cachedGetMainWindow = getMainWindow;
  cachedOptions = options;
  const icon = nativeImage.createFromPath(TRAY_ICON_PATH);
  tray = new Tray(icon);
  const logDir = join(app.getPath('userData'), 'logs');

  const getWindow = (): BrowserWindow | null => {
    const mainWindow = getMainWindow();
    return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  };
  // 灵动岛是鼠标穿透的悬浮窗，显示时不抢占前台应用的键盘焦点。
  const setVisible = (visible: boolean): void => {
    const mainWindow = getWindow();
    if (!mainWindow) return;
    options.onVisibilityChange?.(visible);
    if (visible) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      showIsland(mainWindow);
      restoreIslandAlwaysOnTop(mainWindow);
    } else {
      hideIsland(mainWindow);
    }
  };

  // 自绘菜单与 Linux 原生菜单共用同一组动作，保证两种菜单行为一致。
  const runAction = (action: TrayMenuAction): void => {
    switch (action) {
      case 'show-island':
        setVisible(true);
        break;
      case 'hide-island':
        setVisible(false);
        break;
      case 'open-settings':
        if (options.onOpenSettings) options.onOpenSettings();
        else openStandaloneWindow();
        break;
      case 'toggle-always-on-top': {
        const target = getWindow();
        if (!target) return;
        setIslandAlwaysOnTop(target, !target.isAlwaysOnTop());
        options.onAlwaysOnTopChange?.();
        refreshTrayMenu();
        break;
      }
      case 'open-log-folder':
        // eslint-disable-next-line promise/prefer-await-to-then -- 菜单回调需同步返回，在此处理原生异步操作的拒绝。
        shell.openPath(logDir).catch((error: unknown) => {
          console.error('[Tray] Failed to open log directory:', error);
        });
        break;
      case 'restart':
        app.relaunch();
        app.quit();
        break;
      case 'quit':
        app.quit();
        break;
    }
  };

  // 每次打开菜单都重新读取运行模式、语言和窗口状态，避免启动时的快照长期失效。
  const getMenuState = (): TrayMenuState => {
    const mainWindow = getWindow();
    return {
      windowAvailable: Boolean(mainWindow),
      alwaysOnTop: mainWindow ? mainWindow.isAlwaysOnTop() : false,
      standaloneMode: readStandaloneWindowModeEnabledConfig(),
      language: readAppLanguageConfig(),
    };
  };

  const buildMenu = (): Electron.Menu => {
    const state = getMenuState();
    const labels = TRAY_LABELS[readAppLanguageConfig()];

    const menuItems: Electron.MenuItemConstructorOptions[] = [
      { label: labels.showIsland, enabled: state.windowAvailable, click: () => runAction('show-island') },
      { label: labels.hideIsland, enabled: state.windowAvailable, click: () => runAction('hide-island') },
    ];
    if (state.standaloneMode) {
      menuItems.push({ label: labels.openSettings, click: () => runAction('open-settings') });
    }
    menuItems.push(
      {
        label: labels.alwaysOnTop,
        type: 'checkbox',
        enabled: state.windowAvailable,
        checked: state.alwaysOnTop,
        click: () => runAction('toggle-always-on-top'),
      },
      { type: 'separator' },
      { label: labels.openLogFolder, click: () => runAction('open-log-folder') },
      { label: labels.restart, click: () => runAction('restart') },
      { type: 'separator' },
      { label: labels.quit, click: () => runAction('quit') },
    );

    return Menu.buildFromTemplate(menuItems);
  };
  buildCurrentMenu = buildMenu;
  tray.setToolTip('eIsland');
  // Linux 托盘只能预先设置原生菜单，由 refreshTrayMenu 同步；其他平台右键时弹出自绘菜单窗口（后台预加载）。
  if (process.platform === 'linux') {
    refreshTrayMenu();
  } else {
    tray.on('right-click', () => { showTrayMenuWindow(getMenuState(), runAction); });
    scheduleTrayMenuPreload();
  }

  tray.on('click', () => {
    hideTrayMenuWindow();
    const mainWindow = getWindow();
    if (!mainWindow) return;
    setVisible(!mainWindow.isVisible() || mainWindow.isMinimized());
  });

  return tray;
}

/**
 * 销毁系统托盘
 * @description 应用退出时调用，释放托盘资源
 */
function destroyTray(): void {
  destroyTrayMenuWindow();
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

/**
 * 切换系统托盘图标显示/隐藏
 * @description 隐藏时销毁托盘；显示时重建托盘
 */
function toggleTray(): void {
  if (tray) {
    destroyTrayMenuWindow();
    tray.destroy();
    tray = null;
  } else {
    createTray(cachedGetMainWindow, cachedOptions);
  }
}

export { createTray, destroyTray, refreshTrayMenu, toggleTray };
