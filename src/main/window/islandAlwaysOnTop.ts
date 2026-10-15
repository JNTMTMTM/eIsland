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
 * @file islandAlwaysOnTop.ts
 * @description 保留托盘选择的灵动岛置顶状态，供窗口恢复路径统一应用。
 * @author 鸡哥
 */

import type { BrowserWindow } from 'electron';

// 选择属于应用运行期而非单个窗口，主窗口重建后仍沿用。
let alwaysOnTop = true;

/** 读取托盘的置顶选择，供同层辅助窗口保持一致。
 * @returns 是否置顶。
 */
export function isIslandAlwaysOnTop(): boolean {
  return alwaysOnTop;
}

/** 应用置顶选择；窗口可见时移到同层最上方，避免被背景光效窗口遮挡。
 * @param window - 灵动岛主窗口。
 */
export function restoreIslandAlwaysOnTop(window: BrowserWindow): void {
  if (window.isDestroyed()) return;
  if (alwaysOnTop) window.setAlwaysOnTop(true, 'screen-saver');
  else window.setAlwaysOnTop(false);
  if (window.isVisible()) window.moveTop();
}

/** 更新置顶选择，恢复显示时仍尊重这一选择。
 * @param window - 灵动岛主窗口。
 * @param enabled - 是否置顶。
 */
export function setIslandAlwaysOnTop(window: BrowserWindow, enabled: boolean): void {
  if (window.isDestroyed()) return;
  alwaysOnTop = enabled;
  restoreIslandAlwaysOnTop(window);
}
