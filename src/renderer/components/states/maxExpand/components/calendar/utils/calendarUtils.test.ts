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
 * @file calendarUtils.test.ts
 * @description 验证月历边界、闰年和日历日期计算。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { CALENDAR_MONTH_GAP, CALENDAR_MONTH_HEADER_HEIGHT, CALENDAR_WEEK_HEIGHT, getCalendarDayDifference, getCalendarMonthLayouts, getCalendarWeek, getCalendarWeeks, shiftCalendarMonth } from './calendarUtils';

describe('calendar month navigation', () => {
  it('sizes short and long months with a separate heading and gap', () => {
    const months = getCalendarMonthLayouts(new Date(2026, 1, 1, 12), 0, 4);
    expect(months.map((month) => month.weeks.length)).toEqual([4, 5, 5, 6]);
    expect(months[0].top).toBe(0);
    months.forEach((month, index) => {
      expect(month.height).toBe(CALENDAR_MONTH_GAP + CALENDAR_MONTH_HEADER_HEIGHT + month.weeks.length * CALENDAR_WEEK_HEIGHT);
      if (index > 0) expect(month.top).toBe(months[index - 1].top + months[index - 1].height);
    });
  });

  it('keeps dates unique when grouping leap-year months and compensates prepended heights', () => {
    const anchor = new Date(2024, 0, 1, 12);
    const months = getCalendarMonthLayouts(anchor, 0, 3);
    const dates = months.flatMap((month) => month.weeks.flat().filter((date) => date.getMonth() === month.date.getMonth()));
    expect(dates).toHaveLength(91);
    expect(new Set(dates.map((date) => date.getTime())).size).toBe(91);
    expect(dates.slice(1).every((date, index) => getCalendarDayDifference(date, dates[index]) === 1)).toBe(true);
    const expanded = getCalendarMonthLayouts(anchor, -12, 3);
    const prependedHeight = expanded[12].top;
    months.forEach((month, index) => {
      expect(expanded[index + 12].top - prependedHeight).toBe(month.top);
    });
  });

  it('keeps consecutive weeks unique across month and year boundaries', () => {
    const anchor = new Date(2025, 11, 28, 12);
    const days = Array.from({ length: 20 }, (_, index) => getCalendarWeek(anchor, index - 10)).flat();
    expect(new Set(days.map((day) => day.getTime())).size).toBe(140);
    expect(days.slice(1).every((day, index) => getCalendarDayDifference(day, days[index]) === 1)).toBe(true);
    expect(getCalendarWeek(anchor, 1)[0].getDate()).toBe(4);
    expect(getCalendarWeek(anchor, 1)[0].getFullYear()).toBe(2026);
  });

  it('includes leap day exactly once in the continuous week sequence', () => {
    const days = [...getCalendarWeek(new Date(2024, 1, 25, 12), 0), ...getCalendarWeek(new Date(2024, 1, 25, 12), 1)];
    expect(days.filter((day) => day.getMonth() === 1 && day.getDate() === 29)).toHaveLength(1);
    expect(days[5].getMonth()).toBe(2);
    expect(days[5].getDate()).toBe(1);
    expect(days[7].getDay()).toBe(0);
  });

  it('renders six complete Sunday-first weeks including adjacent months', () => {
    const weeks = getCalendarWeeks(new Date(2026, 1, 1));
    expect(weeks).toHaveLength(6);
    expect(weeks.every((week) => week.length === 7 && week[0].getDay() === 0)).toBe(true);
    expect(weeks[0].map((day) => day.getDay())).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(weeks[0][0].getMonth()).toBe(1);
    expect(weeks[0][0].getDate()).toBe(1);
    expect(weeks.flat().filter((day) => day.getMonth() === 1)).toHaveLength(28);
    expect(new Set(weeks.flat().map((day) => day.getTime())).size).toBe(42);
  });

  it('keeps leap day and clamps month-end navigation without mutating the input', () => {
    const january = new Date(2024, 0, 31);
    const february = shiftCalendarMonth(january, 1);
    expect([february.getMonth(), february.getDate()]).toEqual([1, 29]);
    expect(january.getMonth()).toBe(0);
    expect(shiftCalendarMonth(new Date(2025, 2, 31), -1).getDate()).toBe(28);
    expect(getCalendarWeeks(february).flat().filter((day) => day.getMonth() === 1)).toHaveLength(29);
  });

  it('crosses year boundaries in both directions', () => {
    const next = shiftCalendarMonth(new Date(2025, 11, 15), 1);
    const previous = shiftCalendarMonth(new Date(2026, 0, 15), -1);
    expect([next.getFullYear(), next.getMonth(), next.getDate()]).toEqual([2026, 0, 15]);
    expect([previous.getFullYear(), previous.getMonth()]).toEqual([2025, 11]);
  });

  it('counts calendar days regardless of time of day or daylight-saving changes', () => {
    expect(getCalendarDayDifference(new Date(2026, 2, 9, 0), new Date(2026, 2, 8, 23))).toBe(1);
    expect(getCalendarDayDifference(new Date(2026, 10, 2), new Date(2026, 9, 31))).toBe(2);
    expect(getCalendarDayDifference(new Date(2026, 0, 1), new Date(2025, 11, 31))).toBe(1);
    expect(getCalendarDayDifference(new Date(2026, 0, 1), new Date(2026, 0, 2))).toBe(-1);
  });
});
