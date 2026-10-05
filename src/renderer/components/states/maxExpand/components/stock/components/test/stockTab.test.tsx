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
 * @file stockTab.test.tsx
 * @description StockTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value, trigger, text } from '../../../../test/componentHarness';
import { StockTab as Component } from '../StockTab';
import { StockKlineChart } from '../StockKlineChart';
import { StockSidebar } from '../StockSidebar';
const state = vi.hoisted(() => ({ quote: null as { code: string; name: string; price: number; change: number; changePercent: number } | null, error: '', loading: true, refresh: vi.fn() }));
vi.mock('../../hooks/useStockMarketData', () => ({ useStockMarketData: () => state }));
vi.mock('../StockKlineChart', () => ({ StockKlineChart: () => null }));
describe('StockTab', () => {
  it('uses quote fallback titles, exposes errors and forwards data and refresh', () => {
    const tree = render(Component);
    expect(text(tree)).toContain('stockTab.chart.title');
    expect(value(tree, StockKlineChart, 'loading')).toBe(true);
    trigger(tree, StockSidebar, 'onRefresh');
    expect(state.refresh).toHaveBeenCalledOnce();
    state.quote = { code: 'AAPL', name: 'Apple', price: 10, change: 1, changePercent: 2 };
    state.error = 'stockTab.errors.network';
    const quoted = render(Component);
    expect(text(quoted)).toContain('AppleAAPL');
    expect(text(quoted)).toContain('stockTab.errors.network');
    state.error = 'raw failure';
    expect(text(render(Component))).toContain('raw failure');
  });
});
