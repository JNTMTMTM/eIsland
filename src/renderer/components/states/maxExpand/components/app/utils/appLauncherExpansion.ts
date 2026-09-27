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
 * @file appLauncherExpansion.ts
 * @description 计算应用图标放大时向相邻各圈传播的避让位移。
 * @author 鸡哥
 */

export interface AppLauncherExpansionPosition {
  x: number;
  y: number;
  width: number;
}

const ICON_GAP = 6;
const MAX_SEPARATION_PASSES = 120;
const SEPARATION_TOLERANCE = .0001;

/**
 * 固定选中图标的圆心，将放大造成的碰撞逐圈向外传播。
 * @param positions - 当前图标圆心和直径，包含已有悬停变换。
 * @param activeIndex - 放大图标的索引，找不到时返回零位移。
 * @param scale - 相对当前直径的放大比例，小于等于 1 时保持原位。
 * @returns 与输入顺序相同的连续像素位移，不改变输入坐标。
 */
export function getAppLauncherExpansionOffsets(
  positions: readonly AppLauncherExpansionPosition[],
  activeIndex: number,
  scale: number,
): Array<{ x: number; y: number }> {
  const active = positions[activeIndex];
  if (!active || scale <= 1 || !Number.isFinite(scale)) {
    return positions.map(() => ({ x: 0, y: 0 }));
  }

  const gap = ICON_GAP * Math.min(1, scale - 1);
  const radii = positions.map((position, index) => position.width * (index === activeIndex ? scale : 1) / 2);
  const centers = positions.map((position, index) => {
    if (index === activeIndex) return { x: position.x, y: position.y };
    const dx = position.x - active.x;
    const dy = position.y - active.y;
    const distance = Math.hypot(dx, dy);
    const clearance = radii[activeIndex] + radii[index] + gap;
    if (distance >= clearance) return { x: position.x, y: position.y };
    const angle = distance === 0 ? index * Math.PI * 2 / positions.length : Math.atan2(dy, dx);
    return {
      x: active.x + Math.cos(angle) * clearance,
      y: active.y + Math.sin(angle) * clearance,
    };
  });

  // 近邻必须继续推动后排；只避让选中圆会把第一圈挤进第二圈。
  for (let pass = 0; pass < MAX_SEPARATION_PASSES; pass += 1) {
    let greatestOverlap = 0;
    centers.forEach((first, firstIndex) => {
      centers.forEach((second, secondIndex) => {
        if (secondIndex <= firstIndex) return;
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy);
        const overlap = radii[firstIndex] + radii[secondIndex] + gap - distance;
        if (overlap <= 0) return;
        greatestOverlap = Math.max(greatestOverlap, overlap);
        const unitX = distance === 0 ? 1 : dx / distance;
        const unitY = distance === 0 ? 0 : dy / distance;
        const displacement = overlap + SEPARATION_TOLERANCE;
        const firstShare = secondIndex === activeIndex ? 1 : .5;
        const secondShare = firstIndex === activeIndex ? 1 : .5;
        if (firstIndex !== activeIndex) {
          centers[firstIndex].x -= unitX * displacement * firstShare;
          centers[firstIndex].y -= unitY * displacement * firstShare;
        }
        if (secondIndex !== activeIndex) {
          centers[secondIndex].x += unitX * displacement * secondShare;
          centers[secondIndex].y += unitY * displacement * secondShare;
        }
      });
    });
    if (greatestOverlap <= SEPARATION_TOLERANCE) break;
  }

  return centers.map((center, index) => ({
    x: center.x - positions[index].x,
    y: center.y - positions[index].y,
  }));
}
