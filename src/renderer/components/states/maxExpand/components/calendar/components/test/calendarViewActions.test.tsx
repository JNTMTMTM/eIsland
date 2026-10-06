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
 * @file calendarViewActions.test.tsx
 * @description CalendarViewActions 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, value, trigger } from '../../../../test/componentHarness';
import { CalendarViewActions as Component } from '../CalendarViewActions';
const date = new Date(2026, 9, 6);
describe('CalendarViewActions', () => {
  afterEach(() => vi.useRealTimers());
  it('selects today, switches current view and toggles linked details', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 6));
    const props = { overview: false, visibleDate: date, detailsExpanded: false, detailsId: 'details', onSelectDate: vi.fn(), onToggleOverview: vi.fn(), onToggleDetails: vi.fn() };
    const tree = render(Component, props);
    trigger(tree, '.calendar-today-button', 'onClick');
    trigger(tree, '.calendar-view-toggle', 'onClick');
    (value(tree, '.calendar-details-toggle', 'onClick', 1) as () => void)();
    expect(props.onSelectDate).toHaveBeenCalledWith(new Date(2026, 9, 6));
    expect(props.onToggleOverview).toHaveBeenCalledWith(date);
    expect(props.onToggleDetails).toHaveBeenCalledOnce();
    expect(value(tree, '.calendar-details-toggle', 'aria-controls', 1)).toBe('details');
    const expanded = render(Component, { ...props, overview: true, detailsExpanded: true });
    expect(value(expanded, '.calendar-view-toggle', 'aria-pressed')).toBe(true);
    expect(value(expanded, '.calendar-details-toggle', 'aria-expanded', 1)).toBe(true);
  });
});
