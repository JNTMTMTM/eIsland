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
 * @file historyMathUtils.ts
 * @description 将各计算模式的历史转换为只读数学排版，并兼容旧记录。
 * @author 鸡哥
 */

import { parseCalculatorFormula } from './calculatorUtils';
import { readMatrixDraft } from './matrixEditorUtils';
import { parseMatrix } from './matrixUtils';
import { CONVERSION_UNITS } from './unitConversionUtils';
import type { CalculatorHistoryEntry } from './historyUtils';

type Node = ReturnType<typeof parseCalculatorFormula>;
export interface HistoryMathPart { text: string; tex: string | null }
export interface HistoryMathRecord { expression: HistoryMathPart[]; result: HistoryMathPart[] }

function escapeText(text: string): string {
  return text.replace(/[\\{}#$%&_^~]/g, (symbol) => symbol === '\\' ? '\\textbackslash{}' : symbol === '^' ? '\\textasciicircum{}' : symbol === '~' ? '\\textasciitilde{}' : '\\' + symbol);
}

function numberTex(value: number): string {
  if (!Number.isFinite(value)) throw new Error('Invalid number');
  return String(value).replace(/e([+-]?\d+)$/i, '\\times 10^{$1}');
}

function group(node: Node): string {
  return '\\left(' + nodeTex(node) + '\\right)';
}

function compoundNumber(node: Node): boolean {
  return node.type === 'number' && !node.symbol && /e/i.test(String(node.value));
}

function nodeTex(node: Node): string {
  switch (node.type) {
    case 'number': return node.symbol === 'π' ? '\\pi' : node.symbol === 'e' ? 'e' : numberTex(node.value);
    case 'variable': return 'x';
    case 'imaginary': return 'i';
    case 'unary': return node.operator + (node.value.type === 'binary' && ['+', '-'].includes(node.value.operator) ? group(node.value) : nodeTex(node.value));
    case 'postfix': return (node.value.type === 'binary' || node.value.type === 'unary' || compoundNumber(node.value) ? group(node.value) : nodeTex(node.value)) + (node.operator === '%' ? '\\%' : '!');
    case 'binary': {
      const left = nodeTex(node.left); const right = nodeTex(node.right);
      if (node.operator === '÷') return '\\frac{' + left + '}{' + right + '}';
      if (node.operator === '^') {
        const base = ['binary', 'unary'].includes(node.left.type) || compoundNumber(node.left) ? group(node.left) : left;
        return '{' + base + '}^{' + right + '}';
      }
      if (node.operator === '×') {
        const factor = (value: Node): string => value.type === 'binary' && ['+', '-'].includes(value.operator) ? group(value) : nodeTex(value);
        return factor(node.left) + '\\times ' + factor(node.right);
      }
      return left + node.operator + (node.operator === '-' && node.right.type === 'binary' && ['+', '-'].includes(node.right.operator) ? group(node.right) : right);
    }
    case 'call': {
      const args = node.args.map(nodeTex);
      switch (node.name) {
        case 'sqrt': return '\\sqrt{' + args[0] + '}';
        case 'cbrt': return '\\sqrt[3]{' + args[0] + '}';
        case 'root': return '\\sqrt[' + args[0] + ']{' + args[1] + '}';
        case 'frac': return '\\frac{' + args[0] + '}{' + args[1] + '}';
        case 'logn': return '\\log_{' + args[0] + '}\\left(' + args[1] + '\\right)';
        case 'abs': return '\\left|' + args[0] + '\\right|';
        case 'conj': return '\\overline{' + args[0] + '}';
        case 'sum': return '\\sum_{x=' + args[1] + '}^{' + args[2] + '}\\left(' + args[0] + '\\right)';
        case 'integral': return '\\int_{' + args[1] + '}^{' + args[2] + '}\\left(' + args[0] + '\\right)\\,dx';
        case 'derivative': return '\\left.\\frac{d}{dx}\\left(' + args[0] + '\\right)\\right|_{x=' + args[1] + '}';
        default: return '\\operatorname{' + escapeText(node.name) + '}\\left(' + args.join(',\\,') + '\\right)';
      }
    }
  }
}

function formulaPart(text: string): HistoryMathPart {
  try {
    const sides = text.split('=');
    if (sides.length > 2) throw new Error('Invalid equation');
    return { text, tex: sides.map((side) => nodeTex(parseCalculatorFormula(side))).join('=') };
  } catch { return { text, tex: null }; }
}

function matrixPart(name: string, cells: string[][]): HistoryMathPart {
  const tex = cells.map((row) => row.map((cell) => {
    const part = formulaPart(cell);
    if (!part.tex) throw new Error('Invalid cell');
    return part.tex;
  }).join(' & ')).join(' \\\\ ');
  return { text: name + ' = ' + cells.map((row) => row.join(', ')).join('; '), tex: name + '=\\begin{bmatrix}' + tex + '\\end{bmatrix}' };
}

function unitTex(id: string): string {
  const symbol = CONVERSION_UNITS.find((unit) => unit.id === id)?.symbol;
  if (!symbol) throw new Error('Invalid unit');
  return '\\mathrm{' + escapeText(symbol).replace(/²/g, '^{2}').replace(/³/g, '^{3}').replace(/°/g, '{}^{\\circ}') + '}';
}

function analysisPart(text: string): HistoryMathPart {
  const match = text.match(/^(f\d+(?:\s*∩\s*f\d+)?):\s*(.+)$/);
  if (!match) return { text, tex: null };
  const [body, ...notes] = match[2].split(' · ');
  if (!/^[\d\s.,+\-−∞(){}\[\]∪≈eE]+$/.test(body)) return { text, tex: null };
  const label = match[1].replace(/f(\d+)/g, 'f_{$1}').replace(/∩/g, '\\cap ');
  const value = body.replace(/[{}]/g, '\\$&').replace(/e([+-]?\d+)/gi, '\\times 10^{$1}')
    .replace(/∞/g, '\\infty ').replace(/∪/g, '\\cup ').replace(/≈/g, '\\approx ').replace(/−/g, '-');
  return { text, tex: label + ':\\quad ' + value + (notes.length ? '\\quad\\text{' + escapeText(notes.join(' · ')) + '}' : '') };
}

/** 为历史记录生成安全的数学表达式，无法解释的旧文本仍可显示及恢复。
 * @param entry - 已保存的原始记录
 * @returns 输入与结果的只读排版片段
 */
export function formatHistoryMath(entry: CalculatorHistoryEntry): HistoryMathRecord {
  if (entry.mode === 'matrix') {
    try {
      const expression = [matrixPart('A', readMatrixDraft(entry.input.a))];
      if (['add', 'subtract', 'multiply', 'solve'].includes(entry.input.operation)) expression.push(matrixPart('B', readMatrixDraft(entry.input.b)));
      if (entry.input.operation === 'scale') expression.push({ text: 'k=' + entry.input.scalar, tex: 'k=' + nodeTex(parseCalculatorFormula(entry.input.scalar)) });
      const result = ['determinant', 'rank'].includes(entry.input.operation)
        ? [{ text: entry.result, tex: '\\operatorname{' + (entry.input.operation === 'rank' ? 'rank' : 'det') + '}(A)=' + numberTex(Number(entry.result)) }]
        : [matrixPart(entry.input.operation === 'solve' ? 'X' : 'R', parseMatrix(entry.result).map((row) => row.map(String)))];
      return { expression, result };
    } catch { return { expression: [{ text: entry.formula, tex: null }], result: [{ text: entry.result, tex: null }] }; }
  }
  if (entry.mode === 'unitConversion') {
    try {
      const target = CONVERSION_UNITS.find((unit) => unit.id === entry.input.to)!;
      const value = entry.result.endsWith(' ' + target.symbol) ? entry.result.slice(0, -target.symbol.length).trim() : entry.result;
      return {
        expression: [{ text: entry.formula, tex: numberTex(Number(entry.input.value)) + '\\,' + unitTex(entry.input.from) + '\\longrightarrow ' + unitTex(entry.input.to) }],
        result: [{ text: entry.result, tex: numberTex(Number(value)) + '\\,' + unitTex(entry.input.to) }]
      };
    } catch { return { expression: [{ text: entry.formula, tex: null }], result: [{ text: entry.result, tex: null }] }; }
  }
  const expression = [formulaPart(entry.formula)];
  if (entry.mode === 'coordinate' && entry.extra) expression.push(...entry.extra.split('\n').filter(Boolean).map(formulaPart));
  if (entry.mode === 'coordinate') return { expression, result: entry.result.split('\n').map(analysisPart) };
  if (entry.mode === 'equation') {
    try {
      const match = entry.result.match(/^x\s*(=|≈)\s*(.+)$/);
      return { expression, result: [{ text: entry.result, tex: match ? 'x' + (match[1] === '≈' ? '\\approx ' : '=') + match[2].split(',').map((root) => nodeTex(parseCalculatorFormula(root))).join(',\\,') : null }] };
    } catch { return { expression, result: [{ text: entry.result, tex: null }] }; }
  }
  return { expression, result: [formulaPart(entry.result)] };
}
