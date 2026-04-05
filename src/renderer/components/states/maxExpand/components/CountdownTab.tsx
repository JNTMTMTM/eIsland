/**
 * @file CountdownTab.tsx
 * @description 最大展开模式 — 倒数日 Tab — 重要日期倒计时管理，含日历标记
 * @author 鸡哥
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

/** 倒数日数据 */
interface CountdownItem {
  id: number;
  name: string;
  date: string; // ISO 日期字符串 YYYY-MM-DD
  color: string;
}

const STORE_KEY = 'countdown-dates';

const COLORS = [
  '#ff5252', '#ffab40', '#69c0ff', '#81c784',
  '#ce93d8', '#f48fb1', '#ffcc80', '#80deea',
];

/**
 * 计算距离目标日期的天数差
 * 正数=还剩N天，负数=已过N天，0=就是今天
 */
function diffDays(targetStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 倒数日 Tab
 */
export function CountdownTab(): React.ReactElement {
  const [items, setItems] = useState<CountdownItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const editRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /** 加载数据 */
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data)) setItems(data as CountdownItem[]);
      setLoaded(true);
    }).catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  /** 持久化 */
  useEffect(() => {
    if (!loaded) return;
    window.api.storeWrite(STORE_KEY, items).catch(() => {});
  }, [items, loaded]);

  /** 聚焦编辑 */
  useEffect(() => {
    if (editingId !== null && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  /** 添加倒数日 */
  const addItem = useCallback(() => {
    if (!selectedDate || !newName.trim()) return;
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    setItems(prev => [...prev, {
      id: Date.now() + Math.random(),
      name: newName.trim(),
      date: dateStr,
      color: newColor,
    }]);
    setNewName('');
    setSelectedDate(null);
  }, [selectedDate, newName, newColor]);

  /** 删除 */
  const removeItem = useCallback((id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  /** 开始编辑 */
  const startEdit = useCallback((item: CountdownItem) => {
    setEditingId(item.id);
    setEditName(item.name);
  }, []);

  /** 保存编辑 */
  const saveEdit = useCallback(() => {
    if (editingId === null) return;
    setItems(prev => prev.map(i => i.id === editingId ? { ...i, name: editName.trim() || i.name } : i));
    setEditingId(null);
  }, [editingId, editName]);

  /** 日历上需要高亮的日期 */
  const highlightDates = items.map(i => new Date(i.date + 'T00:00:00'));

  /** 按日期排序：最近的在前 */
  const sorted = [...items].sort((a, b) => {
    const da = Math.abs(diffDays(a.date));
    const db = Math.abs(diffDays(b.date));
    return da - db;
  });

  /** 阻止列表滚轮冒泡 */
  const handleListWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="max-expand-tab-panel countdown-panel">
      {/* ===== 左侧：日历 + 添加 ===== */}
      <div className="countdown-left">
        <div className="countdown-calendar-wrap">
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => setSelectedDate(date)}
            inline
            highlightDates={highlightDates}
            calendarClassName="countdown-calendar"
          />
        </div>
        <div className="countdown-add">
          <input
            className="countdown-add-input"
            placeholder="输入事件名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
          />
          <div className="countdown-add-row">
            <div className="countdown-color-picker">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`countdown-color-dot ${newColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                  type="button"
                />
              ))}
            </div>
            <button
              className="countdown-add-btn"
              onClick={addItem}
              disabled={!selectedDate || !newName.trim()}
              type="button"
            >
              添加
            </button>
          </div>
        </div>
      </div>

      {/* ===== 右侧：倒数日列表 ===== */}
      <div className="countdown-right" ref={listRef} onWheel={handleListWheel}>
        <div className="countdown-list-header">
          <span className="countdown-list-title">倒数日</span>
          <span className="countdown-list-count">{items.length} 项</span>
        </div>
        <div className="countdown-list">
          {sorted.length === 0 ? (
            <div className="countdown-empty">选择日期并添加事件</div>
          ) : (
            sorted.map(item => {
              const days = diffDays(item.date);
              const isEditing = editingId === item.id;
              return (
                <div key={item.id} className="countdown-item">
                  <div className="countdown-item-color" style={{ background: item.color }} />
                  <div className="countdown-item-body">
                    {isEditing ? (
                      <input
                        ref={editRef}
                        className="countdown-item-edit"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      />
                    ) : (
                      <span className="countdown-item-name" onDoubleClick={() => startEdit(item)}>{item.name}</span>
                    )}
                    <span className="countdown-item-date">{item.date}</span>
                  </div>
                  <div className="countdown-item-days">
                    {days > 0 ? (
                      <>
                        <span className="countdown-days-num">{days}</span>
                        <span className="countdown-days-label">天后</span>
                      </>
                    ) : days === 0 ? (
                      <span className="countdown-days-today">今天</span>
                    ) : (
                      <>
                        <span className="countdown-days-num past">{Math.abs(days)}</span>
                        <span className="countdown-days-label">天前</span>
                      </>
                    )}
                  </div>
                  <button
                    className="countdown-item-delete"
                    onClick={() => removeItem(item.id)}
                    type="button"
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
