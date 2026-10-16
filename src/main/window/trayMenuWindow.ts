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
 * @file trayMenuWindow.ts
 * @description 自绘托盘菜单窗口：启动后在后台预加载，在光标附近弹出（页面未就绪时先显示骨架屏）、失焦隐藏，并转发菜单动作
 * @author 鸡哥
 */

import { join } from 'path';
import { BrowserWindow, ipcMain, nativeTheme, screen } from 'electron';
import { is } from '@electron-toolkit/utils';
import { readThemeModeConfig } from '../config/storeConfig';
import { TRAY_MENU_CHANNELS, isTrayMenuAction } from '../../shared/trayMenu';
import type { TrayMenuAction, TrayMenuState } from '../../shared/trayMenu';

/** 菜单窗口宽度（DIP），需与渲染层 .tray-menu 宽度保持一致 */
export const TRAY_MENU_WIDTH = 272;

/** 启动后预加载菜单窗口的延迟，错开主窗口与启动动画的加载高峰 */
const TRAY_MENU_PRELOAD_DELAY_MS = 3000;

/** 首次打开时的窗口高度，需与渲染层骨架屏 .tray-skeleton 高度一致，真实高度由渲染层上报 */
const TRAY_MENU_INITIAL_HEIGHT = 355;

let menuWindow: BrowserWindow | null = null;
let menuMounted = false;
let menuPainted = false;
let menuRevealed = false;
let pendingState: TrayMenuState | null = null;
let lastHeight = TRAY_MENU_INITIAL_HEIGHT;
let anchor = { x: 0, y: 0 };
let actionHandler: ((action: TrayMenuAction) => void) | null = null;
let ipcRegistered = false;
let preloadTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 判断 IPC 是否来自当前菜单窗口，忽略其他窗口伪造的菜单消息
 * @param sender - IPC 发送方
 * @returns 是否来自菜单窗口
 */
function isFromMenuWindow(sender: Electron.WebContents): boolean {
  return Boolean(menuWindow && !menuWindow.isDestroyed() && sender === menuWindow.webContents);
}

/**
 * 计算光标附近的菜单位置
 * @description 默认向右下展开，超出工作区时向左/向上翻转（Windows 任务栏托盘通常在右下角）
 * @param height - 菜单内容高度（DIP）
 * @returns 菜单窗口边界
 */
function getMenuBounds(height: number): Electron.Rectangle {
  const area = screen.getDisplayNearestPoint(anchor).workArea;
  const fitsRight = anchor.x + TRAY_MENU_WIDTH <= area.x + area.width;
  const fitsBelow = anchor.y + height <= area.y + area.height;
  const rawX = fitsRight ? anchor.x : anchor.x - TRAY_MENU_WIDTH;
  const rawY = fitsBelow ? anchor.y : anchor.y - height;
  const x = Math.min(Math.max(rawX, area.x), area.x + area.width - TRAY_MENU_WIDTH);
  const y = Math.min(Math.max(rawY, area.y), area.y + area.height - height);
  return { height, x: Math.round(x), y: Math.round(y), width: TRAY_MENU_WIDTH };
}

/**
 * 解析菜单首屏使用的视觉主题
 * @description 骨架屏在渲染脚本加载前绘制，无法异步读取主题，由主进程通过页面参数传入
 * @returns 视觉主题
 */
function resolveMenuTheme(): 'dark' | 'light' {
  const mode = readThemeModeConfig();
  if (mode !== 'system') return mode;
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

/**
 * 首次打开时页面完成首帧（骨架屏）绘制后立即显示菜单
 * @description 不必等待渲染脚本加载与挂载，数据就绪后由渲染层替换为真实内容
 */
function revealSkeleton(): void {
  if (!pendingState || menuMounted || !menuWindow || menuWindow.isDestroyed()) return;
  menuWindow.setBounds(getMenuBounds(lastHeight));
  menuWindow.setOpacity(1);
  menuWindow.showInactive();
  menuRevealed = true;
  menuWindow.focus();
}

/**
 * 显示菜单窗口并下发状态
 * @description 骨架屏已显示时直接下发；否则以完全透明的状态显示——隐藏过的透明窗口再次显示时
 * 会先露出上次的缓存画面和系统显示动画，造成闪烁，等渲染层绘制完新内容（ready）后再显现。
 */
function flushPendingState(): void {
  if (!pendingState || !menuMounted || !menuWindow || menuWindow.isDestroyed()) return;
  if (!menuRevealed || !menuWindow.isVisible()) {
    menuRevealed = false;
    menuWindow.setOpacity(0);
    menuWindow.setBounds(getMenuBounds(lastHeight));
    if (!menuWindow.isVisible()) menuWindow.showInactive();
  }
  menuWindow.webContents.send(TRAY_MENU_CHANNELS.open, pendingState);
  pendingState = null;
}

/**
 * 按真实内容高度定位并显现菜单
 * @param height - 渲染层上报的内容高度（DIP）
 */
function revealMenu(height: number): void {
  if (!menuWindow || menuWindow.isDestroyed() || !menuWindow.isVisible()) return;
  lastHeight = height;
  menuWindow.setBounds(getMenuBounds(height));
  if (menuRevealed) return;
  menuRevealed = true;
  menuWindow.setOpacity(1);
  menuWindow.focus();
}

/** 收起托盘菜单，窗口保留以便下次快速弹出。 */
export function hideTrayMenuWindow(): void {
  // 渲染层尚未挂载时用户已关闭菜单，挂载后不应再弹出。
  pendingState = null;
  if (!menuWindow || menuWindow.isDestroyed() || !menuWindow.isVisible()) return;
  menuRevealed = false;
  menuWindow.setOpacity(0);
  menuWindow.hide();
}

/** 注册菜单 IPC，只注册一次，菜单窗口重建后继续沿用。 */
function registerTrayMenuIpc(): void {
  if (ipcRegistered) return;
  ipcRegistered = true;
  ipcMain.on(TRAY_MENU_CHANNELS.mounted, (event) => {
    if (!isFromMenuWindow(event.sender)) return;
    menuMounted = true;
    flushPendingState();
  });
  ipcMain.on(TRAY_MENU_CHANNELS.ready, (event, height: unknown) => {
    if (!isFromMenuWindow(event.sender)) return;
    if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) return;
    revealMenu(Math.ceil(height));
  });
  ipcMain.on(TRAY_MENU_CHANNELS.action, (event, action: unknown) => {
    if (!isFromMenuWindow(event.sender) || !isTrayMenuAction(action)) return;
    // 先收起菜单再执行动作，避免显示灵动岛等动作被菜单窗口遮挡或抢回焦点。
    hideTrayMenuWindow();
    actionHandler?.(action);
  });
  ipcMain.on(TRAY_MENU_CHANNELS.close, (event) => {
    if (isFromMenuWindow(event.sender)) hideTrayMenuWindow();
  });
}

