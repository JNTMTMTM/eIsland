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
 * @file calculatorNumericBoundaries.test.ts
 * @description 计算器真实解析求值、数值域、求和积分上限与科学输入边界测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { evaluateFormula, formatDisplay, getScientificInput } from '../calculatorUtils';

describe('numeric and parser boundaries', () => {
  it.each([
    { formula: '+3-2', expected: 1 },
    { formula: '-(-2)', expected: 2 },
    { formula: ' 2 * 3 / 2 ', expected: 3 },
    { formula: '1e2+.5', expected: 100.5 },
    { formula: 'tan(0)', expected: 0 },
    { formula: 'log(100)', expected: 2 },
    { formula: 'ln(e)', expected: 1 },
    { formula: 'abs(-3)', expected: 3 },
    { formula: 'exp(0)', expected: 1 },
    { formula: '0!', expected: 1 },
    { formula: '170!', expected: 7.257415615307994e306 },
    { formula: 'integral(x,2,2)', expected: 0 },
    { formula: 'integral(x,2,0)', expected: -2 },
    { formula: 'sum(1,1,100000)', expected: 100000 },
  ])('evaluates $formula using the real AST', ({ formula, expected }) => {
    expect(evaluateFormula(formula)).toBeCloseTo(expected, 8);
  });
  it.each([
    { formula: '(-1)!', error: 'Invalid factorial' },
    { formula: '1.5!', error: 'Invalid factorial' },
    { formula: '171!', error: 'Invalid factorial' },
    { formula: 'sum(x,1,2.5)', error: 'Invalid summation range' },
    { formula: 'sum(x,3,1)', error: 'Invalid summation range' },
    { formula: 'sum(x,1,100001)', error: 'Invalid summation range' },
    { formula: 'sum(x,1)', error: 'expects 3' },
    { formula: 'integral(x,0)', error: 'expects 3' },
    { formula: 'derivative(x,0,1)', error: 'expects 2' },
    { formula: 'logn(0,1)', error: 'Invalid logarithm domain' },
    { formula: 'logn(2,0)', error: 'Invalid logarithm domain' },
    { formula: 'foo()', error: 'Unknown function' },
    { formula: '1@', error: 'Unexpected token' },
    { formula: '(1', error: 'Missing token' },
    { formula: '', error: 'Expected value' },
    { formula: '1e999', error: 'Non-finite result' },
    { formula: 'integral(1/(x+0.000000000001),0,1)', error: 'Integral did not converge' },
  ])('rejects $formula with the intended error', ({ formula, error }) => {
    expect(() => evaluateFormula(formula)).toThrow(error);
  });
  it.each([
    { value: Infinity, expected: 'Error' },
    { value: -Infinity, expected: 'Error' },
    { value: NaN, expected: 'Error' },
    { value: 123.5, expected: '123.5' },
    { value: 123.456789012345, expected: '123.456789012' },
    { value: 1234567890123, expected: '1.23456789012e+12' },
  ])('formats numerical value $value', ({ value, expected }) => expect(formatDisplay(value)).toBe(expected));
  it.each([
    { fn: 'pi', text: 'π', offset: 0 },
    { fn: 'e', text: 'e', offset: 0 },
    { fn: 'variable', text: 'x', offset: 0 },
    { fn: 'cube', text: '^3', offset: 0 },
    { fn: 'exp', text: 'e^()', offset: 1 },
    { fn: 'factorial', text: '!', offset: 0 },
    { fn: 'reciprocal', text: '1/()', offset: 1 },
  ] as const)('inserts scientific $fn', ({ fn, text, offset }) => expect(getScientificInput(fn)).toEqual({ text, cursorOffset: offset }));
});

it('preserves the exponent while trimming scientific display precision', () => {
  expect(formatDisplay(1.2345678901234568e20)).toBe('1.23456789012e+20');
});

it.each([
  { value: -1.2345678901234568e20, expected: '-1.23456789012e+20' },
  { value: 1.2345678901234568e-10, expected: '1.23456789012e-10' },
  { value: 123456789000.0001, expected: '123456789000' },
  { value: 123456.000000001, expected: '123456' },
  { value: 100200.000000001, expected: '100200' },
  { value: 120030.040000001, expected: '120030.04' },
])('trims fractional zeroes without changing magnitude $value', ({ value, expected }) => {
  expect(formatDisplay(value)).toBe(expected);
});
