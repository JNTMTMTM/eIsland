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
const entry = { id: 'one', formula: '2+3', result: '5', angleUnit: 'degree' as const, document: { segments: [{ type: 'text' as const, value: '2+3' }] } };
it('validates persisted formulas and filters corrupt entries', () => {
  expect(readCalculatorHistory([entry, { ...entry, formula: 'wrong' }, { ...entry, result: 'Error' }, { ...entry, document: null }])).toEqual([entry]);
  expect(readCalculatorHistory(null)).toEqual([]);
});
it('deduplicates calculations and bounds the persisted history', () => {
  expect(mergeCalculatorHistory([{ ...entry, id: 'latest' }], [entry])).toHaveLength(1);
  expect(mergeCalculatorHistory(Array.from({ length: 120 }, (_, index) => ({ ...entry, formula: String(index) })), [])).toHaveLength(100);
});
