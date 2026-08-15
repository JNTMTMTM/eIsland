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
 * @file calculator-icon.test.ts
 * @description unit test
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { CalculatorIcon } from '../calculator-icon';

describe('CalculatorIcon', () => {
  it('should contain expected keys', () => {
    expect(CalculatorIcon).toHaveProperty('BACKSPACE');
    expect(CalculatorIcon).toHaveProperty('DIVISION');
    expect(CalculatorIcon).toHaveProperty('MINUS');
    expect(CalculatorIcon).toHaveProperty('MULTIPLICATION');
    expect(CalculatorIcon).toHaveProperty('PLUS');
    expect(CalculatorIcon).toHaveProperty('PLUS_MINUS');
  });

  it('all values should be strings starting with ./svg/calculator/ and ending with .svg', () => {
    Object.entries(CalculatorIcon).forEach(([, value]) => {
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^\.\/svg\/calculator\/.+\.svg$/);
    });
  });

  it('should contain exactly 6 keys', () => {
    expect(Object.keys(CalculatorIcon)).toHaveLength(6);
  });
});
