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
 * @file todoScheduleEditor.test.tsx
 * @description TodoScheduleEditor 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { TodoScheduleEditor as Component } from '../TodoScheduleEditor';

describe('TodoScheduleEditor', () => {
  const todo = { id: 1, text: 'task', done: false, createdAt: new Date(2026, 9, 1).getTime(), dueDate: '2026-10-15', description: 'notes' };
  const props = { todo, todos: [todo], onSaveDesc: vi.fn(), onSetDueDate: vi.fn() };
  it('renders scheduled periods and rejects invalid or pre-start deadlines', () => {
    const tree = render(Component, props);
    expect(nodes(tree, '.expand-todo-calendar-period').length).toBeGreaterThan(0);
    expect(value(tree, 'input', 'min')).toBe('2026-10-01');
    trigger(tree, 'input', 'onChange', { target: { value: 'invalid' } });
    trigger(tree, 'input', 'onChange', { target: { value: '2026-09-30' } });
    expect(props.onSetDueDate).not.toHaveBeenCalled();
    trigger(tree, 'input', 'onChange', { target: { value: '2026-10-20' } });
    expect(props.onSetDueDate).toHaveBeenCalledWith(1, '2026-10-20');
    trigger(tree, '.expand-todo-deadline-clear', 'onClick');
    expect(props.onSetDueDate).toHaveBeenLastCalledWith(1, '');
  });
  it('shows no-deadline state and forwards description edits and keyboard commit', () => {
    const tree = render(Component, { ...props, todo: { ...todo, dueDate: undefined }, todos: [] });
    expect(nodes(tree, '.expand-todo-deadline-clear')).toHaveLength(0);
    expect(text(tree)).toContain('todo.noDeadline');
    trigger(tree, 'textarea', 'onChange', { target: { value: 'new notes' } });
    expect(props.onSaveDesc).toHaveBeenCalledWith(1, 'new notes');
    const event = { key: 'Enter', ctrlKey: true, preventDefault: vi.fn(), currentTarget: { blur: vi.fn() } };
    trigger(tree, 'textarea', 'onKeyDown', event);
    expect(event.currentTarget.blur).toHaveBeenCalledOnce();
  });
});
