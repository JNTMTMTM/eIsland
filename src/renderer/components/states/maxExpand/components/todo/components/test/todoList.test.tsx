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
 * @file todoList.test.tsx
 * @description TodoList 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, text } from '../../../../test/componentHarness';
import { TodoList as Component } from '../TodoList';
import { TodoItem } from '../TodoItem';
describe('TodoList', () => {
  it('shows an empty state and marks only the expanded ID', () => {
    expect(text(render(Component, { todos: [] }))).toContain('todo.empty');
    const onRemove = vi.fn();
    const todos = [{ id: 1, text: 'first' }, { id: 2, text: 'second' }];
    const tree = render(Component, {
      todos,
      onRemove,
      expandedId: 2
    });
    expect(nodes(tree, TodoItem)).toHaveLength(2);
    expect(value(tree, TodoItem, 'isExpanded')).toBe(false);
    expect(value(tree, TodoItem, 'isExpanded', 1)).toBe(true);
    expect(value(tree, TodoItem, 'onRemove')).toBe(onRemove);
    expect(nodes(tree, '.expand-todo-empty')).toHaveLength(0);
  });
});
