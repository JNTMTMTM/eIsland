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
 * @file expressionUtils.test.ts
 * @description expressionUtils 的单元测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import {
  findClosingParenthesis,
  normalizeBinaryFunctionExpression,
  normalizeCbrtExpression,
  normalizeExpressionForPlot,
  normalizeFractionExpression,
  normalizeLogarithmExpression,
  normalizeRootExpression,
} from '../expressionUtils';

describe('findClosingParenthesis', () => {
  it('找到简单的匹配括号', () => {
    expect(findClosingParenthesis('(abc)', 0)).toBe(4);
  });

  it('处理嵌套括号', () => {
    expect(findClosingParenthesis('((a+b)*(c+d))', 0)).toBe(12);
  });

  it('未匹配时返回 -1', () => {
    expect(findClosingParenthesis('(abc', 0)).toBe(-1);
  });
});

describe('normalizeBinaryFunctionExpression', () => {
  it('处理简单的二元函数', () => {
    expect(normalizeBinaryFunctionExpression('root(4,x)', 'root', (a, b) => `${b}^${a}`))
      .toBe('x^4');
  });

  it('处理嵌套括号内的逗号，不在错误位置拆分', () => {
    // root(root(2,3), x) 应将 root(2,3) 作为左侧整体，x 作为右侧
    expect(normalizeBinaryFunctionExpression('root(root(2,3),x)', 'root', (a, b) => `${b}^${a}`))
      .toBe('x^3^2');
  });

  it('处理深层嵌套', () => {
    // logn(f(1,2), 10) — 逗号在 f(1,2) 内部，不应被误拆
    expect(normalizeBinaryFunctionExpression('logn(f(1,2),10)', 'logn', (a, b) => `(${b}/${a})`))
      .toBe('(10/f(1,2))');
  });

  it('无逗号时保留原始表达式', () => {
    expect(normalizeBinaryFunctionExpression('root(x)', 'root', (a, b) => `${b}^${a}`))
      .toBe('root(x)');
  });

  it('处理多个同级函数', () => {
    expect(normalizeBinaryFunctionExpression('root(4,x)+root(9,y)', 'root', (a, b) => `${b}^${a}`))
      .toBe('x^4+y^9');
  });
});

describe('normalizeRootExpression', () => {
  it('将 root 转换为 nthRoot', () => {
    expect(normalizeRootExpression('root(4,x)')).toBe('nthRoot(x,4)');
  });

  it('处理嵌套 root', () => {
    expect(normalizeRootExpression('root(root(2,3),x)')).toBe('nthRoot(x,nthRoot(3,2))');
  });
});

describe('normalizeCbrtExpression', () => {
  it('将 cbrt 转换为幂形式', () => {
    expect(normalizeCbrtExpression('cbrt(x)')).toBe('(x)^(1/3)');
  });

  it('处理嵌套 cbrt', () => {
    expect(normalizeCbrtExpression('cbrt(cbrt(x))')).toBe('((x)^(1/3))^(1/3)');
  });
});

describe('normalizeLogarithmExpression', () => {
  it('将 logn 转换为 log 比值', () => {
    expect(normalizeLogarithmExpression('logn(10,x)')).toBe('(log(x)/log(10))');
  });
});

describe('normalizeFractionExpression', () => {
  it('将 frac 转换为除法', () => {
    expect(normalizeFractionExpression('frac(a,b)')).toBe('(a)/(b)');
  });
});

describe('normalizeExpressionForPlot', () => {
  it('替换三角反函数', () => {
    expect(normalizeExpressionForPlot('arcsin(x)')).toBe('asin(x)');
    expect(normalizeExpressionForPlot('arccos(x)')).toBe('acos(x)');
    expect(normalizeExpressionForPlot('arctan(x)')).toBe('atan(x)');
  });

  it('替换常量和运算符', () => {
    expect(normalizeExpressionForPlot('π×2÷3')).toBe('PI*2/3');
  });

  it('替换 e^( 为 exp(', () => {
    expect(normalizeExpressionForPlot('e^(x)')).toBe('exp(x)');
  });
});
