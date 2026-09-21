/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarTimelineUtils.ts
 * @description 合并假日、待办与倒数日，展开年度事件并分配无重叠轨道。
 * @author 鸡哥
 */

import type { TodoItem } from '../../todo/types/todoTypes';
import type { CountdownItem } from '../../countdown/types/countdownTypes';
import { isArchived } from '../../countdown/utils/countdownUtils';
import { getTodoColor, getTodoStartDate, parseTodoDate } from '../../todo/utils/todoCalendarUtils';
import type { CalendarHolidayIndex } from '../types/calendarHolidayTypes';
import type { CalendarTimelineEvent, CalendarTimelineSegment } from '../types/calendarTimelineTypes';
import { getCalendarDateKey } from './calendarHolidayUtils';

/**
 * 建立事件周期，待办沿用原有创建日期与截止日期规则。
 * @param holidays - 按日期归类的公共假日
 * @param todos - 已有待办记录
 * @param countdowns - 共享倒数日记录
 * @param today - 用于判定自动归档的当前日期
 * @returns 排序稳定的事件列表
 */
export function getCalendarTimelineEvents(holidays: CalendarHolidayIndex, todos: TodoItem[], countdowns: CountdownItem[] = [], today = new Date()): CalendarTimelineEvent[] {
  const events: CalendarTimelineEvent[] = [];
  const lastByName = new Map<string, CalendarTimelineEvent>();
  [...holidays].sort(([left], [right]) => left.localeCompare(right)).forEach(([date, names]) => {
    const previousDate = parseTodoDate(date);
    if (!previousDate) return;
    previousDate.setDate(previousDate.getDate() - 1);
    names.forEach((name) => {
      const previous = lastByName.get(name);
      if (previous?.end === getCalendarDateKey(previousDate)) {
        previous.end = date;
      } else {
        const event: CalendarTimelineEvent = { id: `holiday:${date}:${name}`, kind: 'holiday', label: name, start: date, end: date };
        lastByName.set(name, event);
        events.push(event);
      }
    });
  });
  todos.forEach((todo) => {
    const start = getTodoStartDate(todo);
    if (!parseTodoDate(start) || !todo.dueDate || !parseTodoDate(todo.dueDate) || todo.dueDate < start) return;
    events.push({ id: `todo:${todo.id}`, kind: 'todo', label: todo.text, start, end: todo.dueDate, done: todo.done, color: getTodoColor(todo.id) });
  });
  countdowns.forEach((item) => {
    if (!parseTodoDate(item.date) || isArchived(item, today)) return;
    events.push({
      id: `countdown:${item.id}`, kind: 'countdown', label: item.name,
      start: item.date, end: item.date, color: item.color,
      repeat: item.repeat === 'yearly' && item.mode !== 'up' ? 'yearly' : undefined,
    });
  });
  return events.sort((left, right) => left.start.localeCompare(right.start) || right.end.localeCompare(left.end) || left.id.localeCompare(right.id));
}

/**
 * 将年度单日事件展开到浏览范围内，2 月 29 日在平年落到 2 月末。
 * @param events - 原始日历事件
 * @param startYear - 浏览起始年份（包含）
 * @param endYear - 浏览结束年份（包含），默认仅展开起始年份
 * @returns 保留原有事件顺序、年度实例按年份递增的事件列表
 */
export function getCalendarEventsInYears(events: CalendarTimelineEvent[], startYear: number, endYear = startYear): CalendarTimelineEvent[] {
  const expanded = events.flatMap((event) => {
    if (event.repeat !== 'yearly') return [event];
    const source = parseTodoDate(event.start);
    if (!source) return [];
    const firstYear = Math.max(startYear, source.getFullYear());
    return Array.from({ length: Math.max(0, endYear - firstYear + 1) }, (_, offset) => {
      const year = firstYear + offset;
      const day = Math.min(source.getDate(), new Date(year, source.getMonth() + 1, 0).getDate());
      const date = getCalendarDateKey(new Date(year, source.getMonth(), day, 12));
      return { ...event, id: `${event.id}:${year}`, start: date, end: date, repeat: undefined };
    });
  });
  return expanded;
}

/**
 * 在当前月份的周内裁切时间条，重叠事件分轨，不相交事件复用轨道。
 * @param week - 周日开始的七个日期
 * @param month - 该周所属月份
 * @param events - 事件周期
 * @returns 可见片段和需要的轨道数
 */
export function getCalendarWeekTimeline(week: Date[], month: Date, events: CalendarTimelineEvent[]) {
  const occupied: number[] = [];
  const segments: CalendarTimelineSegment[] = [];
  if (!events.length) return { segments, lanes: 0 };
  const days = week.map(getCalendarDateKey);
  const first = week.findIndex((date) => date.getMonth() === month.getMonth());
  const last = week.findLastIndex((date) => date.getMonth() === month.getMonth());
  events.forEach((event) => {
    if (event.end < days[first] || event.start > days[last]) return;
    const begin = Math.max(first, days.findIndex((day) => day >= event.start));
    const end = Math.min(last, days.findLastIndex((day) => day <= event.end));
    const mask = ((1 << (end - begin + 1)) - 1) << begin;
    let lane = occupied.findIndex((slots) => (slots & mask) === 0);
    if (lane < 0) lane = occupied.length;
    occupied[lane] = (occupied[lane] ?? 0) | mask;
    segments.push({ event, column: begin + 1, span: end - begin + 1, lane, start: week[begin], continuesBefore: event.start < days[begin], continuesAfter: event.end > days[end] });
  });
  return { segments, lanes: occupied.length };
}
