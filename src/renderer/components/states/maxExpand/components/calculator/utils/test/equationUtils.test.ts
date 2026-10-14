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
 * @file equationUtils.test.ts
 * @description 方程实数解、恒等式、数值解和幂运算优先级测试。
 * @author 鸡哥
 */


import { expect, it } from 'vitest';
import { solveEquation } from '../equationUtils';
import { evaluateFormula } from '../calculatorUtils';
it('solves linear and quadratic equations independently of numerical bounds', () => {
  expect(solveEquation('2x+1=5', -1, 1, 'degree').roots).toEqual([2]);
  expect(solveEquation('x^2=4', -1, 1, 'degree').roots).toEqual([-2, 2]);
  expect(solveEquation('-x^2+4=0', -10, 10, 'degree').roots).toEqual([-2, 2]);
  expect(solveEquation('x^2=0', -10, 10, 'degree').roots).toEqual([0]);
  expect(evaluateFormula('-2^2')).toBe(-4); expect(evaluateFormula('2^-3')).toBe(.125);
});
it('distinguishes no solutions and identities and searches transcendental equations', () => {
  expect(solveEquation('x^2+1=0', -10, 10, 'degree').status).toBe('none');
  expect(solveEquation('x=x', -10, 10, 'degree').status).toBe('infinite');
  expect(solveEquation('sin(x)=0.5', 0, 90, 'degree').roots[0]).toBeCloseTo(30, 7);
  expect(() => solveEquation('x=', -10, 10, 'degree')).toThrow();
});
