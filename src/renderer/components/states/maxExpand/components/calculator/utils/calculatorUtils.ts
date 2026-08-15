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
 * @description 计算器公式求值、数值格式化与科学公式片段构建。
 * @author 鸡哥
 */

import type { ScientificFn } from '../types/calculatorTypes';

/**
 * 将计算结果压缩为适合显示区的字符串。
 * @param value - 公式求值后的有限数值
 * @returns 最多包含十二位有效数字的文本
 */
export function formatDisplay(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  const text = String(value);
  if (text.replace(/[^0-9]/g, '').length > 12) {
    return value.toPrecision(12).replace(/\.?0+$/, '');
  }
  return text;
}

function factorial(value: number): number {
  if (value < 0 || !Number.isInteger(value) || value > 170) return NaN;
  let result = 1;
  for (let factor = 2; factor <= value; factor += 1) result *= factor;
  return result;
}

class FormulaParser {
  private position = 0;

  public constructor(private readonly formula: string) {}

  public parse(): number {
    const value = this.parseExpression();
    this.skipWhitespace();
    if (this.position !== this.formula.length) throw new Error('Unexpected token');
    return value;
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (true) {
      if (this.consume('+')) value += this.parseTerm();
      else if (this.consume('-')) value -= this.parseTerm();
      else return value;
    }
  }

  private parseTerm(): number {
    let value = this.parsePower();
    while (true) {
      if (this.consume('×') || this.consume('*')) value *= this.parsePower();
      else if (this.consume('÷') || this.consume('/')) value /= this.parsePower();
      else return value;
    }
  }

  private parsePower(): number {
    const base = this.parseUnary();
    return this.consume('^') ? base ** this.parsePower() : base;
  }

  private parseUnary(): number {
    if (this.consume('+')) return this.parseUnary();
    if (this.consume('-')) return -this.parseUnary();
    return this.parsePostfix();
  }

  private parsePostfix(): number {
    let value = this.parsePrimary();
    while (true) {
      if (this.consume('!')) value = factorial(value);
      else if (this.consume('%')) value /= 100;
      else return value;
    }
  }

  private parsePrimary(): number {
    if (this.consume('(')) {
      const value = this.parseExpression();
      this.expect(')');
      return value;
    }
    if (this.consume('π')) return Math.PI;

    const number = this.readNumber();
    if (number !== null) return number;

    const identifier = this.readIdentifier();
    if (identifier === 'e') return Math.E;
    if (!identifier) throw new Error('Expected value');

    this.expect('(');
    const first = this.parseExpression();
    const second = this.consume(',') ? this.parseExpression() : null;
    this.expect(')');
    return this.applyFunction(identifier, first, second);
  }

  private applyFunction(name: string, first: number, second: number | null): number {
    switch (name) {
      case 'sin': return Math.sin(first);
      case 'cos': return Math.cos(first);
      case 'tan': return Math.tan(first);
      case 'asin': return Math.asin(first);
      case 'acos': return Math.acos(first);
      case 'atan': return Math.atan(first);
      case 'log': return Math.log10(first);
      case 'ln': return Math.log(first);
      case 'sqrt': return Math.sqrt(first);
      case 'cbrt': return Math.cbrt(first);
      case 'abs': return Math.abs(first);
      case 'exp': return Math.exp(first);
      case 'root': return second === null ? NaN : second ** (1 / first);
      default: throw new Error('Unknown function');
    }
  }

  private readNumber(): number | null {
    this.skipWhitespace();
    const match = this.formula.slice(this.position).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (!match) return null;
    this.position += match[0].length;
    return Number(match[0]);
  }

  private readIdentifier(): string {
    this.skipWhitespace();
    const match = this.formula.slice(this.position).match(/^[a-z]+/i);
    if (!match) return '';
    this.position += match[0].length;
    return match[0].toLowerCase();
  }

  private consume(token: string): boolean {
    this.skipWhitespace();
    if (!this.formula.startsWith(token, this.position)) return false;
    this.position += token.length;
    return true;
  }

  private expect(token: string): void {
    if (!this.consume(token)) throw new Error('Missing token');
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.formula[this.position] ?? '')) this.position += 1;
  }
}

/**
 * 对完整公式执行求值，按钮输入阶段不会调用此函数。
 * @param formula - 使用计算器显示运算符的公式
 * @returns 公式计算结果
 */
export function evaluateFormula(formula: string): number {
  return new FormulaParser(formula).parse();
}

/**
 * 获取科学按钮写入公式的片段，并给出光标回退量。
 * @param fn - 科学运算按钮标识
 * @returns 要插入的公式文本和插入后的光标回退量
 */
export function getScientificInput(fn: ScientificFn): { text: string; cursorOffset: number } {
  switch (fn) {
    case 'pi': return { text: 'π', cursorOffset: 0 };
    case 'e': return { text: 'e', cursorOffset: 0 };
    case 'square': return { text: '^2', cursorOffset: 0 };
    case 'cube': return { text: '^3', cursorOffset: 0 };
    case 'pow': return { text: '^()', cursorOffset: 1 };
    case 'exp': return { text: 'e^()', cursorOffset: 1 };
    case 'factorial': return { text: '!', cursorOffset: 0 };
    case 'reciprocal': return { text: '1/()', cursorOffset: 1 };
    case 'nthroot': return { text: 'root(,)', cursorOffset: 2 };
    default: return { text: `${fn}()`, cursorOffset: 1 };
  }
}