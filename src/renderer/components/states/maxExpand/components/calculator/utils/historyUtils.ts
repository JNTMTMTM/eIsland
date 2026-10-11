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

export interface CalculatorHistoryEntry {
  id: string;
  formula: string;
  result: string;
  angleUnit: CalcAngleUnit;
  document: FormulaDocument;
}

function validDocument(value: unknown, depth = 0): value is FormulaDocument {
  if (!value || typeof value !== 'object' || depth > 20) return false;
  const segments = (value as FormulaDocument).segments;
  return Array.isArray(segments) && segments.length > 0 && segments.length <= 1000 && segments.every((segment) => {
    if (segment.type === 'text') return typeof segment.value === 'string';
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
  return value.filter((entry): entry is CalculatorHistoryEntry => {
    if (!entry || typeof entry.id !== 'string' || typeof entry.formula !== 'string' || typeof entry.result !== 'string') return false;
    if (!Number.isFinite(Number(entry.result)) || !['degree', 'radian'].includes(entry.angleUnit) || !validDocument(entry.document)) return false;
    try { return serializeFormulaDocument(entry.document) === entry.formula; } catch { return false; }
  }).slice(0, 100);
}

/** 合并新旧记录，保留最新顺序并去重。
 * @param recent - 当前会话中新增的记录
 * @param stored - 持久保存的记录
 * @returns 合并后的历史
 */
export function mergeCalculatorHistory(recent: CalculatorHistoryEntry[], stored: CalculatorHistoryEntry[]): CalculatorHistoryEntry[] {
  const seen = new Set<string>();
  return [...recent, ...stored].filter((entry) => {
    const key = JSON.stringify([entry.formula, entry.result, entry.angleUnit]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 100);
}
