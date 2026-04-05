/**
 * @file OverviewTab.tsx
 * @description Expanded 总览 Tab — 仪表盘式概览：时间、天气、音乐状态、倒计时、待办
 * @author 鸡哥
 */

import React, { useEffect, useState } from 'react';
import useIslandStore from '../../../../store/slices';
import { getDayName, getLunarDate } from '../../../../utils/timeUtils';

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

/**
 * 总览 Tab
 * @description 展开状态下仪表盘式概览面板
 */
export function OverviewTab(): React.ReactElement {
  const { setMaxExpand } = useIslandStore();
  const [now, setNow] = useState(new Date());
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
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

  const undoneTodos = todos.filter(t => !t.done);
  const doneTodos = todos.filter(t => t.done);
  const p0Count = todos.filter(t => !t.done && t.priority === 'P0').length;
  const p1Count = todos.filter(t => !t.done && t.priority === 'P1').length;
  const p2Count = todos.filter(t => !t.done && t.priority === 'P2').length;

  return (
    <div className="expand-tab-panel overview-dashboard">
      {/* ========== 左区：时间 + 日期 + 农历 ========== */}
      <div className="ov-dash-time">
        <span className="ov-dash-date">{yyyy}年{month}月{day}日 {dayName}</span>
        <span className="ov-dash-clock">{hh}:{mm}:{ss}</span>
        <span className="ov-dash-lunar">{getLunarDate(now)}</span>
      </div>

      {/* ========== 右区：待办事项 ========== */}
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
                      {todo.description && (
                        <span className={`ov-dash-todo-arrow ${isExpanded ? 'open' : ''}`}>›</span>
                      )}
                    </div>
                    {isExpanded && todo.description && (
                      <div className="ov-dash-todo-desc">{todo.description}</div>
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
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
