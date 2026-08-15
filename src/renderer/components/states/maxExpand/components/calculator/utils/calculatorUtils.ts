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
 * @description 计算器公式 AST 解析、数值求值与科学公式片段构建。
 * @author 鸡哥
 */

import type { ScientificFn } from '../types/calculatorTypes';

type ExpressionNode =
  | { type: 'number'; value: number }
  | { type: 'variable' }
  | { type: 'unary'; operator: '+' | '-'; value: ExpressionNode }
  | { type: 'binary'; operator: '+' | '-' | '×' | '÷' | '^'; left: ExpressionNode; right: ExpressionNode }
  | { type: 'postfix'; operator: '!' | '%'; value: ExpressionNode }
  | { type: 'call'; name: string; args: ExpressionNode[] };

interface EvaluationEnvironment {
  x?: number;
}

const MAX_SUM_TERMS = 100_000;
const INTEGRAL_TOLERANCE = 1e-8;
const MAX_INTEGRAL_DEPTH = 20;

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
  if (value < 0 || !Number.isInteger(value) || value > 170) throw new Error('Invalid factorial');
  let result = 1;
  for (let factor = 2; factor <= value; factor += 1) result *= factor;
  return result;
}

class FormulaParser {
  private position = 0;

  public constructor(private readonly formula: string) {}

  public parse(): ExpressionNode {
    const value = this.parseExpression();
    this.skipWhitespace();
    if (this.position !== this.formula.length) throw new Error('Unexpected token');
    return value;
  }

  private parseExpression(): ExpressionNode {
    let value = this.parseTerm();
    while (true) {
      if (this.consume('+')) value = { type: 'binary', operator: '+', left: value, right: this.parseTerm() };
      else if (this.consume('-')) value = { type: 'binary', operator: '-', left: value, right: this.parseTerm() };
      else return value;
    }
  }

  private parseTerm(): ExpressionNode {
    let value = this.parsePower();
    while (true) {
      if (this.consume('×') || this.consume('*')) {
        value = { type: 'binary', operator: '×', left: value, right: this.parsePower() };
      } else if (this.consume('÷') || this.consume('/')) {
        value = { type: 'binary', operator: '÷', left: value, right: this.parsePower() };
      } else if (this.startsImplicitFactor()) {
        value = { type: 'binary', operator: '×', left: value, right: this.parsePower() };
      } else return value;
    }
  }

  private parsePower(): ExpressionNode {
    const base = this.parseUnary();
    return this.consume('^')
      ? { type: 'binary', operator: '^', left: base, right: this.parsePower() }
      : base;
  }

  private parseUnary(): ExpressionNode {
    if (this.consume('+')) return { type: 'unary', operator: '+', value: this.parseUnary() };
    if (this.consume('-')) return { type: 'unary', operator: '-', value: this.parseUnary() };
    return this.parsePostfix();
  }

  private parsePostfix(): ExpressionNode {
    let value = this.parsePrimary();
    while (true) {
      if (this.consume('!')) value = { type: 'postfix', operator: '!', value };
      else if (this.consume('%')) value = { type: 'postfix', operator: '%', value };
      else return value;
    }
  }

