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
 * @file complexUtils.ts
 * @description 复数算术、幂、模、辐角、共轭和常见复函数。
 * @author 鸡哥
 */


import { parseCalculatorFormula, formatDisplay } from './calculatorUtils';
export interface ComplexNumber { re: number; im: number }
function finite(value: ComplexNumber): ComplexNumber {
  if (!Number.isFinite(value.re) || !Number.isFinite(value.im)) throw new Error('Non-finite result');
  return value;
}
function add(a: ComplexNumber, b: ComplexNumber): ComplexNumber { return finite({ re: a.re + b.re, im: a.im + b.im }); }
function multiply(a: ComplexNumber, b: ComplexNumber): ComplexNumber { return finite({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }); }
function divide(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  if (b.re === 0 && b.im === 0) throw new Error('Division by zero');
  if (Math.abs(b.re) >= Math.abs(b.im)) {
    const ratio = b.im / b.re; const scale = 1 + ratio * ratio;
    return finite({ re: (a.re / b.re + (a.im / b.re) * ratio) / scale, im: (a.im / b.re - (a.re / b.re) * ratio) / scale });
  }
  const ratio = b.re / b.im; const scale = 1 + ratio * ratio;
  return finite({ re: ((a.re / b.im) * ratio + a.im / b.im) / scale, im: ((a.im / b.im) * ratio - a.re / b.im) / scale });
}
function logarithm(a: ComplexNumber): ComplexNumber {
  if (a.re === 0 && a.im === 0) throw new Error('Invalid domain');
  return finite({ re: Math.log(Math.hypot(a.re, a.im)), im: Math.atan2(a.im, a.re) });
}
function exponential(a: ComplexNumber): ComplexNumber { const size = Math.exp(a.re); return finite({ re: size * Math.cos(a.im), im: size * Math.sin(a.im) }); }
function power(base: ComplexNumber, exponent: ComplexNumber): ComplexNumber {
  if (exponent.im === 0 && Number.isInteger(exponent.re) && Math.abs(exponent.re) <= 1000) {
    let count = Math.abs(exponent.re); let result = { re: 1, im: 0 }; let factor = base;
    while (count > 0) { if (count % 2 === 1) result = multiply(result, factor); count = Math.floor(count / 2); if (count) factor = multiply(factor, factor); }
    return exponent.re < 0 ? divide({ re: 1, im: 0 }, result) : result;
  }
  if (base.re === 0 && base.im === 0 && exponent.im === 0 && exponent.re > 0) return { re: 0, im: 0 };
  return exponential(multiply(exponent, logarithm(base)));
}

/** 使用共享 AST 计算复数算术和常见复函数，三角函数采用弧度。
 * @param formula - 使用 i 表示虚数单位的公式
 * @returns 有限的复数结果
 */
export function evaluateComplexFormula(formula: string): ComplexNumber {
  type Node = ReturnType<typeof parseCalculatorFormula>;
  const read = (node: Node): ComplexNumber => {
    if (node.type === 'number') return finite({ re: node.value, im: 0 });
    if (node.type === 'imaginary') return { re: 0, im: 1 };
    if (node.type === 'variable') throw new Error('Unbound variable');
    if (node.type === 'unary') return multiply(read(node.value), { re: node.operator === '-' ? -1 : 1, im: 0 });
    if (node.type === 'binary') {
      const a = read(node.left); const b = read(node.right);
      if (node.operator === '+') return add(a, b);
      if (node.operator === '-') return add(a, { re: -b.re, im: -b.im });
      if (node.operator === '×') return multiply(a, b);
      if (node.operator === '÷') return divide(a, b);
      return power(a, b);
    }
    if (node.type === 'postfix') {
      const a = read(node.value); if (node.operator === '%') return divide(a, { re: 100, im: 0 });
      if (a.im !== 0 || !Number.isInteger(a.re) || a.re < 0 || a.re > 170) throw new Error('Invalid factorial');
      let value = 1; for (let index = 2; index <= a.re; index += 1) value *= index;
      return { re: value, im: 0 };
    }
    if (node.args.length !== 1) throw new Error('Invalid arguments');
    const a = read(node.args[0]);
    switch (node.name) {
      case 'conj': return { re: a.re, im: -a.im };
      case 're': return { re: a.re, im: 0 };
      case 'im': return { re: a.im, im: 0 };
      case 'abs': return finite({ re: Math.hypot(a.re, a.im), im: 0 });
      case 'arg': if (a.re === 0 && a.im === 0) throw new Error('Invalid domain'); return { re: Math.atan2(a.im, a.re), im: 0 };
      case 'sqrt': {
        const size = Math.hypot(a.re, a.im);
        return finite({ re: Math.sqrt(Math.max(0, (size + a.re) / 2)), im: (a.im < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (size - a.re) / 2)) });
      }
      case 'ln': return logarithm(a);
      case 'log': return divide(logarithm(a), { re: Math.LN10, im: 0 });
      case 'exp': return exponential(a);
      case 'sin': return finite({ re: Math.sin(a.re) * Math.cosh(a.im), im: Math.cos(a.re) * Math.sinh(a.im) });
      case 'cos': return finite({ re: Math.cos(a.re) * Math.cosh(a.im), im: -Math.sin(a.re) * Math.sinh(a.im) });
      case 'tan': {
        const sine = read({ type: 'call', name: 'sin', args: node.args });
        const cosine = read({ type: 'call', name: 'cos', args: node.args });
        if (Math.hypot(cosine.re, cosine.im) < 1e-15) throw new Error('Invalid domain');
        return divide(sine, cosine);
      }
      default: throw new Error('Unknown function');
    }
  };
  return finite(read(parseCalculatorFormula(formula)));
}

/** 将复数格式化为代数形式。
 * @param value - 复数
 * @returns a ± bi 形式的文本
 */
export function formatComplex(value: ComplexNumber): string {
  const real = value.re === 0 ? '' : formatDisplay(value.re);
  if (value.im === 0) return real || '0';
  const imaginary = (Math.abs(value.im) === 1 ? '' : formatDisplay(Math.abs(value.im))) + 'i';
  return real ? real + (value.im < 0 ? ' - ' : ' + ') + imaginary : (value.im < 0 ? '-' : '') + imaginary;
}
