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
 * @file index.d.ts
 * @description 全屏检测器类型声明
 * @description 为全屏检测原生模块提供 TypeScript 类型定义
 * @author 鸡哥
 */

export interface NativeRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface NativeMonitorInfo extends NativeRect {
  isPrimary: boolean;
}

export interface FullscreenWindowInfo {
  hwnd: string;
  title: string;
  processId: number;
  bounds: NativeRect;
  monitor: NativeMonitorInfo;
  isForeground: boolean;
}

export function getForegroundFullscreenWindow(): FullscreenWindowInfo | null;
export function getFullscreenWindows(): FullscreenWindowInfo[];
export function isAnyFullscreenWindow(): boolean;