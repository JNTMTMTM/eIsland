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
 * @file worldClockCityPicker.test.tsx
 * @description WorldClockCityPicker 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { WorldClockCityPicker as Component } from '../WorldClockCityPicker';
const query = vi.hoisted(() => ({ query: '', debouncedQuery: '', handleQueryChange: vi.fn(), resetQuery: vi.fn() }));
vi.mock('../../hooks/useDebouncedQuery', () => ({ useDebouncedQuery: () => query }));
vi.mock('../../hooks/usePickerAutoFocus', () => ({ usePickerAutoFocus: () => ({ current: null }) }));
vi.mock('../../hooks/useEscToClose', () => ({ useEscToClose: vi.fn() }));
describe('WorldClockCityPicker', () => {
  const option = { timezone: 'Asia/Shanghai', label: 'Shanghai', countryCode: 'cn' };
  const props = { visible: false, existingTimezones: [], options: [option], onSelect: vi.fn(), onRemove: vi.fn(), onRemoveHover: vi.fn(), onClose: vi.fn() };
  it('does not build the hidden list and shows visible empty results', () => {
    expect(nodes(render(Component, props), '.world-clock-picker-item')).toHaveLength(0);
    expect(nodes(render(Component, { ...props, visible: true, options: [] }), '.world-clock-picker-empty')).toHaveLength(1);
    const tree = render(Component, { ...props, visible: true });
    trigger(tree, '.world-clock-picker-select', 'onClick');
    expect(props.onSelect).toHaveBeenCalledWith({ timezone: 'Asia/Shanghai', label: 'Shanghai', labelKey: undefined, order: 0 });
    trigger(tree, 'input', 'onChange', { target: { value: 'Tokyo' } });
    expect(query.handleQueryChange).toHaveBeenCalledWith('Tokyo');
  });
  it('disables existing canonical aliases and deletes the original stored alias', () => {
    const tree = render(Component, { ...props, visible: true, existingTimezones: ['Asia/Chongqing'] });
    expect(value(tree, '.world-clock-picker-select', 'disabled')).toBe(true);
    trigger(tree, '.world-clock-picker-remove', 'onMouseEnter');
    expect(props.onRemoveHover).toHaveBeenCalledWith('Asia/Chongqing');
    trigger(tree, '.world-clock-picker-remove', 'onClick');
    expect(props.onRemove).toHaveBeenCalledWith('Asia/Chongqing');
    expect(props.onRemoveHover).toHaveBeenLastCalledWith(null);
  });
});
