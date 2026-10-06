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
 * @file appLauncherReorder.test.ts
 * @description 水平插入、错列换行、连续让位及反向拖动几何回归测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { clampAppLauncherDragOffset, getAppLauncherInsertionIndex, getAppLauncherReorderOffsets } from '../appLauncherReorder';

describe('应用图标拖动边界', () => {
  const viewport = { left: 100, right: 400, top: 200, bottom: 450 };
  const bounds = { left: 150, right: 230, top: 250, bottom: 350 };

  it.each([
    [-1000, 0, -50, 0], [1000, 0, 170, 0],
    [0, -1000, 0, -50], [0, 1000, 0, 100],
    [-1000, -1000, -50, -50], [1000, 1000, 170, 100],
  ])('限制位移 (%s, %s)，包含放大图标、进度圈与文字的完整边界', (x, y, expectedX, expectedY) => {
    expect(clampAppLauncherDragOffset(bounds, viewport, x, y)).toEqual({ x: expectedX, y: expectedY });
  });

  it('容器内移动不改变位移，已有越界则立即移回可见区域', () => {
    expect(clampAppLauncherDragOffset(bounds, viewport, 20, 30)).toEqual({ x: 20, y: 30 });
    expect(clampAppLauncherDragOffset({ ...bounds, top: 180, bottom: 280 }, viewport, 0, 0)).toEqual({ x: 0, y: 20 });
  });

  it('容器无法容纳完整图标时禁止开始拖动', () => {
    expect(clampAppLauncherDragOffset(bounds, { ...viewport, right: 150 }, 0, 0)).toBeNull();
    expect(clampAppLauncherDragOffset(bounds, { ...viewport, bottom: 250 }, 0, 0)).toBeNull();
  });
});

describe('应用图标插入预览', () => {
  const positions = [
    { x: 0, y: 0, width: 10 },
    { x: 80, y: 0, width: 10 },
    { x: 160, y: 0, width: 10 },
    { x: 40, y: 90, width: 10 },
    { x: 120, y: 90, width: 10 },
  ];

  it('图标尚未重叠时，跨越水平中线即可让相邻图标移开', () => {
    expect(getAppLauncherInsertionIndex(positions, 39, 0)).toBe(0);
    const index = getAppLauncherInsertionIndex(positions, 41, 0);
    expect(index).toBe(1);
    expect(positions[1].x - 41).toBeGreaterThan(positions[1].width);
    expect(getAppLauncherReorderOffsets(positions, 0, index)[1]).toEqual({ x: -80, y: 0 });
  });

  it('先选行再选水平槽位，横向拖动不会被邻行近处图标吸走', () => {
    expect(getAppLauncherInsertionIndex(positions, 40, 44)).toBe(1);
    expect(getAppLauncherInsertionIndex(positions, 40, 46)).toBe(3);
    expect(getAppLauncherInsertionIndex(positions, 1000, 0)).toBe(2);
    expect(getAppLauncherInsertionIndex(positions, -1000, 90)).toBe(3);
  });

  it('向右跨越多个图标时，相邻图标连续向左填补槽位', () => {
    expect(getAppLauncherReorderOffsets(positions, 0, 2)).toEqual([
      { x: 0, y: 0 }, { x: -80, y: 0 }, { x: -80, y: 0 },
      { x: 0, y: 0 }, { x: 0, y: 0 },
    ]);
  });

  it('向左拖动时，相邻图标连续向右填补槽位', () => {
    expect(getAppLauncherReorderOffsets(positions, 2, 0)).toEqual([
      { x: 80, y: 0 }, { x: 80, y: 0 }, { x: 0, y: 0 },
      { x: 0, y: 0 }, { x: 0, y: 0 },
    ]);
  });

  it('跨越错列行时，按真实槽位移动且没有重复占位', () => {
    const offsets = getAppLauncherReorderOffsets(positions, 0, 4);
    expect(offsets[3]).toEqual({ x: 120, y: -90 });
    const centers = positions.slice(1).map((position, index) => ({
      x: position.x + offsets[index + 1].x,
      y: position.y + offsets[index + 1].y,
    }));
    expect(centers).toEqual(positions.slice(0, 4).map(({ x, y }) => ({ x, y })));
  });

  it('回到原始位置时全部让位位移清零', () => {
    expect(getAppLauncherReorderOffsets(positions, 0, 0).every(({ x, y }) => x === 0 && y === 0)).toBe(true);
  });

  it('空槽位、非法坐标和无效索引不会产生插入或位移', () => {
    expect(getAppLauncherInsertionIndex([], 0, 0)).toBe(-1);
    expect(getAppLauncherInsertionIndex(positions, Number.NaN, 0)).toBe(-1);
    expect(getAppLauncherReorderOffsets(positions, -1, 2).every(({ x, y }) => x === 0 && y === 0)).toBe(true);
    expect(getAppLauncherReorderOffsets(positions, 0, 100).every(({ x, y }) => x === 0 && y === 0)).toBe(true);
  });
});
