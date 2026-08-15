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

import type { CalcOperator, ScientificFn } from '../types/calculatorTypes';

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

/**
 * 阶乘函数（仅支持非负整数）。
 * @param n - 非负整数
 * @returns n! 或 NaN（输入无效时）
 */
function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/**
 * 执行科学函数运算。
 * 一元函数直接对当前值运算；常量函数返回对应值。
 * @param fn - 科学函数标识
 * @param value - 当前数值（常量函数忽略）
 * @returns 运算结果
 */
export function applyScientificFn(fn: ScientificFn, value: number): number {
  switch (fn) {
    case 'sin':       return Math.sin(value);
    case 'cos':       return Math.cos(value);
    case 'tan':       return Math.tan(value);
    case 'asin':      return Math.asin(value);
    case 'acos':      return Math.acos(value);
    case 'atan':      return Math.atan(value);
    case 'log':       return Math.log10(value);
    case 'ln':        return Math.log(value);
    case 'sqrt':      return Math.sqrt(value);
    case 'cbrt':      return Math.cbrt(value);
    case 'square':    return value * value;
    case 'cube':      return value * value * value;
    case 'reciprocal': return value === 0 ? NaN : 1 / value;
    case 'factorial': return factorial(value);
    case 'pi':        return Math.PI;
    case 'e':         return Math.E;
    case 'pow':       return value; // x^y 需要二元操作，此处仅占位
    case 'exp':       return Math.exp(value);
    case 'abs':       return Math.abs(value);
    case 'nthroot':   return value; // n√x 需要二元操作，此处仅占位
  }
}

/**
 * 获取科学函数的显示标签。
 * @param fn - 科学函数标识
 * @returns 显示用文本
 */
export function getScientificFnLabel(fn: ScientificFn): string {
  switch (fn) {
    case 'sin':       return 'sin';
    case 'cos':       return 'cos';
    case 'tan':       return 'tan';
    case 'asin':      return 'sin⁻¹';
    case 'acos':      return 'cos⁻¹';
    case 'atan':      return 'tan⁻¹';
    case 'log':       return 'log';
    case 'ln':        return 'ln';
    case 'sqrt':      return '√';
    case 'cbrt':      return '∛';
    case 'square':    return 'x²';
    case 'cube':      return 'x³';
    case 'reciprocal': return '1/x';
    case 'factorial': return 'n!';
    case 'pi':        return 'π';
    case 'e':         return 'e';
    case 'pow':       return 'x^y';
    case 'exp':       return 'eˣ';
  }
}
