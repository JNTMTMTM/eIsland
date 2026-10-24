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
 * @file islandVisibility.ts
 * @description 灵动岛主窗口显示与隐藏的淡入淡出过渡，供快捷键、托盘、自动隐藏等入口统一使用。
 * @author 鸡哥
 */

import type { BrowserWindow } from 'electron';

/** 完整淡入或淡出的时长（毫秒） */
const FADE_DURATION_MS = 180;
/** 过渡帧间隔（毫秒） */
const FADE_FRAME_MS = 16;

interface IslandFade {
  timer: NodeJS.Timeout;
  visible: boolean;
}

const fades = new WeakMap<BrowserWindow, IslandFade>();

function stopFade(window: BrowserWindow): void {
  const fade = fades.get(window);
  if (!fade) return;
  clearInterval(fade.timer);
  fades.delete(window);
}

/**
 * 从当前透明度过渡到目标可见性
 * @description 中途反向切换时从当前透明度继续，时长按剩余距离折算，避免跳变。
 * @param window - 灵动岛主窗口。
 * @param visible - true 淡入，false 淡出后隐藏窗口。
 */
function startFade(window: BrowserWindow, visible: boolean): void {
  stopFade(window);
  // Linux 不支持窗口透明度，直接切换以免空等过渡时长。
  if (process.platform === 'linux') {
    if (!visible) window.hide();
    return;
  }

  const from = window.getOpacity();
  const to = visible ? 1 : 0;
  const duration = FADE_DURATION_MS * Math.abs(to - from);
  const startedAt = Date.now();
  const timer = setInterval(() => {
    if (window.isDestroyed()) {
      stopFade(window);
      return;
    }
    // 截图等流程会直接隐藏窗口，放弃过渡并恢复不透明，保证其后直接显示时不停留在半透明。
    if (!window.isVisible()) {
      stopFade(window);
      window.setOpacity(1);
      return;
    }
    const progress = duration > 0 ? Math.min(1, (Date.now() - startedAt) / duration) : 1;
    const eased = 1 - (1 - progress) ** 2;
    window.setOpacity(from + (to - from) * eased);
    if (progress < 1) return;
    stopFade(window);
    if (!visible) {
      window.hide();
      window.setOpacity(1);
    }
  }, FADE_FRAME_MS);
  fades.set(window, { timer, visible });
}

/**
 * 读取灵动岛的目标可见性
 * @description 淡出过程中窗口仍可见，切换类入口需按目标状态判断，连按时才能正确反向。
 * @param window - 灵动岛主窗口。
 * @returns 正在淡入或已显示为 true，正在淡出或已隐藏为 false。
 */
export function isIslandShown(window: BrowserWindow): boolean {
  return fades.get(window)?.visible ?? window.isVisible();
}

/**
 * 淡入显示灵动岛
 * @description 隐藏的窗口先置为全透明再显示，避免露出上次的缓存画面；正在淡出时就地反向。
 * @param window - 灵动岛主窗口。
 */
export function showIsland(window: BrowserWindow): void {
  if (window.isDestroyed()) return;
  const wasHidden = !window.isVisible();
  if (wasHidden && process.platform !== 'linux') window.setOpacity(0);
  window.show();
  if (wasHidden || fades.get(window)?.visible === false) startFade(window, true);
}

/**
 * 淡出隐藏灵动岛
 * @description 过渡结束后才真正隐藏窗口，已隐藏或正在淡出时不重复处理。
 * @param window - 灵动岛主窗口。
 */
export function hideIsland(window: BrowserWindow): void {
  if (window.isDestroyed() || !isIslandShown(window)) return;
  startFade(window, false);
}