  private parsePrimary(): ExpressionNode {
    if (this.consume('(')) {
      const value = this.parseExpression();
      this.expect(')');
      return value;
    }
    if (this.consume('π')) return { type: 'number', value: Math.PI };

    const number = this.readNumber();
    if (number !== null) return { type: 'number', value: number };

    const identifier = this.readIdentifier();
    if (identifier === 'e') return { type: 'number', value: Math.E };
    if (identifier === 'x') return { type: 'variable' };
    if (!identifier) throw new Error('Expected value');

    this.expect('(');
    const args: ExpressionNode[] = [];
    if (!this.consume(')')) {
      do args.push(this.parseExpression()); while (this.consume(','));
      this.expect(')');
    }
    return { type: 'call', name: identifier, args };
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

  private startsImplicitFactor(): boolean {
    this.skipWhitespace();
    const token = this.formula[this.position] ?? '';
    return token === '(' || token === 'π' || /^[a-z]$/i.test(token);
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

function requireArgCount(name: string, args: ExpressionNode[], count: number): void {
  if (args.length !== count) throw new Error(`${name} expects ${count} arguments`);
}

function finite(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Non-finite result');
  return value;
}

function evaluateIntegral(
  body: ExpressionNode,
  lower: number,
  upper: number,
  environment: EvaluationEnvironment,
): number {
  if (lower === upper) return 0;
  if (lower > upper) return -evaluateIntegral(body, upper, lower, environment);
  const sample = (x: number): number => finite(evaluateNode(body, { ...environment, x }));
  const fa = sample(lower);
  const fb = sample(upper);
  const midpoint = (lower + upper) / 2;
  const fm = sample(midpoint);
  const whole = ((upper - lower) / 6) * (fa + 4 * fm + fb);

  const adaptive = (
    left: number,
    right: number,
    leftValue: number,
    middleValue: number,
    rightValue: number,
    estimate: number,
    tolerance: number,
    depth: number,
  ): number => {
    const middle = (left + right) / 2;
    const leftMiddle = (left + middle) / 2;
    const rightMiddle = (middle + right) / 2;
    const leftMiddleValue = sample(leftMiddle);
    const rightMiddleValue = sample(rightMiddle);
    const leftEstimate = ((middle - left) / 6) * (leftValue + 4 * leftMiddleValue + middleValue);
    const rightEstimate = ((right - middle) / 6) * (middleValue + 4 * rightMiddleValue + rightValue);
    const delta = leftEstimate + rightEstimate - estimate;
    if (Math.abs(delta) <= 15 * tolerance) return leftEstimate + rightEstimate + delta / 15;
    if (depth <= 0) throw new Error('Integral did not converge');
    return adaptive(left, middle, leftValue, leftMiddleValue, middleValue, leftEstimate, tolerance / 2, depth - 1)
      + adaptive(middle, right, middleValue, rightMiddleValue, rightValue, rightEstimate, tolerance / 2, depth - 1);
  };

  return adaptive(lower, upper, fa, fm, fb, whole, INTEGRAL_TOLERANCE, MAX_INTEGRAL_DEPTH);
}

function evaluateCall(node: Extract<ExpressionNode, { type: 'call' }>, environment: EvaluationEnvironment): number {
  const { name, args } = node;
  if (name === 'sum') {
    requireArgCount(name, args, 3);
    const lower = finite(evaluateNode(args[1], environment));
    const upper = finite(evaluateNode(args[2], environment));
    if (!Number.isInteger(lower) || !Number.isInteger(upper) || lower > upper || upper - lower + 1 > MAX_SUM_TERMS) {
      throw new Error('Invalid summation range');
    }
    let result = 0;
    for (let x = lower; x <= upper; x += 1) result = finite(result + evaluateNode(args[0], { ...environment, x }));
    return result;
  }
  if (name === 'integral') {
    requireArgCount(name, args, 3);
    const lower = finite(evaluateNode(args[1], environment));
    const upper = finite(evaluateNode(args[2], environment));
    return evaluateIntegral(args[0], lower, upper, environment);
  }
  if (name === 'derivative') {
    requireArgCount(name, args, 2);
    const point = finite(evaluateNode(args[1], environment));
    const h = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(point));
    const sample = (x: number): number => finite(evaluateNode(args[0], { ...environment, x }));
    return finite((-sample(point + 2 * h) + 8 * sample(point + h) - 8 * sample(point - h) + sample(point - 2 * h)) / (12 * h));
  }

  const values = args.map((arg) => evaluateNode(arg, environment));
  switch (name) {
    case 'sin': requireArgCount(name, args, 1); return finite(Math.sin(values[0]));
    case 'cos': requireArgCount(name, args, 1); return finite(Math.cos(values[0]));
    case 'tan': requireArgCount(name, args, 1); return finite(Math.tan(values[0]));
    case 'arcsin': requireArgCount(name, args, 1); return finite(Math.asin(values[0]));
    case 'arccos': requireArgCount(name, args, 1); return finite(Math.acos(values[0]));
    case 'arctan': requireArgCount(name, args, 1); return finite(Math.atan(values[0]));
    case 'log': requireArgCount(name, args, 1); return finite(Math.log10(values[0]));
    case 'ln': requireArgCount(name, args, 1); return finite(Math.log(values[0]));
    case 'sqrt': requireArgCount(name, args, 1); return finite(Math.sqrt(values[0]));
    case 'cbrt': requireArgCount(name, args, 1); return finite(Math.cbrt(values[0]));
    case 'abs': requireArgCount(name, args, 1); return Math.abs(values[0]);
    case 'exp': requireArgCount(name, args, 1); return finite(Math.exp(values[0]));
    case 'root': requireArgCount(name, args, 2); return finite(values[1] ** (1 / values[0]));
    case 'frac': requireArgCount(name, args, 2); return finite(values[0] / values[1]);
    case 'logn':
      requireArgCount(name, args, 2);
      if (values[0] <= 0 || values[0] === 1 || values[1] <= 0) throw new Error('Invalid logarithm domain');
      return finite(Math.log(values[1]) / Math.log(values[0]));
    default: throw new Error('Unknown function');
  }
}

function evaluateNode(node: ExpressionNode, environment: EvaluationEnvironment): number {
  switch (node.type) {
    case 'number': return node.value;
    case 'variable':
      if (environment.x === undefined) throw new Error('Unbound variable');
      return environment.x;
    case 'unary': return node.operator === '-' ? -evaluateNode(node.value, environment) : evaluateNode(node.value, environment);
    case 'postfix': {
      const value = evaluateNode(node.value, environment);
      return node.operator === '!' ? factorial(value) : value / 100;
    }
    case 'binary': {
      const left = evaluateNode(node.left, environment);
      const right = evaluateNode(node.right, environment);
      switch (node.operator) {
        case '+': return finite(left + right);
        case '-': return finite(left - right);
        case '×': return finite(left * right);
        case '÷': return finite(left / right);
        case '^': return finite(left ** right);
      }
    }
    case 'call': return evaluateCall(node, environment);
  }
}

/**
 * 对完整公式执行 AST 解析与数值求值。
 * @param formula - 使用规范 DSL 与计算器显示运算符的公式
 * @returns 公式计算结果
 */
export function evaluateFormula(formula: string): number {
  return finite(evaluateNode(new FormulaParser(formula).parse(), {}));
}

/**
 * 获取科学按钮写入线性公式槽位的片段。
 * @param fn - 科学运算按钮标识
 * @returns 要插入的公式文本和插入后的光标回退量
 */
export function getScientificInput(fn: ScientificFn): { text: string; cursorOffset: number } {
  switch (fn) {
    case 'pi': return { text: 'π', cursorOffset: 0 };
    case 'e': return { text: 'e', cursorOffset: 0 };
    case 'variable': return { text: 'x', cursorOffset: 0 };
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