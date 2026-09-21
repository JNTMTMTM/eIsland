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
import type { CountdownItem } from '../../countdown/types/countdownTypes';
import type { TodoItem } from '../../todo/types/todoTypes';
import type { CalendarTimelineEvent } from '../types/calendarTimelineTypes';
import { CALENDAR_EVENT_BOTTOM_GAP, CALENDAR_EVENT_LANE_HEIGHT, CALENDAR_WEEK_HEIGHT } from '../config/calendarConfig';
import { getCalendarEventsInYears, getCalendarTimelineEvents, getCalendarWeekTimeline } from './calendarTimelineUtils';
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

  it('keeps month-bucketed timelines identical to full event scans across leap years and year boundaries', () => {
    const events = [
      period('outside-before', '2020-01-01', '2020-12-31'),
      period('long', '2023-10-01', '2025-04-30'),
      period('leap', '2024-02-28', '2024-03-02'),
      period('overlap', '2024-02-29', '2024-03-01'),
      period('year', '2024-12-31', '2025-01-01'),
      period('outside-after', '2028-01-01', '2028-12-31'),
    ];
    const layouts = getCalendarMonthLayouts(new Date(2024, 2, 1, 12), -4, 13, events);
    layouts.forEach((month) => {
      month.weekLayouts.forEach((week) => {
        expect({ segments: week.segments, lanes: week.lanes }).toEqual(getCalendarWeekTimeline(week.dates, month.date, events));
      });
    });
  });

  it('does not retain stale event buckets after a due date changes or tasks are removed', () => {
    const events = [period('moving', '2026-09-20', '2026-10-01')];
    const before = getCalendarMonthLayouts(september, 0, 2, events);
    expect(before[1].weekLayouts[0].segments).toHaveLength(1);
    events[0].end = '2026-09-30';
    const after = getCalendarMonthLayouts(september, 0, 2, events);
    expect(after[1].weekLayouts.every((week) => week.segments.length === 0)).toBe(true);
    expect(getCalendarMonthLayouts(september, 0, 2, []).every((month) => month.weekLayouts.every((week) => week.lanes === 0))).toBe(true);
  });
});

/**
 * 构造沿用倒数日规则的日历测试事件。
 * @param id - 事件编号
 * @param date - 原始目标日期
 * @param options - 覆盖默认值的事件字段
 * @returns 倒数日测试记录
 */
const countdown = (id: number, date: string, options: Partial<CountdownItem> = {}): CountdownItem => ({
  id, name: `Event ${id}`, date, color: '#69c0ff', type: 'countdown', ...options,
});

describe('calendar countdown integration', () => {
  const today = new Date(2026, 8, 22, 12);

  it('marks only the target day and preserves the name and custom color', () => {
    const events = getCalendarTimelineEvents(new Map(), [], [countdown(1, '2026-09-23', { name: 'Release', color: '#ff8844' })], today);
    expect(events).toEqual([expect.objectContaining({ id: 'countdown:1', kind: 'countdown', label: 'Release', color: '#ff8844', start: '2026-09-23', end: '2026-09-23' })]);
    const month = getCalendarMonthLayouts(september, 0, 1, events)[0];
    const segments = month.weekLayouts.flatMap((week) => week.segments);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ column: 4, span: 1, continuesBefore: false, continuesAfter: false });
  });

  it('uses separate lanes for holidays, todos and multiple countdowns on the same day', () => {
    const events = getCalendarTimelineEvents(new Map([['2026-09-22', ['Holiday']]]), [task(1, '2026-09-22', '2026-09-23')], [countdown(1, '2026-09-22'), countdown(2, '2026-09-22')], today);
    const row = getCalendarMonthLayouts(september, 0, 1, events)[0].weekLayouts[3];
    expect(row.lanes).toBe(4);
    expect(new Set(row.segments.map((segment) => segment.lane)).size).toBe(4);
    expect(row.segments.map((segment) => segment.event.kind).sort()).toEqual(['countdown', 'countdown', 'holiday', 'todo']);
  });

  it('excludes manual archives and invalid dates; auto-archives only after the target day', () => {
    const records = [countdown(1, '2026-09-22', { expiryAction: 'archive' }), countdown(2, '2026-09-22', { archived: true }), countdown(3, '2026-02-30'), countdown(4, '2026-09-20', { expiryAction: 'archive' })];
    expect(getCalendarTimelineEvents(new Map(), [], records, today).map((event) => event.id)).toEqual(['countdown:1']);
    expect(getCalendarTimelineEvents(new Map(), [], records, new Date(2026, 8, 23))).toEqual([]);
  });

  it('keeps elapsed and count-up dates without inventing annual repeats for count-up', () => {
    const records = [countdown(1, '2024-09-20'), countdown(2, '2024-09-21', { mode: 'up', repeat: 'yearly', expiryAction: 'archive' })];
    const events = getCalendarTimelineEvents(new Map(), [], records, today);
    expect(events.map((event) => event.start)).toEqual(['2024-09-20', '2024-09-21']);
    expect(getCalendarEventsInYears(events, 2026)).toEqual(events);
    expect(getCalendarMonthLayouts(september, 0, 1, events)[0].weekLayouts.every((week) => week.lanes === 0)).toBe(true);
  });

  it('expands yearly events in past and future viewed years, never before the source year', () => {
    const events = getCalendarTimelineEvents(new Map(), [], [countdown(1, '2024-02-29', { repeat: 'yearly', expiryAction: 'archive' })], today);
    const expanded = getCalendarEventsInYears(events, 2023, 2028);
    expect(expanded.map((event) => event.start)).toEqual(['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
    expect(new Set(expanded.map((event) => event.id)).size).toBe(5);
    expect(events[0].start).toBe('2024-02-29');
    const layouts = getCalendarMonthLayouts(new Date(2026, 1, 1), -24, 25, events);
    const displayed = layouts.flatMap((month) => month.weekLayouts.flatMap((week) => week.segments.map((segment) => segment.event.start)));
    expect(displayed).toEqual(expanded.map((event) => event.start));
    expect(getCalendarEventsInYears(events, 2026).filter((event) => event.start === '2026-02-28')).toHaveLength(1);
  });

  it('renders annual occurrences across December and January without duplicates', () => {
    const events = getCalendarTimelineEvents(new Map(), [], [countdown(1, '2020-12-31', { repeat: 'yearly' }), countdown(2, '2020-01-01', { repeat: 'yearly' })], today);
    const layouts = getCalendarMonthLayouts(new Date(2026, 11, 1), 0, 2, events);
    expect(layouts.map((month) => month.weekLayouts.flatMap((week) => week.segments.map((segment) => segment.event.start)))).toEqual([['2026-12-31'], ['2027-01-01']]);
  });

  it('removes old markers after edits, archival or deletion of the shared records', () => {
    const markers = (items: CountdownItem[]) => getCalendarMonthLayouts(september, 0, 2, getCalendarTimelineEvents(new Map(), [], items, today))
      .flatMap((month) => month.weekLayouts.flatMap((week) => week.segments.map((segment) => segment.event.start)));
    expect(markers([countdown(1, '2026-09-23')])).toEqual(['2026-09-23']);
    expect(markers([countdown(1, '2026-10-02')])).toEqual(['2026-10-02']);
    expect(markers([countdown(1, '2026-10-02', { archived: true })])).toEqual([]);
    expect(markers([])).toEqual([]);
  });
});
