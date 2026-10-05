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
 */

/**
 * @file appLauncherReorder.ts
 * @description 按行与水平插入位置预览排序，为相邻图标计算连续让位位移。
 * @author 鸡哥
 */

import type { AppLauncherHoverOffset, AppLauncherPosition } from '../types/appLauncherTypes';

/**
 * 将完整拖动视觉范围限制在可见容器内。
 * @param bounds - 拖动图标、外圈和标签在当前滚动位置下的初始边界。
 * @param viewport - 容器的可见边界。
 * @param x - 指针请求的水平位移。
 * @param y - 已包含滚动补偿的垂直位移。
 * @returns 限制后的位移；容器无法容纳图标时返回 null。
 */
export function clampAppLauncherDragOffset(
  bounds: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
  viewport: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>,
  x: number,
  y: number,
): AppLauncherHoverOffset | null {
  const minX = viewport.left - bounds.left;
  const maxX = viewport.right - bounds.right;
  const minY = viewport.top - bounds.top;
  const maxY = viewport.bottom - bounds.bottom;
  if (minX > maxX || minY > maxY) return null;
  return { x: Math.max(minX, Math.min(maxX, x)), y: Math.max(minY, Math.min(maxY, y)) };
}

/**
 * 先确定指针所在行，再按槽位中线确定插入位置，不依赖图标重叠。
 * @param positions - 拖动开始时的固定槽位圆心，按导航顺序排列，不包含设置入口。
 * @param x - 被拖动图标圆心的水平坐标。
 * @param y - 被拖动图标圆心的垂直坐标。
 * @returns 插入槽位索引；没有有效槽位或坐标时返回 -1。
 */
export function getAppLauncherInsertionIndex(positions: readonly AppLauncherPosition[], x: number, y: number): number {
  if (!positions.length || !Number.isFinite(x) || !Number.isFinite(y)) return -1;
  const rows: { y: number; indices: number[] }[] = [];
  positions.forEach((position, index) => {
    const lastRow = rows.at(-1);
    if (lastRow && Math.abs(lastRow.y - position.y) < 2) lastRow.indices.push(index);
    else rows.push({ y: position.y, indices: [index] });
  });
  const row = rows.find((candidate, index) => index === rows.length - 1 || y < (candidate.y + rows[index + 1].y) / 2);
  if (!row) return -1;
  return row.indices.find((index, column) => column === row.indices.length - 1
    || x < (positions[index].x + positions[row.indices[column + 1]].x) / 2) ?? -1;
}

/**
 * 为插入区间中的图标分配相邻槽位，产生实时让位而不修改按钮命中区域。
 * @param positions - 拖动开始时的完整固定槽位圆心，包含末尾设置入口。
 * @param sourceIndex - 被拖动图标原始索引。
 * @param targetIndex - 预览插入索引。
 * @returns 按原始顺序排列的视觉层位移，拖动源由指针单独驱动。
 */
export function getAppLauncherReorderOffsets(
  positions: readonly AppLauncherPosition[],
  sourceIndex: number,
  targetIndex: number,
): AppLauncherHoverOffset[] {
  return positions.map((position, index) => {
    if (!positions[sourceIndex] || !positions[targetIndex] || index === sourceIndex) return { x: 0, y: 0 };
    let slotIndex = index;
    if (sourceIndex < targetIndex && index > sourceIndex && index <= targetIndex) slotIndex--;
    if (sourceIndex > targetIndex && index >= targetIndex && index < sourceIndex) slotIndex++;
    const slot = positions[slotIndex];
    return { x: slot.x - position.x, y: slot.y - position.y };
  });
}
