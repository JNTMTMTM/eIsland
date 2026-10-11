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
 * @file complexUtils.test.ts
 * @description 复数算术、主值、格式化和溢出边界测试。
 * @author 鸡哥
 */


import { expect, it } from 'vitest';
import { evaluateComplexFormula, formatComplex } from '../complexUtils';
it.each([['(1+2i)*(3-4i)',11,2],['i^2',-1,0],['(1+i)^2',0,2],['sqrt(-1)',0,1],['1/i',0,-1],['conj(2+3i)',2,-3],['abs(3+4i)',5,0],['ln(-1)',0,Math.PI],['re(3+2i)',3,0]])('evaluates %s', (formula, re, im) => {
  const result = evaluateComplexFormula(String(formula)); expect(result.re).toBeCloseTo(Number(re)); expect(result.im).toBeCloseTo(Number(im));
});
it('formats signs and checks zero division and logarithm domain', () => {
  expect(formatComplex({re:11,im:2})).toBe('11 + 2i'); expect(formatComplex({re:0,im:-1})).toBe('-i');
  expect(() => evaluateComplexFormula('1/0')).toThrow(); expect(() => evaluateComplexFormula('ln(0)')).toThrow();
  expect(evaluateComplexFormula('(1e308+1e308i)/(1e308+1e308i)')).toEqual({re:1,im:0});
});
