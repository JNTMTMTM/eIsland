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
 * @file calendarMonthGrid.test.tsx
 * @description CalendarMonthGrid 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes } from '../../../../test/componentHarness';
import { CalendarMonthGrid as Component } from '../CalendarMonthGrid';
import { getCalendarMonthLayouts } from '../../utils/calendarUtils';
const date = new Date(2026, 9, 6, 12);
const formats = { full: new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }), month: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }), weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }), lunar: new Intl.DateTimeFormat('zh-CN-u-ca-chinese'), lunarDay: new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { day: 'numeric' }) };
describe('CalendarMonthGrid', () => {
  const props = {
    formats,
    month: getCalendarMonthLayouts(date, 0, 1)[0],
    selectedDay: 6,
    todayDay: 6,
    holidays: new Map([['2026-10-06', ['Holiday']]]),
    locale: 'en-US',
    shortMonthFormat: new Intl.DateTimeFormat('en-US', {
      month: 'short'
    }),
    selectedButtonRef: {
      current: null
    },
    onSelectDate: vi.fn(),
    onDateKeyDown: vi.fn()
  };
  it('renders only the current month, selected focus and holiday accessibility text', () => {
    const tree = render(Component, props);
    expect(nodes(tree, '.calendar-day-button')).toHaveLength(31);
    expect(nodes(tree, '.calendar-day-lunar')).toHaveLength(0);
    const selected = nodes(tree, '.calendar-day-button').find((node) => node.props['aria-pressed']);
    expect(selected?.props.tabIndex).toBe(0);
    expect(selected?.props['aria-current']).toBe('date');
    expect(selected?.props['aria-label']).toContain('Holiday');
    expect(selected?.props.ref).toBe(props.selectedButtonRef);
    (selected!.props.onClick as () => void)();
    expect(props.onSelectDate.mock.calls[0][0]).toEqual(date);
    expect(nodes(render(Component, { ...props, locale: 'zh-CN' }), '.calendar-day-lunar')).toHaveLength(31);
  });

  it('formats lunar days for another locale and forwards the date keyboard event', () => {
    const onDateKeyDown = vi.fn();
    const input = { ...props, locale: 'ja-JP' };
    input.onDateKeyDown = onDateKeyDown;
    const tree = render(Component, input);
    const event = { key: 'ArrowRight', preventDefault: vi.fn() };
    const selected = nodes(tree, '.calendar-day-button').find((node) => node.props['aria-pressed']);
    (selected!.props.onKeyDown as (input: unknown) => void)(event);
    expect(onDateKeyDown).toHaveBeenCalledExactlyOnceWith(event, date);
    const lunarDays = nodes(tree, '.calendar-day-lunar');
    expect(lunarDays).toHaveLength(31);
    expect(lunarDays.every((node) => typeof node.props.children === 'string')).toBe(true);
  });
});
