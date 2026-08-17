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
 * @file expressionUtils.ts
 * @description 表达式解析与归一化工具函数，供 CoordinateGraph 和 formulaKatexCompiler 共用。
 * @author 鸡哥
 */

/**
 * 查找与 openIndex 处 '(' 匹配的 ')' 位置。
 * @param value - 待搜索的字符串
 * @param openIndex - 左括号的位置
 * @returns 右括号的位置，未找到返回 -1
 */
export function findClosingParenthesis(value: string, openIndex: number): number {
  let depth = 1;
  for (let index = openIndex + 1; index < value.length; index += 1) {
    if (value[index] === '(') depth += 1;
    if (value[index] === ')') depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

/**
 * 在 content 中查找第一个位于括号深度 0 处的逗号。
 * @param content - 待搜索的字符串
 * @returns 逗号的位置，未找到返回 -1
 */
function findCommaAtDepth0(content: string): number {
  let depth = 0;
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === '(') depth += 1;
    if (content[index] === ')') depth -= 1;
    if (depth === 0 && content[index] === ',') return index;
  }
  return -1;
}

/**
 * 将二元函数调用归一化为目标格式。
 *
 * 支持嵌套括号与逗号，始终在括号深度 0 处拆分参数。
 *
 * @param expression - 原始表达式
 * @param functionName - 函数名（如 "root"、"logn"、"frac"）
 * @param format - 将 (left, right) 转换为目标格式的回调
 * @returns 归一化后的表达式
 */
export function normalizeBinaryFunctionExpression(
  expression: string,
  functionName: string,
  format: (left: string, right: string) => string,
): string {
  const marker = `${functionName}(`;
  let result = '';
  let cursor = 0;

  while (cursor < expression.length) {
    const start = expression.indexOf(marker, cursor);
    if (start < 0) {
      result += expression.slice(cursor);
      break;
    }

    result += expression.slice(cursor, start);
    let depth = 1;
    let end = start + marker.length;
    while (end < expression.length && depth > 0) {
      if (expression[end] === '(') depth += 1;
      if (expression[end] === ')') depth -= 1;
      end += 1;
    }

    if (depth !== 0) {
      result += expression.slice(start);
      break;
    }

    const content = expression.slice(start + marker.length, end - 1);
    const separator = findCommaAtDepth0(content);
    if (separator < 0) {
      result += expression.slice(start, end);
    } else {
      const left = normalizeBinaryFunctionExpression(content.slice(0, separator), functionName, format);
      const right = normalizeBinaryFunctionExpression(content.slice(separator + 1), functionName, format);
      result += format(left, right);
    }
    cursor = end;
  }

  return result;
}

/** 将 root(index, radicand) 归一化为 nthRoot(radicand, index)。 */
export function normalizeRootExpression(expression: string): string {
  return normalizeBinaryFunctionExpression(
    expression,
    'root',
    (index, radicand) => `nthRoot(${radicand},${index})`,
  );
}

/** 将 cbrt(x) 归一化为 (x)^(1/3)。 */
export function normalizeCbrtExpression(expression: string): string {
  const marker = 'cbrt(';
  let result = '';
  let cursor = 0;

  while (cursor < expression.length) {
    const start = expression.indexOf(marker, cursor);
    if (start < 0) {
      result += expression.slice(cursor);
      break;
    }

    result += expression.slice(cursor, start);
    let depth = 1;
    let end = start + marker.length;
    while (end < expression.length && depth > 0) {
      if (expression[end] === '(') depth += 1;
      if (expression[end] === ')') depth -= 1;
      end += 1;
    }

    if (depth !== 0) {
      result += expression.slice(start);
      break;
    }

    const argument = normalizeCbrtExpression(expression.slice(start + marker.length, end - 1));
    result += `(${argument})^(1/3)`;
    cursor = end;
  }

  return result;
}

/** 将 logn(base, value) 归一化为 (log(value)/log(base))。 */
export function normalizeLogarithmExpression(expression: string): string {
  return normalizeBinaryFunctionExpression(
    expression,
    'logn',
    (base, value) => `(log(${value})/log(${base}))`,
  );
}

/** 将 frac(num, den) 归一化为 (num)/(den)。 */
export function normalizeFractionExpression(expression: string): string {
  return normalizeBinaryFunctionExpression(
    expression,
    'frac',
    (numerator, denominator) => `(${numerator})/(${denominator})`,
  );
}

/**
 * 将计算器表达式归一化为 function-plot 可接受的格式。
 * @param expression - 计算器公式序列化后的表达式
 * @returns function-plot 可用的表达式
 */
export function normalizeExpressionForPlot(expression: string): string {
  return normalizeCbrtExpression(
    normalizeRootExpression(
      normalizeFractionExpression(
        normalizeLogarithmExpression(expression),
      ),
    ),
  )
    .replaceAll('arcsin(', 'asin(')
    .replaceAll('arccos(', 'acos(')
    .replaceAll('arctan(', 'atan(')
    .replaceAll('π', 'PI')
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replace(/(?<![a-zA-Z])e\^[(]/g, 'exp(');
}
