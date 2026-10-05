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
 * @file todoWidget.test.tsx
 * @description TodoWidget 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { byClass, invoke, text } from '../../../../../../test/tree';

import { TodoWidget } from '../TodoWidget';
import type { TreeElement } from '../../../../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));

function fixture() { return { todos: [{ id: 1, text: 'Task', done: false, createdAt: 1, priority: 'P0' as const, description: 'Details', subTodos: [{ id: 2, text: 'Subtask', done: true }] }, { id: 3, text: 'Finished', done: true, createdAt: 1 }], expandedId: 1 as number | null, onOpenTodoPage: vi.fn(), onToggleExpand: vi.fn(), onToggleDone: vi.fn(), onToggleSubDone: vi.fn(), onRemoveTodo: vi.fn() }; }
describe('TodoWidget', () => {
  it('renders priority counts, completed tasks and expanded details', () => { const root = ((TodoWidget(fixture()) as TreeElement)); expect(text(root)).toContain('P0 1'); expect(text(root)).toContain('Details'); expect(text(root)).toContain('Subtask'); expect(text(root)).toContain('Finished'); });
  it('forwards expand, completion, removal and subtask actions with identifiers', () => { const props = fixture(); const root = ((TodoWidget(props) as TreeElement)); const stopPropagation = vi.fn(); invoke(byClass(root, 'ov-dash-todo-row'), 'onClick'); expect(props.onToggleExpand).toHaveBeenCalledWith(1); invoke(byClass(root, 'ov-dash-todo-check'), 'onClick', { stopPropagation }); expect(props.onToggleDone).toHaveBeenCalledWith(1); invoke(byClass(root, 'ov-dash-todo-delete'), 'onClick', { stopPropagation }); expect(props.onRemoveTodo).toHaveBeenCalledWith(1); invoke(byClass(root, 'ov-dash-todo-sub-check'), 'onClick'); expect(props.onToggleSubDone).toHaveBeenCalledWith(1, 2); expect(stopPropagation).toHaveBeenCalledTimes(2); });
  it('omits collapsed details and handles empty list', () => { const props = fixture(); props.expandedId = null; expect(text(((TodoWidget(props) as TreeElement)))).not.toContain('Details'); props.todos = []; const root = ((TodoWidget(props) as TreeElement)); expect(text(root)).toContain('overview.todo.empty'); invoke(byClass(root, 'ov-dash-todo-title'), 'onClick'); expect(props.onOpenTodoPage).toHaveBeenCalledOnce(); });
});
