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
 * @file klineChartOptions.test.ts
 * @description 真实股票图表配置在亮暗主题、保存范围、成交量空值与加载状态下的测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildKlineOptions } from '../klineChartOptions';
afterEach(() => vi.unstubAllGlobals());
describe('真实股票图表配置', () => {
  it.each([false, true])('亮色主题=%s 配置颜色、保存范围与实际数据序列', (light) => {
    vi.stubGlobal('document', { documentElement: { dataset: { theme: light ? 'light' : 'dark' } }, body: { dataset: { theme: 'dark' } } });
    const onAfterSetExtremes = vi.fn();
    const options = buildKlineOptions({ onAfterSetExtremes, quote: null, klines: [
      { date: '2026-10-05', timestamp: 1, open: 2, high: 4, low: 1, close: 3, volume: null },
      { date: '2026-10-06', timestamp: 2, open: 3, high: 5, low: 2, close: 4, volume: 20 },
    ], loading: light, t: (key) => key, range: light ? { min: 0, max: 10 } : null });
    expect(options.chart?.backgroundColor).toBe(light ? 'rgba(255, 255, 255, 0)' : 'rgba(15, 23, 42, 0)');
    expect(options.tooltip?.backgroundColor).toBe(light ? 'rgba(255, 255, 255, 0.96)' : 'rgba(15, 23, 42, 0.96)');
    expect(options.navigator?.handles?.backgroundColor).toBe(light ? '#fff' : '#1e293b');
    expect(options.rangeSelector?.buttonTheme?.fill).toBe(light ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.75)');
    expect(options.xAxis).toMatchObject({ events: { afterSetExtremes: onAfterSetExtremes } });
    if (light) expect(options.xAxis).toMatchObject({ min: 0, max: 10 });
    else expect(options.xAxis).not.toHaveProperty('min');
    expect(options.series).toMatchObject([
      { type: 'candlestick', data: [[1, 2, 4, 1, 3], [2, 3, 5, 2, 4]] },
      { type: 'column', data: [[1, 0], [2, 20]], yAxis: 1 },
    ]);
    expect(options.lang?.noData).toBe(light ? 'stockTab.loading.chart' : 'stockTab.empty.chart');
  });
});
