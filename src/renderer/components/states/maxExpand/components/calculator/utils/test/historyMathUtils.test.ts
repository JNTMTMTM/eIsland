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
 * @file historyMathUtils.test.ts
 * @description 历史数学排版的公式语义、矩阵兼容和无效记录回退测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { formatHistoryMath } from '../historyMathUtils';
import type { CalculatorHistoryEntry } from '../historyUtils';

function complex(formula: string, result = '0'): CalculatorHistoryEntry {
  return { id: 'test', mode: 'complex', formula, result, input: { formula } };
}
function matrix(operation: 'inverse' | 'scale' | 'determinant' | 'solve', a: string, result: string): CalculatorHistoryEntry {
  return { id: 'matrix', mode: 'matrix', formula: operation, result, input: { operation, a, b: '1\n2', scalar: '1/2' } };
}
function render(entry: CalculatorHistoryEntry): void {
  const parts = formatHistoryMath(entry);
  [...parts.expression, ...parts.result].forEach((part) => {
    if (part.tex) expect(() => katex.renderToString(part.tex!, { throwOnError: true, trust: false })).not.toThrow();
  });
}

describe('history math', () => {
  it.each([
    ['x^12', '{x}^{12}'],
    ['1/3', '\\frac{1}{3}'],
    ['-(x+1)', '-\\left(x+1\\right)'],
    ['(x+1)!', '\\left(x+1\\right)!'],
    ['(-x)^2', '{\\left(-x\\right)}^{2}'],
    ['sqrt(-1)', '\\sqrt{-1}'],
    ['logn(2,x)', '\\log_{2}\\left(x\\right)'],
    ['π+e', '\\pi+e'],
    ['1e-20', '1\\times 10^{-20}'],
    ['1e-20^2', '{\\left(1\\times 10^{-20}\\right)}^{2}'],
    ['1e21!', '\\left(1\\times 10^{+21}\\right)!'],
    ['0.123456789012345', '0.123456789012345']
  ])('preserves mathematical grouping and symbols in %s', (formula, expected) => {
    const entry = complex(formula);
    expect(formatHistoryMath(entry).expression[0].tex).toBe(expected);
    render(entry);
  });

  it.each(['frac(1,2)', 'root(3,x)', 'cbrt(x)', 'sum(x^2,1,5)', 'integral(sin(x),0,π)', 'derivative(x^2,2)', '(2+3i)*(4-i)', 'conj(1+i)', 'abs(-2)', 'x-(x+1)'])('renders scientific and complex formulas: %s', (formula) => {
    const entry = complex(formula, '11 + 10i');
    expect(formatHistoryMath(entry).expression[0].tex).not.toBeNull();
    expect(formatHistoryMath(entry).result[0].tex).toContain('i');
    render(entry);
  });

  it('renders legacy and expression matrices, including inputs, scalar and output', () => {
    const entry = matrix('scale', '[["1/2","sqrt(4)"],["3","4"]]', '0.25 1\n1.5 2');
    const parts = formatHistoryMath(entry);
    expect(parts.expression[0].tex).toContain('\\frac{1}{2} & \\sqrt{4}');
    expect(parts.expression[1].tex).toBe('k=\\frac{1}{2}');
    expect(parts.result[0].tex).toContain('\\begin{bmatrix}0.25 & 1 \\\\ 1.5 & 2');
    render(entry);
    const solve = matrix('solve', '2 1\n1 3', '0.2\n0.6');
    expect(formatHistoryMath(solve).expression).toHaveLength(2);
    expect(formatHistoryMath(solve).result[0].tex).toMatch(/^X=/);
    render(solve);
    const determinant = matrix('determinant', '1 2\n3 4', '-2');
    expect(formatHistoryMath(determinant).result[0].tex).toBe('\\operatorname{det}(A)=-2');
    render(determinant);
  });

  it('renders square units without recalculating the stored result', () => {
    const entry: CalculatorHistoryEntry = { id: 'units', mode: 'unitConversion', formula: '1 m² → cm²', result: '10000 cm²', input: { category: 'area', from: 'm2', to: 'cm2', value: '1' } };
    expect(formatHistoryMath(entry).result[0].tex).toBe('10000\\,\\mathrm{cm^{2}}');
    render(entry);
  });

  it('renders equation roots and retains nonnumeric statuses', () => {
    const entry: CalculatorHistoryEntry = { id: 'equation', mode: 'equation', formula: 'x^2=9', result: 'x = -3, 3', input: { equation: 'x^2=9', lower: '-10', upper: '10', angleUnit: 'degree' } };
    expect(formatHistoryMath(entry).expression[0].tex).toBe('{x}^{2}=9');
    expect(formatHistoryMath(entry).result[0].tex).toBe('x=-3,\\,3');
    render(entry);
    expect(formatHistoryMath({ ...entry, result: 'No real roots' }).result[0].tex).toBeNull();
    expect(formatHistoryMath({ ...entry, result: 'x = corrupted' }).result[0].tex).toBeNull();
  });

  it('renders graph intervals, excluded points, scientific bounds and additional formulas', () => {
    const entry: CalculatorHistoryEntry = { id: 'graph', mode: 'coordinate', formula: 'ln(x)', extra: 'sqrt(x)\nx^2', angleUnit: 'radian', document: { segments: [{ type: 'text', value: 'ln(x)' }] }, result: 'Domain\nf1: (0, ∞)\nf2: {0} ∪ [1e-20, ∞) · sampled within view' };
    const parts = formatHistoryMath(entry);
    expect(parts.expression).toHaveLength(3);
    expect(parts.result[1].tex).toContain('\\infty');
    expect(parts.result[2].tex).toContain('\\{0\\}');
    expect(parts.result[2].tex).toContain('10^{-20}');
    render(entry);
  });

  it('falls back to the original text for malformed or untrusted records', () => {
    expect(formatHistoryMath(complex('\\htmlClass{bad}{x}')).expression[0]).toEqual({ text: '\\htmlClass{bad}{x}', tex: null });
    expect(formatHistoryMath(matrix('inverse', 'broken', 'broken')).result[0]).toEqual({ text: 'broken', tex: null });
  });
});
