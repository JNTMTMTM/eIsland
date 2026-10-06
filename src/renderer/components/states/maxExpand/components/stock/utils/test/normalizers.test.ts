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
 * @file normalizers.test.ts
 * @description 股票真实数据正规化的数值字符串、缺失字段、无效日期和排序边界测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeStockKlines, normalizeStockQuote, normalizeStockSearchResults, normalizeStockSymbol } from '../normalizers';
afterEach(() => vi.useRealTimers());
describe('股票数据真实正规化', () => {
  it('规范代码大小写、行情字符串数值和缺失价格字段', () => {
    expect(normalizeStockSymbol(' sh600519 ')).toBe('SH600519');
    expect(normalizeStockQuote({ code: ' SH1 ', name: ' stock ', now: '1,020', yesterday: '1,000', high: '1,050', low: '900', percent: '0.02', volume: '12,000', amount: '20,000', source: ' source ' }, 'fallback')).toMatchObject({ code: 'SH1', name: 'stock', price: 1020, previousClose: 1000, change: 20, changePercent: 0.02, high: 1050, low: 900, volume: 12000, amount: 20000, source: 'source' });
    expect(normalizeStockQuote({ name: ' ', code: null, now: 'bad', yesterday: Infinity, high: '', low: ' ', volume: false, amount: undefined }, 'SH600519')).toMatchObject({ code: 'SH600519', name: 'SH600519', price: 0, previousClose: 0, change: 0, changePercent: 0, high: 0, low: 0, volume: null, amount: null, source: 'auto' });
    expect(normalizeStockQuote({ now: 110, yesterday: 100 }, 'SH1')).toMatchObject({ change: 10, changePercent: 0.1 });
  });
  it.each(['date', 'open', 'high', 'low', 'close'] as const)('缺失 %s 的 K 线行会被过滤', (key) => {
    const row = { date: '2026-10-06', open: 1, high: 3, low: 1, close: 2 };
    expect(normalizeStockKlines([{ ...row, [key]: undefined }])).toEqual([]);
  });
  it('无效日期使用当前时间，合法日期升序排列并保留成交量', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T00:00:00Z'));
    const result = normalizeStockKlines([
      { date: 'bad-date', open: 3, high: 5, low: 2, close: 4 },
      { date: '2026-10-05', open: '2', high: '4', low: '1', close: '3', volume: '2,000' },
      { date: '2026-10-04', open: 1, high: 3, low: 0, close: 2, volume: 1000 },
    ]);
    expect(result.map((row) => row.date)).toEqual(['2026-10-04', '2026-10-05', 'bad-date']);
    expect(result[2]).toMatchObject({ timestamp: Date.now(), volume: null });
    expect(result[1].volume).toBe(2000);
  });
  it('搜索过滤空代码并为缺失名称、来源及数值提供明确回退', () => {
    expect(normalizeStockSearchResults([{ code: '' }, { code: ' SH1 ', now: '4', percent: 'invalid' }, { code: 'SZ2', name: ' name ', source: 'source', now: NaN }])).toEqual([
      { code: 'SH1', name: 'SH1', price: 4, changePercent: null, source: 'auto' },
      { code: 'SZ2', name: 'name', price: null, changePercent: null, source: 'source' },
    ]);
  });
});
