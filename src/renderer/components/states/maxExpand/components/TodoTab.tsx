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
 * @description 最大展开模式 Todo List Tab — 待办事项管理
 * @author 鸡哥
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

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
  priority?: Priority;
  size?: Size;
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

/** 存储键名（对应 userData/eIsland_store/todos.json） */
const STORE_KEY = 'todos';

/** 规范化旧数据，补全缺失字段 */
function normalizeTodos(items: TodoItem[]): TodoItem[] {
  return items.map(t => ({
    ...t,
    description: t.description ?? '',
    subTodos: (t.subTodos ?? []).map(s => ({
      ...s,
      priority: s.priority,
      size: s.size,
    })),
  }));
}

/** 通过 IPC 写入文件，同时同步写入 localStorage 作为缓存 */
function persistTodos(items: TodoItem[]): void {
  try { localStorage.setItem('eIsland_todos', JSON.stringify(items)); } catch { /* noop */ }
  window.api.storeWrite(STORE_KEY, items).catch(() => {});
}

/**
 * Todo List Tab
 * @description 最大展开模式下的待办事项面板
 */
export function TodoTab(): React.ReactElement {
  const { t } = useTranslation();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<Priority | undefined>(undefined);
  const [size, setSize] = useState<Size | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [subInput, setSubInput] = useState('');
  const [subPriority, setSubPriority] = useState<Priority | undefined>(undefined);
  const [subSize, setSubSize] = useState<Size | undefined>(undefined);
  const [editingDescId, setEditingDescId] = useState<number | null>(null);
  const [descDraft, setDescDraft] = useState('');
  const skipPersistOnceRef = useRef(false);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const subInputRef = useRef<HTMLInputElement>(null);

  /** 启动时从文件加载（回退到 localStorage） */
  useEffect(() => {
    let cancelled = false;
    const applyTodos = (data: unknown): void => {
      if (!Array.isArray(data)) return;
      skipPersistOnceRef.current = true;
      setTodos(normalizeTodos(data as TodoItem[]));
    };

    window.api.storeRead(STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data) && data.length > 0) {
        setTodos(normalizeTodos(data as TodoItem[]));
      } else {
        // 回退：从 localStorage 迁移旧数据
        try {
          const raw = localStorage.getItem('eIsland_todos');
          if (raw) {
            const items = normalizeTodos(JSON.parse(raw) as TodoItem[]);
            setTodos(items);
            window.api.storeWrite(STORE_KEY, items).catch(() => {});
          }
        } catch { /* noop */ }
      }
      setLoaded(true);
    }).catch(() => {
      // IPC 失败，从 localStorage 兜底
      try {
        const raw = localStorage.getItem('eIsland_todos');
        if (raw) setTodos(normalizeTodos(JSON.parse(raw) as TodoItem[]));
      } catch { /* noop */ }
      if (!cancelled) setLoaded(true);
    });

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${STORE_KEY}`) {
        applyTodos(value);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  /** todos 变化时持久化（跳过初始空状态） */
  useEffect(() => {
    if (!loaded) return;
    if (skipPersistOnceRef.current) {
      skipPersistOnceRef.current = false;
      return;
    }
    persistTodos(todos);
  }, [todos, loaded]);

  /** 更新状态的便捷方法 */
  const update = useCallback((updater: (prev: TodoItem[]) => TodoItem[]): void => {
    setTodos(updater);
  }, []);

  /** 添加待办 */
  const handleAdd = (): void => {
    const text = input.trim();
    if (!text) return;
    const now = Date.now();
    update(prev => [...prev, { id: now, text, done: false, createdAt: now, priority, size, description: '', subTodos: [] }]);
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
    update(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  /** 删除 */
  const removeTodo = (id: number): void => {
    update(prev => prev.filter(t => t.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  /** 展开/收起 */
  const toggleExpand = (id: number): void => {
    setExpandedId(prev => prev === id ? null : id);
    setSubInput('');
    setSubPriority(undefined);
    setSubSize(undefined);
  };

  /** 进入描述编辑模式 */
  const startEditDesc = (todo: TodoItem): void => {
    setEditingDescId(todo.id);
    setDescDraft(todo.description ?? '');
    requestAnimationFrame(() => descRef.current?.focus());
  };

  /** 保存描述 */
  const saveDesc = (id: number): void => {
    update(prev => prev.map(t => t.id === id ? { ...t, description: descDraft } : t));
    setEditingDescId(null);
  };

  /** 添加子待办 */
  const addSubTodo = (parentId: number): void => {
    const text = subInput.trim();
    if (!text) return;
    update(prev => prev.map(t => {
      if (t.id !== parentId) return t;
      const subs = t.subTodos ?? [];
      return { ...t, subTodos: [...subs, { id: Date.now(), text, done: false, priority: subPriority, size: subSize }] };
    }));
    setSubInput('');
    setSubPriority(undefined);
    setSubSize(undefined);
    requestAnimationFrame(() => subInputRef.current?.focus());
  };

  /** 切换子待办完成 */
  const toggleSubDone = (parentId: number, subId: number): void => {
    update(prev => prev.map(t => {
      if (t.id !== parentId) return t;
      return { ...t, subTodos: (t.subTodos ?? []).map(s => s.id === subId ? { ...s, done: !s.done } : s) };
    }));
  };

  /** 删除子待办 */
  const removeSubTodo = (parentId: number, subId: number): void => {
    update(prev => prev.map(t => {
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
        <span className="expand-todo-title">{t('todo.title', { defaultValue: '待办事项' })}</span>
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
          placeholder={t('todo.addPlaceholder', { defaultValue: '添加待办...' })}
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
              title={t('todo.priorityTitle', { defaultValue: '紧急程度 {{label}}', label: p.label })}
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
              title={t('todo.sizeTitle', { defaultValue: '事件大小 {{label}}', label: s.label })}
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
          <div className="expand-todo-onboarding">
            <div className="expand-todo-onboarding-icon">
              <span className="onboarding-check">✓</span>
              <span className="onboarding-circle" />
            </div>
            <div className="expand-todo-onboarding-title">{t('todo.onboarding.title', { defaultValue: '待办事项' })}</div>
            <div className="expand-todo-onboarding-desc">
              {t('todo.onboarding.desc', { defaultValue: '在这里管理你的任务，保持高效有序' })}
            </div>
            <div className="expand-todo-onboarding-features">
              <div className="onboarding-feature">
                <span className="onboarding-feature-dot" />
                <span>{t('todo.onboarding.feature1', { defaultValue: '创建待办并设置紧急程度与大小' })}</span>
              </div>
              <div className="onboarding-feature">
                <span className="onboarding-feature-dot" />
                <span>{t('todo.onboarding.feature2', { defaultValue: '点击展开查看详情，添加描述' })}</span>
              </div>
              <div className="onboarding-feature">
                <span className="onboarding-feature-dot" />
                <span>{t('todo.onboarding.feature3', { defaultValue: '拆分子任务，追踪完成进度' })}</span>
              </div>
            </div>
            <div className="expand-todo-onboarding-hint">{t('todo.onboarding.hint', { defaultValue: '在上方输入框添加你的第一个待办 ↑' })}</div>
          </div>
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
                  aria-label={todo.done
                    ? t('todo.markUndone', { defaultValue: '标记未完成' })
                    : t('todo.markDone', { defaultValue: '标记完成' })}
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
                    <span className="expand-todo-progress-wrap">
                      <span className="expand-todo-progress-bar">
                        <span className="expand-todo-progress-fill" style={{ width: `${subs.length > 0 ? (subDone / subs.length) * 100 : 0}%` }} />
                      </span>
                      <span className="expand-todo-progress-label">{subDone}/{subs.length}</span>
                    </span>
                  )}
                  <span className="expand-todo-time">{formatCreatedTime(todo.createdAt ?? todo.id)}</span>
                </div>
                {!isExpanded && todo.description && (
                  <span className="expand-todo-desc-preview" title={todo.description}>{todo.description}</span>
                )}
                <span className={`expand-todo-arrow ${isExpanded ? 'open' : ''}`}>›</span>
                <button
                  className="expand-todo-delete"
                  onClick={(e) => { e.stopPropagation(); removeTodo(todo.id); }}
                  aria-label={t('todo.delete', { defaultValue: '删除' })}
                >
                  ×
                </button>
              </div>

              {/* 展开详情 */}
              {isExpanded && (
                <div className="expand-todo-detail" onClick={(e) => e.stopPropagation()}>
                  {/* 描述区域 */}
                  <div className="expand-todo-desc-area">
                    {editingDescId === todo.id ? (
                      <>
                        <textarea
                          ref={descRef}
                          className="expand-todo-desc"
                          placeholder={t('todo.descPlaceholder', { defaultValue: '添加详细描述...' })}
                          value={descDraft}
                          onChange={(e) => setDescDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveDesc(todo.id); }
                          }}
                          rows={3}
                        />
                        <button className="expand-todo-desc-btn save" onClick={() => saveDesc(todo.id)} title={t('todo.saveTitle', { defaultValue: '保存 (Ctrl+Enter)' })}>{t('todo.save', { defaultValue: '保存' })}</button>
                      </>
                    ) : (
                      <>
                        <div className="expand-todo-desc-text">
                          {todo.description ? todo.description : <span className="expand-todo-desc-empty">{t('todo.noDesc', { defaultValue: '暂无描述' })}</span>}
                        </div>
                        <button className="expand-todo-desc-btn edit" onClick={() => startEditDesc(todo)} title={t('todo.editDescTitle', { defaultValue: '编辑描述' })}>{t('todo.edit', { defaultValue: '编辑' })}</button>
                      </>
                    )}
                  </div>

                  {/* 子待办列表 */}
                  <div className="expand-todo-subs">
                    <div className="expand-todo-subs-header">
                      <span className="expand-todo-subs-title">{t('todo.subtasks', { defaultValue: '子任务' })}</span>
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
                        {sub.priority && (
                          <span
                            className="expand-todo-priority-badge"
                            style={{ '--tag-color': PRIORITIES.find(p => p.value === sub.priority)?.color } as React.CSSProperties}
                          >
                            {sub.priority}
                          </span>
                        )}
                        {sub.size && (
                          <span
                            className="expand-todo-size-badge"
                            style={{ '--tag-color': SIZES.find(s => s.value === sub.size)?.color } as React.CSSProperties}
                          >
                            {sub.size}
                          </span>
                        )}
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
                        placeholder={t('todo.addSubPlaceholder', { defaultValue: '添加子任务...' })}
                        value={subInput}
                        onChange={(e) => setSubInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); addSubTodo(todo.id); }
                        }}
                      />
                      <div className="expand-todo-selector">
                        {PRIORITIES.map(p => (
                          <button
                            key={p.value}
                            className={`expand-todo-tag ${subPriority === p.value ? 'active' : ''}`}
                            style={{ '--tag-color': p.color } as React.CSSProperties}
                            onClick={() => setSubPriority(subPriority === p.value ? undefined : p.value)}
                            title={p.label}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div className="expand-todo-selector">
                        {SIZES.map(s => (
                          <button
                            key={s.value}
                            className={`expand-todo-tag size ${subSize === s.value ? 'active' : ''}`}
                            style={{ '--tag-color': s.color } as React.CSSProperties}
                            onClick={() => setSubSize(subSize === s.value ? undefined : s.value)}
                            title={s.label}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
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
