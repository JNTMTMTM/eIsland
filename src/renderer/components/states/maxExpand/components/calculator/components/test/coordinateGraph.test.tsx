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
import { CoordinateGraph as Component } from '../CoordinateGraph';
const plot = vi.hoisted(() => vi.fn());
vi.mock('function-plot', () => ({ default: plot }));
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
    ref.current = { innerHTML: '', clientWidth: 300, clientHeight: 200 } as HTMLDivElement;
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
    ref.current = { innerHTML: 'old', clientWidth: 300, clientHeight: 200 };
    const cleanups = flushEffects();
    expect(plot).toHaveBeenCalledWith(expect.objectContaining({ width: 300, height: 200, data: [expect.objectContaining({ fn: '2*x' })] }));
    expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    cleanups.forEach((cleanup) => cleanup());
    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    plot.mockImplementationOnce(() => { throw new Error('invalid'); });
    expect(render(Component, { expression: 'bad' })).toBeDefined(); flushEffects();
    expect(text(render(Component, { expression: 'bad' }))).toContain('calculator.coordinate.error');
  });
});
