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
 * @file screenshotHelper.ts
 * @description Windows 主屏幕截图辅助模块，优先加载原生插件，失败时回退到 desktopCapturer
 * @author 鸡哥
 */

import { join } from 'path';

interface ScreenshotResult {
  data: Buffer;
  size: number;
  format: 'png';
}

export interface VisibleWindowBounds {
  hwnd: string;
  title: string;
  processId: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WindowsScreenshotHelper {
  capturePrimaryDisplayPng: () => ScreenshotResult | null;
  captureAllDisplaysPng?: () => ScreenshotResult | null;
  getVisibleWindows?: () => VisibleWindowBounds[];
  getLastError?: () => string;
}

let cachedHelper: WindowsScreenshotHelper | null | undefined;
let hasLoggedLoadFailure = false;

function loadWindowsScreenshotHelper(): WindowsScreenshotHelper | null {
  if (process.platform !== 'win32') return null;
  if (cachedHelper !== undefined) return cachedHelper;

  const candidates = [
    '@eisland/windows-screenshot-helper',
    join(process.cwd(), 'plugins', 'eisland-windows-screenshot-helper'),
  ];

  const errors: string[] = [];
  const loaded = candidates.some((candidate) => {
    try {
      cachedHelper = require(candidate) as WindowsScreenshotHelper;
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`  ${candidate}: ${msg}`);
      return false;
    }
  });

  if (!loaded && !hasLoggedLoadFailure) {
    hasLoggedLoadFailure = true;
    console.warn('[ScreenshotHelper] native helper unavailable, fallback to desktopCapturer:\n' + errors.join('\n'));
  }

  if (!loaded) cachedHelper = null;
  return cachedHelper ?? null;
}

/**
 * 截取主显示器画面并返回 PNG Buffer
 * @description 优先使用原生插件截屏，插件不可用时返回 null 以触发 desktopCapturer 回退
 * @returns PNG 格式的 Buffer，截屏失败或插件不可用时返回 null
 */
export function capturePrimaryDisplayPng(): Buffer | null {
  const helper = loadWindowsScreenshotHelper();
  if (!helper) return null;

  try {
    const result = helper.capturePrimaryDisplayPng();
    if (!result || !Buffer.isBuffer(result.data) || result.data.length === 0 || result.format !== 'png') {
      const lastError = helper.getLastError?.();
      if (lastError) console.warn('[ScreenshotHelper] capture failed:', lastError);
      return null;
    }
    return result.data;
  } catch (err) {
    console.warn('[ScreenshotHelper] capture error, fallback to desktopCapturer:', err);
    return null;
  }
}

/**
 * 截取所有显示器画面（虚拟屏幕）并返回 PNG Buffer
 * @description 优先使用原生插件截取全部多显示器画面，插件不可用时返回 null
 * @returns PNG 格式的 Buffer，截屏失败或插件不可用时返回 null
 */
export function captureAllDisplaysPng(): Buffer | null {
  const helper = loadWindowsScreenshotHelper();
  if (!helper?.captureAllDisplaysPng) return null;

  try {
    const result = helper.captureAllDisplaysPng();
    if (!result || !Buffer.isBuffer(result.data) || result.data.length === 0 || result.format !== 'png') {
      const lastError = helper.getLastError?.();
      if (lastError) console.warn('[ScreenshotHelper] capture all displays failed:', lastError);
      return null;
    }
    return result.data;
  } catch (err) {
    console.warn('[ScreenshotHelper] capture all displays error:', err);
    return null;
  }
}

/**
 * 获取所有可见窗口的位置和尺寸信息
 * @description 枚举桌面上所有可见的顶层窗口，返回其边界矩形和元数据，用于截图选区的窗口识别
 * @returns 可见窗口边界数组，插件不可用时返回空数组
 */
export function getVisibleWindows(): VisibleWindowBounds[] {
  const helper = loadWindowsScreenshotHelper();
  if (!helper?.getVisibleWindows) return [];

  try {
    const windows = helper.getVisibleWindows();
    return Array.isArray(windows) ? windows : [];
  } catch (err) {
    console.warn('[ScreenshotHelper] window bounds unavailable:', err);
    return [];
  }
}