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
 * @file unitConversionUtils.ts
 * @description 长度、面积、体积、质量、温度、时间和速度换算。
 * @author 鸡哥
 */

export type UnitCategory = 'length' | 'area' | 'volume' | 'mass' | 'temperature' | 'time' | 'speed';
export interface UnitDefinition { id: string; symbol: string; category: UnitCategory; factor: number; offset?: number }
export const CONVERSION_UNITS: UnitDefinition[] = [
  ...[['m', 'm', 1], ['cm', 'cm', .01], ['mm', 'mm', .001], ['km', 'km', 1000], ['in', 'in', .0254], ['ft', 'ft', .3048], ['mi', 'mi', 1609.344]].map(([id, symbol, factor]) => ({ id, symbol, factor, category: 'length' })),
  ...[['m2', 'm²', 1], ['cm2', 'cm²', .0001], ['km2', 'km²', 1e6], ['ha', 'ha', 10000], ['ft2', 'ft²', .09290304], ['acre', 'acre', 4046.8564224]].map(([id, symbol, factor]) => ({ id, symbol, factor, category: 'area' })),
  ...[['l', 'L', .001], ['ml', 'mL', .000001], ['m3', 'm³', 1], ['gal', 'gal (US)', .003785411784]].map(([id, symbol, factor]) => ({ id, symbol, factor, category: 'volume' })),
  ...[['kg', 'kg', 1], ['g', 'g', .001], ['mg', 'mg', .000001], ['t', 't', 1000], ['lb', 'lb', .45359237], ['oz', 'oz', .028349523125]].map(([id, symbol, factor]) => ({ id, symbol, factor, category: 'mass' })),
  { id: 'c', symbol: '°C', category: 'temperature', factor: 1, offset: 273.15 },
  { id: 'f', symbol: '°F', category: 'temperature', factor: 5 / 9, offset: 273.15 - 32 * 5 / 9 },
  { id: 'k', symbol: 'K', category: 'temperature', factor: 1 },
  ...[['s', 's', 1], ['min', 'min', 60], ['h', 'h', 3600], ['d', 'd', 86400]].map(([id, symbol, factor]) => ({ id, symbol, factor, category: 'time' })),
  ...[['ms', 'm/s', 1], ['kmh', 'km/h', 1 / 3.6], ['mph', 'mph', .44704], ['kn', 'kn', 1852 / 3600]].map(([id, symbol, factor]) => ({ id, symbol, factor, category: 'speed' })),
] as UnitDefinition[];

/** 在同类单位之间换算，温度以开尔文为基准。
 * @param value - 原单位中的有限数值
 * @param fromId - 源单位标识
 * @param toId - 目标单位标识
 * @returns 换算结果
 */
export function convertUnit(value: number, fromId: string, toId: string): number {
  const from = CONVERSION_UNITS.find((unit) => unit.id === fromId);
  const to = CONVERSION_UNITS.find((unit) => unit.id === toId);
  if (!Number.isFinite(value) || !from || !to || from.category !== to.category) throw new Error('Invalid unit conversion');
  const base = value * from.factor + (from.offset ?? 0);
  if (from.category === 'temperature' && base < -1e-10) throw new Error('Below absolute zero');
  const result = (base - (to.offset ?? 0)) / to.factor;
  if (!Number.isFinite(result)) throw new Error('Conversion overflow');
  return result;
}
