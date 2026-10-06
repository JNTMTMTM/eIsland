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
 * @file stockKlineChart.test.tsx
 * @description StockKlineChart 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import HighchartsReact from 'highcharts-react-official';
import { render, value } from '../../../../test/componentHarness';
import { StockKlineChart as Component } from '../StockKlineChart';
vi.mock('highcharts/highstock', () => ({ default: {} }));
vi.mock('highcharts/modules/exporting', () => ({}));
vi.mock('highcharts/modules/export-data', () => ({}));
vi.mock('highcharts/modules/accessibility', () => ({}));
vi.mock('highcharts/modules/no-data-to-display', () => ({}));
vi.mock('../../hooks/useKlineRange', () => ({ useKlineRange: () => ({ rangeRef: { current: null }, handleAfterSetExtremes: vi.fn() }) }));
describe('StockKlineChart', () => {
  it('uses the stock constructor and builds real empty or populated chart options', () => {
    const tree = render(Component, { quote: null, klines: [], loading: false });
    expect(value(tree, HighchartsReact, 'constructorType')).toBe('stockChart');
    const options = value(tree, HighchartsReact, 'options') as { series: { data: unknown[] }[] };
    expect(options.series[0].data).toEqual([]);
    const populated = render(Component, { quote: { code: 'AAPL', name: 'Apple' }, klines: [{ date: '2026-10-06', open: 1, high: 3, low: 1, close: 2, volume: 100 }], loading: true });
    const nextOptions = value(populated, HighchartsReact, 'options') as { series: { data: unknown[] }[] };
    expect(nextOptions.series[0].data).toHaveLength(1);
  });
});
