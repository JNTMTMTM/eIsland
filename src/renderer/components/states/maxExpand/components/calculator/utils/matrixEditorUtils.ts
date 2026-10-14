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
 * @file matrixEditorUtils.ts
 * @description 可视化矩阵的尺寸调整、表达式求值、文本粘贴及历史序列化。
 * @author 鸡哥
 */

import { evaluateFormula } from './calculatorUtils';
import { parseMatrix, type Matrix } from './matrixUtils';
export type MatrixDraft = string[][];

function validate(draft: MatrixDraft): void {
  if (!Array.isArray(draft) || draft.length < 1 || draft.length > 6 || !Array.isArray(draft[0]) || draft[0].length < 1 || draft[0].length > 6
    || !draft.every((row) => Array.isArray(row) && row.length === draft[0].length && row.every((value) => typeof value === 'string'))
    || draft.flat().reduce((count, cell) => count + cell.length, 0) > 5000) throw new Error('Invalid matrix');
}

/** 读取旧文本矩阵、JSON 数值矩阵或可视化编辑器保存的表达式矩阵。
 * @param text - 粘贴或历史记录中的矩阵文本
 * @returns 保留各单元格表达式的矩阵
 */
export function readMatrixDraft(text: string): MatrixDraft {
  if (text.length > (text.trim().startsWith('[') ? 10000 : 5000) || !text.trim()) throw new Error('Invalid matrix');
  let draft: MatrixDraft;
  if (text.trim().startsWith('[')) {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Invalid matrix');
    draft = parsed.map((row: unknown) => {
      if (!Array.isArray(row)) throw new Error('Invalid matrix');
      return row.map((cell: unknown) => {
        if (typeof cell !== 'number' && typeof cell !== 'string') throw new Error('Invalid matrix');
        return String(cell);
      });
    });
  } else {
    draft = text.trim().split(/[;\n]/).filter((line) => line.trim()).map((line) => line.trim().split(/[,\s]+/));
  }
  validate(draft); evaluateMatrixDraft(draft); return draft;
}

/** 求值矩阵单元格，空值和无效公式仍返回明确错误。
 * @param draft - 可编辑矩阵
 * @returns 已验证的实数矩阵
 */
export function evaluateMatrixDraft(draft: MatrixDraft): Matrix {
  validate(draft);
  const matrix = draft.map((row) => row.map((cell) => {
    if (!cell.trim()) throw new Error('Invalid matrix');
    return evaluateFormula(cell);
  }));
  return parseMatrix(JSON.stringify(matrix));
}

/** 调整矩阵尺寸，保留重叠位置的表达式，并用零补充新单元格。
 * @param draft - 原矩阵
 * @param rows - 目标行数
 * @param columns - 目标列数
 * @returns 独立的新矩阵
 */
export function resizeMatrixDraft(draft: MatrixDraft, rows: number, columns: number): MatrixDraft {
  if (![rows, columns].every((value) => Number.isInteger(value) && value >= 1 && value <= 6)) throw new Error('Matrix dimensions');
  return Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => draft[row]?.[column] ?? '0'));
}

/** 将表达式矩阵保存为历史可恢复的 JSON，避免逗号或空格拆散单元格。
 * @param draft - 表达式矩阵
 * @returns 历史记录中的矩阵文本
 */
export function serializeMatrixDraft(draft: MatrixDraft): string {
  validate(draft); return JSON.stringify(draft);
}
