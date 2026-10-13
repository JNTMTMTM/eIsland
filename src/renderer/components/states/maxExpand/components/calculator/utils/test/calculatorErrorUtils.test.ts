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
 * @file calculatorErrorUtils.test.ts
 * @description 具体数学错误提示测试。
 * @author 鸡哥
 */

import { expect, it } from 'vitest';
import { evaluateFormula } from '../calculatorUtils';
import { getCalculatorErrorCode } from '../calculatorErrorUtils';
it.each([
 ['1/0', 'divisionByZero'], ['frac(1,0)', 'divisionByZero'], ['sqrt(-1)', 'domain'], ['tan(90)', 'domain'],
 ['log(0)', 'domain'], ['arcsin(2)', 'domain'], ['2+', 'incomplete'], ['1@', 'syntax'], ['x+1', 'unboundVariable'], ['foo(1)', 'unknownFunction'], ['1e999', 'overflow'],
])('explains %s precisely', (formula, code) => {
  try { evaluateFormula(formula, 'degree'); throw new Error('Expected failure'); }
  catch (error) { expect(getCalculatorErrorCode(error)).toBe(code); }
});
