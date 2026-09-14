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
 * @file todoCalendarUtils.test.ts
 * @description 验证截止日期、跨月周期裁切与旧待办数据兼容性。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { formatTodoDate, getTodoMonthWeeks, getTodoStartDate, getTodoWeekSegment, parseTodoDate } from './todoCalendarUtils';
import { normalizeTodos } from './todoUtils';
import type { TodoItem } from '../types/todoTypes';

const todo: TodoItem = { id: new Date(2026, 8, 15).getTime(), createdAt: new Date(2026, 8, 15).getTime(), text: 'Task', done: false };

describe('todo calendar periods', () => {
  it('validates leap dates and rejects invalid or non-date values', () => {
    expect(formatTodoDate(parseTodoDate('2024-02-29')!)).toBe('2024-02-29');
    for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-9-15', 'invalid']) {
      expect(parseTodoDate(value)).toBeNull();
    }
  });

  it('uses local calendar dates rather than UTC conversion', () => {
    expect(formatTodoDate(new Date(2026, 8, 15, 0, 5))).toBe('2026-09-15');
    expect(getTodoStartDate(todo)).toBe('2026-09-15');
  });

  it('builds full Monday-first weeks across year boundaries', () => {
    const weeks = getTodoMonthWeeks(new Date(2027, 0, 1));
    expect(formatTodoDate(weeks[0][0])).toBe('2026-12-28');
    expect(formatTodoDate(weeks.at(-1)![6])).toBe('2027-01-31');
    expect(weeks.every(week => week.length === 7 && week[0].getDay() === 1)).toBe(true);
  });

  it('clips multiweek periods and includes the due date', () => {
    const weeks = getTodoMonthWeeks(new Date(2026, 8, 1));
    expect(getTodoWeekSegment('2026-08-30', '2026-09-09', weeks[0])).toEqual({ column: 1, span: 7 });
    expect(getTodoWeekSegment('2026-08-30', '2026-09-09', weeks[1])).toEqual({ column: 1, span: 3 });
    expect(getTodoWeekSegment('2026-08-30', '2026-09-09', weeks[2])).toBeNull();
    expect(getTodoWeekSegment('2026-09-09', '2026-09-09', weeks[1])).toEqual({ column: 3, span: 1 });
    expect(getTodoWeekSegment('2026-09-10', '2026-09-09', weeks[1])).toBeNull();
  });

  it('preserves deadlines and descriptions while accepting legacy tasks', () => {
    expect(normalizeTodos([todo])[0].dueDate).toBeUndefined();
    const saved = { ...todo, description: 'Notes', dueDate: '2026-10-03' };
    expect(normalizeTodos(JSON.parse(JSON.stringify([saved])))[0]).toMatchObject(saved);
    expect(getTodoStartDate({ ...todo, createdAt: undefined } as unknown as TodoItem)).toBe('2026-09-15');
  });

  it('discards impossible and pre-creation deadlines on load', () => {
    for (const dueDate of ['2026-02-31', '2026-09-14', '']) {
      expect(normalizeTodos([{ ...todo, dueDate }])[0].dueDate).toBeUndefined();
    }
  });
});
