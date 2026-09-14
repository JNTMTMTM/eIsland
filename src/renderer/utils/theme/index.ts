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
 * @file index.ts
 * @description 主题管理工具：初始化、切换、监听系统主题变更
 * @author 鸡哥
 */

export type ThemeMode = 'dark' | 'light' | 'system';

/** 主题切换动画的圆心坐标（相对于当前视口） */
export interface ThemeTransitionOrigin {
  x: number;
  y: number;
}

/** 系统偏好媒体查询 */
const darkMq = window.matchMedia('(prefers-color-scheme: dark)');

/** 当前生效的模式（存储用户选择，非最终视觉主题） */
let currentMode: ThemeMode = 'dark';

/** 幂等标记：防止 initTheme 重复注册监听器 */
let initialized = false;

/** 根据用户模式解析最终视觉主题 */
function getVisualTheme(mode: ThemeMode): 'dark' | 'light' {
  return mode === 'system' ? (darkMq.matches ? 'dark' : 'light') : mode;
}

/**
 * 根据模式解析最终视觉主题并设置 data-theme
 */
function applyVisualTheme(mode: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', getVisualTheme(mode));
}

/** 用户要求减少动态效果时跳过主题切换动画 */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 从指定位置以圆形扩散方式应用主题；不支持 View Transitions 时直接切换。
 */
function applyVisualThemeWithTransition(
  mode: ThemeMode,
  origin: ThemeTransitionOrigin | undefined,
  previousVisualTheme: 'dark' | 'light',
): void {
  const nextVisualTheme = getVisualTheme(mode);
  const startViewTransition = document.startViewTransition;

  if (!origin || previousVisualTheme === nextVisualTheme || !startViewTransition || prefersReducedMotion()) {
    applyVisualTheme(mode);
    return;
  }

  const transition = startViewTransition.call(document, () => applyVisualTheme(mode));
  void transition.ready.then(() => {
    const x = Math.max(0, Math.min(origin.x, window.innerWidth));
    const y = Math.max(0, Math.min(origin.y, window.innerHeight));
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    const animationOptions: KeyframeAnimationOptions & { pseudoElement: string } = {
      duration: 520,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both',
      pseudoElement: '::view-transition-new(root)',
    };

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radius}px at ${x}px ${y}px)`,
        ],
      },
      animationOptions,
    );
  }).catch(() => {});
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

  // 幂等保护：防止重复注册监听器
  if (initialized) return;
  initialized = true;

  darkMq.addEventListener('change', onSystemThemeChange);

  window.api.onSettingsChanged((channel: string, value: unknown) => {
    if (channel === 'theme:mode') {
      const mode = value as string;
      const safe: ThemeMode = mode === 'dark' || mode === 'light' || mode === 'system' ? mode : 'dark';
      currentMode = safe;
      applyVisualTheme(safe);
    }
  });
}

/**
 * 切换主题模式并持久化
 * @param mode - 目标模式
 */
export async function setThemeMode(mode: ThemeMode, origin?: ThemeTransitionOrigin): Promise<void> {
  const previousVisualTheme = getVisualTheme(currentMode);
  currentMode = mode;
  applyVisualThemeWithTransition(mode, origin, previousVisualTheme);
  await window.api.themeModeSet(mode);
}

/**
 * 获取当前主题模式
 */
export function getThemeMode(): ThemeMode {
  return currentMode;
}
