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
 * @file TodoTab.tsx
 * @description 最大展开模式 Todo List Tab — 仅负责 hook 调用与组件组合。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTodos } from '../hooks/useTodos';
import { TodoHeader } from './TodoHeader';
import { TodoInputBar } from './TodoInputBar';
import { TodoList } from './TodoList';

/**
 * Todo List Tab
 * @description 最大展开模式下的待办事项面板：hook 调用 → 组件组合
 */
export function TodoTab(): ReactElement {
  const {
    todos, expandedId,
    input, setInput, priority, setPriority, size, setSize,
    subInput, setSubInput, subPriority, setSubPriority, subSize, setSubSize,
    inputRef, listRef, subInputRef,
    doneCount, undoneCount, p0Count, p1Count, p2Count,
    handleAdd, handleKeyDown,
    toggleDone, removeTodo, toggleExpand,
    saveDesc, setDueDate,
    addSubTodo, toggleSubDone, removeSubTodo,
  } = useTodos();

  return (
    <div className="expand-todo">
      <TodoHeader
        doneCount={doneCount}
        undoneCount={undoneCount}
        p0Count={p0Count}
        p1Count={p1Count}
        p2Count={p2Count}
      />

      <TodoInputBar
        input={input}
        setInput={setInput}
        priority={priority}
        setPriority={setPriority}
        size={size}
        setSize={setSize}
        inputRef={inputRef}
        onAdd={handleAdd}
        onKeyDown={handleKeyDown}
      />

      <TodoList
        todos={todos}
        expandedId={expandedId}
        subInput={subInput}
        setSubInput={setSubInput}
        subPriority={subPriority}
        setSubPriority={setSubPriority}
        subSize={subSize}
        setSubSize={setSubSize}
        subInputRef={subInputRef}
        listRef={listRef}
        onToggleDone={toggleDone}
        onRemove={removeTodo}
        onToggleExpand={toggleExpand}
        onSaveDesc={saveDesc}
        onSetDueDate={setDueDate}
        onAddSubTodo={addSubTodo}
        onToggleSubDone={toggleSubDone}
        onRemoveSubTodo={removeSubTodo}
      />
    </div>
  );
}
