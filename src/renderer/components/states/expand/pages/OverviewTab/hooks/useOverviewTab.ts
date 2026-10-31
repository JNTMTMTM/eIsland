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
 * @file useOverviewTab.ts
 * @description Expanded 总览 Tab 的时钟、布局配置订阅、快捷启动拖拽排序、待办同步与页面跳转。
 * @author 鸡哥
 */

import { useShallow } from 'zustand/react/shallow';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import useIslandStore from '../../../../../../store/slices';
import { DEFAULT_LAYOUT, LAYOUT_STORE_KEY, LEGACY_TODOS_LOCAL_STORAGE_KEY } from '../config/overviewConfig';
import {
  APPS_STORE_KEY,
  LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY,
  STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY,
  STANDALONE_WINDOW_MODE_STORE_KEY,
  STORE_KEY,
  type AppShortcut,
  type TodoItem,
} from '../utils/overviewUtils';
import {
  moveItem,
  normalizeOverviewLayoutConfig,
  removeTodoById,
  toggleSubTodoDone,
  toggleTodoDone,
} from '../utils/overviewTabUtils';
import type { OverviewLayoutConfig, UseOverviewTabReturn } from '../types/overviewTypes';

/**
 * 同时写入旧版 localStorage 与主存储，保持旧版本回退读取可用。
 * @param updated - 更新后的待办列表
 */
function persistTodos(updated: TodoItem[]): void {
  try { localStorage.setItem(LEGACY_TODOS_LOCAL_STORAGE_KEY, JSON.stringify(updated)); } catch { /* noop */ }
  window.api.storeWrite(STORE_KEY, updated).catch(() => {});
}

/**
 * 管理总览面板状态与交互。
 * @returns 时钟、布局、快捷启动、待办状态与交互回调
 */
export function useOverviewTab(): UseOverviewTabReturn {
  const { setMaxExpand, setMaxExpandTab } = useIslandStore(useShallow((store) => ({
    setMaxExpand: store.setMaxExpand,
    setMaxExpandTab: store.setMaxExpandTab,
  })));
  const [now, setNow] = useState(new Date());
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [apps, setApps] = useState<AppShortcut[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<OverviewLayoutConfig>(DEFAULT_LAYOUT);

  const openTargetPage = useCallback((target: string): void => {
    window.api.storeRead(STANDALONE_WINDOW_MODE_STORE_KEY).then((mode) => {
      if (mode === 'standalone' || mode === 'integrated') return mode;
      return window.api.storeRead(LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY).catch(() => null);
    }).then(async (mode) => {
      if (mode === 'standalone') {
        await window.api.storeWrite(STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY, target);
        await window.api.openStandaloneWindow();
      } else {
        setMaxExpandTab(target as Parameters<typeof setMaxExpandTab>[0]);
        setMaxExpand();
      }
    }).catch(() => {
      setMaxExpandTab(target as Parameters<typeof setMaxExpandTab>[0]);
      setMaxExpand();
    });
  }, [setMaxExpand, setMaxExpandTab]);

  // 世界时钟仅在灵动岛最大展开页面中提供。
  const openWorldClockPage = useCallback((): void => {
    setMaxExpandTab('worldClock');
    setMaxExpand();
  }, [setMaxExpand, setMaxExpandTab]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  /** 加载布局配置 */
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(LAYOUT_STORE_KEY).then((data) => {
      if (cancelled) return;
      setLayoutConfig(normalizeOverviewLayoutConfig(data));
    }).catch(() => {});

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${LAYOUT_STORE_KEY}`) {
        setLayoutConfig(normalizeOverviewLayoutConfig(value));
      }
    });

    return () => { cancelled = true; unsub(); };
  }, []);

  /** 加载应用快捷方式（只读） */
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(APPS_STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data)) setApps(data as AppShortcut[]);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /** 拖拽排序状态 */
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  /** 打开应用 */
  const openApp = useCallback((path: string) => {
    window.api.openFile(path).catch(() => {});
  }, []);

  /** 拖拽排序 */
  const handleAppDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleAppDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleAppDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === dropIndex) return;
    setApps(prev => {
      const updated = moveItem(prev, fromIndex, dropIndex);
      window.api.storeWrite(APPS_STORE_KEY, updated).catch(() => {});
      return updated;
    });
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  const handleAppDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  /** 加载待办数据 */
  useEffect(() => {
    let cancelled = false;
    const applyTodos = (data: unknown): void => {
      if (!Array.isArray(data)) return;
      setTodos(data as TodoItem[]);
    };

    window.api.storeRead(STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data) && data.length > 0) {
        applyTodos(data);
      } else {
        try {
          const raw = localStorage.getItem(LEGACY_TODOS_LOCAL_STORAGE_KEY);
          if (raw) setTodos(JSON.parse(raw) as TodoItem[]);
        } catch { /* noop */ }
      }
    }).catch(() => {
      try {
        const raw = localStorage.getItem(LEGACY_TODOS_LOCAL_STORAGE_KEY);
        if (raw) setTodos(JSON.parse(raw) as TodoItem[]);
      } catch { /* noop */ }
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

  const toggleExpand = (id: number): void => {
    setExpandedId(prev => prev === id ? null : id);
  };

  /**
   * 切换完成状态并持久化
   * @param id - 待办 ID
   */
  const toggleDone = (id: number): void => {
    setTodos(prev => {
      const updated = toggleTodoDone(prev, id);
      persistTodos(updated);
      return updated;
    });
  };

  /**
   * 切换子待办完成状态并持久化
   * @param todoId - 父待办 ID
   * @param subId - 子待办 ID
   */
  const toggleSubDone = (todoId: number, subId: number): void => {
    setTodos(prev => {
      const updated = toggleSubTodoDone(prev, todoId, subId);
      persistTodos(updated);
      return updated;
    });
  };

  /**
   * 删除待办并持久化
   * @param id - 待办 ID
   */
  const removeTodo = (id: number): void => {
    setTodos(prev => {
      const updated = removeTodoById(prev, id);
      persistTodos(updated);
      return updated;
    });
    if (expandedId === id) setExpandedId(null);
  };

  return {
    now,
    todos,
    expandedId,
    apps,
    layoutConfig,
    dragIndexRef,
    dragOverIndex,
    openTargetPage,
    openWorldClockPage,
    openApp,
    handleAppDragStart,
    handleAppDragOver,
    handleAppDrop,
    handleAppDragEnd,
    toggleExpand,
    toggleDone,
    toggleSubDone,
    removeTodo,
  };
}
