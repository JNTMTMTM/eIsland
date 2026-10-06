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
 * @file appLauncherExpansion.test.ts
 * @description 应用图标放大时的多圈避让、蜂窝碰撞与稳定性回归测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { getAppLauncherExpansionOffsets } from '../appLauncherExpansion';
import type { AppLauncherExpansionPosition } from '../../types/appLauncherTypes';

function honeycomb(rows: readonly number[], diameter: number): AppLauncherExpansionPosition[] {
  const pitch = diameter + 7;
  return rows.flatMap((count, row) => Array.from(Array.from({ length: count }).keys(), (column) => ({
    x: (column + (row % 2) / 2) * pitch,
    y: row * pitch * Math.sqrt(3) / 2,
    width: diameter,
  })));
}

function expectSeparated(
  positions: readonly AppLauncherExpansionPosition[],
  offsets: readonly { x: number; y: number }[],
  activeIndex: number,
  scale: number,
): void {
  positions.forEach((first, firstIndex) => {
    positions.forEach((second, secondIndex) => {
      if (secondIndex <= firstIndex) return;
      const distance = Math.hypot(
        first.x + offsets[firstIndex].x - second.x - offsets[secondIndex].x,
        first.y + offsets[firstIndex].y - second.y - offsets[secondIndex].y,
      );
      const firstRadius = first.width * (firstIndex === activeIndex ? scale : 1) / 2;
      const secondRadius = second.width * (secondIndex === activeIndex ? scale : 1) / 2;
      expect(distance, `icons ${firstIndex} and ${secondIndex}`).toBeGreaterThanOrEqual(firstRadius + secondRadius + 5.99);
    });
  });
}

describe('getAppLauncherExpansionOffsets', () => {
  const positions = [
    { x: 0, y: 0, width: 64 },
    { x: 80, y: 0, width: 64 },
    { x: 160, y: 0, width: 64 },
    { x: 240, y: 0, width: 64 },
    { x: 1000, y: 0, width: 64 },
  ] as const;

  it.each([-1, positions.length])('索引 %s 不存在时不移动图标', (activeIndex) => {
    expect(getAppLauncherExpansionOffsets(positions, activeIndex, 2.4))
      .toEqual(positions.map(() => ({ x: 0, y: 0 })));
  });

  it.each([0, .8, 1, Number.NaN, Number.POSITIVE_INFINITY])('比例 %s 不要求有效放大时保持原位', (scale) => {
    expect(getAppLauncherExpansionOffsets(positions, 0, scale))
      .toEqual(positions.map(() => ({ x: 0, y: 0 })));
  });

  it('空导航目录返回空列表', () => {
    expect(getAppLauncherExpansionOffsets([], 0, 2.4)).toEqual([]);
  });

  it('共享圆心的图标仍能分离，保留固定选中位置与有限位移', () => {
    const overlapping = [
      { x: 100, y: 100, width: 64 },
      { x: 100, y: 100, width: 64 },
      { x: 100, y: 100, width: 64 },
    ];
    const offsets = getAppLauncherExpansionOffsets(overlapping, 0, 2.4);
    expect(offsets[0]).toEqual({ x: 0, y: 0 });
    expect(offsets.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    expectSeparated(overlapping, offsets, 0, 2.4);
  });

  it('选中图标固定，近邻推动后排，未受影响的远处图标保持原位', () => {
    const offsets = getAppLauncherExpansionOffsets(positions, 0, 2.4);

    expect(offsets[0]).toEqual({ x: 0, y: 0 });
    expect(offsets[1].x).toBeGreaterThan(0);
    expect(offsets[2].x).toBeGreaterThan(0);
    expect(offsets[3].x).toBeGreaterThan(0);
    expect(offsets[2].x).toBeLessThan(offsets[1].x);
    expect(offsets[3].x).toBeLessThan(offsets[2].x);
    expect(offsets[4]).toEqual({ x: 0, y: 0 });
    expectSeparated(positions, offsets, 0, 2.4);
  });

  it.each([
    { label: '7/6', rows: [7, 6, 5], diameter: 64, activeIndex: 9 },
    { label: '5/4', rows: [5, 4, 5, 4], diameter: 56, activeIndex: 6 },
    { label: '3/2', rows: [3, 2, 3, 2, 3, 2, 3], diameter: 40, activeIndex: 8 },
  ].flatMap((layout) => [2.4, 3.2].map((scale) => ({ scale, ...layout }))))('$label 错列密集布局中放大 $scale 倍后所有圆均保留间隙', ({ rows, diameter, activeIndex, scale }) => {
    const grid = honeycomb(rows, diameter);
    const offsets = getAppLauncherExpansionOffsets(grid, activeIndex, scale);

    expect(offsets[activeIndex]).toEqual({ x: 0, y: 0 });
    expectSeparated(grid, offsets, activeIndex, scale);
  });

  it.each([2.4, 3.2])('已放大的悬停圆和边缘图标在 %s 倍缩放时使用各自真实直径避让', (scale) => {
    const grid = honeycomb([7, 6, 5], 64);
    grid[0] = { ...grid[0], width: 76.8 };
    const offsets = getAppLauncherExpansionOffsets(grid, 0, scale);

    expect(offsets[0]).toEqual({ x: 0, y: 0 });
    expectSeparated(grid, offsets, 0, scale);
  });

  it('重复计算不累计位移或修改输入，整体平移不改变相对避让结果', () => {
    const frozen = Object.freeze(positions.map((position) => Object.freeze({ ...position })));
    const original = JSON.stringify(frozen);
    const offsets = getAppLauncherExpansionOffsets(frozen, 0, 2.4);
    const shifted = frozen.map(({ x, y, width }) => ({ width, x: x + 117, y: y - 81 }));

    expect(getAppLauncherExpansionOffsets(frozen, 0, 2.4)).toEqual(offsets);
    getAppLauncherExpansionOffsets(shifted, 0, 2.4).forEach((offset, index) => {
      expect(offset.x).toBeCloseTo(offsets[index].x, 8);
      expect(offset.y).toBeCloseTo(offsets[index].y, 8);
    });
    expect(JSON.stringify(frozen)).toBe(original);
  });

  it('放大比例的小变化产生连续的小位移变化，不按像素取整', () => {
    const before = getAppLauncherExpansionOffsets(positions, 0, 2.4);
    const after = getAppLauncherExpansionOffsets(positions, 0, 2.401);

    expect(after[1].x).toBeGreaterThan(before[1].x);
    after.forEach((offset, index) => {
      expect(Math.hypot(offset.x - before[index].x, offset.y - before[index].y)).toBeLessThan(.1);
    });
    expect(Number.isInteger(before[1].x)).toBe(false);
  });

  it('刚开始放大时不强制扩展未选中图标间距，密集网格不会突然跳开', () => {
    const touching = [
      { x: 0, y: 0, width: 64 },
      { x: 64, y: 0, width: 64 },
      { x: 128, y: 0, width: 64 },
    ];
    const offsets = getAppLauncherExpansionOffsets(touching, 0, 1.00001);

    expect(offsets[0]).toEqual({ x: 0, y: 0 });
    expect(offsets[1].x).toBeGreaterThan(0);
    offsets.forEach(({ x, y }) => {
      expect(Math.hypot(x, y)).toBeLessThan(.01);
    });
  });
});
