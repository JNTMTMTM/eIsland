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
 * @file trayMenu.ts
 * @description 自绘托盘菜单的主进程与渲染进程共享协议：菜单动作、菜单状态与 IPC 通道
 * @author 鸡哥
 */

/** 托盘菜单可触发的动作 */
export type TrayMenuAction =
  | 'show-island'
  | 'hide-island'
  | 'open-settings'
  | 'toggle-always-on-top'
  | 'open-log-folder'
  | 'restart'
  | 'quit';

/** 全部托盘菜单动作，供 IPC 入参校验 */
export const TRAY_MENU_ACTIONS: readonly TrayMenuAction[] = [
  'show-island',
  'hide-island',
  'open-settings',
  'toggle-always-on-top',
  'open-log-folder',
  'restart',
  'quit',
];

/** 打开菜单时由主进程下发的状态快照 */
export interface TrayMenuState {
  /** 主窗口是否存在，不存在时窗口相关动作禁用 */
  windowAvailable: boolean;
  /** 窗口置顶是否开启 */
  alwaysOnTop: boolean;
  /** 是否处于独立窗口模式，决定是否显示“打开配置界面” */
  standaloneMode: boolean;
  /** 界面语言，菜单窗口据此同步文案 */
  language: string;
}

/** 托盘菜单 IPC 通道 */
export const TRAY_MENU_CHANNELS = {
  /** 主进程 → 菜单：打开菜单并下发状态 */
  open: 'tray-menu:open',
  /** 菜单 → 主进程：渲染层已订阅打开事件，可以下发状态 */
  mounted: 'tray-menu:mounted',
  /** 菜单 → 主进程：内容已渲染，携带内容高度 */
  ready: 'tray-menu:ready',
  /** 菜单 → 主进程：执行菜单动作 */
  action: 'tray-menu:action',
  /** 菜单 → 主进程：关闭菜单 */
  close: 'tray-menu:close',
} as const;

/**
 * 判断任意值是否为合法的托盘菜单动作
 * @param value - 待校验的值
 * @returns 是否为合法动作
 */
export function isTrayMenuAction(value: unknown): value is TrayMenuAction {
  return typeof value === 'string' && (TRAY_MENU_ACTIONS as readonly string[]).includes(value);
}
