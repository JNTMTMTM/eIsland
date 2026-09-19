/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file useCalendarTodos.ts
 * @description 只读订阅现有待办文件与跨窗口更新，不改写待办数据。
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import { LOCAL_STORAGE_KEY, STORE_KEY, TODOS_UPDATED_EVENT } from '../../todo/config/todoConfig';
import type { TodoItem } from '../../todo/types/todoTypes';
import { normalizeTodos } from '../../todo/utils/todoUtils';

/**
 * 读取共享待办并订阅更新，避免较晚的初始读取覆盖实时广播。
 * @returns 最新待办列表
 */
export function useCalendarTodos(): TodoItem[] {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  useEffect(() => {
    let active = true;
    let updated = false;
    const apply = (value: unknown): void => {
      if (active && Array.isArray(value)) setTodos(normalizeTodos(value as TodoItem[]));
    };
    const fallback = (): void => {
      try { apply(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? '[]')); } catch { /* 无可用缓存时保留空列表。 */ }
    };
    const unsubscribe = window.api.onSettingsChanged((channel, value) => {
      if (channel !== `store:${STORE_KEY}`) return;
      updated = true;
      apply(value);
    });
    const onLocalUpdate = (event: Event): void => {
      updated = true;
      apply((event as CustomEvent<unknown>).detail);
    };
    window.addEventListener(TODOS_UPDATED_EVENT, onLocalUpdate);
    void window.api.storeRead(STORE_KEY).then((value) => {
      if (!active || updated) return;
      if (Array.isArray(value)) apply(value);
      else fallback();
    }).catch(() => { if (active && !updated) fallback(); });
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener(TODOS_UPDATED_EVENT, onLocalUpdate);
    };
  }, []);
  return todos;
}
