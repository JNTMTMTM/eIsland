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
 * @file TodoList.tsx
 * @description Todo 列表容器组件：简洁空状态 + 待办条目列表。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { TodoListProps } from '../types/todoTypes';
import { TodoItem } from './TodoItem';

/**
 * Todo 列表容器
 * @description 空状态时显示简短提示，有待办时渲染条目列表
 */
export function TodoList({
  todos, expandedId,
  subInput, setSubInput, subPriority, setSubPriority, subSize, setSubSize, subInputRef,
  listRef,
  onToggleDone, onRemove, onToggleExpand, onSaveTitle, onSaveSubTitle, onSaveDesc, onSetDueDate,
  onAddSubTodo, onToggleSubDone, onRemoveSubTodo,
}: TodoListProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="expand-todo-list" ref={listRef}>
      {todos.length === 0 && (
        <div className="expand-todo-empty">{t('todo.empty')}</div>
      )}
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          todos={todos}
          isExpanded={expandedId === todo.id}
          subInput={subInput}
          setSubInput={setSubInput}
          subPriority={subPriority}
          setSubPriority={setSubPriority}
          subSize={subSize}
          setSubSize={setSubSize}
          subInputRef={subInputRef}
          onToggleDone={onToggleDone}
          onRemove={onRemove}
          onToggleExpand={onToggleExpand}
          onSaveTitle={onSaveTitle}
          onSaveSubTitle={onSaveSubTitle}
          onSaveDesc={onSaveDesc}
          onSetDueDate={onSetDueDate}
          onAddSubTodo={onAddSubTodo}
          onToggleSubDone={onToggleSubDone}
          onRemoveSubTodo={onRemoveSubTodo}
        />
      ))}
    </div>
  );
}
