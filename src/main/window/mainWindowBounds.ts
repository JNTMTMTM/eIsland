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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/**
 * @file mainWindowBounds.ts
 * @description 按窗口实例保留主动设置的外框尺寸，避免 Windows 透明窗口回读尺寸放大。
 * @author 鸡哥
 */

import type { BrowserWindow, Rectangle } from 'electron';

const backingSizes = new WeakMap<BrowserWindow, Pick<Rectangle, 'width' | 'height'>>();

/**
 * 读取实时位置及与裁剪区域匹配的外框尺寸。
 * @param win - 灵动岛主窗口实例。
 * @returns 已记录尺寸的窗口边界；尚未设置过边界时使用原生值。
 */
export function readMainWindowBounds(win: BrowserWindow): Rectangle {
  return { ...win.getBounds(), ...backingSizes.get(win) };
}

/**
 * 设置边界并在原生调用成功后记录尺寸，供拖动、展开和命中范围计算使用。
 * @param win - 灵动岛主窗口实例，新窗口拥有独立的尺寸记录。
 * @param bounds - 与随后设置的裁剪区域对应的屏幕位置及外框尺寸。
 */
export function setMainWindowBounds(win: BrowserWindow, bounds: Rectangle): void {
  win.setBounds(bounds);
  backingSizes.set(win, { width: bounds.width, height: bounds.height });
}
