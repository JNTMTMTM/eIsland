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
 * @file OverviewTab.tsx
 * @description Expanded 总览 Tab — 仪表盘式概览：时间、天气、音乐状态、倒计时、待办
 * @author 鸡哥
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import { getDayName, getDayJi, getDayYi, getLunarDate } from '../../../../utils/timeUtils';
import {
  AlbumCarouselWidget,
  CountdownWidget,
  MokugyoWidget,
  PomodoroWidget,
  ShortcutsWidget,
  SongWidget,
  TodoWidget,
  UrlFavoritesWidget,
} from './OverviewTab/components/OverviewWidgets';
import {
  APPS_STORE_KEY,
  LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY,
  STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY,
  STANDALONE_WINDOW_MODE_STORE_KEY,
  STORE_KEY,
  type AppShortcut,
  type TodoItem,
} from './OverviewTab/utils/overviewUtils';

/** 总览控件类型 */
export type OverviewWidgetType = 'shortcuts' | 'todo' | 'song' | 'countdown' | 'pomodoro' | 'urlFavorites' | 'album' | 'mokugyo';

/** 控件选项列表 */
export const OVERVIEW_WIDGET_OPTIONS: { value: OverviewWidgetType; label: string }[] = [
  { value: 'shortcuts', label: '快捷启动' },
  { value: 'todo', label: '待办事项' },
  { value: 'song', label: '歌曲' },
  { value: 'album', label: '相册轮播' },
  { value: 'countdown', label: '倒数日' },
  { value: 'pomodoro', label: '番茄钟' },
  { value: 'mokugyo', label: '电子木鱼' },
  { value: 'urlFavorites', label: 'URL 收藏' },
];

/** 总览布局配置 */
export interface OverviewLayoutConfig {
  left: OverviewWidgetType;
  right: OverviewWidgetType;
}

const LAYOUT_STORE_KEY = 'overview-layout';
const DEFAULT_LAYOUT: OverviewLayoutConfig = { left: 'shortcuts', right: 'todo' };

/**
 * 总览 Tab
 * @description 展开状态下仪表盘式概览面板
 */
