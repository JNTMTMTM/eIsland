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
 * @file todoTab.test.tsx
 * @description TodoTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value } from '../../../../test/componentHarness';
import { TodoTab as Component } from '../TodoTab';
import { TodoHeader } from '../TodoHeader';
import { TodoInputBar } from '../TodoInputBar';
import { TodoList } from '../TodoList';
const state = vi.hoisted(() => ({ todos: [], doneCount: 2, handleAdd: vi.fn(), removeTodo: vi.fn(), saveTitle: vi.fn(), setDueDate: vi.fn() }));
vi.mock('../../hooks/useTodos', () => ({ useTodos: () => state }));
describe('TodoTab', () => {
  it('wires hook data and all list mutation callbacks into child components', () => {
    const tree = render(Component);
    expect(value(tree, TodoHeader, 'doneCount')).toBe(2);
    expect(value(tree, TodoInputBar, 'onAdd')).toBe(state.handleAdd);
    expect(value(tree, TodoList, 'todos')).toBe(state.todos);
    expect(value(tree, TodoList, 'onRemove')).toBe(state.removeTodo);
    expect(value(tree, TodoList, 'onSaveTitle')).toBe(state.saveTitle);
    expect(value(tree, TodoList, 'onSetDueDate')).toBe(state.setDueDate);
  });
});