/**
 * 创建隐藏的菜单窗口并加载渲染入口
 * @returns 菜单窗口
 */
function createMenuWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: TRAY_MENU_WIDTH,
    height: TRAY_MENU_INITIAL_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    title: '',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // 菜单在透明预显示阶段完成渲染与测量，不能被后台节流延迟。
      backgroundThrottling: false,
    },
  });
  window.setAlwaysOnTop(true, 'pop-up-menu');
  window.removeMenu();
  // 透明预显示阶段窗口未获得焦点，只有真正显现后的失焦才代表用户点了别处。
  window.once('ready-to-show', () => {
    menuPainted = true;
    revealSkeleton();
  });
  window.on('blur', () => {
    if (menuRevealed) hideTrayMenuWindow();
  });
  window.on('closed', () => {
    if (menuWindow === window) {
      menuWindow = null;
      menuMounted = false;
      menuPainted = false;
      menuRevealed = false;
    }
  });

  const theme = resolveMenuTheme();
  const loading = is.dev && process.env.ELECTRON_RENDERER_URL
    ? window.loadURL(`${process.env.ELECTRON_RENDERER_URL}/html/DynamicIslandTrayMenu.html?theme=${theme}`)
    : window.loadFile(join(__dirname, '../renderer/html/DynamicIslandTrayMenu.html'), { query: { theme } });
  // eslint-disable-next-line promise/prefer-await-to-then -- 创建函数需同步返回窗口，在此处理加载失败。
  loading.catch((error: unknown) => {
    console.error('[TrayMenu] Failed to load tray menu page:', error);
  });
  return window;
}

/**
 * 创建菜单窗口并重置页面就绪状态
 */
function openMenuWindow(): void {
  registerTrayMenuIpc();
  menuMounted = false;
  menuPainted = false;
  menuWindow = createMenuWindow();
}

/**
 * 延迟在后台预创建隐藏的菜单窗口
 * @description 首次右键时页面与脚本已加载完成，无需现建窗口；用户在预加载前右键时由 showTrayMenuWindow 直接创建
 * @param delayMs - 延迟毫秒数
 */
export function scheduleTrayMenuPreload(delayMs = TRAY_MENU_PRELOAD_DELAY_MS): void {
  if (preloadTimer) clearTimeout(preloadTimer);
  preloadTimer = setTimeout(() => {
    preloadTimer = null;
    if (!menuWindow || menuWindow.isDestroyed()) openMenuWindow();
  }, delayMs);
}

/**
 * 在光标位置弹出托盘菜单
 * @param state - 本次打开时的菜单状态快照
 * @param onAction - 用户选择菜单项后的处理函数
 */
export function showTrayMenuWindow(state: TrayMenuState, onAction: (action: TrayMenuAction) => void): void {
  registerTrayMenuIpc();
  actionHandler = onAction;
  anchor = screen.getCursorScreenPoint();
  pendingState = state;
  if (!menuWindow || menuWindow.isDestroyed()) {
    openMenuWindow();
    return;
  }
  // 预加载的页面已绘制但脚本尚未挂载时，ready-to-show 已触发过，直接显示骨架屏。
  if (!menuMounted && menuPainted) revealSkeleton();
  flushPendingState();
}

/** 销毁托盘菜单窗口，托盘销毁或应用退出时调用。 */
export function destroyTrayMenuWindow(): void {
  if (preloadTimer) clearTimeout(preloadTimer);
  preloadTimer = null;
  if (menuWindow && !menuWindow.isDestroyed()) menuWindow.destroy();
  menuWindow = null;
  menuMounted = false;
  menuPainted = false;
  menuRevealed = false;
  pendingState = null;
}
