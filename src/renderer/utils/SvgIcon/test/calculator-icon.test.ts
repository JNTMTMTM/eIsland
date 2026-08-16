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
    expect(CalculatorIcon).toHaveProperty('ARITHMETIC');
    expect(CalculatorIcon).toHaveProperty('BACKSPACE');
    expect(CalculatorIcon).toHaveProperty('CLEAR');
    expect(CalculatorIcon).toHaveProperty('COLLAPSE');
    expect(CalculatorIcon).toHaveProperty('COORDINATE');
    expect(CalculatorIcon).toHaveProperty('DIVISION');
    expect(CalculatorIcon).toHaveProperty('EXPAND');
    expect(CalculatorIcon).toHaveProperty('FRACTION');
    expect(CalculatorIcon).toHaveProperty('INTEGRATION');
    expect(CalculatorIcon).toHaveProperty('MINUS');
    expect(CalculatorIcon).toHaveProperty('MULTIPLICATION');
    expect(CalculatorIcon).toHaveProperty('N_ROOT');
    expect(CalculatorIcon).toHaveProperty('PERCENTAGE');
    expect(CalculatorIcon).toHaveProperty('PI');
    expect(CalculatorIcon).toHaveProperty('PLUS');
    expect(CalculatorIcon).toHaveProperty('PLUS_MINUS');
    expect(CalculatorIcon).toHaveProperty('ROOT');
    expect(CalculatorIcon).toHaveProperty('SCIENTIFIC');
    expect(CalculatorIcon).toHaveProperty('SIGMA');
  });

  it('all values should be strings ending with .svg', () => {
    Object.entries(CalculatorIcon).forEach(([, value]) => {
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^\.\/svg\/.+\.svg$/);
    });
  });

  it('should contain exactly 20 keys', () => {
    expect(Object.keys(CalculatorIcon)).toHaveLength(20);
  });
});
