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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/**
 * @file tangentUtils.ts
 * @description 数值切线的左右导数检查与可见区间裁剪。
 * @author 鸡哥
 */

export interface TangentPoint { x: number; y: number; slope: number }

/** 比较左右二阶差分和相邻步长的收敛结果，估计有限导数。
 * @param evaluate - 与曲线绘制一致的单变量求值函数
 * @param x - 鼠标追踪点的横坐标
 * @returns 数值切点和斜率；尖点、断点、定义域边界或不收敛时返回空值
 */
export function estimateTangent(evaluate: (x: number) => number, x: number): TangentPoint | null {
  if (!Number.isFinite(x)) return null;
  try {
    const y = evaluate(x);
    if (!Number.isFinite(y)) return null;
    let h = Math.pow(Number.EPSILON, .25) * Math.max(1, Math.abs(x));
    for (let iteration = 0; iteration < 4; iteration += 1, h /= 2) {
      if (x + h / 4 === x || x - h / 4 === x) return null;
      const left = [evaluate(x - h), evaluate(x - h / 2), evaluate(x - h / 4)];
      const right = [evaluate(x + h), evaluate(x + h / 2), evaluate(x + h / 4)];
      if (![...left, ...right].every(Number.isFinite)) return null;
      const dl = left.map((sample, index) => (y - sample) / (h / (2 ** index)));
      const dr = right.map((sample, index) => (sample - y) / (h / (2 ** index)));
      const leftSlope = 2 * dl[2] - dl[1]; const rightSlope = 2 * dr[2] - dr[1];
      const previousLeft = 2 * dl[1] - dl[0]; const previousRight = 2 * dr[1] - dr[0];
      const scale = Math.max(1, Math.abs(leftSlope), Math.abs(rightSlope));
      const roundoff = 32 * Number.EPSILON * Math.max(1, Math.abs(y), ...left.map(Math.abs), ...right.map(Math.abs)) / (h / 4);
      const tolerance = 1e-5 * scale + roundoff;
      const error = Math.max(Math.abs(leftSlope - rightSlope), Math.abs(leftSlope - previousLeft), Math.abs(rightSlope - previousRight));
      const slope = (leftSlope + rightSlope) / 2;
      if (Number.isFinite(slope) && error <= tolerance) return { x, y, slope };
    }
  } catch { return null; }
  return null;
}

/** 将切线裁剪为可见坐标范围内的线段，避免产生无限大 SVG 坐标。
 * @param tangent - 有限导数对应的切点和斜率
 * @param xDomain - 当前可见横坐标范围
 * @param yDomain - 当前可见纵坐标范围
 * @returns 线段的两个端点；切线不经过视图时返回空值
 */
export function clipTangent(tangent: TangentPoint, xDomain: readonly number[], yDomain: readonly number[]): [[number, number], [number, number]] | null {
  const { x, y, slope } = tangent;
  let left = Math.min(...xDomain); let right = Math.max(...xDomain);
  const bottom = Math.min(...yDomain); const top = Math.max(...yDomain);
  if (![x, y, slope, left, right, bottom, top].every(Number.isFinite) || left >= right || bottom >= top) return null;
  if (slope === 0) return y < bottom || y > top ? null : [[left, y], [right, y]];
  const a = x + (bottom - y) / slope; const b = x + (top - y) / slope;
  left = Math.max(left, Math.min(a, b)); right = Math.min(right, Math.max(a, b));
  if (left >= right) return null;
  const at = (value: number): number => Math.max(bottom, Math.min(top, y + slope * (value - x)));
  return [[left, at(left)], [right, at(right)]];
}
