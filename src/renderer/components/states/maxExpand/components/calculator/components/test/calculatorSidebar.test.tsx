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
 * @file calculatorSidebar.test.tsx
 * @description CalculatorSidebar 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { CalculatorSidebar as Component } from '../CalculatorSidebar';

describe('CalculatorSidebar', () => {
  it('selects modes and toggles collapsed navigation with the right icon', () => {
    const props = { activeMode: 'arithmetic', collapsed: true, onSwitchMode: vi.fn(), onToggleCollapse: vi.fn() };
    const tree = render(Component, props);
    expect(nodes(tree, '.calc-sidebar-nav-btn--active')).toHaveLength(1);
    expect(nodes(tree, '.calc-sidebar-nav--expanded')).toHaveLength(0);
    trigger(tree, '.calc-sidebar-nav-btn', 'onClick');
    trigger(tree, '.calc-sidebar-toggle-btn', 'onClick');
    expect(props.onSwitchMode).toHaveBeenCalledWith('arithmetic');
    expect(props.onToggleCollapse).toHaveBeenCalledOnce();
    const expanded = render(Component, { ...props, collapsed: false, activeMode: 'coordinate' });
    expect(nodes(expanded, '.calc-sidebar-nav--expanded')).toHaveLength(1);
    expect(value(expanded, '.calc-sidebar-toggle-btn', 'title')).toContain('calculator.sidebar.collapse');
  });
});