export function OverviewTab(): React.ReactElement {
  const { t } = useTranslation();
  const { setMaxExpand, setMaxExpandTab } = useIslandStore();
  const [now, setNow] = useState(new Date());
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [apps, setApps] = useState<AppShortcut[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<OverviewLayoutConfig>(DEFAULT_LAYOUT);

  const openTargetPage = useCallback((target: string): void => {
    window.api.storeRead(STANDALONE_WINDOW_MODE_STORE_KEY).then((mode) => {
      if (mode === 'standalone' || mode === 'integrated') return mode;
      return window.api.storeRead(LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY).catch(() => null);
    }).then((mode) => {
      if (mode === 'standalone') {
        window.api.storeWrite(STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY, target).catch(() => {});
        window.api.openStandaloneWindow().catch(() => {});
      } else {
        setMaxExpandTab(target as Parameters<typeof setMaxExpandTab>[0]);
        setMaxExpand();
      }
    }).catch(() => {
      setMaxExpandTab(target as Parameters<typeof setMaxExpandTab>[0]);
      setMaxExpand();
    });
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
      if (data && typeof data === 'object' && 'left' in (data as object) && 'right' in (data as object)) {
        setLayoutConfig(data as OverviewLayoutConfig);
      }
    }).catch(() => {});

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${LAYOUT_STORE_KEY}`) {
        if (value && typeof value === 'object' && 'left' in (value as object) && 'right' in (value as object)) {
          setLayoutConfig(value as OverviewLayoutConfig);
        }
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
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(dropIndex, 0, moved);
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
          const raw = localStorage.getItem('eIsland_todos');
          if (raw) setTodos(JSON.parse(raw) as TodoItem[]);
        } catch { /* noop */ }
      }
    }).catch(() => {
      try {
        const raw = localStorage.getItem('eIsland_todos');
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

  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');

  const yyyy = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dayName = t(`overview.time.weekdays.${now.getDay()}`, { defaultValue: getDayName(now) });

  const toggleExpand = (id: number): void => {
    setExpandedId(prev => prev === id ? null : id);
  };

  /** 切换完成状态并持久化 */
  const toggleDone = (id: number): void => {
    setTodos(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, done: !t.done } : t);
      try { localStorage.setItem('eIsland_todos', JSON.stringify(updated)); } catch { /* noop */ }
      window.api.storeWrite(STORE_KEY, updated).catch(() => {});
      return updated;
    });
  };

  /** 切换子待办完成状态并持久化 */
  const toggleSubDone = (todoId: number, subId: number): void => {
    setTodos(prev => {
      const updated = prev.map(t => {
        if (t.id !== todoId || !t.subTodos) return t;
        return { ...t, subTodos: t.subTodos.map(s => s.id === subId ? { ...s, done: !s.done } : s) };
      });
      try { localStorage.setItem('eIsland_todos', JSON.stringify(updated)); } catch { /* noop */ }
      window.api.storeWrite(STORE_KEY, updated).catch(() => {});
      return updated;
    });
  };

  /** 删除待办并持久化 */
  const removeTodo = (id: number): void => {
    setTodos(prev => {
      const updated = prev.filter(t => t.id !== id);
      try { localStorage.setItem('eIsland_todos', JSON.stringify(updated)); } catch { /* noop */ }
      window.api.storeWrite(STORE_KEY, updated).catch(() => {});
      return updated;
    });
    if (expandedId === id) setExpandedId(null);
  };

  /** 渲染控件 */
  const renderWidget = (type: OverviewWidgetType): React.ReactNode => {
    switch (type) {
      case 'shortcuts':
        return (
          <ShortcutsWidget
            apps={apps}
            dragIndex={dragIndexRef.current}
            dragOverIndex={dragOverIndex}
            onOpenApp={openApp}
            onDragStart={handleAppDragStart}
            onDragOver={handleAppDragOver}
            onDrop={handleAppDrop}
            onDragEnd={handleAppDragEnd}
          />
        );
      case 'todo':
        return (
          <TodoWidget
            todos={todos}
            expandedId={expandedId}
            onOpenTodoPage={() => openTargetPage('todo')}
            onToggleExpand={toggleExpand}
            onToggleDone={toggleDone}
            onToggleSubDone={toggleSubDone}
            onRemoveTodo={removeTodo}
          />
        );
      case 'song':
        return <SongWidget />;
      case 'album':
        return <AlbumCarouselWidget openAlbumPage={() => openTargetPage('album')} />;
      case 'countdown':
        return <CountdownWidget openTargetPage={openTargetPage} />;
      case 'pomodoro':
        return <PomodoroWidget />;
      case 'mokugyo':
        return <MokugyoWidget />;
      case 'urlFavorites':
        return <UrlFavoritesWidget openUrlFavoritesPage={() => openTargetPage('urlFavorites')} />;
      default:
        return null;
    }
  };

  return (
    <div className="expand-tab-panel overview-dashboard">
      {/* ========== 左区 ========== */}
      <div className="ov-dash-slot ov-dash-slot-left">
        {renderWidget(layoutConfig.left)}
      </div>

      {/* ========== 中区：时间（始终居中） ========== */}
      <div className="ov-dash-time">
        <span className="ov-dash-date">{t('overview.time.date', { defaultValue: '{{yyyy}}年{{month}}月{{day}}日 {{dayName}}', yyyy, month, day, dayName })}</span>
        <span className="ov-dash-clock">{hh}:{mm}:{ss}</span>
        <span className="ov-dash-lunar">{getLunarDate(now)}</span>
        <div className="ov-dash-yiji">
          <div className="ov-dash-yiji-row">
            <span className="ov-dash-yiji-label yi">{t('overview.time.yi', { defaultValue: '宜' })}</span>
            <span className="ov-dash-yiji-items">{getDayYi(now).slice(0, 3).join(' · ')}</span>
          </div>
          <div className="ov-dash-yiji-row">
            <span className="ov-dash-yiji-label ji">{t('overview.time.ji', { defaultValue: '忌' })}</span>
            <span className="ov-dash-yiji-items">{getDayJi(now).slice(0, 3).join(' · ')}</span>
          </div>
        </div>
      </div>

      {/* ========== 右区 ========== */}
      <div className="ov-dash-slot ov-dash-slot-right">
        {renderWidget(layoutConfig.right)}
      </div>
    </div>
  );
}
