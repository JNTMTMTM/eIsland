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
 * @file appLauncherHover.test.ts
 * @description 应用导航悬停避让的方向、稳定性与响应式几何回归测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { getAppLauncherHoverOffsets } from '../appLauncherHover';
import type { AppLauncherPosition } from '../appLauncherHover';

describe('getAppLauncherHoverOffsets', () => {
  const positions = [
    { x: 100, y: 100, width: 80 },
    { x: 180, y: 100, width: 80 },
    { x: 140, y: 180, width: 80 },
    { x: 1000, y: 100, width: 80 },
  ] as const;

  it.each([-1, positions.length, Number.NaN])('激活索引 %s 不存在时所有图标复位', (activeIndex) => {
    const offsets = getAppLauncherHoverOffsets(positions, activeIndex);

    expect(offsets).toHaveLength(positions.length);
    expect(offsets.every(({ x, y }) => x === 0 && y === 0)).toBe(true);
  });

  it('空目录返回空位移列表', () => {
    expect(getAppLauncherHoverOffsets([], 0)).toEqual([]);
  });

  it('激活图标和远处图标保持原位，附近图标避让', () => {
    const offsets = getAppLauncherHoverOffsets(positions, 0);

    expect(offsets[0]).toEqual({ x: 0, y: 0 });
    expect(offsets[3]).toEqual({ x: 0, y: 0 });
    expect(offsets[1].x).toBeGreaterThan(0);
    expect(offsets[2].y).toBeGreaterThan(0);
  });

  it('上下左右等距邻居对称向外移动，不产生横向漂移', () => {
    const offsets = getAppLauncherHoverOffsets([
      { x: 0, y: 0, width: 80 },
      { x: -70, y: 0, width: 80 },
      { x: 70, y: 0, width: 80 },
      { x: 0, y: -70, width: 80 },
      { x: 0, y: 70, width: 80 },
    ], 0);

    expect(offsets[1].x).toBeLessThan(0);
    expect(offsets[2].x).toBe(-offsets[1].x);
    expect(offsets[1].y).toBe(0);
    expect(offsets[2].y).toBe(0);
    expect(offsets[3].y).toBeLessThan(0);
    expect(offsets[4].y).toBe(-offsets[3].y);
    expect(offsets[3].x).toBe(0);
    expect(offsets[4].x).toBe(0);
  });

  it('错列中的斜向邻居沿各自方向避让，距离越远移动越少', () => {
    const offsets = getAppLauncherHoverOffsets([
      { x: 0, y: 0, width: 80 },
      { x: -40, y: -40, width: 80 },
      { x: 40, y: -40, width: 80 },
      { x: -40, y: 40, width: 80 },
      { x: 40, y: 40, width: 80 },
      { x: 80, y: 80, width: 80 },
    ], 0);

    expect(offsets[1].x).toBeLessThan(0);
    expect(offsets[1].y).toBeLessThan(0);
    expect(offsets[2].x).toBeGreaterThan(0);
    expect(offsets[2].y).toBeLessThan(0);
    expect(offsets[3].x).toBeLessThan(0);
    expect(offsets[3].y).toBeGreaterThan(0);
    expect(offsets[4].x).toBeGreaterThan(0);
    expect(offsets[4].y).toBeGreaterThan(0);
    expect(offsets[4].x).toBe(offsets[4].y);
    expect(offsets[5].x).toBeLessThan(offsets[4].x);
    expect(offsets[5].y).toBeLessThan(offsets[4].y);
  });

  it('重合中心与尚未布局的零宽按钮不会产生无效位移', () => {
    const coincident = [
      { x: 0, y: 0, width: 80 },
      { x: 0, y: 0, width: 80 },
    ];
    expect(getAppLauncherHoverOffsets(coincident, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
    expect(getAppLauncherHoverOffsets([
      { x: 0, y: 0, width: 0 },
      { x: 40, y: 0, width: 80 },
    ], 0)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it('重复计算及整体坐标平移不会累计偏移，也不修改原始网格', () => {
    const frozenPositions: readonly AppLauncherPosition[] = Object.freeze(
      positions.map((position) => Object.freeze({ ...position })),
    );
    const original = JSON.stringify(frozenPositions);
    const expected = getAppLauncherHoverOffsets(frozenPositions, 0);
    const translated = frozenPositions.map(({ x, y, width }) => ({ width, x: x + 271, y: y - 155 }));

    expect(getAppLauncherHoverOffsets(frozenPositions, 0)).toEqual(expected);
    expect(getAppLauncherHoverOffsets(translated, 0)).toEqual(expected);
    expect(JSON.stringify(frozenPositions)).toBe(original);
  });

  it.each([.65, 1.25, 2])('网格等比例缩放 %s 倍时保持一致的避让强度', (scale) => {
    const resized = positions.map(({ x, y, width }) => ({
      x: x * scale,
      y: y * scale,
      width: width * scale,
    }));

    expect(getAppLauncherHoverOffsets(resized, 0)).toEqual(getAppLauncherHoverOffsets(positions, 0));
  });

  it('极近邻居仍使用有限整数像素，单轴位移不超过 24px', () => {
    const offsets = getAppLauncherHoverOffsets([
      { x: 0, y: 0, width: 80 },
      { x: 1, y: 0, width: 80 },
      { x: -1, y: 1, width: 80 },
      { x: 1, y: -1, width: 80 },
    ], 0);

    offsets.forEach(({ x, y }) => {
      expect(Number.isInteger(x)).toBe(true);
      expect(Number.isInteger(y)).toBe(true);
      expect(Math.abs(x)).toBeLessThanOrEqual(24);
      expect(Math.abs(y)).toBeLessThanOrEqual(24);
    });
  });
});
