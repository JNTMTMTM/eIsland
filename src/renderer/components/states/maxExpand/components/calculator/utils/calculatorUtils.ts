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
 * @file calculatorUtils.ts
 * @description 计算器纯工具函数
 * @author 鸡哥
 */

import type { CalcOperator } from '../types/calculatorTypes';

/**
 * 格式化数值为显示字符串。
 * 去除尾部多余小数点，限制最大 12 位有效数字避免溢出显示区。
 * @param value - 数值
 * @returns 格式化后的字符串
 */
export function formatDisplay(value: number): string {
  if (!isFinite(value)) return 'Error';
  const str = String(value);
  if (str.replace(/[^0-9]/g, '').length > 12) {
    return value.toPrecision(12).replace(/\.?0+$/, '');
  }
  return str;
}

/**
 * 执行二元运算。
 * @param left - 左操作数
 * @param right - 右操作数
 * @param op - 运算符
 * @returns 运算结果
 */
export function evaluate(left: number, right: number, op: CalcOperator): number {
  switch (op) {
    case '+': return left + right;
    case '-': return left - right;
    case '×': return left * right;
    case '÷': return right === 0 ? NaN : left / right;
  }
}
