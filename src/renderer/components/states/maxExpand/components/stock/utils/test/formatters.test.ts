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
 * @file formatters.test.ts
 * @description 股票展示函数的空值、涨跌方向、成交量单位阈值与更新时间测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { formatStockChange, formatStockPercent, formatStockPrice, formatStockTime, formatStockVolume, getStockTrendClass } from '../formatters';
describe('股票真实格式化', () => {
  it.each([null, undefined, NaN])('无效数值 %s 使用统一空占位与中性方向', (value) => {
    [formatStockPrice, formatStockPercent, formatStockChange, formatStockVolume, formatStockTime].forEach((format) => expect(format(value)).toBe('--'));
    expect(getStockTrendClass(value)).toBe('neutral');
  });
  it('正负零价格和百分比保留小数及符号，并按值判断方向', () => {
    expect(formatStockPrice(10.234)).toContain('10.234');
    expect(formatStockPercent(0.012)).toBe('+1.20%');
    expect(formatStockPercent(-0.012)).toBe('-1.20%');
    expect(formatStockPercent(0)).toBe('0.00%');
    expect(formatStockChange(2)).toBe('+2.00');
    expect(formatStockChange(-2)).toBe('-2.00');
    expect(formatStockChange(0)).toBe('0.00');
    expect([getStockTrendClass(1), getStockTrendClass(-1), getStockTrendClass(0)]).toEqual(['up', 'down', 'neutral']);
  });
  it('成交量在万和亿阈值切换单位，负数按绝对规模判定', () => {
    expect(formatStockVolume(0)).toBe('0');
    expect(formatStockVolume(10_000)).toBe('1.00万');
    expect(formatStockVolume(-10_000)).toBe('-1.00万');
    expect(formatStockVolume(100_000_000)).toBe('1.00亿');
    expect(formatStockVolume(-100_000_000)).toBe('-1.00亿');
    expect(formatStockVolume(9999)).not.toMatch(/[万亿]/);
  });
  it('合法时间戳显示时分秒而不是空占位', () => {
    expect(formatStockTime(new Date('2026-10-06T12:34:56').getTime())).toContain(':34:56');
    expect(formatStockTime(0)).not.toBe('--');
  });
});
