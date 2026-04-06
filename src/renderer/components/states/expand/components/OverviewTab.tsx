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
import useIslandStore from '../../../../store/slices';
import { getDayName, getDayJi, getDayYi, getLunarDate } from '../../../../utils/timeUtils';
import { SvgIcon } from '../../../../utils/SvgIcon';

/** 紧急程度 */
type Priority = 'P0' | 'P1' | 'P2';

/** 事件大小 */
type Size = 'S' | 'M' | 'L' | 'XL';

/** 优先级配置 */
const PRIORITIES: { value: Priority; color: string }[] = [
  { value: 'P0', color: '#ff5252' },
  { value: 'P1', color: '#ffab40' },
  { value: 'P2', color: '#69c0ff' },
];

/** 大小配置 */
const SIZES: { value: Size; color: string }[] = [
  { value: 'S', color: '#81c784' },
  { value: 'M', color: '#64b5f6' },
  { value: 'L', color: '#ffb74d' },
  { value: 'XL', color: '#e57373' },
];

/** 单条待办 */
interface TodoItem {
  id: number;
  text: string;
  done: boolean;
  createdAt: number;
  priority?: Priority;
  size?: Size;
  description?: string;
  subTodos?: { id: number; text: string; done: boolean; priority?: Priority; size?: Size }[];
}

/** 存储键名 */
const STORE_KEY = 'todos';
const APPS_STORE_KEY = 'app-shortcuts';

/** 应用快捷方式 */
interface AppShortcut {
  id: number;
  name: string;
  path: string;
  iconBase64: string | null;
}

/** 总览控件类型 */
export type OverviewWidgetType = 'shortcuts' | 'todo' | 'song' | 'countdown' | 'pomodoro';

/** 控件选项列表 */
export const OVERVIEW_WIDGET_OPTIONS: { value: OverviewWidgetType; label: string }[] = [
  { value: 'shortcuts', label: '快捷启动' },
  { value: 'todo', label: '待办事项' },
  { value: 'song', label: '歌曲' },
  { value: 'countdown', label: '倒数日' },
  { value: 'pomodoro', label: '番茄钟' },
];

/** 总览布局配置 */
export interface OverviewLayoutConfig {
  left: OverviewWidgetType;
  right: OverviewWidgetType;
}

const LAYOUT_STORE_KEY = 'overview-layout';
const DEFAULT_LAYOUT: OverviewLayoutConfig = { left: 'shortcuts', right: 'todo' };

/** 倒数日数据 */
interface CountdownDateItem {
  id: number;
  name: string;
  date: string;
  color: string;
  type: string;
  description?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
}

const CD_TYPE_LABELS: Record<string, string> = {
  countdown: '倒数日',
  anniversary: '纪念日',
  birthday: '生日',
  holiday: '节日',
  exam: '考试',
};

