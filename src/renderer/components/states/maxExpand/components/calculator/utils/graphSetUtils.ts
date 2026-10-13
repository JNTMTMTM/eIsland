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
 * @file graphSetUtils.ts
 * @description 常见实函数的完整定义域和值域，以及当前视图的采样估计。
 * @author 鸡哥
 */

import { EvalBuiltIn } from 'function-plot';
import { formatDisplay, getPolynomialCoefficients, parseCalculatorFormula } from './calculatorUtils';
import { normalizeExpressionForPlot } from './expressionUtils';
import { solveEquation } from './equationUtils';

type Node = ReturnType<typeof parseCalculatorFormula>;
export interface FunctionInterval { lower: number; upper: number; lowerClosed: boolean; upperClosed: boolean }
export interface FunctionSetResult { intervals: FunctionInterval[]; exact: boolean; scope: [number, number] }
export interface FunctionSets { domain: FunctionSetResult; range: FunctionSetResult }
export type GraphSetKind = 'domain' | 'range';
type Intervals = FunctionInterval[];
const interval = (lower: number, upper: number, lowerClosed = false, upperClosed = false): FunctionInterval => ({
  lower, upper, lowerClosed: Number.isFinite(lower) && lowerClosed, upperClosed: Number.isFinite(upper) && upperClosed,
});
const REAL = [interval(-Infinity, Infinity)];
const POSITIVE = [interval(0, Infinity)];
const NONNEGATIVE = [interval(0, Infinity, true)];
const NONZERO = [interval(-Infinity, 0), interval(0, Infinity)];
const UNIT = [interval(-1, 1, true, true)];

function serialize(node: Node): string {
  switch (node.type) {
    case 'number': return '(' + node.value + ')';
    case 'variable': return 'x';
    case 'imaginary': return 'i';
    case 'unary': return '(' + node.operator + serialize(node.value) + ')';
    case 'postfix': return '(' + serialize(node.value) + node.operator + ')';
    case 'binary': return '(' + serialize(node.left) + node.operator + serialize(node.right) + ')';
    case 'call': return node.name + '(' + node.args.map(serialize).join(',') + ')';
  }
}

function union(values: Intervals): Intervals {
  const sorted = values.filter((v) => v.lower < v.upper || (v.lower === v.upper && v.lowerClosed && v.upperClosed))
    .sort((a, b) => a.lower - b.lower || Number(b.lowerClosed) - Number(a.lowerClosed));
  const result: Intervals = [];
  for (const value of sorted) {
    const last = result.at(-1);
    if (!last || value.lower > last.upper || (value.lower === last.upper && !value.lowerClosed && !last.upperClosed)) result.push({ ...value });
    else if (value.upper > last.upper) { last.upper = value.upper; last.upperClosed = value.upperClosed; }
    else if (value.upper === last.upper) last.upperClosed ||= value.upperClosed;
  }
  return result;
}

function intersect(a: Intervals, b: Intervals): Intervals {
  return union(a.flatMap((left) => b.map((right) => interval(
    Math.max(left.lower, right.lower), Math.min(left.upper, right.upper),
    left.lower > right.lower ? left.lowerClosed : left.lower < right.lower ? right.lowerClosed : left.lowerClosed && right.lowerClosed,
    left.upper < right.upper ? left.upperClosed : left.upper > right.upper ? right.upperClosed : left.upperClosed && right.upperClosed,
  ))));
}

function mapIntervals(values: Intervals, map: (value: number) => number, decreasing = false): Intervals {
  return union(values.map((value) => decreasing
    ? interval(map(value.upper), map(value.lower), value.upperClosed, value.lowerClosed)
    : interval(map(value.lower), map(value.upper), value.lowerClosed, value.upperClosed)));
}

function polynomial(node: Node): number[] | null {
  const result = getPolynomialCoefficients(serialize(node), 'radian');
  return result?.every(Number.isFinite) ? result : null;
}

function constant(node: Node): number | null {
  const coefficients = polynomial(node);
  return coefficients?.length === 1 ? coefficients[0] : null;
}

