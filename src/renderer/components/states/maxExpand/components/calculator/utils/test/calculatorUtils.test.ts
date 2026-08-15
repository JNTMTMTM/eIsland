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
 * @file calculatorUtils.test.ts
 * @description 计算器公式解析与科学输入片段测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { evaluateFormula, getScientificInput } from '../calculatorUtils';

describe('evaluateFormula', () => {
  it('仅在完整公式求值时应用运算优先级', () => {
    expect(evaluateFormula('2+3×4')).toBe(14);
    expect(evaluateFormula('(2+3)×4')).toBe(20);
  });

  it('支持幂、百分比与阶乘', () => {
    expect(evaluateFormula('2^(3)+5!')).toBe(128);
    expect(evaluateFormula('200×10%')).toBe(20);
  });

  it('支持科学函数、常量与任意次根', () => {
    expect(evaluateFormula('sqrt(16)+cbrt(8)')).toBe(6);
    expect(evaluateFormula('root(3,27)')).toBeCloseTo(3);
    expect(evaluateFormula('cos(0)+π')).toBeCloseTo(1 + Math.PI);
    expect(evaluateFormula('arcsin(0)')).toBe(0);
    expect(evaluateFormula('arccos(1)')).toBe(0);
    expect(evaluateFormula('arctan(0)')).toBe(0);
  });

  it('支持任意底数对数与分数', () => {
    expect(evaluateFormula('logn(2,8)')).toBe(3);
    expect(evaluateFormula('frac(1,2)+frac(1,4)')).toBe(0.75);
    expect(() => evaluateFormula('logn(1,8)')).toThrow();
    expect(() => evaluateFormula('frac(1,0)')).toThrow();
  });

  it('支持单变量有限求和', () => {
    expect(evaluateFormula('sum(x^2,1,3)')).toBe(14);
    expect(() => evaluateFormula('sum(x,1.5,3)')).toThrow();
    expect(() => evaluateFormula('x+1')).toThrow();
  });

  it('将相邻变量和表达式解析为隐式乘法', () => {
    expect(evaluateFormula('2π')).toBeCloseTo(2 * Math.PI);
    expect(evaluateFormula('2(3+4)')).toBe(14);
    expect(evaluateFormula('2sin(π÷2)')).toBeCloseTo(2);
    expect(evaluateFormula('sum(2x,1,3)')).toBe(12);
    expect(evaluateFormula('integral(2x,0,1)')).toBeCloseTo(1, 7);
  });

  it('支持定积分与指定点微分', () => {
    expect(evaluateFormula('integral(x^2,0,1)')).toBeCloseTo(1 / 3, 7);
    expect(evaluateFormula('integral(sin(x),0,π)')).toBeCloseTo(2, 7);
    expect(evaluateFormula('derivative(x^2,2)')).toBeCloseTo(4, 5);
    expect(evaluateFormula('derivative(sin(x),0)')).toBeCloseTo(1, 5);
  });

  it('拒绝不完整公式', () => {
    expect(() => evaluateFormula('2+')).toThrow();
    expect(() => evaluateFormula('sqrt(')).toThrow();
  });
});

describe('getScientificInput', () => {
  it('将反三角函数按钮转换为 arc 公式', () => {
    expect(getScientificInput('arcsin')).toEqual({ text: 'arcsin()', cursorOffset: 1 });
    expect(getScientificInput('arccos')).toEqual({ text: 'arccos()', cursorOffset: 1 });
    expect(getScientificInput('arctan')).toEqual({ text: 'arctan()', cursorOffset: 1 });
  });

  it('将幂按钮转换为可编辑的指数占位', () => {
    expect(getScientificInput('pow')).toEqual({ text: '^()', cursorOffset: 1 });
    expect(getScientificInput('square')).toEqual({ text: '^2', cursorOffset: 0 });
  });
});