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
 * @file calendarTab.test.tsx
 * @description CalendarTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { CalendarTab as Component } from '../CalendarTab';
import { CalendarGrid } from '../CalendarGrid';
import { CalendarYearOverview } from '../CalendarYearOverview';
import { CalendarDetailPanel } from '../CalendarDetailPanel';
const date = new Date(2026, 9, 6, 12);
const formats = { full: new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }), month: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }), weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }), lunar: new Intl.DateTimeFormat('zh-CN-u-ca-chinese'), lunarDay: new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { day: 'numeric' }) };
vi.mock('../../hooks/useCalendar', () => ({ useCalendar: () => ({
  formats,
  selectedDate: date,
  today: date,
  locale: 'en-US',
  selectedDay: 6,
  selectedButtonRef: {
    current: null
  },
  focusDateRef: {
    current: false
  }
}) }));
vi.mock('../../hooks/useCalendarHolidays', () => ({ useCalendarHolidays: () => ({ holidays: new Map(), setVisibleYear: vi.fn() }) }));
vi.mock('../../hooks/useCalendarTodos', () => ({ useCalendarTodos: () => [] }));
vi.mock('../../../countdown/hooks/useCountdownItems', () => ({ useCountdownItems: () => ({ items: [] }) }));
describe('CalendarTab', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('links details and collapses them while retaining the panel', () => {
    const tree = render(Component);
    expect(value(tree, '.calendar-details-shell', 'inert')).toBe(false);
    expect(value(tree, CalendarGrid, 'detailsId')).toBe(value(tree, '.calendar-details-shell', 'id'));
    trigger(tree, CalendarGrid, 'onToggleDetails');
    const collapsed = render(Component);
    expect(value(collapsed, '.calendar-details-shell', 'aria-hidden')).toBe(true);
    expect(nodes(collapsed, CalendarDetailPanel)).toHaveLength(1);
  });
  it('switches views only after the exit animation and ignores nested animation events', () => {
    vi.stubGlobal('document', { activeElement: null });
    const tree = render(Component);
    trigger(tree, CalendarGrid, 'onToggleOverview', date);
    const exiting = render(Component);
    expect(value(exiting, '.calendar-view-stage', 'data-phase')).toBe('exit');
    expect(value(exiting, '.calendar-view-stage', 'inert')).toBe(true);
    const firstElementChild = {};
    trigger(exiting, '.calendar-view-stage', 'onAnimationEnd', { target: {}, currentTarget: { firstElementChild } });
    expect(nodes(render(Component), CalendarGrid)).toHaveLength(1);
    trigger(exiting, '.calendar-view-stage', 'onAnimationEnd', { target: firstElementChild, currentTarget: { firstElementChild } });
    const prepared = render(Component);
    expect(nodes(prepared, CalendarYearOverview)).toHaveLength(1);
    expect(value(prepared, CalendarYearOverview, 'overviewYear')).toBe(2026);
    expect(value(prepared, '.calendar-view-stage', 'data-phase')).toBe('prepare');
  });
});
