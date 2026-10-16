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
 * @file trayMenuItems.ts
 * @description 托盘菜单项配置，顺序即菜单展示顺序
 * @author 鸡哥
 */

import type { TrayMenuItemConfig } from '../types';

/** 托盘菜单项，与 Linux 原生菜单保持相同的项与顺序 */
export const TRAY_MENU_ITEMS: readonly TrayMenuItemConfig[] = [
  { kind: 'action', action: 'show-island', labelKey: 'tray.showIsland', requiresWindow: true },
  { kind: 'action', action: 'hide-island', labelKey: 'tray.hideIsland', requiresWindow: true },
  { kind: 'action', action: 'open-settings', labelKey: 'tray.openSettings', standaloneOnly: true },
  { kind: 'toggle', action: 'toggle-always-on-top', labelKey: 'tray.alwaysOnTop', requiresWindow: true },
  { kind: 'separator', id: 'window-actions' },
  { kind: 'action', action: 'open-log-folder', labelKey: 'tray.openLogFolder' },
  { kind: 'action', action: 'restart', labelKey: 'tray.restart' },
  { kind: 'separator', id: 'app-actions' },
  { kind: 'action', action: 'quit', labelKey: 'tray.quit', danger: true },
];
