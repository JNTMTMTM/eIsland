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
 * @file useCalculatorHistory.ts
 * @description 计算历史的加载、持久保存和管理。
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import type { CalcAngleUnit, FormulaDocument } from '../types/calculatorTypes';
import { mergeCalculatorHistory, readCalculatorHistory, type CalculatorHistoryEntry } from '../utils/historyUtils';
import { serializeFormulaDocument } from '../utils/formulaDocumentUtils';

const STORE_KEY = 'calculator-history';

/** 持久保存成功的计算记录，并提供删除和清空操作。
 * @param document - 当前可编辑公式
 * @param result - 等号计算后的结果
 * @param angleUnit - 计算时采用的角度单位
 * @returns 历史记录、存储状态和管理方法
 */
export function useCalculatorHistory(document: FormulaDocument, result: string | null, angleUnit: CalcAngleUnit) {
  const [entries, setEntries] = useState<CalculatorHistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const read = typeof window !== 'undefined' ? window.api?.storeRead?.(STORE_KEY) : undefined;
    Promise.resolve(read).then((stored) => {
      if (!cancelled) { setEntries((recent) => mergeCalculatorHistory(recent, readCalculatorHistory(stored))); setLoaded(true); }
    }).catch(() => { if (!cancelled) { setStorageError(true); setLoaded(true); } });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (result === null || !Number.isFinite(Number(result))) return;
    const entry = { id: crypto.randomUUID(), formula: serializeFormulaDocument(document), result, angleUnit, document };
    setEntries((previous) => mergeCalculatorHistory([entry], previous));
  }, [document, result, angleUnit]);
  useEffect(() => {
    if (!loaded || typeof window === 'undefined' || !window.api?.storeWrite) return;
    window.api.storeWrite(STORE_KEY, entries).then((saved) => setStorageError(!saved)).catch(() => setStorageError(true));
  }, [entries, loaded]);
  return { entries, storageError, clear: () => setEntries([]), remove: (id: string) => setEntries((previous) => previous.filter((entry) => entry.id !== id)) };
}
