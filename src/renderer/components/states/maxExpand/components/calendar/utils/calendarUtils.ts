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

/**
 * 返回从周一开始的六周日期，固定行数以避免切月时布局跳动。
 * @param month - 当前显示月份内的任意日期。
 * @returns 按周分组的本地日期。
 */
export function getCalendarWeeks(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) =>
      new Date(first.getFullYear(), first.getMonth(), 1 - offset + week * 7 + day, 12)
    )
  );
}

/**
 * 从固定周一起点生成连续日期，不在月界重复补齐相邻月份。
 * @param anchor - 基准周的周一。
 * @param offset - 相对基准周的整数偏移。
 * @returns 按本地日历顺序排列的七天。
 */
export function getCalendarWeek(anchor: Date, offset: number): Date[] {
  return Array.from({ length: 7 }, (_, day) =>
    new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + offset * 7 + day, 12)
  );
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
