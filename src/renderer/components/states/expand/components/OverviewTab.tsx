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
export type OverviewWidgetType = 'shortcuts' | 'todo' | 'song' | 'countdown';

/** 控件选项列表 */
export const OVERVIEW_WIDGET_OPTIONS: { value: OverviewWidgetType; label: string }[] = [
  { value: 'shortcuts', label: '快捷启动' },
  { value: 'todo', label: '待办事项' },
  { value: 'song', label: '歌曲' },
  { value: 'countdown', label: '倒数日' },
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
  backgroundImage?: string;
  backgroundOpacity?: number;
}

function cdDiffDays(targetStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** 歌曲控件 */
function SongWidget(): React.ReactElement {
  const { mediaInfo, coverImage, isPlaying, isMusicPlaying, dominantColor } = useIslandStore();
  const [r, g, b] = dominantColor;

  return (
    <div className="ov-dash-widget ov-dash-song-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title">正在播放</span>
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
  }).slice(0, 6);

  return (
    <div className="ov-dash-widget ov-dash-countdown-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title">倒数日</span>
      </div>
      {sorted.length === 0 ? (
        <div className="ov-dash-countdown-empty">暂无倒数日</div>
      ) : (
        <div className="ov-dash-countdown-list">
          {sorted.map(item => {
            const days = cdDiffDays(item.date);
            return (
              <div key={item.id} className="ov-dash-countdown-item" style={{ borderLeftColor: item.color }}>
                <span className="ov-dash-countdown-name">{item.name}</span>
                <span className="ov-dash-countdown-days" style={{ color: item.color }}>
                  {days > 0 ? `${days}天后` : days === 0 ? '今天' : `${Math.abs(days)}天前`}
                </span>
              </div>
            );
          })}
        </div>
      )}
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
