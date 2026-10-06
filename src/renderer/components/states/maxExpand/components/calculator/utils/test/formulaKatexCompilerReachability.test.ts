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
 * @file formulaKatexCompilerReachability.test.ts
 * @description 公式真实编译器的全部结构、空文档与未完成输入边界测试
 * @author 鸡哥
 */

import { expect, it } from 'vitest';
import { compileFormulaToKatex, getKatexSlotOrder } from '../formulaKatexCompiler';
import type { FormulaDocument, FormulaStructure, FormulaStructureKind } from '../../types/calculatorTypes';

it.each(['', 'cbrt(x+1)', 'cbrt(', 'cbrt()', 'x^', 'x^(', 'x^()', 'x^(sin(x))', 'unknown(x)', '\\{}#$%&_×÷π'])('compiles public unfinished and escaped text: %s', (value) => {
  const result = compileFormulaToKatex({ segments: [{ value, type: 'text' }] });
  expect(result.tex.length).toBeGreaterThan(0); expect(result.anchors.length).toBeGreaterThan(0);
  expect(result.anchors.every((anchor) => anchor.start.offset >= 0 && anchor.end.offset >= anchor.start.offset)).toBe(true);
});

it.each<FormulaStructureKind>(['logn', 'fraction', 'sum', 'integral', 'derivative', 'sqrt', 'root'])('compiles every real public structure and empty slot: %s', (kind) => {
  const structure: FormulaStructure = { kind, id: 'node', slots: {} };
  const empty = compileFormulaToKatex({ segments: [{ type: 'structure', value: structure }] });
  expect(empty.anchors.every((anchor) => anchor.kind === 'slot')).toBe(true);
  const slots = getKatexSlotOrder(structure); expect(slots.length).toBeGreaterThan(0);
  slots.forEach((slot) => { structure.slots[slot] = { segments: [{ type: 'text', value: '1' }, { type: 'text', value: '2' }] }; });
  const full = compileFormulaToKatex({ segments: [{ type: 'structure', value: structure }] });
  expect(full.anchors.every((anchor) => anchor.kind === 'token')).toBe(true); expect(full.anchors.length).toBe(slots.length * 2);
});

it('accepts an empty public document and a nested structure-only slot', () => {
  const empty: FormulaDocument = { segments: [] }; expect(compileFormulaToKatex(empty)).toEqual({ tex: '', anchors: [] });
  const root: FormulaStructure = { kind: 'sqrt', id: 'nested', slots: { radicand: { segments: [{ type: 'text', value: '' }] } } };
  expect(compileFormulaToKatex({ segments: [{ type: 'structure', value: { kind: 'sqrt', id: 'outer', slots: { radicand: { segments: [{ type: 'structure', value: root }] } } } }] }).anchors[0].start.path).toHaveLength(2);
});