/** 多项式限制保留零点的开闭性，不通过稀疏采样猜测完整定义域。 */
function polynomialRestriction(formula: string, condition: 'positive' | 'nonnegative' | 'nonzero'): Intervals | null {
  const coefficients = getPolynomialCoefficients(formula, 'radian');
  if (!coefficients?.every(Number.isFinite)) return null;
  const accepts = (value: number): boolean => condition === 'nonzero' ? value !== 0 : condition === 'positive' ? value > 0 : value >= 0;
  if (coefficients.length === 1) return accepts(coefficients[0]) ? REAL : [];
  const roots = solveEquation(formula, -1, 1, 'radian').roots;
  const edges = [-Infinity, ...roots, Infinity];
  const result: Intervals = [];
  for (let index = 0; index < edges.length - 1; index += 1) {
    const lower = edges[index]; const upper = edges[index + 1];
    const sample = !Number.isFinite(lower) ? upper - Math.max(1, Math.abs(upper)) : !Number.isFinite(upper) ? lower + Math.max(1, Math.abs(lower)) : lower / 2 + upper / 2;
    // 无实根时用原点判断整个实轴的符号。
    const x = roots.length ? sample : 0;
    const value = coefficients.reduceRight((sum, coefficient) => sum * x + coefficient, 0);
    if (accepts(value)) result.push(interval(lower, upper, condition === 'nonnegative', condition === 'nonnegative'));
  }
  if (condition === 'nonnegative') roots.forEach((root) => result.push(interval(root, root, true, true)));
  return union(result);
}

function exactRange(node: Node): Intervals | null {
  const coefficients = polynomial(node);
  if (coefficients) {
    const [c, b = 0, a = 0] = coefficients;
    if (a !== 0) {
      const vertex = c - b * b / (4 * a);
      if (!Number.isFinite(vertex)) return null;
      return [a > 0 ? interval(vertex, Infinity, true) : interval(-Infinity, vertex, false, true)];
    }
    return b === 0 ? [interval(c, c, true, true)] : REAL;
  }
  if (node.type === 'unary') {
    const child = exactRange(node.value);
    return child && (node.operator === '-' ? mapIntervals(child, (v) => -v, true) : child);
  }
  if (node.type === 'binary') {
    const a = constant(node.left); const b = constant(node.right);
    const right = a === null ? null : exactRange(node.right); const left = b === null ? null : exactRange(node.left);
    if (node.operator === '^') {
      if (right && a !== null && a > 0) return a === 1 ? (right.length ? [interval(1, 1, true, true)] : []) : mapIntervals(right, (v) => a ** v, a < 1);
      if (b !== null && Number.isInteger(b) && b < 0) return exactRange({ type: 'binary', operator: '÷', left: { type: 'number', value: 1 }, right: {
        type: 'binary', operator: '^', left: node.left, right: { type: 'number', value: -b },
      } });
      if (left && b !== null && Number.isInteger(b) && b >= 0) {
        if (b === 0) return left.length ? [interval(1, 1, true, true)] : [];
        const base = b % 2 ? left : union([...intersect(left, NONNEGATIVE), ...mapIntervals(intersect(left, [interval(-Infinity, 0, false, true)]), (v) => -v, true)]);
        if (base.some((v) => [v.lower, v.upper].some((edge) => Number.isFinite(edge) && !Number.isFinite(edge ** b)))) return null;
        return mapIntervals(base, (v) => v ** b);
      }
    }
    if (right && node.operator === '÷') {
      if (a === 0) return intersect(right, NONZERO).length ? [interval(0, 0, true, true)] : [];
      const pieces = intersect(right, NONZERO);
      return union(pieces.flatMap((piece) => {
        const negative = piece.upper <= 0;
        const reciprocal = mapIntervals([piece], (v) => v === 0 ? (negative ? -Infinity : Infinity) : 1 / v, true);
        return mapIntervals(reciprocal, (v) => a! * v, a! < 0);
      }));
    }
    if (node.operator === '+' || node.operator === '-') {
      if (left) return mapIntervals(left, (v) => v + (node.operator === '+' ? b! : -b!));
      if (right) return mapIntervals(right, (v) => a! + (node.operator === '+' ? v : -v), node.operator === '-');
    }
    if (node.operator === '×' && (left || right)) {
      const factor = left ? b! : a!; const child = left ?? right!;
      return factor === 0 ? (child.length ? [interval(0, 0, true, true)] : []) : mapIntervals(child, (v) => factor * v, factor < 0);
    }
    if (node.operator === '÷' && left && b !== 0) return mapIntervals(left, (v) => v / b!, b! < 0);
    return null;
  }
  if (node.type === 'postfix' && node.operator === '%') {
    const child = exactRange(node.value); return child && mapIntervals(child, (v) => v / 100);
  }
  if (node.type !== 'call') return null;
  if (node.name === 'frac' && node.args.length === 2) return exactRange({ type: 'binary', operator: '÷', left: node.args[0], right: node.args[1] });
  if (node.name === 'logn' && node.args.length === 2) {
    const base = constant(node.args[0]); const argument = exactRange(node.args[1]);
    return base !== null && base > 0 && base !== 1 && argument
      ? mapIntervals(intersect(argument, POSITIVE), (v) => Math.log(v) / Math.log(base), base < 1) : null;
  }
  if (node.args.length !== 1) return null;
  const child = exactRange(node.args[0]); if (!child) return null;
  switch (node.name) {
    case 'ln': return mapIntervals(intersect(child, POSITIVE), Math.log);
    case 'log': return mapIntervals(intersect(child, POSITIVE), Math.log10);
    case 'sqrt': return mapIntervals(intersect(child, NONNEGATIVE), Math.sqrt);
    case 'exp': return child.some((v) => [v.lower, v.upper].some((edge) => Number.isFinite(edge) && !Number.isFinite(Math.exp(edge)))) ? null : mapIntervals(child, Math.exp);
    case 'abs': return union([...intersect(child, NONNEGATIVE), ...mapIntervals(intersect(child, [interval(-Infinity, 0, false, true)]), (v) => -v, true)]);
    case 'arctan': return mapIntervals(child, Math.atan);
    case 'arcsin': return mapIntervals(intersect(child, UNIT), Math.asin);
    case 'arccos': return mapIntervals(intersect(child, UNIT), Math.acos, true);
    case 'sin':
    case 'cos': return child.length === 1 && child[0].lower === -Infinity && child[0].upper === Infinity ? UNIT : null;
    default: return null;
  }
}

