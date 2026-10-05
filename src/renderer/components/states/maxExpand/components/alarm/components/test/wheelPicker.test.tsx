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
 * @file wheelPicker.test.tsx
 * @description WheelPicker 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, trigger, text } from '../../../../test/componentHarness';
import { WheelPicker as Component } from '../WheelPicker';
const handleMouseDown = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useWheelPicker', () => ({ useWheelPicker: () => ({ handleMouseDown }) }));
describe('WheelPicker', () => {
  it('renders inclusive limits, padded labels and selected item and forwards dragging', () => {
    const tree = render(Component, { min: 0, max: 2, value: 1, onChange: vi.fn() });
    expect(text(tree)).toBe('000102');
    expect(nodes(tree, '.alarm-wheel-item--active')).toHaveLength(1);
    expect(text(nodes(tree, '.alarm-wheel-item--active')[0])).toBe('01');
    const event = { clientY: 10 };
    trigger(tree, '.alarm-wheel-scroll', 'onMouseDown', event);
    expect(handleMouseDown).toHaveBeenCalledWith(event);
    const singleton = render(Component, { min: 5, max: 5, value: 5, onChange: vi.fn() });
    expect(text(singleton)).toBe('05');
  });
});
