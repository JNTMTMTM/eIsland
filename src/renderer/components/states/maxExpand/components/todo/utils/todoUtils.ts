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
 * @file todoUtils.ts
 * @description Todo 模块纯工具函数（格式化、规范化、持久化）。
 * @author 鸡哥
 */

import { LOCAL_STORAGE_KEY, STORE_KEY, TODOS_UPDATED_EVENT } from '../config/todoConfig';
import type { TodoItem } from '../types/todoTypes';
import { getTodoStartDate, parseTodoDate } from './todoCalendarUtils';

/** 格式化时间为 yyyy-mm-dd hh:mm:ss */
export function formatCreatedTime(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}

/** 规范化旧数据，补全缺失字段 */
export function normalizeTodos(items: TodoItem[]): TodoItem[] {
  return items.map(t => ({
    ...t,
    description: t.description ?? '',
    dueDate: t.dueDate && parseTodoDate(t.dueDate) && t.dueDate >= getTodoStartDate(t) ? t.dueDate : undefined,
    subTodos: (t.subTodos ?? []).map(s => ({
      ...s,
      priority: s.priority,
      size: s.size,
    })),
  }));
}

/** 通过 IPC 写入文件，同时同步写入 localStorage 作为缓存 */
export function persistTodos(items: TodoItem[]): void {
  try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items)); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent(TODOS_UPDATED_EVENT, { detail: items }));
  window.api.storeWrite(STORE_KEY, items).catch(() => {});
}
