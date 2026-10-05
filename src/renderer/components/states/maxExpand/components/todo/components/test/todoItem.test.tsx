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
 * @file todoItem.test.tsx
 * @description TodoItem 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { TodoItem as Component } from '../TodoItem';

describe('TodoItem', () => {
  const todo = { id: 1, text: 'task', done: false, createdAt: 1, subTodos: [{ id: 2, done: true }, { id: 3, done: false }], description: 'notes', dueDate: '2026-10-15', priority: 'P0', size: 'S' };
  const props = { todo, todos: [todo], isExpanded: false, subInput: '', subInputRef: { current: null }, onToggleDone: vi.fn(), onRemove: vi.fn(), onToggleExpand: vi.fn(), onAddSubTodo: vi.fn() };
  it('keeps collapsed details inert and restores the shared input ref when expanded', () => {
    const tree = render(Component, props);
    expect(value(tree, '.expand-todo-collapse', 'inert')).toBe(true);
    expect(value(tree, '.expand-todo-sub-input', 'ref')).toBeUndefined();
    expect(text(tree)).toContain('1/2');
    const expanded = render(Component, { ...props, isExpanded: true, subInput: 'child', todo: { ...todo, done: true } });
    expect(value(expanded, '.expand-todo-collapse', 'inert')).toBe(false);
    expect(value(expanded, '.expand-todo-sub-input', 'ref')).toBe(props.subInputRef);
    expect(value(expanded, '.expand-todo-check', 'aria-pressed')).toBe(true);
    expect(value(expanded, '.expand-todo-sub-add-btn', 'disabled')).toBe(false);
  });
  it('routes click and keyboard actions without allowing nested title events to toggle', () => {
    const tree = render(Component, props);
    const event = { stopPropagation: vi.fn(), preventDefault: vi.fn(), key: 'Enter', currentTarget: {}, target: {} };
    trigger(tree, '.expand-todo-check', 'onClick', event);
    trigger(tree, '.expand-todo-delete', 'onClick', event);
    trigger(tree, '.expand-todo-body', 'onKeyDown', event);
    expect(props.onToggleExpand).not.toHaveBeenCalled();
    trigger(tree, '.expand-todo-body', 'onKeyDown', { ...event, target: event.currentTarget });
    expect(props.onToggleDone).toHaveBeenCalledWith(1);
    expect(props.onRemove).toHaveBeenCalledWith(1);
    expect(props.onToggleExpand).toHaveBeenCalledWith(1);
    trigger(tree, '.expand-todo-sub-input', 'onKeyDown', event);
    expect(props.onAddSubTodo).toHaveBeenCalledWith(1);
  });
  it('omits optional badges and progress for a task without metadata', () => {
    const tree = render(Component, { ...props, todo: { id: 1, text: 'bare', done: false } });
    expect(nodes(tree, '.expand-todo-progress-wrap')).toHaveLength(0);
    expect(nodes(tree, '.expand-todo-deadline-badge')).toHaveLength(0);
    expect(nodes(tree, '.expand-todo-desc-preview')).toHaveLength(0);
  });
});
