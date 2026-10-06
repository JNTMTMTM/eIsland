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
 * @file calendarGrid.test.tsx
 * @description CalendarGrid 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, flushEffects } from '../../../../test/componentHarness';
import { CalendarGrid as Component } from '../CalendarGrid';
import { CalendarMonthGrid } from '../CalendarMonthGrid';
import { getCalendarMonthLayouts } from '../../utils/calendarUtils';
const date = new Date(2026, 9, 6, 12);
const formats = { full: new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }), month: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }), weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }), lunar: new Intl.DateTimeFormat('zh-CN-u-ca-chinese'), lunarDay: new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { day: 'numeric' }) };
vi.mock('../../hooks/useCalendarScroll', () => ({ useCalendarScroll: () => ({ months: getCalendarMonthLayouts(date, 0, 1), visibleDate: date, scrollRef: { current: null }, weekHeight: 40, paddingTop: 0, paddingBottom: 0 }) }));
describe('CalendarGrid', () => {
  const props = {
    formats,
    selectedDate: date,
    today: date,
    locale: 'en-US',
    selectedButtonRef: {
      current: null
    },
    focusDateRef: {
      current: false
    },
    onVisibleYearChange: vi.fn(),
    onDateKeyDown: vi.fn(),
    events: [],
    holidays: new Map()
  };
  it('renders virtual months and ignores keyboard events from nested targets', () => {
    const tree = render(Component, props);
    expect(nodes(tree, CalendarMonthGrid)).toHaveLength(1);
    expect(value(tree, CalendarMonthGrid, 'selectedDay')).toBe(6);
    expect(value(tree, CalendarMonthGrid, 'todayDay')).toBe(6);
    const currentTarget = {};
    trigger(tree, '.calendar-scroll', 'onKeyDown', {
      currentTarget,
      target: {},
      key: 'ArrowRight'
    });
    expect(props.onDateKeyDown).not.toHaveBeenCalled();
    const event = {
      currentTarget,
      target: currentTarget,
      key: 'ArrowRight'
    };
    trigger(tree, '.calendar-scroll', 'onKeyDown', event);
    expect(props.onDateKeyDown).toHaveBeenCalledWith(event, date);
    flushEffects();
    expect(props.onVisibleYearChange).toHaveBeenCalledWith(2026);
  });

  it('keeps a pending keyboard focus until the selected date button is mounted', async () => {
    const focus = vi.fn();
    const focusDateRef = { current: true };
    const selectedButtonRef = { current: null as HTMLButtonElement | null };
    const refs = { focusDateRef, selectedButtonRef };
    const input = { ...props, ...refs };
    await render(Component, input);
    flushEffects();
    expect(focusDateRef.current).toBe(true);
    expect(focus).not.toHaveBeenCalled();
    selectedButtonRef.current = { focus } as unknown as HTMLButtonElement;
    await render(Component, input);
    flushEffects();
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(focusDateRef.current).toBe(false);
  });
});
