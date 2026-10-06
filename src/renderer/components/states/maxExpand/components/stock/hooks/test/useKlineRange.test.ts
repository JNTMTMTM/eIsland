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
 * @file useKlineRange.test.ts
 * @description K线真实范围持久化、损坏缓存、股票切换、用户事件与存储失败测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKlineRange } from '../useKlineRange';
import { renderWithHooks, resetLifecycle, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
import type Highcharts from 'highcharts/highstock';

vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
const getItem = vi.fn<Storage['getItem']>();
const setItem = vi.fn<Storage['setItem']>();
const saved = new Map<string, string>();

/**
 * 渲染真实范围 Hook，使用公开股票输入切换数据。
 * @param code - 当前股票。
 * @returns 范围 ref 和图表事件入口。
 */
function view(code?: string) {
  return renderWithHooks(() => useKlineRange(code));
}

/**
 * 构造第三方 Highcharts 事件边界。
 * @param trigger - 图表事件触发类型。
 * @returns 外部事件参数。
 */
function event(trigger?: string): Highcharts.AxisSetExtremesEventObject {
  return { trigger, min: 100, max: 200 } as unknown as Highcharts.AxisSetExtremesEventObject;
}

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  saved.clear();
  getItem.mockImplementation((key) => saved.get(key) ?? null);
  setItem.mockImplementation((key, value) => { saved.set(key, value); });
  vi.stubGlobal('localStorage', { getItem, setItem });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});

describe('useKlineRange actual local persistence', () => {
  it.each([undefined, ''])('initializes without reading storage for missing stock %s', (code) => {
    expect(view(code).rangeRef.current).toBeNull();
    expect(getItem).not.toHaveBeenCalled();
    view(code).handleAfterSetExtremes(event('zoom'));
    expect(view(code).rangeRef.current).toEqual({ min: 100, max: 200 });
    expect(setItem).not.toHaveBeenCalled();
  });

  it.each([null, '', '{', 'null', '{}', '{"min":"1","max":2}', '{"min":1,"max":"2"}'])('contains absent or invalid range cache %s', (raw) => {
    getItem.mockReturnValue(raw);
    expect(view('AAPL').rangeRef.current).toBeNull();
  });

  it('contains denied storage reads', () => {
    getItem.mockImplementation(() => { throw new Error('denied'); });
    expect(view('AAPL').rangeRef.current).toBeNull();
  });

  it('loads per-stock numeric ranges, keeps the current ref on rerender and resets on stock change', () => {
    saved.set('stock-kline-range:AAPL', '{"min":10,"max":30}');
    saved.set('stock-kline-range:MSFT', '{"min":50,"max":90}');
    const first = view('AAPL');
    expect(first.rangeRef.current).toEqual({ min: 10, max: 30 });
    first.handleAfterSetExtremes(event('navigator'));
    expect(view('AAPL').rangeRef).toBe(first.rangeRef);
    expect(view('AAPL').rangeRef.current).toEqual({ min: 100, max: 200 });
    expect(view('MSFT').rangeRef.current).toEqual({ min: 50, max: 90 });
    view('MSFT').handleAfterSetExtremes(event('scrollbar'));
    expect(setItem).toHaveBeenLastCalledWith('stock-kline-range:MSFT', '{"min":100,"max":200}');
    expect(view('NVDA').rangeRef.current).toBeNull();
  });

  it.each(['rangeSelectorButton', 'zoom', 'navigator', 'scrollbar'])('persists manual range changes from %s', (trigger) => {
    view('AAPL').handleAfterSetExtremes(event(trigger));
    expect(view('AAPL').rangeRef.current).toEqual({ min: 100, max: 200 });
    expect(setItem).toHaveBeenCalledWith('stock-kline-range:AAPL', '{"min":100,"max":200}');
  });

  it.each([undefined, 'updatedData', 'syncExtremes'])('ignores nonmanual triggers %s', (trigger) => {
    saved.set('stock-kline-range:AAPL', '{"min":1,"max":2}');
    view('AAPL').handleAfterSetExtremes(event(trigger));
    expect(view('AAPL').rangeRef.current).toEqual({ min: 1, max: 2 });
    expect(setItem).not.toHaveBeenCalled();
  });

  it('updates its ref when native storage writes fail', () => {
    setItem.mockImplementation(() => { throw new Error('quota'); });
    view('AAPL').handleAfterSetExtremes(event('zoom'));
    expect(view('AAPL').rangeRef.current).toEqual({ min: 100, max: 200 });
  });
});
