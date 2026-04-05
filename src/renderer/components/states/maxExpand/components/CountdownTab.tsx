/**
 * @file CountdownTab.tsx
 * @description 最大展开模式 — 倒数日 Tab — 重要日期倒计时管理，含日历标记
 * @author 鸡哥
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

/** 事件类型 */
type EventType = 'countdown' | 'anniversary' | 'birthday' | 'holiday' | 'exam';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'countdown', label: '倒数日' },
  { value: 'anniversary', label: '纪念日' },
  { value: 'birthday', label: '生日' },
  { value: 'holiday', label: '节日' },
  { value: 'exam', label: '考试' },
];

/** 倒数日数据 */
interface CountdownItem {
  id: number;
  name: string;
  date: string;
  color: string;
  type: EventType;
  description?: string;
}

const STORE_KEY = 'countdown-dates';

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function diffDays(targetStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const COLOR_PRESETS = [
  '#ff5252', '#ff7043', '#ffab40', '#ffd740',
  '#69f0ae', '#81c784', '#69c0ff', '#448aff',
  '#7c4dff', '#ce93d8', '#f48fb1', '#80deea',
];

export function CountdownTab(): React.ReactElement {
  const [items, setItems] = useState<CountdownItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#69c0ff');
  const [newType, setNewType] = useState<EventType>('countdown');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<CountdownItem>>({});
  const editCustomColorRef = useRef<HTMLInputElement>(null);
  const addCustomColorRef = useRef<HTMLInputElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  /** 加载 */
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

  /** 添加 */
  const addItem = useCallback(() => {
    if (!selectedDate || !newName.trim()) return;
    const dateStr = toLocalDateStr(selectedDate);
    setItems(prev => [...prev, {
      id: Date.now() + Math.random(),
      name: newName.trim(),
      date: dateStr,
      color: newColor,
      type: newType,
      description: newDesc.trim() || undefined,
    }]);
    setNewName('');
    setNewDesc('');
    setSelectedDate(null);
  }, [selectedDate, newName, newColor, newType, newDesc]);

  /** 删除 */
  const removeItem = useCallback((id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (editingId === id) setEditingId(null);
  }, [editingId]);

  /** 开始编辑 */
  const startEdit = useCallback((item: CountdownItem) => {
    setEditingId(item.id);
    setEditData({ name: item.name, description: item.description || '', color: item.color, type: item.type });
  }, []);

  /** 保存编辑 */
  const saveEdit = useCallback(() => {
    if (editingId === null) return;
    setItems(prev => prev.map(i => {
      if (i.id !== editingId) return i;
      return {
        ...i,
        name: (editData.name || '').trim() || i.name,
        description: (editData.description || '').trim() || undefined,
        color: editData.color || i.color,
        type: editData.type || i.type,
      };
    }));
    setEditingId(null);
  }, [editingId, editData]);

  /** 日历高亮 */
  const highlightDates = items.map(i => new Date(i.date + 'T00:00:00'));

  /** 排序 */
  const sorted = [...items].sort((a, b) => {
    const da = Math.abs(diffDays(a.date));
    const db = Math.abs(diffDays(b.date));
    return da - db;
  });

  /** 卡片列表水平滚轮 */
  const handleCardsWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    if (cardsRef.current) {
      cardsRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  const typeInfo = (t: EventType) => EVENT_TYPES.find(et => et.value === t) || EVENT_TYPES[0];

  const editItem = editingId !== null ? items.find(i => i.id === editingId) : null;

  return (
    <div className="max-expand-tab-panel countdown-panel-v2">
      {/* ===== 上部区域 ===== */}
      <div className="cd-top">
        {/* 左上：日历 */}
        <div className="cd-calendar-wrap countdown-calendar-wrap">
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => setSelectedDate(date)}
            inline
            highlightDates={highlightDates}
            calendarClassName="countdown-calendar"
          />
        </div>

        {/* 中：编辑表单 */}
        {editItem ? (
          <div className="cd-editor-form">
            <div className="cd-editor-title">编辑事件</div>
            <input
              className="cd-input"
              value={editData.name || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="事件名称"
            />
            <textarea
              className="cd-textarea"
              value={editData.description || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="描述（可选）"
              rows={2}
            />
            <div className="cd-form-row">
              <span className="cd-form-label">类型</span>
              <div className="cd-type-selector">
                {EVENT_TYPES.map(t => (
                  <button
                    key={t.value}
                    className={`cd-type-btn ${editData.type === t.value ? 'active' : ''}`}
                    onClick={() => setEditData(prev => ({ ...prev, type: t.value }))}
                    type="button"
                    title={t.label}
                  >
                    <span className="cd-type-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="cd-form-row">
              <span className="cd-form-label">颜色</span>
              <div className="cd-color-row">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    className={`cd-color-dot ${(editData.color || '#69c0ff') === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setEditData(prev => ({ ...prev, color: c }))}
                    type="button"
                  />
                ))}
                <button
                  className="cd-color-dot cd-color-custom-trigger"
                  style={{ background: COLOR_PRESETS.includes(editData.color || '') ? undefined : editData.color }}
                  onClick={() => editCustomColorRef.current?.click()}
                  type="button"
                  title="自定义颜色"
                >
                  <span className="cd-color-custom-icon">+</span>
                </button>
                <input
                  ref={editCustomColorRef}
                  type="color"
                  className="cd-color-native-hidden"
                  value={editData.color || '#69c0ff'}
                  onChange={(e) => setEditData(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
            </div>
            <div className="cd-form-actions">
              <button className="cd-btn save" onClick={saveEdit} type="button">保存</button>
              <button className="cd-btn cancel" onClick={() => setEditingId(null)} type="button">取消</button>
            </div>
          </div>
        ) : (
          <div className="cd-editor-form">
            <div className="cd-editor-title">
              {selectedDate ? `新建事件 - ${toLocalDateStr(selectedDate)}` : '< 选择日期以添加事件'}
            </div>
            <input
              className="cd-input"
              placeholder="事件名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
            />
            <textarea
              className="cd-textarea"
              placeholder="描述（可选）"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
            />
            <div className="cd-form-row">
              <span className="cd-form-label">类型</span>
              <div className="cd-type-selector">
                {EVENT_TYPES.map(t => (
                  <button
                    key={t.value}
                    className={`cd-type-btn ${newType === t.value ? 'active' : ''}`}
                    onClick={() => setNewType(t.value)}
                    type="button"
                    title={t.label}
                  >
                    <span className="cd-type-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="cd-form-row">
              <span className="cd-form-label">颜色</span>
              <div className="cd-color-row">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    className={`cd-color-dot ${newColor === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setNewColor(c)}
                    type="button"
                  />
                ))}
                <button
                  className="cd-color-dot cd-color-custom-trigger"
                  style={{ background: COLOR_PRESETS.includes(newColor) ? undefined : newColor }}
                  onClick={() => addCustomColorRef.current?.click()}
                  type="button"
                  title="自定义颜色"
                >
                  <span className="cd-color-custom-icon">+</span>
                </button>
                <input
                  ref={addCustomColorRef}
                  type="color"
                  className="cd-color-native-hidden"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                />
              </div>
            </div>
            <div className="cd-form-actions">
              <button
                className="cd-btn save"
                onClick={addItem}
                disabled={!selectedDate || !newName.trim()}
                type="button"
              >
                添加
              </button>
            </div>
          </div>
        )}

        {/* 右：卡片预览 */}
        <div className="cd-preview">
          <div className="cd-preview-label">预览</div>
          {editItem ? (
            <div
              className={`cd-card cd-card-${editData.type || editItem.type}`}
              style={{ borderColor: editData.color || editItem.color }}
            >
              <div className="cd-card-overlay" style={{ background: `linear-gradient(135deg, ${editData.color || editItem.color}30, ${editData.color || editItem.color}10)` }} />
              <div className="cd-card-content">
                <div className="cd-card-top-row">
                  <span className="cd-card-type-badge" style={{ background: `${editData.color || editItem.color}50`, color: '#fff' }}>{typeInfo(editData.type || editItem.type).label}</span>
                </div>
                <div className="cd-card-name">{(editData.name || '').trim() || editItem.name}</div>
                {(editData.description || '').trim() && <div className="cd-card-desc">{(editData.description || '').trim()}</div>}
                <div className="cd-card-bottom">
                  <span className="cd-card-date">{editItem.date}</span>
                  <span className="cd-card-days" style={{ color: editData.color || editItem.color }}>
                    {(() => { const d = diffDays(editItem.date); return d > 0 ? `${d} 天后` : d === 0 ? '就是今天' : `${Math.abs(d)} 天前`; })()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`cd-card cd-card-${newType}`}
              style={{ borderColor: newColor }}
            >
              <div className="cd-card-overlay" style={{ background: `linear-gradient(135deg, ${newColor}30, ${newColor}10)` }} />
              <div className="cd-card-content">
                <div className="cd-card-top-row">
                  <span className="cd-card-type-badge" style={{ background: `${newColor}50`, color: '#fff' }}>{typeInfo(newType).label}</span>
                </div>
                <div className="cd-card-name">{newName.trim() || '事件名称'}</div>
                {newDesc.trim() && <div className="cd-card-desc">{newDesc.trim()}</div>}
                <div className="cd-card-bottom">
                  <span className="cd-card-date">{selectedDate ? toLocalDateStr(selectedDate) : 'YYYY-MM-DD'}</span>
                  <span className="cd-card-days" style={{ color: newColor }}>
                    {selectedDate ? (() => { const d = diffDays(toLocalDateStr(selectedDate)); return d > 0 ? `${d} 天后` : d === 0 ? '就是今天' : `${Math.abs(d)} 天前`; })() : '-- 天'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== 下部：卡片水平列表 ===== */}
      <div className="cd-cards-wrap" ref={cardsRef} onWheel={handleCardsWheel}>
        {sorted.length === 0 ? (
          <div className="cd-cards-empty">选择日期并添加事件</div>
        ) : (
          sorted.map(item => {
            const days = diffDays(item.date);
            const info = typeInfo(item.type);
            return (
              <div
                key={item.id}
                className={`cd-card cd-card-${item.type}`}
                style={{ borderColor: item.color }}
                onClick={() => startEdit(item)}
              >
                <div className="cd-card-overlay" style={{ background: `linear-gradient(135deg, ${item.color}30, ${item.color}10)` }} />
                <div className="cd-card-content">
                  <div className="cd-card-top-row">
                    <span className="cd-card-type-badge" style={{ background: `${item.color}50`, color: '#fff' }}>{info.label}</span>
                    <button
                      className="cd-card-delete"
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      type="button"
                      title="删除"
                    >x</button>
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
          })
        )}
      </div>
    </div>
  );
}
