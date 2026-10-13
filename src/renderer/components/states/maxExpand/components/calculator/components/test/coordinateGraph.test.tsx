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
 * @file coordinateGraph.test.tsx
 * @description CoordinateGraph 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, value, text, flushEffects } from '../../../../test/componentHarness';
import { Chart, type FunctionPlotOptions } from 'function-plot';
import { CoordinateGraph as Component } from '../CoordinateGraph';
const plot = vi.hoisted(() => vi.fn());
vi.mock('function-plot', () => ({ default: plot, Chart: { cache: {} } }));
vi.mock('../../utils/FullWidthChart', () => ({ FullWidthChart: class {} }));
describe('CoordinateGraph', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('renders a zero expression and ignores resize after its native target detaches', () => {
    const listeners = new Map<string, () => void>();
    vi.stubGlobal('window', {
      addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
      removeEventListener: (name: string) => listeners.delete(name),
    });
    const tree = render(Component, { expression: '' });
    const ref = value(tree, '.coordinate-graph-canvas', 'ref') as { current: HTMLDivElement | null };
    ref.current = { replaceChildren: vi.fn(), querySelector: vi.fn(), clientWidth: 300, clientHeight: 200 } as unknown as HTMLDivElement;
    const before = plot.mock.calls.length;
    const cleanups = flushEffects();
    expect(plot).toHaveBeenLastCalledWith(expect.objectContaining({ data: [expect.objectContaining({ fn: '0' })] }));
    ref.current = null;
    listeners.get('resize')!();
    expect(plot).toHaveBeenCalledTimes(before + 1);
    cleanups.forEach((cleanup) => cleanup());
    expect(listeners.size).toBe(0);
  });

  it('plots normalized expressions, shows errors and cleans up resize subscription', () => {
    const addEventListener = vi.fn(); const removeEventListener = vi.fn();
    vi.stubGlobal('window', { addEventListener, removeEventListener });
    const tree = render(Component, { expression: '2×x' });
    const ref = value(tree, '.coordinate-graph-canvas', 'ref') as { current: unknown };
    ref.current = { replaceChildren: vi.fn(), querySelector: vi.fn(), clientWidth: 300, clientHeight: 200 };
    const cleanups = flushEffects();
    expect(plot).toHaveBeenCalledWith(expect.objectContaining({ width: 300, height: 200, data: [expect.objectContaining({ fn: '2*x' })] }));
    expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    cleanups.forEach((cleanup) => cleanup());
    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    plot.mockImplementationOnce(() => { throw new Error('invalid'); });
    expect(render(Component, { expression: 'bad' })).toBeDefined(); flushEffects();
    expect(text(render(Component, { expression: 'bad' }))).toContain('calculator.coordinate.error');
  });

  it('redraws on canvas resize with the same options and zoom domain, then releases the cached chart', () => {
    let resize: (() => void) | undefined;
    const disconnect = vi.fn();
    const removeAllListeners = vi.fn();
    const chart = { removeAllListeners, on: vi.fn(), removeListener: vi.fn() } as unknown as Chart;
    vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal('ResizeObserver', vi.fn().mockImplementation(function (callback: () => void) {
      resize = callback;
      return { observe: vi.fn(), disconnect };
    }));
    plot.mockImplementation((options: FunctionPlotOptions) => {
      options.id = 'calculator-test';
      Chart.cache['calculator-test'] = chart;
      return chart;
    });
    const tree = render(Component, { expression: 'x^2' });
    const canvas = { replaceChildren: vi.fn(), querySelector: vi.fn(), clientWidth: 300, clientHeight: 200 };
    const ref = value(tree, '.coordinate-graph-canvas', 'ref') as { current: unknown };
    ref.current = canvas;
    const cleanups = flushEffects();
    const options = plot.mock.lastCall![0] as FunctionPlotOptions;
    options.xAxis!.domain = [3, 7];
    canvas.clientWidth = 240;
    resize?.();
    expect(plot.mock.lastCall![0]).toBe(options);
    expect(options.width).toBe(240);
    expect(options.xAxis!.domain).toEqual([3, 7]);
    cleanups.forEach((cleanup) => cleanup());
    expect(disconnect).toHaveBeenCalledOnce();
    expect(removeAllListeners).toHaveBeenCalledOnce();
    expect(Chart.cache['calculator-test']).toBeUndefined();
    plot.mockReset();
  });

  it('waits for a visible canvas rather than plotting a zero size region', () => {
    vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const tree = render(Component, { expression: 'x' });
    const ref = value(tree, '.coordinate-graph-canvas', 'ref') as { current: unknown };
    ref.current = { querySelector: vi.fn(), clientWidth: 0, clientHeight: 0 };
    const before = plot.mock.calls.length;
    flushEffects();
    expect(plot).toHaveBeenCalledTimes(before);
  });
});
