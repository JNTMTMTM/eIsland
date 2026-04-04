/**
 * @file TodoTab.tsx
 * @description Expanded Todo List Tab — 待办事项管理
 * @author 鸡哥
 */

import React, { useState, useRef, useEffect } from 'react';

/** 紧急程度 */
type Priority = 'P0' | 'P1' | 'P2';

/** 事件大小 */
type Size = 'S' | 'M' | 'L' | 'XL';

/** 优先级配置 */
const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'P0', label: 'P0', color: '#ff5252' },
  { value: 'P1', label: 'P1', color: '#ffab40' },
  { value: 'P2', label: 'P2', color: '#69c0ff' },
];

/** 大小配置 */
const SIZES: { value: Size; label: string; color: string }[] = [
  { value: 'S', label: 'S', color: '#81c784' },
  { value: 'M', label: 'M', color: '#64b5f6' },
  { value: 'L', label: 'L', color: '#ffb74d' },
  { value: 'XL', label: 'XL', color: '#e57373' },
];

/** 单条待办 */
interface TodoItem {
  id: number;
  text: string;
  done: boolean;
  createdAt: number;
  priority?: Priority;
  size?: Size;
}

/** 格式化时间为 yyyy-mm-dd hh:mm:ss */
function formatCreatedTime(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
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
  const [priority, setPriority] = useState<Priority | undefined>(undefined);
  const [size, setSize] = useState<Size | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /** 持久化 */
  useEffect(() => { saveTodos(todos); }, [todos]);

  /** 添加待办 */
  const handleAdd = (): void => {
    const text = input.trim();
    if (!text) return;
    const now = Date.now();
    setTodos(prev => [...prev, { id: now, text, done: false, createdAt: now, priority, size }]);
    setInput('');
    setPriority(undefined);
    setSize(undefined);
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
      {/* 标题栏 */}
      <div className="expand-todo-header">
        <span className="expand-todo-title">待办事项</span>
        <span className="expand-todo-badge">{todos.length}</span>
      </div>

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
        {/* 紧急程度选择 */}
        <div className="expand-todo-selector">
          {PRIORITIES.map(p => (
            <button
              key={p.value}
              className={`expand-todo-tag ${priority === p.value ? 'active' : ''}`}
              style={{ '--tag-color': p.color } as React.CSSProperties}
              onClick={() => setPriority(priority === p.value ? undefined : p.value)}
              title={`紧急程度 ${p.label}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {/* 大小选择 */}
        <div className="expand-todo-selector">
          {SIZES.map(s => (
            <button
              key={s.value}
              className={`expand-todo-tag size ${size === s.value ? 'active' : ''}`}
              style={{ '--tag-color': s.color } as React.CSSProperties}
              onClick={() => setSize(size === s.value ? undefined : s.value)}
              title={`事件大小 ${s.label}`}
            >
              {s.label}
            </button>
          ))}
        </div>
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
            <div className="expand-todo-body">
              <span className="expand-todo-text">{todo.text}</span>
              {todo.priority && (
                <span
                  className="expand-todo-priority-badge"
                  style={{ '--tag-color': PRIORITIES.find(p => p.value === todo.priority)?.color } as React.CSSProperties}
                >
                  {todo.priority}
                </span>
              )}
              {todo.size && (
                <span
                  className="expand-todo-size-badge"
                  style={{ '--tag-color': SIZES.find(s => s.value === todo.size)?.color } as React.CSSProperties}
                >
                  {todo.size}
                </span>
              )}
              <span className="expand-todo-time">{formatCreatedTime(todo.createdAt ?? todo.id)}</span>
            </div>
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
    </div>
  );
}
