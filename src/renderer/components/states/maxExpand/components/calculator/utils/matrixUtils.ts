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
 * @file matrixUtils.ts
 * @description 矩阵四则、数乘、转置、行列式、逆、秩与线性方程组求解。
 * @author 鸡哥
 */


import { evaluateFormula } from './calculatorUtils';
export type Matrix = number[][];
export type MatrixOperation = 'add' | 'subtract' | 'multiply' | 'scale' | 'transpose' | 'determinant' | 'inverse' | 'rank' | 'solve';
const EPSILON = Number.EPSILON * 96;

function validate(matrix: Matrix): void {
  if (!Array.isArray(matrix) || matrix.length === 0 || matrix.length > 6 || !Array.isArray(matrix[0]) || matrix[0].length === 0 || matrix[0].length > 6
    || !matrix.every((row) => Array.isArray(row) && row.length === matrix[0].length && row.every(Number.isFinite))) throw new Error('Invalid matrix');
}
function finiteMatrix(matrix: Matrix): Matrix { validate(matrix); return matrix; }
function square(matrix: Matrix): void { if (matrix.length !== matrix[0].length) throw new Error('Matrix dimensions'); }
function scaledRows(matrix: Matrix): Matrix { return matrix.map((row) => { const scale = Math.max(...row.map(Math.abs)) || 1; return row.map((value) => value / scale); }); }

/** 读取文本或 JSON 矩阵，元素可使用无空格的实数公式。
 * @param text - 空格或逗号分列，换行或分号分行的矩阵
 * @returns 最大六行六列的实数矩阵
 */
export function parseMatrix(text: string): Matrix {
  if (text.length > 5000 || !text.trim()) throw new Error('Invalid matrix');
  let matrix: Matrix;
  if (text.trim().startsWith('[')) matrix = JSON.parse(text) as Matrix;
  else matrix = text.trim().split(/[;\n]/).filter((line) => line.trim()).map((line) => line.trim().split(/[,\s]+/).map((cell) => evaluateFormula(cell)));
  validate(matrix); return matrix;
}

function solve(a: Matrix, b: Matrix): Matrix {
  square(a); if (a.length !== b.length) throw new Error('Matrix dimensions');
  const n = a.length; const width = b[0].length;
  const rows = a.map((row, index) => {
    const scale = Math.max(...row.map(Math.abs)) || 1;
    return [...row.map((value) => value / scale), ...b[index].map((value) => value / scale)];
  });
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    if (Math.abs(rows[pivot][column]) <= EPSILON) throw new Error('Singular matrix');
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column]; rows[column] = rows[column].map((value) => value / divisor);
    rows.forEach((row, index) => {
      if (index === column) return; const factor = row[column];
      rows[index] = row.map((value, position) => value - factor * rows[column][position]);
    });
  }
  return finiteMatrix(rows.map((row) => row.slice(n, n + width)));
}
function determinant(matrix: Matrix): number {
  square(matrix);
  const scales = matrix.map((row) => Math.max(...row.map(Math.abs)));
  if (scales.includes(0)) return 0;
  const rows = scaledRows(matrix); let sign = 1; let logarithm = scales.reduce((sum, scale) => sum + Math.log(scale), 0);
  for (let column = 0; column < rows.length; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < rows.length; row += 1) if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    if (Math.abs(rows[pivot][column]) <= EPSILON) return 0;
    if (pivot !== column) { [rows[column], rows[pivot]] = [rows[pivot], rows[column]]; sign *= -1; }
    const divisor = rows[column][column]; sign *= Math.sign(divisor); logarithm += Math.log(Math.abs(divisor));
    for (let row = column + 1; row < rows.length; row += 1) {
      const ratio = rows[row][column] / divisor;
      for (let position = column + 1; position < rows.length; position += 1) rows[row][position] -= ratio * rows[column][position];
    }
  }
  const result = sign * Math.exp(logarithm);
  if (!Number.isFinite(result) || result === 0) throw new Error('Non-finite result');
  return result;
}
function rank(matrix: Matrix): number {
  const rows = scaledRows(matrix); let active = 0;
  for (let column = 0; column < rows[0].length && active < rows.length; column += 1) {
    let pivot = active;
    for (let row = active + 1; row < rows.length; row += 1) if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    if (Math.abs(rows[pivot][column]) <= EPSILON) continue;
    [rows[active], rows[pivot]] = [rows[pivot], rows[active]];
    for (let row = active + 1; row < rows.length; row += 1) {
      const factor = rows[row][column] / rows[active][column];
      for (let position = column; position < rows[0].length; position += 1) rows[row][position] -= factor * rows[active][position];
    }
    active += 1;
  }
  return active;
}

/** 执行矩阵运算，输入矩阵始终保持不变。
 * @param operation - 矩阵运算类型
 * @param a - 第一矩阵
 * @param b - 二元运算中的第二矩阵或方程右端项
 * @param scalar - 数乘所用标量
 * @returns 实数或矩阵结果
 */
export function calculateMatrix(operation: MatrixOperation, a: Matrix, b?: Matrix, scalar = 1): Matrix | number {
  validate(a);
  if (operation === 'transpose') return a[0].map((_, column) => a.map((row) => row[column]));
  if (operation === 'determinant') return determinant(a);
  if (operation === 'rank') return rank(a);
  if (operation === 'scale') { if (!Number.isFinite(scalar)) throw new Error('Invalid matrix'); return finiteMatrix(a.map((row) => row.map((value) => value * scalar))); }
  if (operation === 'inverse') return solve(a, a.map((_, row) => a.map((__, column) => row === column ? 1 : 0)));
  if (!b) throw new Error('Matrix dimensions'); validate(b);
  if (operation === 'solve') return solve(a, b);
  if (operation === 'multiply') {
    if (a[0].length !== b.length) throw new Error('Matrix dimensions');
    return finiteMatrix(a.map((row) => b![0].map((_, column) => row.reduce((sum, value, index) => sum + value * b![index][column], 0))));
  }
  if (a.length !== b.length || a[0].length !== b[0].length) throw new Error('Matrix dimensions');
  return finiteMatrix(a.map((row, index) => row.map((value, column) => value + (operation === 'add' ? 1 : -1) * b![index][column])));
}
