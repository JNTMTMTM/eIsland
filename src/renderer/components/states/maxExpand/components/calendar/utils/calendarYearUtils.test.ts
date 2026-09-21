/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarYearUtils.test.ts
 * @description 验证全年概览的日期数量、星期对齐与共享事件标记。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { getCalendarYearMonths } from './calendarYearUtils';
import { getCalendarTimelineEvents } from './calendarTimelineUtils';

describe('calendar year overview', () => {
  it('renders twelve months with each date exactly once and correct weekday alignment', () => {
    const months = getCalendarYearMonths(2026, []);
    expect(months).toHaveLength(12);
    expect(months[0].firstColumn).toBe(5);
    expect(months[1].firstColumn).toBe(1);
    const days = months.flatMap((month) => month.days);
    expect(days).toHaveLength(365);
    expect(new Set(days.map((day) => day.key)).size).toBe(365);
    expect(days[0].key).toBe('2026-01-01');
    expect(days.at(-1)?.key).toBe('2026-12-31');
  });

  it('includes leap day only in leap years, including century rules', () => {
    expect(getCalendarYearMonths(2024, [])[1].days).toHaveLength(29);
    expect(getCalendarYearMonths(2100, [])[1].days).toHaveLength(28);
    expect(getCalendarYearMonths(2000, [])[1].days).toHaveLength(29);
  });

  it('combines holidays and todo periods with annual countdown labels and colors', () => {
    const events = getCalendarTimelineEvents(new Map([['2026-02-28', ['Holiday']]]), [], [{ id: 1, name: 'Birthday', date: '2024-02-29', color: '#ff8844', type: 'birthday', repeat: 'yearly' }], new Date(2026, 8, 22));
    events.push({ id: 'todo:1', kind: 'todo', label: 'Task', start: '2026-02-27', end: '2026-03-01', color: '#abcdef' });
    const months = getCalendarYearMonths(2026, events);
    expect(months[1].days.at(-1)).toMatchObject({ key: '2026-02-28', names: expect.arrayContaining(['Birthday', 'Holiday', 'Task']), color: '#ff8844' });
    expect(months[2].days[0].names).toEqual(['Task']);
    expect(months[2].days[1].names).toEqual([]);
    expect(getCalendarYearMonths(2028, events)[1].days.at(-1)?.names).toEqual(['Birthday']);
  });

  it('does not retain stale markers after shared events are removed or moved', () => {
    const original = [{ id: 'countdown:1', kind: 'countdown' as const, label: 'Trip', start: '2026-09-22', end: '2026-09-22' }];
    expect(getCalendarYearMonths(2026, original)[8].days[21].names).toEqual(['Trip']);
    const updated = [{ ...original[0], start: '2026-10-01', end: '2026-10-01' }];
    expect(getCalendarYearMonths(2026, updated)[8].days[21].names).toEqual([]);
    expect(getCalendarYearMonths(2026, updated)[9].days[0].names).toEqual(['Trip']);
    expect(getCalendarYearMonths(2026, [])[9].days[0].names).toEqual([]);
  });
});
