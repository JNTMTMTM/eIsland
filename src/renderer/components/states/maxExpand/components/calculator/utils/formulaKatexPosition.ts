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
 * @file formulaKatexPosition.ts
 * @description 结构化公式光标与 KaTeX 锚点矩形之间的纯几何映射。
 * @author 鸡哥
 */

import type { FormulaCursor, FormulaPathStep } from '../types/calculatorTypes';
import type { FormulaKatexAnchor } from './formulaKatexCompiler';

export interface FormulaKatexRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FormulaKatexCaret {
  left: number;
  top: number;
  height: number;
}

function samePath(left: FormulaPathStep[], right: FormulaPathStep[]): boolean {
  return left.length === right.length
    && left.every((step, index) => step.segmentIndex === right[index].segmentIndex && step.slot === right[index].slot);
}

function sameCursor(left: FormulaCursor, right: FormulaCursor): boolean {
  return left.segmentIndex === right.segmentIndex
    && left.offset === right.offset
    && samePath(left.path, right.path);
}

function cursorInAnchor(cursor: FormulaCursor, anchor: FormulaKatexAnchor): boolean {
  if (!samePath(cursor.path, anchor.start.path) || !samePath(cursor.path, anchor.end.path)) return false;
  if (cursor.segmentIndex !== anchor.start.segmentIndex || cursor.segmentIndex !== anchor.end.segmentIndex) return false;
  return cursor.offset >= anchor.start.offset && cursor.offset <= anchor.end.offset;
}

/**
 * 将公式光标映射为 KaTeX 锚点上的绝对光标位置。
 * @param cursor - 当前结构化公式光标
 * @param anchors - 编译器生成的锚点与其矩形
 * @returns 光标覆盖层位置，找不到对应锚点时返回 null
 */
export function getFormulaKatexCaret(
  cursor: FormulaCursor,
  anchors: ReadonlyArray<{ anchor: FormulaKatexAnchor; rect: FormulaKatexRect }>,
): FormulaKatexCaret | null {
  const match = anchors.find(({ anchor }) => cursorInAnchor(cursor, anchor));
  if (!match) return null;
  const { anchor, rect } = match;
  const atEnd = sameCursor(cursor, anchor.end);
  return {
    left: rect.left + (atEnd ? rect.width : 0),
    top: rect.top,
    height: Math.max(rect.height, 1),
  };
}

/**
 * 将点击位置映射回最接近的公式锚点边界。
 * @param point - 相对于公式容器的点击坐标
 * @param anchors - 编译器生成的锚点与其矩形
 * @returns 命中的结构化光标，未命中时返回 null
 */
export function getFormulaKatexCursorAtPoint(
  point: { x: number; y: number },
  anchors: ReadonlyArray<{ anchor: FormulaKatexAnchor; rect: FormulaKatexRect }>,
): FormulaCursor | null {
  const containing = anchors.find(({ rect }) => (
    point.x >= rect.left && point.x <= rect.left + rect.width
      && point.y >= rect.top && point.y <= rect.top + rect.height
  ));
  if (!containing) return null;
  const { anchor, rect } = containing;
  const midpoint = rect.left + rect.width / 2;
  return point.x < midpoint ? anchor.start : anchor.end;
}