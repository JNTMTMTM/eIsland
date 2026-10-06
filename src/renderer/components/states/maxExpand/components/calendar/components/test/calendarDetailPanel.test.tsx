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
 * @file calendarDetailPanel.test.tsx
 * @description CalendarDetailPanel 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { render, nodes, value, text } from '../../../../test/componentHarness';
import { CalendarDetailPanel as Component } from '../CalendarDetailPanel';
const date = new Date(2026, 9, 6, 12);
const formats = { full: new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }), month: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }), weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }), lunar: new Intl.DateTimeFormat('zh-CN-u-ca-chinese'), lunarDay: new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { day: 'numeric' }) };
describe('CalendarDetailPanel', () => {
  const props = {
    formats,
    selectedDate: date,
    selectedDay: 6,
    relativeLabel: 'Today',
    locale: 'en-US',
    events: [],
    holidayInfo: {}
  };
  it('shows selected date and includes lunar detail only outside English locales', () => {
    const tree = render(Component, props);
    expect(text(tree)).toContain('06');
    expect(text(tree)).toContain('Today');
    expect(nodes(tree, '.calendar-lunar-details')).toHaveLength(0);
    expect(nodes(render(Component, { ...props, locale: 'zh-CN' }), '.calendar-lunar-details')).toHaveLength(1);
  });
  it('filters todo ranges and countdowns to the selected date and marks completed todos', () => {
    const calendarEvents = [{ id: 'a', kind: 'todo', start: '2026-10-01', end: '2026-10-10', label: 'Task', done: true }, { id: 'b', kind: 'todo', start: '2026-10-07', end: '2026-10-10', label: 'Future' }, { id: 'c', kind: 'countdown', start: '2026-10-06', end: '2026-10-06', label: 'Release' }];
    const tree = render(Component, {
      ...props,
      events: calendarEvents
    });
    expect(nodes(tree, '.calendar-todo-item')).toHaveLength(2);
    expect(text(tree)).toContain('Release');
    expect(text(tree)).toContain('Task');
    expect(text(tree)).not.toContain('Future');
    expect(value(tree, '.calendar-todo-item', 'data-done', 1)).toBe(true);
  });
});
