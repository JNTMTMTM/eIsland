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
import type { CalendarTimelineEvent } from '../types/calendarTimelineTypes';
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
  it('clips long events to the viewed year and preserves source ordering and color priority', () => {
    const events: CalendarTimelineEvent[] = [
      { id: 'long', kind: 'todo', label: 'Long', start: '1990-01-01', end: '2090-12-31', color: '#111111' },
      { id: 'leap', kind: 'countdown', label: 'Leap', start: '2024-02-29', end: '2024-02-29', color: '#222222' },
      { id: 'later', kind: 'countdown', label: 'Later', start: '2024-02-29', end: '2024-02-29', color: '#333333' },
    ];
    const days = getCalendarYearMonths(2024, events).flatMap((month) => month.days);
    expect(days).toHaveLength(366);
    expect(days.every((day) => day.names[0] === 'Long')).toBe(true);
    expect(days.find((day) => day.key === '2024-02-29')).toMatchObject({ names: ['Long', 'Leap', 'Later'], color: '#222222' });
    expect(days[0].color).toBe('#111111');
  });

  it('does not rescan the history for each day when events are outside the viewed year', () => {
    let reads = 0;
    const events: CalendarTimelineEvent[] = Array.from({ length: 5000 }, (_, id) => ({
      id: String(id), kind: 'todo', label: 'History',
      get start() { reads += 1; return '2020-01-01'; },
      get end() { reads += 1; return '2020-01-31'; },
    }));
    const months = getCalendarYearMonths(2026, events);
    expect(months.every((month) => month.days.every((day) => day.names.length === 0))).toBe(true);
    expect(reads).toBeLessThanOrEqual(events.length * 4);
  });

});
