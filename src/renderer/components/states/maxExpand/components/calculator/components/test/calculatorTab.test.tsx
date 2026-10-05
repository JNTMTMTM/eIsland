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
 * @file calculatorTab.test.tsx
 * @description CalculatorTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { CalculatorTab as Component } from '../CalculatorTab';
import { CalcDisplay } from '../CalcDisplay';
import { CalculatorSidebar } from '../CalculatorSidebar';
import { CoordinateGraph } from '../CoordinateGraph';
const state = vi.hoisted(() => ({ formula: 'x', result: null, inputDigit: vi.fn(), inputOperator: vi.fn(), inputText: vi.fn(), calculate: vi.fn(), moveCursorHorizontal: vi.fn(), moveCursorBoundary: vi.fn() }));
vi.mock('../../hooks/useCalculator', () => ({ useCalculator: () => state }));
vi.mock('function-plot', () => ({ default: vi.fn() }));
describe('CalculatorTab', () => {
  it('switches arithmetic, scientific and coordinate layouts and keys', () => {
    const tree = render(Component);
    expect(value(tree, CalcDisplay, 'fontSize')).toBe('34px');
    trigger(tree, CalculatorSidebar, 'onSwitchMode', 'scientific');
    expect(nodes(render(Component), '.calc-buttons-dual')).toHaveLength(1);
    trigger(tree, CalculatorSidebar, 'onSwitchMode', 'coordinate');
    const coordinate = render(Component);
    expect(value(coordinate, CalcDisplay, 'showValue')).toBe(false);
    expect(value(coordinate, CoordinateGraph, 'expression')).toBe('x');
    trigger(coordinate, '.calc-btn--toggle', 'onClick');
    expect(text(render(Component))).toContain('f(x)');
    trigger(tree, CalculatorSidebar, 'onToggleCollapse');
    expect(value(render(Component), CalculatorSidebar, 'collapsed')).toBe(false);
  });
  it('routes keyboard calculation, operators, cursor navigation and ignores unrelated keys', () => {
    const tree = render(Component);
    const preventDefault = vi.fn();
    ['2', '*', '/', 'Enter', 'ArrowLeft', 'End', '('].forEach((key) => trigger(tree, CalcDisplay, 'onKeyDown', { key, preventDefault }));
    expect(state.inputDigit).toHaveBeenCalledWith('2');
    expect(state.inputOperator.mock.calls).toEqual([['×'], ['÷']]);
    expect(state.calculate).toHaveBeenCalledOnce();
    expect(state.moveCursorHorizontal).toHaveBeenCalledWith(-1);
    expect(state.moveCursorBoundary).toHaveBeenCalledWith('end');
    expect(state.inputText).toHaveBeenCalledWith('(');
    trigger(tree, CalcDisplay, 'onKeyDown', {
      preventDefault,
      key: 'Escape'
    });
    expect(preventDefault).toHaveBeenCalledTimes(7);
  });
});
