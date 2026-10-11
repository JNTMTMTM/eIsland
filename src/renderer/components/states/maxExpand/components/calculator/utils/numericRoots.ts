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
 * @file numericRoots.ts
 * @description 有界实数零点搜索与极点排除。
 * @author 鸡哥
 */


export interface RootSearchResult { roots: number[]; identicallyZero: boolean }

/** 在有界区间中通过采样、二分和局部牛顿迭代寻找实数根。
 * @param evaluate - 可求值的单变量函数
 * @param lower - 区间左端点
 * @param upper - 区间右端点
 * @returns 数值近似根及区间内恒零的标记
 */
export function findRealRoots(evaluate: (x: number) => number, lower: number, upper: number): RootSearchResult {
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower >= upper || !Number.isFinite(upper - lower)) throw new Error('Invalid range');
  const sample = (x: number): number => { try { const value = evaluate(x); return Number.isFinite(value) ? value : NaN; } catch { return NaN; } };
  const count = 512; const step = (upper - lower) / count;
  const points = Array.from({ length: count + 1 }, (_, index) => { const x = lower + index * step; return { x, y: sample(x) }; });
  if (points.every((point) => point.y === 0)) return { roots: [], identicallyZero: true };
  const roots: number[] = [];
  const add = (x: number): void => {
    if (x >= lower && x <= upper && Math.abs(sample(x)) <= 1e-8 && !roots.some((root) => Math.abs(root - x) <= 1e-5) && roots.length < 100) roots.push(x);
  };
  points.forEach((point, index) => {
    if (point.y === 0) add(point.x);
    const next = points[index + 1];
    if (next && Number.isFinite(point.y) && Number.isFinite(next.y) && Math.sign(point.y) !== Math.sign(next.y)) {
      let a = point.x; let b = next.x; let fa = point.y;
      for (let iteration = 0; iteration < 70; iteration += 1) {
        const middle = (a + b) / 2; const value = sample(middle);
        if (!Number.isFinite(value)) break;
        if (value === 0) { a = middle; b = middle; break; }
        if (Math.sign(value) === Math.sign(fa)) { a = middle; fa = value; } else b = middle;
      }
      add((a + b) / 2);
    }
    // 局部极小值迭代可以捕获不改变符号的偶重根，最终残差检查排除极点。
    const before = points[index - 1];
    if (!before || !next || !Number.isFinite(point.y) || Math.abs(point.y) > Math.abs(before.y) || Math.abs(point.y) > Math.abs(next.y)) return;
    let x = point.x;
    for (let iteration = 0; iteration < 40; iteration += 1) {
      const value = sample(x); const h = 1e-5 * Math.max(1, Math.abs(x));
      const slope = (sample(x + h) - sample(x - h)) / (2 * h);
      if (!Number.isFinite(slope) || slope === 0) break;
      const candidate = x - value / slope;
      if (!Number.isFinite(candidate) || candidate < lower || candidate > upper) break;
      const change = Math.abs(candidate - x); x = candidate;
      if (change < 1e-10) break;
    }
    add(x);
  });
  return { roots: roots.sort((a, b) => a - b), identicallyZero: false };
}
