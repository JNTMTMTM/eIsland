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
 * @file historyUtils.ts
 * @description 计算历史的存储校验与去重。
 * @author 鸡哥
 */

import type { CalcAngleUnit, FormulaDocument } from '../types/calculatorTypes';
import { serializeFormulaDocument } from './formulaDocumentUtils';
import { CONVERSION_UNITS, type UnitCategory } from './unitConversionUtils';
import type { MatrixOperation } from './matrixUtils';

/** 各计算界面恢复历史时所需的完整输入。 */
export type CalculatorHistoryInput = { formula: string; result: string } & (
  | { mode: 'arithmetic' | 'scientific' | 'coordinate'; angleUnit: CalcAngleUnit; document: FormulaDocument; extra?: string }
  | { mode: 'unitConversion'; input: { category: UnitCategory; from: string; to: string; value: string } }
  | { mode: 'equation'; input: { equation: string; lower: string; upper: string; angleUnit: CalcAngleUnit } }
  | { mode: 'complex'; input: { formula: string } }
  | { mode: 'matrix'; input: { a: string; b: string; scalar: string; operation: MatrixOperation } }
);

/** 包含持久化标识的统一计算历史。 */
export type CalculatorHistoryEntry = CalculatorHistoryInput & { id: string };

/** 指定功能界面中可恢复的输入字段。 */
export type CalculatorHistoryFields<Mode extends 'unitConversion' | 'equation' | 'complex' | 'matrix'> = Extract<CalculatorHistoryInput, { mode: Mode }>['input'];

function boundedText(value: unknown, maximum = 5000): value is string {
  return typeof value === 'string' && value.length <= maximum;
}

function validDocument(value: unknown, depth = 0): value is FormulaDocument {
  if (!value || typeof value !== 'object' || depth > 20) return false;
  const segments = (value as FormulaDocument).segments;
  return Array.isArray(segments) && segments.length > 0 && segments.length <= 1000 && segments.every((segment) => {
    if (!segment || typeof segment !== 'object') return false;
    if (segment.type === 'text') return boundedText(segment.value);
    if (segment.type !== 'structure' || !segment.value || typeof segment.value.id !== 'string') return false;
    if (!['logn', 'fraction', 'sum', 'integral', 'derivative', 'sqrt', 'root'].includes(segment.value.kind)) return false;
    return segment.value.slots && Object.values(segment.value.slots).every((slot) => validDocument(slot, depth + 1));
  });
}

/** 过滤损坏的历史数据，并限制记录数量。
 * @param value - 存储中读出的历史记录
 * @returns 可安全恢复的最近一百条记录
 */
export function readCalculatorHistory(value: unknown): CalculatorHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: CalculatorHistoryEntry[] = [];
  value.some((entry) => {
    if (!entry || typeof entry !== 'object' || !boundedText(entry.id, 200) || !boundedText(entry.formula, 20000) || !boundedText(entry.result, 200000) || !entry.result.trim()) return false;
    const mode = entry.mode ?? 'arithmetic';
    if (['arithmetic', 'scientific', 'coordinate'].includes(mode)) {
      if (!['degree', 'radian'].includes(entry.angleUnit) || !validDocument(entry.document) || (entry.extra !== undefined && !boundedText(entry.extra))) return false;
      if (mode !== 'coordinate' && !Number.isFinite(Number(entry.result))) return false;
      try { if (serializeFormulaDocument(entry.document) !== entry.formula) return false; } catch { return false; }
    } else {
      const input = entry.input;
      if (!input || typeof input !== 'object') return false;
      if (mode === 'unitConversion') {
        if (!boundedText(input.value) || !Number.isFinite(Number(input.value)) || !input.value.trim()) return false;
        if (![input.from, input.to].every((id) => CONVERSION_UNITS.some((unit) => unit.id === id && unit.category === input.category))) return false;
      } else if (mode === 'equation') {
        if (![input.equation, input.lower, input.upper].every((text) => boundedText(text)) || !['degree', 'radian'].includes(input.angleUnit)) return false;
      } else if (mode === 'complex') {
        if (!boundedText(input.formula)) return false;
      } else if (mode === 'matrix') {
        if (![input.a, input.b].every((text) => boundedText(text, 10000)) || !boundedText(input.scalar) || !['add', 'subtract', 'multiply', 'scale', 'transpose', 'determinant', 'inverse', 'rank', 'solve'].includes(input.operation)) return false;
      } else return false;
    }
    entries.push({ ...entry, mode } as CalculatorHistoryEntry);
    return entries.length === 100;
  });
  return entries;
}

/** 合并新旧记录，保留最新顺序并去重。
 * @param recent - 当前会话中新增的记录
 * @param stored - 持久保存的记录
 * @returns 合并后的历史
 */
export function mergeCalculatorHistory(recent: CalculatorHistoryEntry[], stored: CalculatorHistoryEntry[]): CalculatorHistoryEntry[] {
  const seen = new Set<string>();
  return [...recent, ...stored].filter((entry) => {
    const key = JSON.stringify([entry.mode, entry.formula, entry.result, 'angleUnit' in entry ? entry.angleUnit : entry.input, 'extra' in entry ? entry.extra : undefined]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 100);
}
