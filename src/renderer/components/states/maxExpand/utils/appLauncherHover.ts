/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file appLauncherHover.ts
 * @description 根据固定网格位置计算应用图标的悬停避让位移。
 * @author 鸡哥
 */

export interface AppLauncherPosition {
  x: number;
  y: number;
  width: number;
}

/**
 * 将附近图标沿悬停项的径向推开，保持网格布局及命中区域不变。
 * @param positions - 各按钮未经视觉变换的中心坐标与宽度。
 * @param activeIndex - 当前悬停或键盘聚焦的索引，-1 表示没有激活项。
 * @returns 各图标的整数像素位移，激活项和远处图标保持原位。
 */
export function getAppLauncherHoverOffsets(
  positions: readonly AppLauncherPosition[],
  activeIndex: number,
): Array<{ x: number; y: number }> {
  const active = positions[activeIndex];
  return positions.map((position) => {
    if (!active) return { x: 0, y: 0 };
    const dx = position.x - active.x;
    const dy = position.y - active.y;
    const distance = Math.hypot(dx, dy);
    const radius = active.width * 1.8;
    if (distance === 0 || distance >= radius) return { x: 0, y: 0 };
    const strength = 24 * (1 - distance / radius);
    return {
      x: Math.round(dx / distance * strength),
      y: Math.round(dy / distance * strength),
    };
  });
}
