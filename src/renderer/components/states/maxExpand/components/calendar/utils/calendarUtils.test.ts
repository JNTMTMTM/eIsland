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
import { getCalendarDayDifference, getCalendarWeeks, shiftCalendarMonth } from './calendarUtils';

describe('calendar month navigation', () => {
  it('renders six complete Monday-first weeks including adjacent months', () => {
    const weeks = getCalendarWeeks(new Date(2026, 1, 1));
    expect(weeks).toHaveLength(6);
    expect(weeks.every((week) => week.length === 7 && week[0].getDay() === 1)).toBe(true);
    expect(weeks[0][0].getMonth()).toBe(0);
    expect(weeks[0][0].getDate()).toBe(26);
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
