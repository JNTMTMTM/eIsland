/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarTimelineUtils.test.ts
 * @description 验证事件聚合、分轨、月份裁切及动态行高的滚动补偿。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import type { TodoItem } from '../../todo/types/todoTypes';
import type { CalendarTimelineEvent } from '../types/calendarTimelineTypes';
import { CALENDAR_EVENT_BOTTOM_GAP, CALENDAR_EVENT_LANE_HEIGHT, CALENDAR_WEEK_HEIGHT } from '../config/calendarConfig';
import { getCalendarTimelineEvents, getCalendarWeekTimeline } from './calendarTimelineUtils';
import { getCalendarMonthLayouts, getCalendarReflowTop, getCalendarWeeks } from './calendarUtils';

const task = (id: number, start: string, end?: string): TodoItem => ({ id, text: `Task ${id}`, createdAt: new Date(`${start}T12:00:00`).getTime(), done: false, dueDate: end });
const period = (id: string, start: string, end: string): CalendarTimelineEvent => ({ id, start, end, kind: 'todo', label: id });
const september = new Date(2026, 8, 1, 12);

describe('calendar timeline', () => {
  it('merges consecutive dates of the same holiday without bridging gaps or different names', () => {
    const holidays = new Map([
      ['2026-10-02', ['Festival']], ['2026-09-30', ['Festival']], ['2026-10-01', ['Festival', 'Other']], ['2026-10-04', ['Festival']],
    ]);
    const events = getCalendarTimelineEvents(holidays, []);
    expect(events.map(({ label, start, end }) => [label, start, end])).toEqual([
      ['Festival', '2026-09-30', '2026-10-02'], ['Other', '2026-10-01', '2026-10-01'], ['Festival', '2026-10-04', '2026-10-04'],
    ]);
  });

  it('uses existing todo periods and completion state, excluding unscheduled or invalid periods', () => {
    const events = getCalendarTimelineEvents(new Map(), [task(1, '2026-09-20', '2026-09-25'), task(2, '2026-09-20'), task(3, '2026-09-20', '2026-09-19'), { ...task(4, '2026-09-20', '2026-09-21'), done: true }]);
    expect(events).toHaveLength(2);
    expect(events.find((event) => event.id === 'todo:1')).toMatchObject({ start: '2026-09-20', end: '2026-09-25', done: false });
    expect(events.find((event) => event.id === 'todo:4')).toMatchObject({ done: true });
  });

  it('puts overlapping intervals in separate lanes and reuses a lane for disjoint intervals', () => {
    const week = getCalendarWeeks(september)[3];
    const events = [period('a', '2026-09-20', '2026-09-22'), period('b', '2026-09-21', '2026-09-23'), period('c', '2026-09-24', '2026-09-26')];
    const layout = getCalendarWeekTimeline(week, september, events);
    expect(layout.lanes).toBe(2);
    expect(layout.segments.map(({ column, span, lane }) => [column, span, lane])).toEqual([[1, 3, 0], [2, 3, 1], [5, 3, 0]]);
  });

  it('clips cross-month events without drawing on blank days and preserves continuation flags', () => {
    const events = [period('a', '2026-09-29', '2026-10-03')];
    const endSeptember = getCalendarWeekTimeline(getCalendarWeeks(september)[4], september, events).segments[0];
    const october = new Date(2026, 9, 1, 12);
    const startOctober = getCalendarWeekTimeline(getCalendarWeeks(october)[0], october, events).segments[0];
    expect(endSeptember).toMatchObject({ column: 3, span: 2, continuesBefore: false, continuesAfter: true });
    expect(startOctober).toMatchObject({ column: 5, span: 3, continuesBefore: true, continuesAfter: false });
  });

  it('handles year boundaries and one-day periods without extra dates', () => {
    const january = new Date(2027, 0, 1, 12);
    const layout = getCalendarWeekTimeline(getCalendarWeeks(january)[0], january, [period('a', '2026-12-30', '2027-01-01'), period('b', '2027-01-01', '2027-01-01')]);
    expect(layout.segments.map(({ column, span }) => [column, span])).toEqual([[6, 1], [6, 1]]);
    expect(layout.lanes).toBe(2);
  });

  it('grows only occupied weeks and preserves the visible week after async data arrives or is removed', () => {
    const plain = getCalendarMonthLayouts(september, -1, 2);
    const events = [period('a', '2026-08-01', '2026-09-22'), period('b', '2026-09-20', '2026-09-24')];
    const expanded = getCalendarMonthLayouts(september, -1, 2, events);
    const row = expanded[1].weekLayouts[3];
    expect(row.height).toBe(CALENDAR_WEEK_HEIGHT + CALENDAR_EVENT_LANE_HEIGHT * 2 + CALENDAR_EVENT_BOTTOM_GAP);
    expect(expanded[1].weekLayouts[4].height).toBe(CALENDAR_WEEK_HEIGHT);
    const before = plain[1].top + plain[1].weekLayouts[4].top + 12;
    const after = expanded[1].top + expanded[1].weekLayouts[4].top + 12;
    expect(getCalendarReflowTop(plain, expanded, before)).toBe(after);
    expect(getCalendarReflowTop(expanded, plain, after)).toBe(before);
    expect(getCalendarReflowTop(plain, expanded, plain[1].top + 20)).toBe(expanded[1].top + 20);
  });

  it('clamps offsets when the visible event stack becomes shorter', () => {
    const plain = getCalendarMonthLayouts(september, 0, 1);
    const expanded = getCalendarMonthLayouts(september, 0, 1, [period('a', '2026-09-20', '2026-09-26')]);
    const row = expanded[0].weekLayouts[3];
    const result = getCalendarReflowTop(expanded, plain, row.top + row.height - 1);
    expect(result).toBe(plain[0].weekLayouts[3].top + CALENDAR_WEEK_HEIGHT - 1);
  });
});
