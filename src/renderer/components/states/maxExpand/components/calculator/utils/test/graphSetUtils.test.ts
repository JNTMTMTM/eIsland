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
 * @file graphSetUtils.test.ts
 * @description 验证定义域和值域的完整区间、开闭边界与采样结果标记。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { analyzeFunctionSets, formatFunctionSet } from '../graphSetUtils';

describe('complete real domains and ranges', () => {
  it.each([
    ['x', '(−∞, +∞)', '(−∞, +∞)'],
    ['7', '(−∞, +∞)', '{7}'],
    ['x^2', '(−∞, +∞)', '[0, +∞)'],
    ['-2*(x-3)^2+5', '(−∞, +∞)', '(−∞, 5]'],
    ['x^3', '(−∞, +∞)', '(−∞, +∞)'],
    ['x%', '(−∞, +∞)', '(−∞, +∞)'],
    ['ln(x)', '(0, +∞)', '(−∞, +∞)'],
    ['log(2*x-4)', '(2, +∞)', '(−∞, +∞)'],
    ['logn(2,x)', '(0, +∞)', '(−∞, +∞)'],
    ['sqrt(x-2)', '[2, +∞)', '[0, +∞)'],
    ['sqrt(1-x^2)', '[-1, 1]', '[0, 1]'],
    ['sqrt(x^2-1)', '(−∞, -1] ∪ [1, +∞)', '[0, +∞)'],
    ['sqrt(-x^2)', '{0}', '{0}'],
    ['abs(x)', '(−∞, +∞)', '[0, +∞)'],
    ['exp(x)', '(−∞, +∞)', '(0, +∞)'],
    ['e^(x)', '(−∞, +∞)', '(0, +∞)'],
    ['1^x', '(−∞, +∞)', '{1}'],
    ['2*sin(x)+3', '(−∞, +∞)', '[1, 5]'],
    ['cos(x)', '(−∞, +∞)', '[-1, 1]'],
    ['sin(x)^2', '(−∞, +∞)', '[0, 1]'],
    ['arcsin(x)', '[-1, 1]', '[-1.57079632679, 1.57079632679]'],
    ['1/(x-1)', '(−∞, 1) ∪ (1, +∞)', '(−∞, 0) ∪ (0, +∞)'],
    ['frac(1,x)', '(−∞, 0) ∪ (0, +∞)', '(−∞, 0) ∪ (0, +∞)'],
    ['1/(x^2+1)', '(−∞, +∞)', '(0, 1]'],
    ['1/(x^2-1)', '(−∞, -1) ∪ (-1, 1) ∪ (1, +∞)', '(−∞, -1] ∪ (0, +∞)'],
    ['x^(-2)', '(−∞, 0) ∪ (0, +∞)', '(0, +∞)'],
    ['ln((x-2)^2)', '(−∞, 2) ∪ (2, +∞)', '(−∞, +∞)'],
    ['0/x', '(−∞, 0) ∪ (0, +∞)', '{0}'],
    ['ln(-1)', '∅', '∅'],
  ])('%s preserves all interval boundaries', (formula, domain, range) => {
    const sets = analyzeFunctionSets(formula, -10, 10);
    expect(sets.domain.exact).toBe(true);
    expect(sets.range.exact).toBe(true);
    expect(formatFunctionSet(sets.domain)).toBe(domain);
    expect(formatFunctionSet(sets.range)).toBe(range);
  });
});

describe('sampling scope and mathematical restrictions', () => {
  it('identifies view estimates rather than claiming global intervals for unsupported expressions', () => {
    const sets = analyzeFunctionSets('tan(x)', -1, 1);
    expect(sets.domain.exact).toBe(false);
    expect(sets.range.exact).toBe(false);
    expect(sets.domain.scope).toEqual([-1, 1]);
    expect(formatFunctionSet(sets.domain)).toBe('[-1, 1]');
    expect(sets.range.intervals[0].lower).toBeCloseTo(Math.tan(-1));
    expect(sets.range.intervals[0].upper).toBeCloseTo(Math.tan(1));
  });

  it('keeps disconnected sampled domains and can still derive a complete range', () => {
    const sets = analyzeFunctionSets('ln(sin(x))', -4, 4);
    expect(sets.domain.exact).toBe(false);
    expect(sets.domain.intervals).toHaveLength(2);
    expect(sets.domain.intervals[0].upper).toBeCloseTo(-Math.PI, 8);
    expect(sets.domain.intervals[1].lower).toBeCloseTo(0, 8);
    expect(sets.domain.intervals[1].upper).toBeCloseTo(Math.PI, 8);
    expect(sets.range.exact).toBe(true);
    expect(formatFunctionSet(sets.range)).toBe('(−∞, 0]');
  });

  it('does not label empty numeric coverage as an empty global domain', () => {
    const sets = analyzeFunctionSets('ln(sin(x))', -2, -1);
    expect(sets.domain.exact).toBe(false);
    expect(formatFunctionSet(sets.domain)).toBe('∅');
    expect(sets.domain.scope).toEqual([-2, -1]);
    expect(formatFunctionSet(sets.range)).toBe('(−∞, 0]');
  });

  it('preserves simultaneous restrictions and does not fill excluded points', () => {
    const sets = analyzeFunctionSets('ln(x)+1/(x-1)', -10, 10);
    expect(sets.domain.exact).toBe(true);
    expect(formatFunctionSet(sets.domain)).toBe('(0, 1) ∪ (1, +∞)');
    expect(sets.range.exact).toBe(false);
    expect(sets.range.intervals).toHaveLength(2);
    expect(sets.range.intervals[0].upper).toBeLessThan(0);
    expect(sets.range.intervals[1].lower).toBeGreaterThan(0);
  });

  it('rejects invalid expressions and analysis ranges', () => {
    expect(() => analyzeFunctionSets('ln(', -10, 10)).toThrow();
    expect(() => analyzeFunctionSets('missing(x)', -10, 10)).toThrow();
    expect(() => analyzeFunctionSets('x', 1, 1)).toThrow();
  });
});
