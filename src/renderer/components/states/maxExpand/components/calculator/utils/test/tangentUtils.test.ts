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
 * @file tangentUtils.test.ts
 * @description 验证可导曲线、尖点和断点的数值切线，以及视图裁剪。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { clipTangent, estimateTangent } from '../tangentUtils';

describe('estimateTangent', () => {
  it.each([
    [(x: number) => x * x, 3, 6],
    [(x: number) => Math.sin(x), 0, 1],
    [(x: number) => Math.log(x), 2, .5],
    [(x: number) => Math.abs(x), -2, -1],
    [(x: number) => 10000 * x * x, 0, 0],
    [() => 7, 2, 0],
  ] as const)('matches the local derivative of a smooth curve', (evaluate, x, slope) => {
    const tangent = estimateTangent(evaluate, x);
    expect(tangent).not.toBeNull();
    expect(tangent!.y).toBe(evaluate(x));
    expect(tangent!.slope).toBeCloseTo(slope, 5);
  });

  it.each([
    Math.abs,
    Math.sqrt,
    Math.cbrt,
    Math.floor,
    (x: number) => 1 / x,
    () => { throw new Error('Outside domain'); },
  ])('rejects corners, singularities, jumps and domain boundaries', (evaluate) => {
    expect(estimateTangent(evaluate, 0)).toBeNull();
  });

  it('rejects a non-finite tracking coordinate', () => {
    expect(estimateTangent((x) => x * x, Infinity)).toBeNull();
  });
});

describe('clipTangent', () => {
  it('keeps the line through its contact point and clips both ends to the visible range', () => {
    expect(clipTangent({ x: 2, y: 4, slope: 4 }, [-10, 10], [-10, 10])).toEqual([[-1.5, -10], [3.5, 10]]);
  });

  it('handles horizontal and steep lines without huge rendered coordinates', () => {
    expect(clipTangent({ x: 0, y: 3, slope: 0 }, [-10, 10], [-10, 10])).toEqual([[-10, 3], [10, 3]]);
    const steep = clipTangent({ x: 0, y: 0, slope: 1e12 }, [-10, 10], [-10, 10]);
    expect(steep).toEqual([[-1e-11, -10], [1e-11, 10]]);
  });

  it('hides lines that do not cross the view and rejects invalid domains', () => {
    expect(clipTangent({ x: 0, y: 11, slope: 0 }, [-10, 10], [-10, 10])).toBeNull();
    expect(clipTangent({ x: 0, y: 0, slope: 1 }, [3, 4], [-1, 1])).toBeNull();
    expect(clipTangent({ x: 0, y: 0, slope: 1 }, [0, Infinity], [-1, 1])).toBeNull();
  });
});
