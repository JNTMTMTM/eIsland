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
 * @file theme.ts
 * @description 主题管理工具：初始化、切换、监听系统主题变更
 * @author 鸡哥
 */

export type ThemeMode = 'dark' | 'light' | 'system';

/** 系统偏好媒体查询 */
const darkMq = window.matchMedia('(prefers-color-scheme: dark)');

/** 当前生效的模式（存储用户选择，非最终视觉主题） */
let currentMode: ThemeMode = 'dark';

/**
 * 根据模式解析最终视觉主题并设置 data-theme
 */
function applyVisualTheme(mode: ThemeMode): void {
  const visual = mode === 'system' ? (darkMq.matches ? 'dark' : 'light') : mode;
  document.documentElement.setAttribute('data-theme', visual);
}

/**
 * 系统主题变化回调（仅 system 模式下生效）
 */
function onSystemThemeChange(): void {
  if (currentMode === 'system') {
    applyVisualTheme('system');
  }
}

/**
 * 初始化主题：从持久化读取模式并应用
 * 应在 React 挂载前调用，避免白屏闪烁
 */
export async function initTheme(): Promise<void> {
  try {
    const mode = (await window.api.themeModeGet()) as ThemeMode;
    currentMode = mode === 'dark' || mode === 'light' || mode === 'system' ? mode : 'dark';
  } catch {
    currentMode = 'dark';
  }
  applyVisualTheme(currentMode);
  darkMq.addEventListener('change', onSystemThemeChange);
}

/**
 * 切换主题模式并持久化
 * @param mode - 目标模式
 */
export async function setThemeMode(mode: ThemeMode): Promise<void> {
  currentMode = mode;
  applyVisualTheme(mode);
  await window.api.themeModeSet(mode);
}

/**
 * 获取当前主题模式
 */
export function getThemeMode(): ThemeMode {
  return currentMode;
}