function restriction(node: Node, allowed: Intervals, formula: string, condition: 'positive' | 'nonnegative' | 'nonzero'): Intervals | null {
  const result = polynomialRestriction(formula, condition);
  if (result) return result;
  const image = exactRange(node);
  if (!image) return null;
  const valid = intersect(image, allowed);
  if (!valid.length) return [];
  return valid.length === image.length && valid.every((v, i) => v.lower === image[i].lower && v.upper === image[i].upper && v.lowerClosed === image[i].lowerClosed && v.upperClosed === image[i].upperClosed) ? REAL : null;
}

function exactDomain(node: Node): Intervals | null {
  if (node.type === 'number' || node.type === 'variable') return REAL;
  if (node.type === 'unary') return exactDomain(node.value);
  if (node.type === 'postfix') return node.operator === '%' ? exactDomain(node.value) : constant(node) !== null ? REAL : null;
  if (node.type === 'binary') {
    const left = exactDomain(node.left); const right = exactDomain(node.right);
    if (!left || !right) return null;
    let domain = intersect(left, right);
    if (node.operator === '÷') {
      const limit = restriction(node.right, NONZERO, serialize(node.right), 'nonzero');
      return limit && intersect(domain, limit);
    }
    if (node.operator === '^') {
      const exponent = constant(node.right);
      if (exponent === null) { const base = constant(node.left); return base !== null && base > 0 ? domain : null; }
      if (!Number.isInteger(exponent) || exponent < 0) {
        const allowed = exponent < 0 ? (Number.isInteger(exponent) ? NONZERO : POSITIVE) : NONNEGATIVE;
        const condition = exponent < 0 ? (Number.isInteger(exponent) ? 'nonzero' : 'positive') : 'nonnegative';
        const limit = restriction(node.left, allowed, serialize(node.left), condition);
        if (!limit) return null;
        domain = intersect(domain, limit);
      }
    }
    return domain;
  }
  if (node.type !== 'call') return null;
  if (node.name === 'frac' && node.args.length === 2) return exactDomain({ type: 'binary', operator: '÷', left: node.args[0], right: node.args[1] });
  const children = node.args.map(exactDomain);
  if (children.some((v) => v === null)) return null;
  let domain = (children as Intervals[]).reduce(intersect, REAL);
  const argument = node.args[node.name === 'logn' ? 1 : 0]; if (!argument) return null;
  if (['ln', 'log', 'logn', 'sqrt'].includes(node.name)) {
    const nonnegative = node.name === 'sqrt';
    const limit = restriction(argument, nonnegative ? NONNEGATIVE : POSITIVE, serialize(argument), nonnegative ? 'nonnegative' : 'positive');
    if (!limit) return null;
    domain = intersect(domain, limit);
    if (node.name === 'logn') {
      const base = node.args[0];
      const positive = restriction(base, POSITIVE, serialize(base), 'positive');
      const notOne = polynomialRestriction('(' + serialize(base) + ')-1', 'nonzero');
      return positive && notOne ? intersect(intersect(domain, positive), notOne) : null;
    }
    return domain;
  }
  if (node.name === 'arcsin' || node.name === 'arccos') {
    const lower = polynomialRestriction('(' + serialize(argument) + ')+1', 'nonnegative');
    const upper = polynomialRestriction('1-(' + serialize(argument) + ')', 'nonnegative');
    return lower && upper ? intersect(intersect(domain, lower), upper) : null;
  }
  return ['sin', 'cos', 'arctan', 'exp', 'abs'].includes(node.name) ? domain : null;
}

