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
 * @file useTodos.ts
 * @description Todo 模块状态管理 hook：加载、持久化、增删改查等全部逻辑。
 * @author 鸡哥
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { LOCAL_STORAGE_KEY, STORE_KEY } from '../config/todoConfig';
import type { Priority, Size, TodoItem, UseTodosReturn } from '../types/todoTypes';
import { normalizeTodos, persistTodos } from '../utils/todoUtils';
import { getTodoStartDate, parseTodoDate } from '../utils/todoCalendarUtils';

/**
 * Todo 模块状态管理 hook
 * @description 封装 TodoTab 的全部状态与操作逻辑
 */
export function useTodos(): UseTodosReturn {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<Priority | undefined>(undefined);
  const [size, setSize] = useState<Size | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [subInput, setSubInput] = useState('');
  const [subPriority, setSubPriority] = useState<Priority | undefined>(undefined);
  const [subSize, setSubSize] = useState<Size | undefined>(undefined);
  const skipPersistOnceRef = useRef(false);
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
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
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
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
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

  /** 直接编辑描述时同步保存，避免切换条目丢失草稿。 */
  const saveDesc = (id: number, description: string): void => {
    update(prev => prev.map(todo => todo.id === id ? { ...todo, description } : todo));
  };

  /** 截止日期按本地日历保存，不能早于任务创建日期。 */
  const setDueDate = (id: number, dueDate: string): void => {
    if (dueDate && !parseTodoDate(dueDate)) return;
    update(prev => prev.map(todo => {
      if (todo.id !== id || (dueDate && dueDate < getTodoStartDate(todo))) return todo;
      return { ...todo, dueDate: dueDate || undefined };
    }));
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

  return {
    todos,
    input, setInput,
    priority, setPriority,
    size, setSize,
    expandedId,
    subInput, setSubInput,
    subPriority, setSubPriority,
    subSize, setSubSize,
    inputRef, listRef, subInputRef,
    doneCount, undoneCount,
    p0Count, p1Count, p2Count,
    handleAdd, handleKeyDown,
    toggleDone, removeTodo, toggleExpand,
    saveDesc, setDueDate,
    addSubTodo, toggleSubDone, removeSubTodo,
  };
}
