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
 * @file todoItemRuntime.test.tsx
 * @description 真实待办父组件标题保存、键盘与子任务选择回调及旧数据边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../calendar/hooks/test/calendarHookHarness';
import { byClass, elements, find, invoke } from '../../../../../test/tree';
import { TodoItem } from '../TodoItem';
import type { TodoItemProps, TodoItem as TodoData } from '../../types/todoTypes';
const callbacks = {
  onToggleDone: vi.fn(),
  onRemove: vi.fn(),
  onToggleExpand: vi.fn(),
  onSaveTitle: vi.fn(),
  onSaveSubTitle: vi.fn(),
  onSaveDesc: vi.fn(),
  onSetDueDate: vi.fn(),
  onAddSubTodo: vi.fn(),
  onToggleSubDone: vi.fn(),
  onRemoveSubTodo: vi.fn(),
  setSubInput: vi.fn(),
  setSubPriority: vi.fn<TodoItemProps['setSubPriority']>(),
  setSubSize: vi.fn<TodoItemProps['setSubSize']>()
};
/** 构建真实条目合法公开属性。
 * @param todo - 任务
 * @returns 完整属性
 */
function props(todo: TodoData): TodoItemProps {
  return {
    todo,
    ...callbacks,
    todos: [todo],
    isExpanded: true,
    subInput: 'child',
    subPriority: 'P0',
    subSize: 'S',
    subInputRef: {
      current: null
    }
  };
}
beforeEach(() => {
  resetHook();
  vi.clearAllMocks();
});
afterEach(unmountHook);
describe('TodoItem runtime', () => {
  it('routes title save, expansion, detail stop, child text and add action', () => {
    const todo: TodoData = {
      id: 1,
      createdAt: 1,
      text: 'work',
      done: false,
      subTodos: [{
        id: 2,
        text: 'child',
        done: false
      }]
    };
    const tree = renderHook(() => TodoItem(props(todo)));
    flushHookEffects();
    invoke(find(tree, (n) => typeof n.type === 'function' && n.type.name === 'TodoTitleInput'), 'onSave', 'new');
    expect(callbacks.onSaveTitle).toHaveBeenCalledWith(1, 'new');
    invoke(byClass(tree, 'expand-todo-body'), 'onClick');
    expect(callbacks.onToggleExpand).toHaveBeenCalledWith(1);
    const stopPropagation = vi.fn();
    invoke(byClass(tree, 'expand-todo-detail'), 'onClick', {
      stopPropagation
    });
    expect(stopPropagation).toHaveBeenCalledOnce();
    invoke(byClass(tree, 'expand-todo-sub-input'), 'onChange', {
      target: {
        value: 'next'
      }
    });
    expect(callbacks.setSubInput).toHaveBeenCalledWith('next');
    invoke(byClass(tree, 'expand-todo-sub-input'), 'onKeyDown', {
      key: 'Tab'
    });
    expect(callbacks.onAddSubTodo).not.toHaveBeenCalled();
    invoke(byClass(tree, 'expand-todo-sub-add-btn'), 'onClick');
    expect(callbacks.onAddSubTodo).toHaveBeenCalledWith(1);
    const currentTarget = {};
    const preventDefault = vi.fn();
    invoke(byClass(tree, 'expand-todo-body'), 'onKeyDown', {
      currentTarget,
      preventDefault,
      target: currentTarget,
      key: ' '
    });
    expect(preventDefault).toHaveBeenCalledOnce();
    invoke(byClass(tree, 'expand-todo-body'), 'onKeyDown', {
      currentTarget,
      preventDefault,
      target: currentTarget,
      key: 'Tab'
    });
    expect(preventDefault).toHaveBeenCalledOnce();
  });
  it('each selected and unselected child priority/size executes actual toggle closures', () => {
    const tree = renderHook(() => TodoItem(props({
      id: 1,
      createdAt: 1,
      text: 'task',
      done: false
    })));
    const tags = elements(tree).filter((n) => n.type === 'button' && String(n.props.className).includes('expand-todo-tag'));
    tags.forEach((n) => invoke(n, 'onClick'));
    expect(callbacks.setSubPriority.mock.calls.map((c) => c[0])).toEqual([undefined, 'P1', 'P2']);
    expect(callbacks.setSubSize.mock.calls.map((c) => c[0])).toEqual([undefined, 'M', 'L', 'XL']);
  });
  it('legacy persisted unknown metadata has no color and missing creation time uses the ID', () => {
    const todo = JSON.parse('{"id":1,"text":"legacy","done":true,"priority":"unknown","size":"unknown"}') as TodoData;
    const tree = renderHook(() => TodoItem(props(todo)));
    expect(byClass(tree, 'expand-todo-priority-badge').props.style).toMatchObject({
      '--tag-color': undefined
    });
    expect(byClass(tree, 'expand-todo-size-badge').props.style).toMatchObject({
      '--tag-color': undefined
    });
    expect(find(tree, (n) => typeof n.type === 'function' && n.type.name === 'TodoTitleInput').props.text).toBe('legacy');
  });
});
