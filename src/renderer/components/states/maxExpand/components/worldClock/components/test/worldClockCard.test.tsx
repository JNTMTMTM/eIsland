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
 * @file worldClockCard.test.tsx
 * @description WorldClockCard 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { WorldClockCard as Component } from '../WorldClockCard';

describe('WorldClockCard', () => {
  const tick = { timezone: 'Asia/Shanghai', label: 'Shanghai', countryCode: 'cn', formattedTime: '08:05:03', formattedDate: '2026-10-06', utcOffset: 'UTC+8', handAngles: { hour: 240, minute: 30, second: 18 } };
  const props = { tick, onRemove: vi.fn(), onToggleOverview: vi.fn(), overviewSelected: false, overviewSelectionFull: true };
  it('renders time and hand angles and prevents adding beyond overview capacity', () => {
    const tree = render(Component, props);
    expect(text(tree)).toContain('08:05:03');
    expect(value(tree, '.world-clock-card-hand--second', 'style')).toEqual({ transform: 'rotate(18deg)' });
    expect(value(tree, '.world-clock-card-add-overview', 'disabled')).toBe(true);
    const selected = render(Component, { ...props, overviewSelected: true, removeHighlighted: true });
    expect(value(selected, '.world-clock-card-add-overview', 'disabled')).toBe(false);
    expect(nodes(selected, '.world-clock-card--remove-highlighted')).toHaveLength(1);
    trigger(selected, '.world-clock-card-remove', 'onClick');
    trigger(selected, '.world-clock-card-add-overview', 'onClick');
    expect(props.onRemove).toHaveBeenCalledWith('Asia/Shanghai');
    expect(props.onToggleOverview).toHaveBeenCalledWith('Asia/Shanghai');
  });
});
