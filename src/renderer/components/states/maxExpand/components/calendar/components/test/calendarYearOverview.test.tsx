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
 * @file calendarYearOverview.test.tsx
 * @description CalendarYearOverview 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, flushEffects } from '../../../../test/componentHarness';
import { CalendarYearOverview as Component } from '../CalendarYearOverview';
import { CalendarOverviewMonths } from '../CalendarOverviewMonths';
const date = new Date(2026, 9, 6, 12);
const formats = { full: new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }), month: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }), weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }), lunar: new Intl.DateTimeFormat('zh-CN-u-ca-chinese'), lunarDay: new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { day: 'numeric' }) };
describe('CalendarYearOverview', () => {
  it('keeps adjacent years as placeholders and mounts only the visible year', () => {
    const onVisibleYearChange = vi.fn();
    const props = {
      formats,
      onVisibleYearChange,
      selectedDate: date,
      today: date,
      locale: 'en-US',
      events: [],
      selectedButtonRef: {
        current: null
      },
      focusDateRef: {
        current: false
      },
      onDateKeyDown: vi.fn()
    };
    const tree = render(Component, props);
    expect(nodes(tree, '.calendar-overview-year')).toHaveLength(3);
    expect(nodes(tree, CalendarOverviewMonths)).toHaveLength(1);
    expect(nodes(tree, '.calendar-overview-month-placeholder')).toHaveLength(24);
    expect(value(tree, CalendarOverviewMonths, 'selectedKey')).toBe('2026-10-06');
    flushEffects();
    expect(onVisibleYearChange).toHaveBeenCalledWith(2026);
    const currentTarget = {};
    const event = {
      currentTarget,
      target: currentTarget,
      key: 'ArrowDown'
    };
    trigger(tree, '.calendar-scroll', 'onKeyDown', event);
    expect(props.onDateKeyDown).toHaveBeenCalledWith(event, new Date(2026, 0, 1, 12));
  });
});