function cdDiffDays(targetStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** 歌曲控件 */
function SongWidget(): React.ReactElement {
  const { mediaInfo, coverImage, isPlaying, isMusicPlaying, dominantColor, setExpandTab } = useIslandStore();
  const [r, g, b] = dominantColor;

  return (
    <div className="ov-dash-widget ov-dash-song-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link" onClick={() => setExpandTab('song')}>正在播放</span>
      </div>
      {isMusicPlaying ? (
        <div
          className="ov-dash-song-content"
          style={{ '--song-glow': `rgba(${r}, ${g}, ${b}, 0.35)` } as React.CSSProperties}
        >
          {coverImage && (
            <div
              className="ov-dash-song-bg"
              style={{ backgroundImage: `url(${coverImage})` }}
            />
          )}
          <div className="ov-dash-song-body">
            <div
              className="ov-dash-song-cover"
              style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
            />
            <div className="ov-dash-song-info">
              <div className="ov-dash-song-title">{mediaInfo.title || '未知歌曲'}</div>
              <div className="ov-dash-song-artist">{mediaInfo.artist || '未知艺术家'}</div>
              {mediaInfo.album && <div className="ov-dash-song-album">{mediaInfo.album}</div>}
            </div>
          </div>
          <div className="ov-dash-song-controls">
            <button className="ov-dash-song-btn" onClick={() => window.api.mediaPrev()} type="button" title="上一首">
              <img src={SvgIcon.PREVIOUS_SONG} alt="上一首" className="ov-dash-song-btn-icon ov-dash-song-btn-icon--sm" />
            </button>
            <button className="ov-dash-song-btn ov-dash-song-btn-play" onClick={() => window.api.mediaPlayPause()} type="button" title={isPlaying ? '暂停' : '播放'}>
              {isPlaying ? (
                <img src={SvgIcon.PAUSE} alt="暂停" className="ov-dash-song-btn-icon" />
              ) : (
                <img src={SvgIcon.CONTINUE} alt="播放" className="ov-dash-song-btn-icon" />
              )}
            </button>
            <button className="ov-dash-song-btn" onClick={() => window.api.mediaNext()} type="button" title="下一首">
              <img src={SvgIcon.NEXT_SONG} alt="下一首" className="ov-dash-song-btn-icon ov-dash-song-btn-icon--sm" />
            </button>
          </div>
        </div>
      ) : (
        <div className="ov-dash-song-empty">暂无播放中的歌曲</div>
      )}
    </div>
  );
}

/** 倒数日控件 */
function CountdownWidget(): React.ReactElement {
  const { setMaxExpand, setMaxExpandTab } = useIslandStore();
  const [cdItems, setCdItems] = useState<CountdownDateItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead('countdown-dates').then((data) => {
      if (cancelled) return;
      if (Array.isArray(data)) setCdItems(data as CountdownDateItem[]);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const sorted = [...cdItems].sort((a, b) => {
    const da = Math.abs(cdDiffDays(a.date));
    const db = Math.abs(cdDiffDays(b.date));
    return da - db;
  }).slice(0, 2);

  const goToCountdown = (): void => {
    setMaxExpandTab('countdown');
    setMaxExpand();
  };

  return (
    <div className="ov-dash-widget ov-dash-countdown-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link" onClick={goToCountdown}>倒数日</span>
      </div>
      {sorted.length === 0 ? (
        <div className="ov-dash-countdown-empty">暂无倒数日</div>
      ) : (
        <div className="ov-dash-countdown-cards">
          {sorted.map(item => {
            const days = cdDiffDays(item.date);
            const typeLabel = CD_TYPE_LABELS[item.type] || item.type;
            return (
              <div
                key={item.id}
                className={`cd-card cd-card-${item.type} ov-cd-card`}
                style={{ borderColor: item.color }}
              >
                {item.backgroundImage && (
                  <div className="cd-card-bg" style={{ backgroundImage: `url(${item.backgroundImage})`, opacity: item.backgroundOpacity ?? 0.5 }} />
                )}
                <div className="cd-card-overlay" style={{ background: `linear-gradient(135deg, ${item.color}30, ${item.color}10)` }} />
                <div className="cd-card-content">
                  <div className="cd-card-top-row">
                    <span className="cd-card-type-badge" style={{ background: `${item.color}50`, color: '#fff' }}>{typeLabel}</span>
                  </div>
                  <div className="cd-card-name">{item.name}</div>
                  {item.description && <div className="cd-card-desc">{item.description}</div>}
                  <div className="cd-card-bottom">
                    <span className="cd-card-date">{item.date}</span>
                    <span className="cd-card-days" style={{ color: item.color }}>
                      {days > 0 ? `${days} 天后` : days === 0 ? '就是今天' : `${Math.abs(days)} 天前`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 番茄钟阶段 */
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

/** 番茄钟配置（秒） */
const POMODORO_DURATIONS: Record<PomodoroPhase, number> = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const POMODORO_LABELS: Record<PomodoroPhase, string> = {
  work: '专注中',
  shortBreak: '短休息',
  longBreak: '长休息',
};

const POMODORO_STORE_KEY = 'pomodoro-state';

/** 番茄钟持久化数据 */
interface PomodoroData {
  phase: PomodoroPhase;
  remaining: number;
  running: boolean;
  completedCount: number;
}

/** 首次挂载标记，防止 Tab 切换重复读 IPC */
let _pomodoroInitialized = false;

/** 番茄钟持久化写入（模块级，无需组件实例） */
function _persistPomodoro(phase: PomodoroPhase, remaining: number, count: number): void {
  const payload: PomodoroData = { phase, remaining, running: false, completedCount: count };
  window.api.storeWrite(POMODORO_STORE_KEY, payload).catch(() => {});
}

/** 计算下一阶段（模块级） */
function _advancePomodoroPhase(phase: PomodoroPhase, count: number): { nextPhase: PomodoroPhase; nextCount: number } {
  if (phase === 'work') {
    const nextCount = count + 1;
    const nextPhase: PomodoroPhase = nextCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    return { nextPhase, nextCount };
  }
  return { nextPhase: 'work', nextCount: count };
}

/** 模块级计时器 ID（切换 Tab 也持续运行） */
let _pomodoroIntervalId: ReturnType<typeof setInterval> | null = null;

function _startPomodoroInterval(): void {
  if (_pomodoroIntervalId !== null) return;
  _pomodoroIntervalId = setInterval(() => {
    const store = useIslandStore.getState();
    const current = store.pomodoroRemaining;
    if (current <= 1) {
      clearInterval(_pomodoroIntervalId!);
      _pomodoroIntervalId = null;
      const { nextPhase, nextCount } = _advancePomodoroPhase(store.pomodoroPhase, store.pomodoroCompletedCount);
      const nextRemaining = POMODORO_DURATIONS[nextPhase];
      store.setPomodoroRunning(false);
      store.setPomodoroPhase(nextPhase);
      store.setPomodoroRemaining(nextRemaining);
      store.setPomodoroCompletedCount(nextCount);
      _persistPomodoro(nextPhase, nextRemaining, nextCount);
    } else {
      store.setPomodoroRemaining(current - 1);
    }
  }, 1000);
}

function _stopPomodoroInterval(): void {
  if (_pomodoroIntervalId !== null) {
    clearInterval(_pomodoroIntervalId);
    _pomodoroIntervalId = null;
  }
}

/** 订阅 pomodoroRunning，自动启停模块级计时器 */
let _prevPomodoroRunning = false;
useIslandStore.subscribe((state) => {
  const running = state.pomodoroRunning;
  if (running === _prevPomodoroRunning) return;
  _prevPomodoroRunning = running;
  if (running) {
    _startPomodoroInterval();
  } else {
    _stopPomodoroInterval();
  }
});

/** 获取时间轴上下文（上一、当前、下一阶段） */
function getPomodoroTimeline(phase: PomodoroPhase, count: number): { prev: PomodoroPhase | null; next: PomodoroPhase } {
  if (phase === 'work') {
    const prev: PomodoroPhase | null = count === 0 ? null : count % 4 === 0 ? 'longBreak' : 'shortBreak';
    const nextCount = count + 1;
    const next: PomodoroPhase = nextCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    return { prev, next };
  }
  return { prev: 'work', next: 'work' };
}

/** 格式化秒为 MM:SS */
function fmtPomodoroTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** 番茄钟控件（仅负责显示和控制，计时逻辑在模块级） */
function PomodoroWidget(): React.ReactElement {
  const {
    pomodoroPhase: phase,
    pomodoroRemaining: remaining,
    pomodoroRunning: running,
    pomodoroCompletedCount: completedCount,
    setPomodoroPhase: setPhase,
    setPomodoroRemaining: setRemaining,
    setPomodoroRunning: setRunning,
    setPomodoroCompletedCount: setCompletedCount,
  } = useIslandStore();

  /** 首次挂载时从 IPC 恢复持久化状态 */
  useEffect(() => {
    if (_pomodoroInitialized) return;
    _pomodoroInitialized = true;
    window.api.storeRead(POMODORO_STORE_KEY).then((data) => {
      if (!data) return;
      const d = data as PomodoroData;
      if (d.phase) setPhase(d.phase);
      if (typeof d.remaining === 'number') setRemaining(d.remaining);
      if (typeof d.completedCount === 'number') setCompletedCount(d.completedCount);
    }).catch(() => {});
  }, [setPhase, setRemaining, setCompletedCount]);

  const totalDuration = POMODORO_DURATIONS[phase];
  const progress = 1 - remaining / totalDuration;
  const circumference = 2 * Math.PI * 38;
  const dashOffset = circumference * (1 - progress);

  const handleStartPause = (): void => {
    setRunning(!running);
  };

  const handleReset = (): void => {
    setRunning(false);
    setRemaining(POMODORO_DURATIONS[phase]);
    _persistPomodoro(phase, POMODORO_DURATIONS[phase], completedCount);
  };

  const handleResetCount = (): void => {
    setCompletedCount(0);
    _persistPomodoro(phase, remaining, 0);
  };

  const handleSkip = (): void => {
    setRunning(false);
    const { nextPhase, nextCount } = _advancePomodoroPhase(phase, completedCount);
    setPhase(nextPhase);
    setCompletedCount(nextCount);
    const nextRemaining = POMODORO_DURATIONS[nextPhase];
    setRemaining(nextRemaining);
    _persistPomodoro(nextPhase, nextRemaining, nextCount);
  };

  const phaseColor = phase === 'work' ? '#ff6b6b' : phase === 'shortBreak' ? '#51cf66' : '#339af0';
  const { prev: prevPhase, next: nextPhase } = getPomodoroTimeline(phase, completedCount);

  return (
    <div className="ov-dash-widget ov-dash-pomodoro-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title">番茄钟</span>
        <span className="ov-dash-pomodoro-count" title="已完成番茄数">
          <img src={SvgIcon.POMODORO} alt="番茄" className="ov-dash-pomodoro-icon" />
          {completedCount}
          {completedCount > 0 && (
            <button className="ov-dash-pomodoro-count-reset" onClick={handleResetCount} type="button" title="重置计数">
              <img src={SvgIcon.REVERT} alt="重置" className="ov-dash-pomodoro-count-reset-icon" />
            </button>
          )}
        </span>
      </div>
      <div className="ov-dash-pomodoro-body">
        {/* 环形进度盘 */}
        <div className="ov-dash-pomodoro-ring-wrap">
          <svg className="ov-dash-pomodoro-ring" viewBox="0 0 84 84">
            <circle className="ov-dash-pomodoro-ring-bg" cx="42" cy="42" r="38" />
            <circle
              className="ov-dash-pomodoro-ring-progress"
              cx="42" cy="42" r="38"
              style={{ stroke: phaseColor, strokeDasharray: circumference, strokeDashoffset: dashOffset }}
            />
          </svg>
          <div className="ov-dash-pomodoro-ring-inner">
            <div className="ov-dash-pomodoro-time">{fmtPomodoroTime(remaining)}</div>
            <div className="ov-dash-pomodoro-phase" style={{ color: phaseColor }}>{POMODORO_LABELS[phase]}</div>
          </div>
        </div>

        {/* 时间线 */}
        <div className="ov-dash-pomodoro-timeline" key={`${phase}-${completedCount}`}>
          <div className={`ov-dash-pomodoro-tl-item${!prevPhase ? ' ov-dash-pomodoro-tl-item--empty' : ''}`}>
            {prevPhase && (
              <>
                <div className="ov-dash-pomodoro-tl-dot" />
                <div className="ov-dash-pomodoro-tl-info">
                  <span className="ov-dash-pomodoro-tl-name">{POMODORO_LABELS[prevPhase]}</span>
                  <span className="ov-dash-pomodoro-tl-dur">{POMODORO_DURATIONS[prevPhase] / 60}m</span>
                </div>
              </>
            )}
          </div>
          <div className="ov-dash-pomodoro-tl-item ov-dash-pomodoro-tl-item--current">
            <div className="ov-dash-pomodoro-tl-dot ov-dash-pomodoro-tl-dot--current" style={{ background: phaseColor, boxShadow: `0 0 5px ${phaseColor}99` }} />
            <div className="ov-dash-pomodoro-tl-info">
              <span className="ov-dash-pomodoro-tl-name ov-dash-pomodoro-tl-name--current">{POMODORO_LABELS[phase]}</span>
              <span className="ov-dash-pomodoro-tl-dur ov-dash-pomodoro-tl-dur--current" style={{ color: phaseColor }}>{fmtPomodoroTime(remaining)}</span>
            </div>
          </div>
          <div className="ov-dash-pomodoro-tl-item">
            <div className="ov-dash-pomodoro-tl-dot" />
            <div className="ov-dash-pomodoro-tl-info">
              <span className="ov-dash-pomodoro-tl-name">{POMODORO_LABELS[nextPhase]}</span>
              <span className="ov-dash-pomodoro-tl-dur">{POMODORO_DURATIONS[nextPhase] / 60}m</span>
            </div>
          </div>
        </div>
        {/* 控制按钮（横排） */}
        <div className="ov-dash-pomodoro-controls">
          <button className="ov-dash-pomodoro-btn" onClick={handleStartPause} type="button" title={running ? '暂停' : '开始'}>
            <img src={running ? SvgIcon.PAUSE : SvgIcon.CONTINUE} alt={running ? '暂停' : '开始'} className="ov-dash-pomodoro-btn-icon" />
          </button>
          <button className="ov-dash-pomodoro-btn" onClick={handleReset} type="button" title="重置">
            <img src={SvgIcon.REVERT} alt="重置" className="ov-dash-pomodoro-btn-icon" />
          </button>
          <button className="ov-dash-pomodoro-btn" onClick={handleSkip} type="button" title="跳过">
            <img src={SvgIcon.NEXT_SONG} alt="跳过" className="ov-dash-pomodoro-btn-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 总览 Tab
 * @description 展开状态下仪表盘式概览面板
 */
export function OverviewTab(): React.ReactElement {
  const { setMaxExpand, setExpandTab } = useIslandStore();
  const [now, setNow] = useState(new Date());
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [apps, setApps] = useState<AppShortcut[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<OverviewLayoutConfig>(DEFAULT_LAYOUT);

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
    return () => { cancelled = true; };
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
    window.api.storeRead(STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data) && data.length > 0) {
        setTodos(data as TodoItem[]);
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
    return () => { cancelled = true; };
  }, []);

  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');

  const yyyy = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dayName = getDayName(now);

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

  const undoneTodos = todos.filter(t => !t.done);
  const doneTodos = todos.filter(t => t.done);
  const p0Count = todos.filter(t => !t.done && t.priority === 'P0').length;
  const p1Count = todos.filter(t => !t.done && t.priority === 'P1').length;
  const p2Count = todos.filter(t => !t.done && t.priority === 'P2').length;

  /** 渲染控件 */
  const renderWidget = (type: OverviewWidgetType): React.ReactNode => {
    switch (type) {
      case 'shortcuts':
        return (
          <div className="ov-dash-apps-wrap">
            <div className="ov-dash-apps-header">
              <span className="ov-dash-apps-title clickable" onClick={() => setExpandTab('tools')} title="编辑快捷启动">快捷启动</span>
              <span className="ov-dash-apps-count">{apps.length} 项</span>
            </div>
            <div className="ov-dash-apps">
              {apps.length === 0 && (
                <div className="ov-dash-apps-empty">在系统工具中添加</div>
              )}
              {apps.map((app, index) => (
                <div
                  key={app.id}
                  className={`ov-dash-app-item ${dragOverIndex === index ? 'drag-over' : ''} ${dragIndexRef.current === index ? 'dragging' : ''}`}
                  onClick={() => openApp(app.path)}
                  title={app.name}
                  draggable
                  onDragStart={(e) => handleAppDragStart(e, index)}
                  onDragOver={(e) => handleAppDragOver(e, index)}
                  onDrop={(e) => handleAppDrop(e, index)}
                  onDragEnd={handleAppDragEnd}
                >
                  {app.iconBase64 ? (
                    <img className="ov-dash-app-icon" src={`data:image/png;base64,${app.iconBase64}`} alt={app.name} />
                  ) : (
                    <div className="ov-dash-app-icon-placeholder">📂</div>
                  )}
                  <span className="ov-dash-app-name">{app.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'todo':
        return (
          <div className="ov-dash-todo">
            <div className="ov-dash-todo-header">
              <span className="ov-dash-todo-title clickable" onClick={() => setMaxExpand()} title="前往待办事项">待办事项</span>
              <div className="ov-dash-todo-stats">
                <span className="ov-dash-todo-stat done">✓ {doneTodos.length}</span>
                <span className="ov-dash-todo-stat undone">○ {undoneTodos.length}</span>
                {p0Count > 0 && <span className="ov-dash-todo-stat p0">P0 {p0Count}</span>}
                {p1Count > 0 && <span className="ov-dash-todo-stat p1">P1 {p1Count}</span>}
                {p2Count > 0 && <span className="ov-dash-todo-stat p2">P2 {p2Count}</span>}
              </div>
            </div>
            <div className="ov-dash-todo-list">
              {todos.length === 0 ? (
                <div className="ov-dash-todo-empty">暂无待办</div>
              ) : (
                <>
                  {undoneTodos.map(todo => {
                    const isExpanded = expandedId === todo.id;
                    const pColor = PRIORITIES.find(p => p.value === todo.priority)?.color;
                    const sColor = SIZES.find(s => s.value === todo.size)?.color;
                    return (
                      <div
                        key={todo.id}
                        className={`ov-dash-todo-item ${isExpanded ? 'expanded' : ''}`}
                      >
                        <div className="ov-dash-todo-row" onClick={() => toggleExpand(todo.id)}>
                          <button
                            className="ov-dash-todo-check"
                            onClick={(e) => { e.stopPropagation(); toggleDone(todo.id); }}
                          >
                            ○
                          </button>
                          {todo.priority && (
                            <span className="ov-dash-todo-priority" style={{ background: pColor }}>
                              {todo.priority}
                            </span>
                          )}
                          {todo.size && (
                            <span className="ov-dash-todo-size" style={{ background: sColor }}>
                              {todo.size}
                            </span>
                          )}
                          <span className="ov-dash-todo-text">{todo.text}</span>
                          {(todo.description || (todo.subTodos && todo.subTodos.length > 0)) && (
                            <span className={`ov-dash-todo-arrow ${isExpanded ? 'open' : ''}`}>›</span>
                          )}
                          <button
                            className="ov-dash-todo-delete"
                            onClick={(e) => { e.stopPropagation(); removeTodo(todo.id); }}
                            aria-label="删除"
                          >
                            ×
                          </button>
                        </div>
                        {isExpanded && todo.description && (
                          <div className="ov-dash-todo-desc">{todo.description}</div>
                        )}
                        {isExpanded && todo.subTodos && todo.subTodos.length > 0 && (
                          <div className="ov-dash-todo-subs">
                            {todo.subTodos.map(sub => (
                              <div key={sub.id} className={`ov-dash-todo-sub ${sub.done ? 'done' : ''}`}>
                                <button
                                  className="ov-dash-todo-sub-check"
                                  onClick={() => toggleSubDone(todo.id, sub.id)}
                                >
                                  {sub.done ? '✓' : '○'}
                                </button>
                                {sub.priority && (
                                  <span className="ov-dash-todo-priority" style={{ background: PRIORITIES.find(p => p.value === sub.priority)?.color }}>
                                    {sub.priority}
                                  </span>
                                )}
                                {sub.size && (
                                  <span className="ov-dash-todo-size" style={{ background: SIZES.find(s => s.value === sub.size)?.color }}>
                                    {sub.size}
                                  </span>
                                )}
                                <span className="ov-dash-todo-sub-text">{sub.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {doneTodos.length > 0 && (
                    <>
                      <div className="ov-dash-todo-divider">已完成 {doneTodos.length}</div>
                      {doneTodos.map(todo => (
                        <div key={todo.id} className="ov-dash-todo-item done">
                          <div className="ov-dash-todo-row">
                            <button
                              className="ov-dash-todo-check"
                              onClick={() => toggleDone(todo.id)}
                            >
                              ✓
                            </button>
                            <span className="ov-dash-todo-text">{todo.text}</span>
                            <button
                              className="ov-dash-todo-delete"
                              onClick={(e) => { e.stopPropagation(); removeTodo(todo.id); }}
                              aria-label="删除"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        );
      case 'song':
        return <SongWidget />;
      case 'countdown':
        return <CountdownWidget />;
      case 'pomodoro':
        return <PomodoroWidget />;
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
        <span className="ov-dash-date">{yyyy}年{month}月{day}日 {dayName}</span>
        <span className="ov-dash-clock">{hh}:{mm}:{ss}</span>
        <span className="ov-dash-lunar">{getLunarDate(now)}</span>
        <div className="ov-dash-yiji">
          <div className="ov-dash-yiji-row">
            <span className="ov-dash-yiji-label yi">宜</span>
            <span className="ov-dash-yiji-items">{getDayYi(now).slice(0, 3).join(' · ')}</span>
          </div>
          <div className="ov-dash-yiji-row">
            <span className="ov-dash-yiji-label ji">忌</span>
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
