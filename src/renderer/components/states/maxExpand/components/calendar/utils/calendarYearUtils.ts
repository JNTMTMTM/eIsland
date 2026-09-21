/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarYearUtils.ts
 * @description 全年概览的十二个月、日期列位置及共享事件标记。
 * @author 鸡哥
 */

import type { CalendarTimelineEvent } from '../types/calendarTimelineTypes';
import { getCalendarDateKey } from './calendarHolidayUtils';
import { getCalendarEventsInYears } from './calendarTimelineUtils';

/**
 * 构建完整年份，年度倒数日沿用月视图的展开规则。
 * @param year - 公历年份
 * @param events - 共享假日、待办与倒数日事件
 * @returns 十二个月及各日期对应的事件名称和标记颜色
 */
export function getCalendarYearMonths(year: number, events: CalendarTimelineEvent[]) {
  const expanded = getCalendarEventsInYears(events, year);
  return Array.from({ length: 12 }, (_, month) => {
    const date = new Date(year, month, 1, 12);
    const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => {
      const day = new Date(year, month, index + 1, 12);
      const key = getCalendarDateKey(day);
      const matching = expanded.filter((event) => event.start <= key && event.end >= key);
      return { date: day, key, names: matching.map((event) => event.label), color: matching.find((event) => event.kind === 'countdown')?.color ?? matching.find((event) => event.color)?.color };
    });
    return { date, days, firstColumn: date.getDay() + 1 };
  });
}
