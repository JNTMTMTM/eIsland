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
 * @file historyUtils.test.ts
 * @description 历史数据校验和容量边界测试。
 * @author 鸡哥
 */

import { expect, it } from 'vitest';
import { readCalculatorHistory, mergeCalculatorHistory } from '../historyUtils';
import type { CalculatorHistoryEntry } from '../historyUtils';
const entry = { id: 'one', mode: 'arithmetic' as const, formula: '2+3', result: '5', angleUnit: 'degree' as const, document: { segments: [{ type: 'text' as const, value: '2+3' }] } };
it('validates persisted formulas and filters corrupt entries', () => {
  expect(readCalculatorHistory([entry, { ...entry, formula: 'wrong' }, { ...entry, result: 'Error' }, { ...entry, document: null }])).toEqual([entry]);
  expect(readCalculatorHistory(null)).toEqual([]);
});
it('migrates legacy records and rejects malformed documents without losing valid records', () => {
  const { mode: _, ...legacy } = entry;
  expect(readCalculatorHistory([legacy, { ...entry, document: { segments: [null] } }])).toEqual([entry]);
});
it('round-trips every calculator mode and rejects incomplete restoration fields', () => {
  const records: CalculatorHistoryEntry[] = [
    entry,
    { ...entry, id: 'science', mode: 'scientific' },
    { ...entry, id: 'graph', mode: 'coordinate', extra: 'x+2', result: 'f1 ∩ f2: (1, 3)' },
    { id: 'units', mode: 'unitConversion', formula: '0 °C → °F', result: '32 °F', input: { category: 'temperature', from: 'c', to: 'f', value: '0' } },
    { id: 'equation', mode: 'equation', formula: 'x^2=4', result: 'x = -2, 2', input: { equation: 'x^2=4', lower: '-10', upper: '10', angleUnit: 'degree' } },
    { id: 'complex', mode: 'complex', formula: '3+4i', result: '3 + 4i', input: { formula: '3+4i' } },
    { id: 'matrix', mode: 'matrix', formula: 'A × B', result: '1\t2\n3\t4', input: { a: '1 2\n3 4', b: '1 0\n0 1', operation: 'multiply', scalar: '2' } },
  ];
  expect(readCalculatorHistory(JSON.parse(JSON.stringify(records)))).toEqual(records);
  expect(readCalculatorHistory([
    { ...records[3], input: { category: 'length', from: 'c', to: 'f', value: '0' } },
    { ...records[4], input: { equation: 'x=1' } },
    { ...records[5], input: { formula: null } },
    { ...records[6], input: { a: '1', b: '1', operation: 'unknown', scalar: '2' } },
    { ...entry, mode: 'unknown' },
  ])).toEqual([]);
  expect(mergeCalculatorHistory([entry, { ...entry, mode: 'scientific' }], [])).toHaveLength(2);
});
it('deduplicates calculations and bounds the persisted history', () => {
  expect(mergeCalculatorHistory([{ ...entry, id: 'latest' }], [entry])).toHaveLength(1);
  expect(mergeCalculatorHistory(Array.from({ length: 120 }, (_, index) => ({ ...entry, formula: String(index) })), [])).toHaveLength(100);
});

it('stops reading after one hundred valid records while skipping corrupt entries', () => {
  const records: unknown[] = [null, ...Array.from({ length: 100 }, (_, index) => ({ ...entry, id: String(index) }))];
  Object.defineProperty(records, records.length, { get: () => { throw new Error('Read beyond history limit'); } });
  const stored = readCalculatorHistory(records);
  expect(stored).toHaveLength(100);
  expect(stored[0].id).toBe('0');
  expect(stored[99].id).toBe('99');
});
