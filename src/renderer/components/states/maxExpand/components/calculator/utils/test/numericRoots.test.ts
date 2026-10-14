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
 * @file numericRoots.test.ts
 * @description 零点搜索、偶重根和不连续点回归测试。
 * @author 鸡哥
 */


import { expect, it } from 'vitest';
import { findRealRoots } from '../numericRoots';
import { compileNumericFormula } from '../calculatorUtils';
it('finds crossing, repeated and endpoint roots', () => {
  expect(findRealRoots(compileNumericFormula('x^2-4'), -3, 3).roots).toEqual([-2, 2]);
  expect(findRealRoots(compileNumericFormula('(x-0.37)^2'), -1, 1).roots[0]).toBeCloseTo(.37, 7);
  expect(findRealRoots(compileNumericFormula('x'), 0, 2).roots).toEqual([0]);
});
it('rejects poles, detects identical curves and validates the interval', () => {
  expect(findRealRoots(compileNumericFormula('1/x'), -1, 1).roots).toEqual([]);
  expect(findRealRoots(compileNumericFormula('x^2+1'), -1, 1).roots).toEqual([]);
  expect(findRealRoots(() => 0, -1, 1).identicallyZero).toBe(true);
  expect(() => findRealRoots(() => 1, 1, -1)).toThrow();
});
