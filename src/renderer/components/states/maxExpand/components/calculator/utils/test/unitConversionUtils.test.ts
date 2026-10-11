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
 * @file unitConversionUtils.test.ts
 * @description 单位换算和温度边界测试。
 * @author 鸡哥
 */


import { expect, it } from 'vitest';
import { CONVERSION_UNITS, convertUnit } from '../unitConversionUtils';
it.each([[1,'m','cm',100],[1,'ft','m',.3048],[1,'ha','m2',10000],[1,'gal','l',3.785411784],[1,'lb','g',453.59237],[0,'c','f',32],[32,'f','c',0],[0,'c','k',273.15],[1,'h','s',3600],[36,'kmh','ms',10]] as const)('converts %s %s to %s', (value, from, to, expected) => expect(convertUnit(value, from, to)).toBeCloseTo(expected, 8));
it('round-trips every supported unit and validates dimensions and absolute zero', () => {
  CONVERSION_UNITS.forEach((unit) => expect(convertUnit(convertUnit(123, unit.id, unit.id), unit.id, unit.id)).toBeCloseTo(123));
  expect(() => convertUnit(1, 'm', 'kg')).toThrow(); expect(() => convertUnit(-274, 'c', 'k')).toThrow(); expect(() => convertUnit(Infinity, 'm', 'cm')).toThrow();
});
