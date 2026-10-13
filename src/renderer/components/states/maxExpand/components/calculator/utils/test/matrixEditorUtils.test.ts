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
 * @file matrixEditorUtils.test.ts
 * @description 检查矩阵编辑尺寸、表达式粘贴和新旧历史格式兼容。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { evaluateMatrixDraft, readMatrixDraft, resizeMatrixDraft, serializeMatrixDraft } from '../matrixEditorUtils';

describe('matrix draft editing', () => {
  it('preserves formulas during resizing without mutating the original matrix', () => {
    const original = [['1/2', '2'], ['3', '4']];
    const resized = resizeMatrixDraft(original, 3, 1);
    expect(resized).toEqual([['1/2'], ['3'], ['0']]);
    resized[0][0] = '7';
    expect(original).toEqual([['1/2', '2'], ['3', '4']]);
    expect(resizeMatrixDraft(original, 1, 3)).toEqual([['1/2', '2', '0']]);
  });

  it.each(['1/2 2\n3 4', '1/2,2;3,4', '[["1/2","2"],["3","4"]]'])('imports expression matrices from %s', (text) => {
    expect(readMatrixDraft(text)).toEqual([['1/2', '2'], ['3', '4']]);
  });

  it('keeps complex cell formulas intact in serialized history', () => {
    const cells = [['logn(2,8)', '1 + 2'], ['sqrt(4)', '1/2']];
    expect(readMatrixDraft(serializeMatrixDraft(cells))).toEqual(cells);
    expect(evaluateMatrixDraft(cells)).toEqual([[3, 3], [2, .5]]);
  });

  it('imports old JSON numeric matrices and six-by-six matrices', () => {
    expect(readMatrixDraft('[[1,2],[3,4]]')).toEqual([['1', '2'], ['3', '4']]);
    const six = resizeMatrixDraft([['1']], 6, 6);
    expect(evaluateMatrixDraft(six)).toHaveLength(6);
    expect(evaluateMatrixDraft(six)[0]).toHaveLength(6);
  });

  it.each(['', '1 2\n3', '[[true]]', '[null]', '[[]]', '1/0', '[[{}]]'])('rejects malformed or non-finite imported data: %s', (text) => {
    expect(() => readMatrixDraft(text)).toThrow();
  });

  it('does not silently replace incomplete cells with zero', () => {
    expect(() => evaluateMatrixDraft([['']])).toThrow();
    expect(() => evaluateMatrixDraft([['sqrt(']])).toThrow();
    expect(() => resizeMatrixDraft([['1']], 7, 2)).toThrow();
    expect(() => resizeMatrixDraft([['1']], 0, 2)).toThrow();
  });
});
