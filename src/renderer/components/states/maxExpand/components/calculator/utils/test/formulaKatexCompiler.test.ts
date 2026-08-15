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
 */

/**
 * @file formulaKatexCompiler.test.ts
 * @description 结构化公式 KaTeX 编译与锚点测试。
 * @author 鸡哥
 */

import katex from 'katex';
import { describe, expect, it } from 'vitest';
import type { FormulaDocument } from '../../types/calculatorTypes';
import { compileFormulaToKatex } from '../formulaKatexCompiler';

function text(value: string): FormulaDocument {
  return { segments: [{ type: 'text', value }] };
}

function structure(
  kind: 'fraction' | 'integral' | 'root' | 'sqrt',
  slots: Record<string, FormulaDocument>,
): FormulaDocument {
  return { segments: [{ type: 'structure', value: { id: kind, kind, slots } }] };
}

describe('formulaKatexCompiler', () => {
  it('编译基础文本、函数和幂', () => {
    const compilation = compileFormulaToKatex(text('sin(x)^2+π'));

    expect(compilation.tex).toContain('\\sin');
    expect(compilation.tex).toContain('^{');
    expect(compilation.tex).toContain('\\pi');
    expect(compilation.anchors.length).toBeGreaterThan(4);
  });

  it('编译分数、根式和积分上下限', () => {
    const root = structure('sqrt', { radicand: text('x') });
    const fraction = structure('fraction', { numerator: root, denominator: text('2') });
    const integral = structure('integral', { lower: text('0'), upper: text('1'), body: fraction });
    const compilation = compileFormulaToKatex(integral);

    expect(compilation.tex).toContain('\\int_{');
    expect(compilation.tex).toContain('\\frac{');
    expect(compilation.tex).toContain('\\sqrt{');
    expect(compilation.anchors.some((anchor) => anchor.kind === 'slot')).toBe(false);
  });

  it('生成的 TeX 可由 KaTeX 严格解析', () => {
    const compilation = compileFormulaToKatex(structure('root', { index: text('3'), radicand: text('x') }));

    expect(() => katex.renderToString(compilation.tex, {
      throwOnError: true,
      trust: ({ command }) => command === '\\htmlData',
    })).not.toThrow();
  });

  it('为空文本段生成末尾光标锚点', () => {
    const compilation = compileFormulaToKatex({ segments: [
      { type: 'text', value: '' },
      { type: 'text', value: '1' },
      { type: 'text', value: '' },
    ] });

    expect(compilation.anchors.filter((anchor) => anchor.start.offset === anchor.end.offset)).toHaveLength(2);
    expect(compilation.tex).toContain('\\kern0.1em');
  });

  it('为所有空槽生成可定位占位锚点', () => {
    const compilation = compileFormulaToKatex(structure('root', { index: text(''), radicand: text('') }));

    expect(compilation.tex).toContain('\\sqrt[');
    expect(compilation.tex).toContain('\\square');
    expect(compilation.anchors.filter((anchor) => anchor.kind === 'slot')).toHaveLength(2);
  });
});