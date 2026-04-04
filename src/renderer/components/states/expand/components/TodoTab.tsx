/**
 * @file TodoTab.tsx
 * @description Expanded Todo List Tab — 待办事项管理
 * @author 鸡哥
 */

import React, { useState, useRef, useEffect } from 'react';

/** 单条待办 */
interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

/** 本地存储 key */
const STORAGE_KEY = 'eIsland_todos';

/** 从 localStorage 读取 */
function loadTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** 写入 localStorage */
function saveTodos(items: TodoItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Todo List Tab
 * @description 展开状态下的待办事项面板
 */
export function TodoTab(): React.ReactElement {
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /** 持久化 */
  useEffect(() => { saveTodos(todos); }, [todos]);

  /** 添加待办 */
  const handleAdd = (): void => {
    const text = input.trim();
    if (!text) return;
    setTodos(prev => [...prev, { id: Date.now(), text, done: false }]);
    setInput('');
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  /** 回车添加 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
  };

  /** 切换完成 */
  const toggleDone = (id: number): void => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  /** 删除 */
  const removeTodo = (id: number): void => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  /** 清除已完成 */
  const clearDone = (): void => {
    setTodos(prev => prev.filter(t => !t.done));
  };

  const doneCount = todos.filter(t => t.done).length;

  return (
    <div className="expand-todo">
      {/* 输入栏 */}
      <div className="expand-todo-input-bar">
        <input
          ref={inputRef}
          className="expand-todo-input"
          type="text"
          placeholder="添加待办..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="expand-todo-add" onClick={handleAdd}>+</button>
      </div>

      {/* 列表 */}
      <div className="expand-todo-list" ref={listRef}>
        {todos.length === 0 && (
          <div className="expand-todo-empty">暂无待办</div>
        )}
        {todos.map(todo => (
          <div key={todo.id} className={`expand-todo-item ${todo.done ? 'done' : ''}`}>
            <button
              className="expand-todo-check"
              onClick={() => toggleDone(todo.id)}
              aria-label={todo.done ? '标记未完成' : '标记完成'}
            >
              {todo.done ? '✓' : '○'}
            </button>
            <span className="expand-todo-text">{todo.text}</span>
            <button
              className="expand-todo-delete"
              onClick={() => removeTodo(todo.id)}
              aria-label="删除"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* 底栏 */}
      {todos.length > 0 && (
        <div className="expand-todo-footer">
          <span className="expand-todo-count">{doneCount}/{todos.length} 已完成</span>
          {doneCount > 0 && (
            <button className="expand-todo-clear" onClick={clearDone}>清除已完成</button>
          )}
        </div>
      )}
    </div>
  );
}
