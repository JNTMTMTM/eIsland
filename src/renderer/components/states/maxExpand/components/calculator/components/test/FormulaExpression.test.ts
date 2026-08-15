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
 * @file FormulaExpression.test.ts
 * @description 高级公式结构静态渲染测试。
 * @author 鸡哥
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FormulaDocument, FormulaSlotName, FormulaStructure, FormulaStructureKind } from '../../types/calculatorTypes';
import { FormulaExpression } from '../FormulaExpression';

function text(value: string): FormulaDocument {
  return { segments: [{ type: 'text', value }] };
}

function renderStructure(kind: FormulaStructureKind, slots: FormulaStructure['slots']): string {
  const document: FormulaDocument = {
    segments: [{ type: 'structure', value: { id: `test-${kind}`, kind, slots } }],
  };
  return renderToStaticMarkup(createElement(FormulaExpression, {
    document,
    cursor: {
      path: [{ segmentIndex: 0, slot: Object.keys(slots)[0] as FormulaSlotName }],
      segmentIndex: 0,
      offset: 0,
    },
    onCursorChange: () => undefined,
  }));
}

describe('FormulaExpression', () => {
  it('渲染下标对数与二维分数', () => {
    const logarithm = renderStructure('logn', { base: text('2'), value: text('8') });
    const fraction = renderStructure('fraction', { numerator: text('1'), denominator: text('3') });

    expect(logarithm).toContain('class="katex"');
    expect(logarithm).toContain('data-formula-anchor');
    expect(fraction).toContain('class="mfrac"');
  });

  it('渲染求和、积分与指定点微分结构', () => {
    const nestedRoot: FormulaDocument = {
      segments: [{ type: 'structure', value: { id: 'nested-sqrt', kind: 'sqrt', slots: { radicand: text('2') } } }],
    };
    const sum = renderStructure('sum', { lower: text('1'), upper: text('3'), body: text('x^2') });
    const integral = renderStructure('integral', { lower: text('0'), upper: nestedRoot, body: text('x') });
    const derivative = renderStructure('derivative', { body: text('x^2'), point: text('2') });

    expect(sum).toContain('∑');
    expect(integral).toContain('∫');
    expect(integral).toContain('data-formula-anchor');
    expect(integral).toContain('dx');
    expect(derivative).toContain('data-formula-anchor');
    expect(derivative).toContain('application/x-tex');
  });

  it('区分平方根与带指数根式', () => {
    const squareRoot = renderStructure('sqrt', { radicand: text('9') });
    const nthRoot = renderStructure('root', { index: text('3'), radicand: text('8') });

    expect(squareRoot).toContain('sqrt');
    expect(squareRoot).toContain('data-formula-anchor');
    expect(nthRoot).toContain('sqrt');
    expect(nthRoot).toContain('data-formula-anchor');
  });
});