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
 * @file clipboardUtils.test.ts
 * @description 复制粘贴公式归一化与输入边界测试。
 * @author 鸡哥
 */

import { expect, it } from 'vitest';
import { normalizePastedFormula } from '../clipboardUtils';
import { evaluateFormula } from '../calculatorUtils';
it('normalizes copied mathematical symbols and preserves evaluator semantics', () => {
  expect(normalizePastedFormula(' y = √(16) − 2² ')).toBe('sqrt(16)-2^2');
  expect(evaluateFormula(normalizePastedFormula('2 * 3 / 2'))).toBe(3);
  expect(evaluateFormula(normalizePastedFormula('sin(pi / 2)'))).toBeCloseTo(1);
  expect(normalizePastedFormula('asin(0.5)')).toBe('arcsin(0.5)');
});
it('bounds clipboard input and treats empty content as empty', () => {
  expect(normalizePastedFormula(' ')).toBe('');
  expect(() => normalizePastedFormula('1'.repeat(5001))).toThrow();
});
