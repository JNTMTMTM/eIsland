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
 * @file calendarOverviewMonths.test.tsx
 * @description CalendarOverviewMonths 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, trigger } from '../../../../test/componentHarness';
import { CalendarOverviewMonths as Component } from '../CalendarOverviewMonths';
import type { ReactElement } from 'react';
const formats = { full: new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }), month: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }), weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }), lunar: new Intl.DateTimeFormat('zh-CN-u-ca-chinese'), lunarDay: new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { day: 'numeric' }) };
describe('CalendarOverviewMonths', () => {
  it('builds twelve months and passes selection and today only to affected months', () => {
    const onSelectDate = vi.fn(); const onOpenMonth = vi.fn();
    const tree = render(Component, {
      formats,
      onSelectDate,
      onOpenMonth,
      year: 2026,
      events: [],
      selectedKey: '2026-10-06',
      todayKey: '2026-01-01',
      shortMonthFormat: new Intl.DateTimeFormat('en-US', {
        month: 'short'
      })
    }) as ReactElement<{ children: ReactElement<Record<string, unknown>>[] }>;
    const months = tree.props.children;
    expect(months).toHaveLength(12);
    expect(months[0].props.todayKey).toBe('2026-01-01');
    expect(months[0].props.selectedKey).toBeNull();
    expect(months[9].props.selectedKey).toBe('2026-10-06');
    expect(months[9].props.todayKey).toBeNull();
    const october = render(months[9].type, months[9].props);
    expect(nodes(october, '.calendar-overview-day')).toHaveLength(31);
    trigger(october, '.calendar-overview-month-link', 'onClick');
    expect(onOpenMonth).toHaveBeenCalledWith(new Date(2026, 9, 1, 12));
    trigger(october, '.calendar-overview-day', 'onClick');
    expect(onSelectDate).toHaveBeenCalledWith(new Date(2026, 9, 1, 12));
  });

  it('forwards keyboard selection and double-click month navigation from a day', () => {
    const onSelectDate = vi.fn();
    const onOpenMonth = vi.fn();
    const onDateKeyDown = vi.fn();
    const tree = render(Component, {
      formats, onSelectDate, onOpenMonth, onDateKeyDown, year: 2026, events: [],
      selectedKey: null, todayKey: null,
      shortMonthFormat: new Intl.DateTimeFormat('en-US', { month: 'short' }),
    }) as ReactElement<{ children: ReactElement<Record<string, unknown>>[] }>;
    const january = render(tree.props.children[0].type, tree.props.children[0].props);
    const event = { key: 'ArrowDown', preventDefault: vi.fn() };
    trigger(january, '.calendar-overview-day', 'onKeyDown', event);
    trigger(january, '.calendar-overview-day', 'onDoubleClick');
    expect(onDateKeyDown).toHaveBeenCalledExactlyOnceWith(event, new Date(2026, 0, 1, 12));
    expect(onOpenMonth).toHaveBeenCalledExactlyOnceWith(new Date(2026, 0, 1, 12));
    expect(onSelectDate).not.toHaveBeenCalled();
  });
});
