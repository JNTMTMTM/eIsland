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
 * @file calendarUtils.ts
 * @description 月历网格、月份切换与本地日期差计算。
 * @author 鸡哥
 */

import { CALENDAR_EVENT_BOTTOM_GAP, CALENDAR_EVENT_LANE_HEIGHT, CALENDAR_MONTH_GAP, CALENDAR_WEEK_HEIGHT } from '../config/calendarConfig';
import type { CalendarTimelineEvent } from '../types/calendarTimelineTypes';
import { getCalendarWeekTimeline } from './calendarTimelineUtils';

/**
 * 返回从周日开始的六周日期，固定行数以避免切月时布局跳动。
 * @param month - 当前显示月份内的任意日期。
 * @returns 按周分组的本地日期。
 */
export function getCalendarWeeks(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = first.getDay();
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) =>
      new Date(first.getFullYear(), first.getMonth(), 1 - offset + week * 7 + day, 12)
    )
  );
}

/**
 * 从固定周日起点生成连续日期，不在月界重复补齐相邻月份。
 * @param anchor - 基准周的周日。
 * @param offset - 相对基准周的整数偏移。
 * @returns 按本地日历顺序排列的七天。
 */
export function getCalendarWeek(anchor: Date, offset: number): Date[] {
  return Array.from({ length: 7 }, (_, day) =>
    new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + offset * 7 + day, 12)
  );
}

/**
 * 生成带月份间隔的布局，精确计算各月高度以保持滚动位置稳定。
 * @param anchor - 基准月份内的日期。
 * @param start - 起始月份偏移（包含）。
 * @param end - 结束月份偏移（不包含）。
 * @param events - 决定周行高度的假日与待办周期。
 * @returns 每个月的日期、所需周行、顶部位置和高度。
 */
export function getCalendarMonthLayouts(anchor: Date, start: number, end: number, events: CalendarTimelineEvent[] = []) {
  let top = 0;
  return Array.from({ length: end - start }, (_, offset) => {
    const index = start + offset;
    const date = new Date(anchor.getFullYear(), anchor.getMonth() + index, 1, 12);
    const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const weekCount = Math.ceil((date.getDay() + days) / 7);
    const weeks = getCalendarWeeks(date).slice(0, weekCount);
    let height = CALENDAR_MONTH_GAP;
    const weekLayouts = weeks.map((dates) => {
      const timeline = getCalendarWeekTimeline(dates, date, events);
      const rowHeight = CALENDAR_WEEK_HEIGHT + (timeline.lanes ? timeline.lanes * CALENDAR_EVENT_LANE_HEIGHT + CALENDAR_EVENT_BOTTOM_GAP : 0);
      const week = { dates, ...timeline, top: height, height: rowHeight };
      height += rowHeight;
      return week;
    });
    const layout = { index, date, weeks, weekLayouts, top, height };
    top += height;
    return layout;
  });
}

/**
 * 数据更新改变行高时，保持当前可视周及周内偏移，避免滚动跳到其他日期。
 * @param previous - 更新前布局
 * @param next - 更新后布局
 * @param scrollTop - 原滚动位置
 * @returns 补偿后的滚动位置
 */
export function getCalendarReflowTop(previous: ReturnType<typeof getCalendarMonthLayouts>, next: ReturnType<typeof getCalendarMonthLayouts>, scrollTop: number): number {
  const month = previous.find((item) => item.top + item.height > scrollTop) ?? previous[previous.length - 1];
  const target = next.find((item) => item.index === month.index);
  if (!target) return scrollTop;
  const localTop = scrollTop - month.top;
  if (localTop < CALENDAR_MONTH_GAP) return target.top + localTop;
  const row = month.weekLayouts.findIndex((week) => week.top + week.height > localTop);
  if (row < 0) return target.top + target.height;
  return target.top + target.weekLayouts[row].top + Math.min(localTop - month.weekLayouts[row].top, target.weekLayouts[row].height - 1);
}

/**
 * 切换月份并将月末日期限制到目标月份的最后一天。
 * @param date - 当前选中日期。
 * @param offset - 相对月份偏移，负值向前。
 * @returns 新的本地日期，不修改原日期。
 */
export function shiftCalendarMonth(date: Date, offset: number): Date {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + offset + 1, 0, 12).getDate();
  return new Date(date.getFullYear(), date.getMonth() + offset, Math.min(date.getDate(), lastDay), 12);
}

/**
 * 计算本地日期差，通过 UTC 日序消除夏令时导致的非整日间隔。
 * @param date - 目标日期。
 * @param origin - 基准日期。
 * @returns 相差的日历天数，未来为正。
 */
export function getCalendarDayDifference(date: Date, origin: Date): number {
  const targetDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const originDay = Date.UTC(origin.getFullYear(), origin.getMonth(), origin.getDate());
  return (targetDay - originDay) / 86_400_000;
}
