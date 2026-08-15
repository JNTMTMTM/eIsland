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
 * @file formulaKatexPosition.test.ts
 * @description KaTeX 锚点与结构化公式光标的几何映射测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import type { FormulaKatexAnchor } from '../formulaKatexCompiler';
import { getFormulaKatexCaret, getFormulaKatexCursorAtPoint } from '../formulaKatexPosition';

function anchor(startOffset: number, endOffset: number): FormulaKatexAnchor {
  return {
    id: `${startOffset}-${endOffset}`,
    kind: 'token',
    start: { path: [], segmentIndex: 0, offset: startOffset },
    end: { path: [], segmentIndex: 0, offset: endOffset },
  };
}

function emptyAnchor(segmentIndex: number, id: string): FormulaKatexAnchor {
  return {
    id,
    kind: 'token',
    start: { path: [], segmentIndex, offset: 0 },
    end: { path: [], segmentIndex, offset: 0 },
  };
}

describe('formulaKatexPosition', () => {
  it('按光标边界计算覆盖层位置', () => {
    const first = anchor(0, 1);
    const second = anchor(1, 2);
    const measured = [
      { anchor: first, rect: { left: 10, top: 4, width: 8, height: 20 } },
      { anchor: second, rect: { left: 18, top: 4, width: 9, height: 20 } },
    ];

    expect(getFormulaKatexCaret(first.end, measured)).toEqual({ left: 18, top: 4, height: 20 });
    expect(getFormulaKatexCaret(second.start, measured)).toEqual({ left: 18, top: 4, height: 20 });
  });

  it('区分相同路径和偏移量的不同文本段', () => {
    const leading = emptyAnchor(0, 'leading');
    const trailing = emptyAnchor(2, 'trailing');
    const cursor = { path: [], segmentIndex: 2, offset: 0 };

    expect(getFormulaKatexCaret(cursor, [
      { anchor: leading, rect: { left: 0, top: 0, width: 1, height: 20 } },
      { anchor: trailing, rect: { left: 42, top: 0, width: 1, height: 20 } },
    ])).toEqual({ left: 43, top: 0, height: 20 });
  });

  it('为零高度锚点保留可见光标高度', () => {
    const trailing = emptyAnchor(2, 'trailing');

    expect(getFormulaKatexCaret(
      trailing.start,
      [{ anchor: trailing, rect: { left: 42, top: 0, width: 0, height: 0 } }],
    )).toEqual({ left: 42, top: 0, height: 1 });
  });

  it('按点击位置返回最近的前后光标边界', () => {
    const token = anchor(2, 3);
    const measured = [{ anchor: token, rect: { left: 10, top: 4, width: 8, height: 20 } }];

    expect(getFormulaKatexCursorAtPoint({ x: 11, y: 10 }, measured)).toEqual(token.start);
    expect(getFormulaKatexCursorAtPoint({ x: 17, y: 10 }, measured)).toEqual(token.end);
    expect(getFormulaKatexCursorAtPoint({ x: 30, y: 10 }, measured)).toBeNull();
  });
});