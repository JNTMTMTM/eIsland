/**
 * @file TodoTab.tsx
 * @description 最大展开模式 Todo List Tab — 待办事项管理
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

/** 子待办 */
interface SubTodo {
  id: number;
  text: string;
  done: boolean;
}

/** 单条待办 */
interface TodoItem {
  id: number;
  text: string;
  done: boolean;
  createdAt: number;
  priority?: Priority;
  size?: Size;
  description?: string;
  subTodos?: SubTodo[];
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
 * @description 最大展开模式下的待办事项面板
 */
export function TodoTab(): React.ReactElement {
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<Priority | undefined>(undefined);
  const [size, setSize] = useState<Size | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [subInput, setSubInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const subInputRef = useRef<HTMLInputElement>(null);

  /** 持久化 */
  useEffect(() => { saveTodos(todos); }, [todos]);

  /** 添加待办 */
  const handleAdd = (): void => {
    const text = input.trim();
    if (!text) return;
    const now = Date.now();
    setTodos(prev => [...prev, { id: now, text, done: false, createdAt: now, priority, size, description: '', subTodos: [] }]);
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
    if (expandedId === id) setExpandedId(null);
  };

  /** 展开/收起 */
  const toggleExpand = (id: number): void => {
    setExpandedId(prev => prev === id ? null : id);
    setSubInput('');
  };

  /** 更新描述 */
  const updateDescription = (id: number, desc: string): void => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, description: desc } : t));
  };

  /** 添加子待办 */
  const addSubTodo = (parentId: number): void => {
    const text = subInput.trim();
    if (!text) return;
    setTodos(prev => prev.map(t => {
      if (t.id !== parentId) return t;
      const subs = t.subTodos ?? [];
      return { ...t, subTodos: [...subs, { id: Date.now(), text, done: false }] };
    }));
    setSubInput('');
    requestAnimationFrame(() => subInputRef.current?.focus());
  };

  /** 切换子待办完成 */
  const toggleSubDone = (parentId: number, subId: number): void => {
    setTodos(prev => prev.map(t => {
      if (t.id !== parentId) return t;
      return { ...t, subTodos: (t.subTodos ?? []).map(s => s.id === subId ? { ...s, done: !s.done } : s) };
    }));
  };

  /** 删除子待办 */
  const removeSubTodo = (parentId: number, subId: number): void => {
    setTodos(prev => prev.map(t => {
      if (t.id !== parentId) return t;
      return { ...t, subTodos: (t.subTodos ?? []).filter(s => s.id !== subId) };
    }));
  };

  const doneCount = todos.filter(t => t.done).length;
  const undoneCount = todos.length - doneCount;
  const p0Count = todos.filter(t => !t.done && t.priority === 'P0').length;
  const p1Count = todos.filter(t => !t.done && t.priority === 'P1').length;
  const p2Count = todos.filter(t => !t.done && t.priority === 'P2').length;

  return (
    <div className="expand-todo">
      {/* 标题栏 */}
      <div className="expand-todo-header">
        <span className="expand-todo-title">待办事项</span>
        <div className="expand-todo-stats">
          <span className="expand-todo-stat done">✓ {doneCount}</span>
          <span className="expand-todo-stat undone">○ {undoneCount}</span>
          {p0Count > 0 && <span className="expand-todo-stat p0">P0 {p0Count}</span>}
          {p1Count > 0 && <span className="expand-todo-stat p1">P1 {p1Count}</span>}
          {p2Count > 0 && <span className="expand-todo-stat p2">P2 {p2Count}</span>}
        </div>
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
        {todos.map(todo => {
          const isExpanded = expandedId === todo.id;
          const subs = todo.subTodos ?? [];
          const subDone = subs.filter(s => s.done).length;
          return (
            <div key={todo.id} className={`expand-todo-item ${todo.done ? 'done' : ''} ${isExpanded ? 'expanded' : ''}`}>
              {/* 标题行 */}
              <div className="expand-todo-row" onClick={() => toggleExpand(todo.id)}>
                <button
                  className="expand-todo-check"
                  onClick={(e) => { e.stopPropagation(); toggleDone(todo.id); }}
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
                  {subs.length > 0 && (
                    <span className="expand-todo-sub-count">{subDone}/{subs.length}</span>
                  )}
                  <span className="expand-todo-time">{formatCreatedTime(todo.createdAt ?? todo.id)}</span>
                </div>
                <span className={`expand-todo-arrow ${isExpanded ? 'open' : ''}`}>›</span>
                <button
                  className="expand-todo-delete"
                  onClick={(e) => { e.stopPropagation(); removeTodo(todo.id); }}
                  aria-label="删除"
                >
                  ×
                </button>
              </div>

              {/* 展开详情 */}
              {isExpanded && (
                <div className="expand-todo-detail" onClick={(e) => e.stopPropagation()}>
                  {/* 描述编辑 */}
                  <textarea
                    className="expand-todo-desc"
                    placeholder="添加详细描述..."
                    value={todo.description ?? ''}
                    onChange={(e) => updateDescription(todo.id, e.target.value)}
                    rows={2}
                  />

                  {/* 子待办列表 */}
                  <div className="expand-todo-subs">
                    <div className="expand-todo-subs-header">
                      <span className="expand-todo-subs-title">子任务</span>
                      {subs.length > 0 && <span className="expand-todo-subs-progress">{subDone}/{subs.length}</span>}
                    </div>
                    {subs.map(sub => (
                      <div key={sub.id} className={`expand-todo-sub ${sub.done ? 'done' : ''}`}>
                        <button
                          className="expand-todo-sub-check"
                          onClick={() => toggleSubDone(todo.id, sub.id)}
                        >
                          {sub.done ? '✓' : '○'}
                        </button>
                        <span className="expand-todo-sub-text">{sub.text}</span>
                        <button
                          className="expand-todo-sub-delete"
                          onClick={() => removeSubTodo(todo.id, sub.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {/* 添加子待办 */}
                    <div className="expand-todo-sub-add">
                      <input
                        ref={subInputRef}
                        className="expand-todo-sub-input"
                        type="text"
                        placeholder="添加子任务..."
                        value={subInput}
                        onChange={(e) => setSubInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); addSubTodo(todo.id); }
                        }}
                      />
                      <button className="expand-todo-sub-add-btn" onClick={() => addSubTodo(todo.id)}>+</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
