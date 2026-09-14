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
 * @file todoCalendarUtils.ts
 * @description 本地日历日期和跨周任务周期计算，避免 UTC 日期造成时区偏移。
 * @author 鸡哥
 */

import type { TodoItem } from '../types/todoTypes';

/** 将本地日期转换为可排序的日历日期字符串。 */
export function formatTodoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 解析并校验 YYYY-MM-DD，拒绝自动溢出的无效日期。 */
export function parseTodoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return formatTodoDate(date) === value ? date : null;
}

/** 旧记录缺少创建时间时使用时间戳 ID。 */
export function getTodoStartDate(todo: TodoItem): string {
  return formatTodoDate(new Date(todo.createdAt ?? todo.id));
}

/** 返回月视图的完整周，每周从周一开始。 */
export function getTodoMonthWeeks(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from({ length: Math.ceil((offset + days) / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + week * 7 + day, 12))
  );
}

/** 将包含首尾日期的任务周期裁切为当前周内的网格列。 */
export function getTodoWeekSegment(start: string, end: string, week: Date[]): { column: number; span: number } | null {
  if (end < start || end < formatTodoDate(week[0]) || start > formatTodoDate(week[6])) return null;
  const first = week.findIndex(day => formatTodoDate(day) >= start);
  const last = week.findLastIndex(day => formatTodoDate(day) <= end);
  return { column: first + 1, span: last - first + 1 };
}

/** 使用任务 ID 保持跨月份、排序和重启后的周期颜色一致。 */
export function getTodoColor(id: number): string {
  const colors = ['#6ba6e8', '#b58be4', '#63b69b', '#dfab64', '#dc8696', '#70bac6'];
  return colors[Math.abs(Math.trunc(id)) % colors.length];
}
