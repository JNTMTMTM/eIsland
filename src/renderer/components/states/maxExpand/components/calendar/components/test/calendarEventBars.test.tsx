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
 * @file calendarEventBars.test.tsx
 * @description CalendarEventBars 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { CalendarEventBars as Component } from '../CalendarEventBars';

describe('CalendarEventBars', () => {
  it('omits zero lanes and preserves event placement, continuation and selected date', () => {
    expect(render(Component, { segments: [], lanes: 0, onSelectDate: vi.fn() })).toBeNull();
    const onSelectDate = vi.fn();
    const start = new Date(2026, 9, 6);
    const segment = {
      start,
      event: {
        id: 'a',
        kind: 'todo',
        label: 'Task',
        start: '2026-10-01',
        end: '2026-10-10',
        done: true,
        color: '#f00'
      },
      column: 2,
      span: 3,
      lane: 0,
      continuesBefore: true,
      continuesAfter: false
    };
    const tree = render(Component, {
      onSelectDate,
      segments: [segment],
      lanes: 1
    });
    expect(value(tree, 'button', 'data-done')).toBe(true);
    expect(value(tree, 'button', 'data-continues-before')).toBe(true);
    expect(value(tree, 'button', 'style')).toMatchObject({ '--calendar-event-column': 2, '--calendar-event-span': 3, '--calendar-event-lane': 1 });
    expect(value(tree, 'button', 'title')).toContain('maxExpand.calendar.eventCompleted');
    trigger(tree, 'button', 'onClick');
    expect(onSelectDate).toHaveBeenCalledWith(start);
    const holiday = render(Component, {
      onSelectDate,
      segments: [{
        ...segment,
        event: {
          ...segment.event,
          kind: 'holiday'
        }
      }],
      lanes: 1
    });
    expect(nodes(holiday, 'span')).toHaveLength(0);
  });
});
