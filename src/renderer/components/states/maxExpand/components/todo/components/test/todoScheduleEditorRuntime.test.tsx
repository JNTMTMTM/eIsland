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
 * @file todoScheduleEditorRuntime.test.tsx
 * @description 日程编辑真实月历导航、日期清空、周期及键盘边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, resetHook, unmountHook } from '../../../calendar/hooks/test/calendarHookHarness';
import { byClass, elements, find, invoke, text } from '../../../../../test/tree';
import type { TodoItem } from '../../types/todoTypes';
let TodoScheduleEditor: typeof import('../TodoScheduleEditor').TodoScheduleEditor;
const locale = vi.hoisted(() => ({
  resolved: undefined as string | undefined
}));
beforeEach(async () => {
  resetHook();
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 5));
  locale.resolved = undefined;
  vi.doMock('react-i18next', () => ({
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: {
        language: 'zh-CN',
        resolvedLanguage: locale.resolved
      }
    })
  }));
  ({ TodoScheduleEditor } = await import('../TodoScheduleEditor'));
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
});
describe('TodoScheduleEditor runtime', () => {
  it('calendar uses resolved locale, excludes invalid dates and distinguishes selected/done periods', () => {
    locale.resolved = 'en-US';
    const todo: TodoItem = {
      id: 1,
      text: 'selected',
      done: false,
      createdAt: new Date(2026, 9, 1).getTime(),
      dueDate: '2026-10-15'
    };
    const todos = [todo, {
      ...todo,
      id: 2,
      text: 'done',
      done: true
    }, {
      ...todo,
      id: 3,
      dueDate: 'invalid'
    }, {
      ...todo,
      id: 4,
      dueDate: '2026-09-01'
    }, {
      ...todo,
      id: 5,
      dueDate: undefined
    }];
    const tree = renderHook(() => TodoScheduleEditor({
      todo,
      todos,
      onSaveDesc: vi.fn(),
      onSetDueDate: vi.fn()
    }));
    expect(text(tree)).toContain('October');
    expect(elements(tree).some((n) => String(n.props.className).includes('period selected'))).toBe(true);
    expect(elements(tree).some((n) => String(n.props.className).includes('period done'))).toBe(true);
    expect(elements(tree).some((n) => String(n.props.className).includes(' today'))).toBe(true);
  });
  it('month navigation, empty deadline input and date button execute real callbacks', () => {
    const todo: TodoItem = {
      id: 1,
      text: 'task',
      done: false,
      createdAt: new Date(2026, 9, 1).getTime()
    };
    const due = vi.fn();
    const run = () => renderHook(() => TodoScheduleEditor({
      todo,
      todos: [],
      onSaveDesc: vi.fn(),
      onSetDueDate: due
    }));
    expect(byClass(run(), 'expand-todo-desc').props.value).toBe('');
    invoke(find(run(), (n) => n.props['aria-label'] === 'todo.previousMonth'), 'onClick');
    expect(text(run())).toContain('9月');
    invoke(find(run(), (n) => n.props['aria-label'] === 'todo.nextMonth'), 'onClick');
    expect(text(run())).toContain('10月');
    invoke(find(run(), (n) => n.type === 'input'), 'onChange', {
      target: {
        value: ''
      }
    });
    expect(due).toHaveBeenCalledWith(1, '');
    invoke(find(run(), (n) => n.type === 'button' && n.props.disabled === false && String(n.props.className).includes('calendar-day')), 'onClick');
    expect(due.mock.calls.at(-1)?.[1]).toMatch(/^2026-10-/);
  });
  it.each([{
    key: 'Enter',
    ctrlKey: false,
    metaKey: true,
    commit: true
  }, {
    key: 'Enter',
    ctrlKey: false,
    metaKey: false,
    commit: false
  }, {
    key: 'Tab',
    ctrlKey: true,
    metaKey: true,
    commit: false
  }])('description shortcut %j', ({
    key,
    ctrlKey,
    metaKey,
    commit
  }) => {
    const todo: TodoItem = {
      id: 1,
      text: 'task',
      done: false,
      createdAt: 1
    };
    const blur = vi.fn();
    const preventDefault = vi.fn();
    const tree = renderHook(() => TodoScheduleEditor({
      todo,
      todos: [],
      onSaveDesc: vi.fn(),
      onSetDueDate: vi.fn()
    }));
    invoke(byClass(tree, 'expand-todo-desc'), 'onKeyDown', {
      key,
      ctrlKey,
      metaKey,
      preventDefault,
      currentTarget: {
        blur
      }
    });
    expect(blur).toHaveBeenCalledTimes(commit ? 1 : 0);
    expect(preventDefault).toHaveBeenCalledTimes(commit ? 1 : 0);
  });
});