/** 分析完整区间；无法进行可靠解析时，只返回当前横坐标范围的采样估计。
 * @param formula - 计算器函数表达式
 * @param lower - 当前视图横坐标下限
 * @param upper - 当前视图横坐标上限
 * @returns 定义域和值域的区间、解析标记以及数值搜索范围
 */
export function analyzeFunctionSets(formula: string, lower: number, upper: number): FunctionSets {
  if (![lower, upper].every(Number.isFinite) || lower >= upper) throw new Error('Invalid analysis range');
  const node = parseCalculatorFormula(formula);
  const domain = exactDomain(node); const range = domain?.length === 0 ? [] : exactRange(node);
  const scope: [number, number] = [lower, upper];
  if (domain !== null && range !== null) return { domain: { intervals: domain, exact: true, scope }, range: { intervals: range, exact: true, scope } };
  const datum = { fn: normalizeExpressionForPlot(formula) };
  let sampleError: unknown; let evaluated = false;
  const sample = (x: number): number | null => {
    try { const y: number = EvalBuiltIn(datum, 'fn', { x }); evaluated = true; return Number.isFinite(y) ? y : null; }
    catch (error) { sampleError = error; return null; }
  };
  const sampledDomain: Intervals = []; const sampledRange: Intervals = [];
  const boundary = (a: number, b: number, validAtA: boolean): number => {
    for (let iteration = 0; iteration < 40; iteration += 1) {
      const mid = a / 2 + b / 2;
      if ((sample(mid) !== null) === validAtA) a = mid; else b = mid;
    }
    return a / 2 + b / 2;
  };
  // 已知定义域的各分支分别取样，不能把极点两侧的值域直接连接起来。
  const views = domain === null ? [interval(lower, upper, true, true)] : intersect(domain, [interval(lower, upper, true, true)]);
  for (const view of views) {
    let start: number | null = null; let minimum = Infinity; let maximum = -Infinity; let previous = view.lower;
    for (let index = 0; index <= 2048; index += 1) {
      const fraction = index === 0 && !view.lowerClosed ? .5 : index === 2048 && !view.upperClosed ? 2047.5 : index;
      const x = view.lower + (view.upper - view.lower) * fraction / 2048; const y = sample(x); const valid = y !== null;
      if (valid && start === null) start = index === 0 ? x : boundary(previous, x, false);
      if (y !== null) { minimum = Math.min(minimum, y); maximum = Math.max(maximum, y); }
      if (!valid && start !== null) {
        sampledDomain.push(interval(start, boundary(previous, x, true), start === view.lower && view.lowerClosed, false));
        sampledRange.push(interval(minimum, maximum, true, true)); start = null; minimum = Infinity; maximum = -Infinity;
      }
      if (index === 2048 && start !== null) {
        sampledDomain.push(interval(start, x, start === view.lower && view.lowerClosed, valid && view.upperClosed));
        sampledRange.push(interval(minimum, maximum, true, true));
      }
      previous = x;
    }
  }
  // 仅求值失败与整个视图无实数值要区分；后者是合法的空采样结果。
  if (!evaluated && sampleError) throw sampleError;
  return {
    domain: { intervals: domain ?? union(sampledDomain), exact: domain !== null, scope },
    range: { intervals: range ?? union(sampledRange), exact: range !== null, scope },
  };
}

/** 将区间集合格式化为数学记号，保留无穷端点和开闭边界。
 * @param result - 定义域或值域分析结果
 * @returns 可展示的数学区间集合
 */
export function formatFunctionSet(result: FunctionSetResult): string {
  const value = (v: number): string => v === -Infinity ? '−∞' : v === Infinity ? '+∞' : formatDisplay(v);
  if (!result.intervals.length) return '∅';
  return result.intervals.map((v) => v.lower === v.upper ? '{' + value(v.lower) + '}'
    : (v.lowerClosed ? '[' : '(') + value(v.lower) + ', ' + value(v.upper) + (v.upperClosed ? ']' : ')')).join(' ∪ ');
}
