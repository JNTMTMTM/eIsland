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
 */

/**
 * @file formulaDocumentUtils.test.ts
 * @description 结构化公式文档编辑与序列化测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import {
  createInitialFormula,
  deleteFormulaContent,
  insertFormulaStructure,
  insertFormulaText,
  moveFormulaCursor,
  serializeFormulaDocument,
} from '../formulaDocumentUtils';

describe('formulaDocumentUtils', () => {
  it('将结构槽位序列化为规范 DSL', () => {
    const initial = createInitialFormula();
    const fraction = insertFormulaStructure(initial.document, initial.cursor, 'fraction');
    const numerator = insertFormulaText(fraction.document, fraction.cursor, '1');
    const denominatorCursor = moveFormulaCursor(numerator.document, numerator.cursor, 1);
    const denominator = insertFormulaText(numerator.document, denominatorCursor, '2');

    expect(serializeFormulaDocument(denominator.document)).toBe('frac(1,2)');
  });

  it('支持在结构槽位中嵌套结构', () => {
    const initial = createInitialFormula();
    const integral = insertFormulaStructure(initial.document, initial.cursor, 'integral');
    const nested = insertFormulaStructure(integral.document, integral.cursor, 'fraction');

    expect(serializeFormulaDocument(nested.document)).toBe('integral(,frac(,),)');
  });

  it('在文本边界原子删除相邻结构', () => {
    const initial = createInitialFormula();
    const fraction = insertFormulaStructure(initial.document, initial.cursor, 'fraction');
    const deletedFromSlot = deleteFormulaContent(fraction.document, fraction.cursor, -1);
    const deletedFromOutside = deleteFormulaContent(
      fraction.document,
      { path: [], segmentIndex: 2, offset: 0 },
      -1,
    );

    expect(serializeFormulaDocument(deletedFromSlot.document)).toBe('');
    expect(serializeFormulaDocument(deletedFromOutside.document)).toBe('');
    expect(deletedFromOutside.cursor).toEqual({ path: [], segmentIndex: 0, offset: 0 });
  });
});