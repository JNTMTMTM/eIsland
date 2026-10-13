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
 * @file matrixUtils.test.ts
 * @description 矩阵代数、线性系统、数值尺度和输入边界测试。
 * @author 鸡哥
 */


import { expect, it } from 'vitest';
import { calculateMatrix, parseMatrix } from '../matrixUtils';
const a = [[1,2],[3,4]];
it('parses matrices and performs elementwise, product, transpose and scale operations', () => {
  expect(parseMatrix('1/2 2;3 4')).toEqual([[.5,2],[3,4]]); expect(parseMatrix('[[1,2],[3,4]]')).toEqual(a);
  expect(calculateMatrix('add', a, a)).toEqual([[2,4],[6,8]]);
  expect(calculateMatrix('subtract', a, a)).toEqual([[0,0],[0,0]]);
  expect(calculateMatrix('multiply', a, a)).toEqual([[7,10],[15,22]]);
  expect(calculateMatrix('transpose', a)).toEqual([[1,3],[2,4]]);
  expect(calculateMatrix('scale', a, undefined, 2)).toEqual([[2,4],[6,8]]);
  expect(a).toEqual([[1,2],[3,4]]);
});
it('computes determinant, inverse, rank and solves multiple right hand sides', () => {
  expect(calculateMatrix('determinant', a)).toBeCloseTo(-2);
  const inverse = calculateMatrix('inverse', a) as number[][]; expect(inverse[0][0]).toBeCloseTo(-2); expect(inverse[1][1]).toBeCloseTo(-.5);
  const identity = calculateMatrix('multiply', a, inverse) as number[][]; expect(identity[0][0]).toBeCloseTo(1); expect(identity[0][1]).toBeCloseTo(0);
  expect(calculateMatrix('rank', [[1,2,3],[2,4,6]])).toBe(1);
  const solution = calculateMatrix('solve', [[2,1],[1,3]], [[1],[2]]) as number[][]; expect(solution[0][0]).toBeCloseTo(.2); expect(solution[1][0]).toBeCloseTo(.6);
  expect(calculateMatrix('determinant', [[1e100,0],[0,1e-100]])).toBeCloseTo(1);
});
it('rejects singular, ragged, nonfinite and incompatible matrices', () => {
  expect(() => calculateMatrix('inverse', [[1,2],[2,4]])).toThrow('Singular');
  expect(() => calculateMatrix('multiply', a, [[1,2,3]])).toThrow('dimensions');
  expect(() => parseMatrix('1 2\n3')).toThrow(); expect(() => parseMatrix('Infinity')).toThrow();
  expect(() => parseMatrix('[[1,null],[2,3]]')).toThrow();
});
