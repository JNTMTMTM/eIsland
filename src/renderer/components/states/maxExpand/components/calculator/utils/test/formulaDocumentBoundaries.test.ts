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
 * @file formulaDocumentBoundaries.test.ts
 * @description 结构化公式的缺失槽位、文本编辑、光标边界与结构删除契约测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { createFormulaStructure, createInitialFormula, deleteFormulaContent, getStructureSlotOrder, insertFormulaStructure, insertFormulaText, moveFormulaCursor, moveFormulaCursorBoundary, serializeFormulaDocument } from '../formulaDocumentUtils';
import type { FormulaCursor, FormulaDocument, FormulaStructureKind } from '../../types/calculatorTypes';
const start: FormulaCursor = { path: [], segmentIndex: 0, offset: 0 };
/** 创建符合公开文档契约的文本节点。
 * @param value - 文本内容
 * @returns 可编辑公式文档
 */
function text(value: string): FormulaDocument { return { segments: [{ value, type: 'text' }] }; }

describe('formula document public boundaries', () => {
  it.each([
    { kind: 'logn', serialized: 'logn(,)' },
    { kind: 'sum', serialized: 'sum(,,)' },
    { kind: 'derivative', serialized: 'derivative(,)' },
  ] satisfies Array<{ kind: FormulaStructureKind; serialized: string }>)('serializes empty $kind slots', ({ kind, serialized }) => {
    const structure = createFormulaStructure(kind);
    expect(getStructureSlotOrder(kind).length).toBeGreaterThan(0);
    expect(serializeFormulaDocument({ segments: [{ type: 'structure', value: structure }] })).toBe(serialized);
    structure.slots = {};
    expect(serializeFormulaDocument({ segments: [{ type: 'structure', value: structure }] })).toBe(serialized);
  });
  it('preserves documents for a path that points at text or a missing slot', () => {
    const document = text('abc');
    const cursor: FormulaCursor = { path: [{ segmentIndex: 0, slot: 'body' }], segmentIndex: 0, offset: 0 };
    expect(insertFormulaText(document, cursor, 'X').document).toBe(document);
    const structure = createFormulaStructure('fraction');
    structure.slots = {};
    const partial: FormulaDocument = { segments: [{ type: 'structure', value: structure }] };
    expect(insertFormulaText(partial, { ...cursor, path: [{ segmentIndex: 0, slot: 'numerator' }] }, 'X').document).toBe(partial);
    expect(moveFormulaCursorBoundary(partial, 'start')).toEqual(start);
  });
  it.each(['text', 'structure', 'delete'] as const)('leaves non-text insertion targets unchanged for %s', (operation) => {
    const document: FormulaDocument = { segments: [{ type: 'structure', value: createFormulaStructure('sqrt') }] };
    const operations = { text: () => insertFormulaText(document, start, 'X'), structure: () => insertFormulaStructure(document, start, 'fraction'), delete: () => deleteFormulaContent(document, start, 1) };
    const result = operations[operation]();
    expect(result.document).toBe(document);
  });
  it('inserts text with explicit preservation and cursor retreat', () => {
    const initial = createInitialFormula();
    const preserved = insertFormulaText(initial.document, initial.cursor, '12', false, 1);
    expect(serializeFormulaDocument(preserved.document)).toBe('012');
    expect(preserved.cursor.offset).toBe(2);
    const atStart = insertFormulaText(initial.document, start, '3');
    expect(serializeFormulaDocument(atStart.document)).toBe('30');
    const multi: FormulaDocument = { segments: [{ type: 'text', value: '0' }, { type: 'text', value: 'end' }] };
    expect(serializeFormulaDocument(insertFormulaText(multi, initial.cursor, '7').document)).toBe('07end');
  });
  it('inserts a structure between existing text and keeps both sides', () => {
    const result = insertFormulaStructure(text('12'), { ...start, offset: 1 }, 'fraction');
    expect(serializeFormulaDocument(result.document)).toBe('1frac(,)2');
    expect(result.cursor.path).toEqual([{ segmentIndex: 1, slot: 'numerator' }]);
    const zero = insertFormulaStructure(text('0'), start, 'sqrt');
    expect(serializeFormulaDocument(zero.document)).toBe('sqrt()0');
  });
  it.each([-1, 1] as const)('moves characters and respects outer boundaries direction=%s', (direction) => {
    const document = text('abc');
    const cursor = { ...start, offset: 1 };
    expect(moveFormulaCursor(document, cursor, direction).offset).toBe(direction === -1 ? 0 : 2);
    const boundary = { ...start, offset: direction === -1 ? 0 : 3 };
    expect(moveFormulaCursor(document, boundary, direction)).toBe(boundary);
    const missing = { ...start, segmentIndex: 3 };
    expect(moveFormulaCursor(document, missing, direction)).toBe(missing);
  });
  it('moves backwards into the previous leaf and resolves start and end', () => {
    const document: FormulaDocument = { segments: [{ type: 'text', value: 'ab' }, { type: 'text', value: 'cd' }] };
    expect(moveFormulaCursor(document, { ...start, segmentIndex: 1 }, -1)).toEqual({ ...start, offset: 2 });
    expect(moveFormulaCursorBoundary(document, 'start')).toEqual(start);
    expect(moveFormulaCursorBoundary(document, 'end')).toEqual({ ...start, segmentIndex: 1, offset: 2 });
    expect(moveFormulaCursorBoundary({ segments: [] }, 'end')).toEqual(start);
  });
  it.each([-1, 1] as const)('deletes an adjacent text character direction=%s', (direction) => {
    const result = deleteFormulaContent(text('abc'), { ...start, offset: 1 }, direction);
    expect(serializeFormulaDocument(result.document)).toBe(direction === -1 ? 'bc' : 'ac');
    expect(result.cursor.offset).toBe(direction === -1 ? 0 : 1);
  });
  it('merges texts after forward deletion of the neighboring structure', () => {
    const structure = createFormulaStructure('sqrt');
    const document: FormulaDocument = { segments: [{ type: 'text', value: 'ab' }, { type: 'structure', value: structure }, { type: 'text', value: 'cd' }] };
    const result = deleteFormulaContent(document, { ...start, offset: 2 }, 1);
    expect(serializeFormulaDocument(result.document)).toBe('abcd');
    expect(result.cursor.offset).toBe(2);
  });
  it.each(['before', 'after', 'left-structure'] as const)('removes a structure without two adjacent text nodes: %s', (scenario) => {
    const first = { type: 'structure' as const, value: createFormulaStructure('sqrt') };
    const second = { type: 'structure' as const, value: createFormulaStructure('fraction') };
    const value = { type: 'text' as const, value: '' };
    const segments = { before: [first, value], after: [value, first, second], 'left-structure': [first, second, value] };
    const document: FormulaDocument = { segments: segments[scenario] };
    const indices = { before: 1, after: 0, 'left-structure': 2 };
    const cursor = { ...start, segmentIndex: indices[scenario] };
    const result = deleteFormulaContent(document, cursor, scenario === 'after' ? 1 : -1);
    expect(result.document.segments).toHaveLength(document.segments.length - 1);
    expect(result.cursor.segmentIndex).toBeLessThan(result.document.segments.length);
  });
  it('preserves an empty outer text when backspace has no neighboring structure', () => {
    const document = text('');
    expect(deleteFormulaContent(document, start, -1)).toEqual({ document, cursor: start });
  });
});

it('replaces initial zero when typing the first value', () => {
  const initial = createInitialFormula();
  const result = insertFormulaText(initial.document, initial.cursor, '42');
  expect(serializeFormulaDocument(result.document)).toBe('42');
  expect(result.cursor.offset).toBe(2);
});
