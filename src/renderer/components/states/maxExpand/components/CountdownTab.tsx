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
 * @file CountdownTab.tsx
 * @description 最大展开模式 — 倒数日 Tab — 重要日期倒计时管理，含日历标记
 * @author 鸡哥
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import DatePicker from 'react-datepicker';
import { useTranslation } from 'react-i18next';
import 'react-datepicker/dist/react-datepicker.css';
import useIslandStore from '../../../../store/slices';

/** 事件类型 */
type EventType = 'countdown' | 'anniversary' | 'birthday' | 'holiday' | 'exam';

const EVENT_TYPES: EventType[] = ['countdown', 'anniversary', 'birthday', 'holiday', 'exam'];

/** 倒数日数据 */
interface CountdownItem {
  id: number;
  name: string;
  date: string;
  color: string;
  type: EventType;
  description?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
}

const STORE_KEY = 'countdown-dates';

function isRenderableImageSource(src: string): boolean {
  return src.startsWith('data:')
    || src.startsWith('http://')
    || src.startsWith('https://')
    || src.startsWith('file://')
    || src.startsWith('blob:')
    || src.startsWith('/');
}

async function normalizeImageSource(src: string | undefined): Promise<string | undefined> {
  if (!src) return undefined;
  if (isRenderableImageSource(src)) return src;
  const dataUrl = await window.api.loadWallpaperFile(src).catch(() => null);
  return dataUrl || src;
}

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

/**
 * 渲染倒数日管理面板
 * @description 提供倒数日新增、编辑、删除与卡片预览能力
 * @returns 倒数日 Tab 组件
 */
export function CountdownTab(): React.ReactElement {
  const { t } = useTranslation();
  const [items, setItems] = useState<CountdownItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#69c0ff');
  const [newType, setNewType] = useState<EventType>('countdown');
  const [newDesc, setNewDesc] = useState('');
  const [newBgImage, setNewBgImage] = useState<string | undefined>(undefined);
  const [newBgOpacity, setNewBgOpacity] = useState(0.5);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<CountdownItem>>({});
  const [editBgImage, setEditBgImage] = useState<string | undefined>(undefined);
  const [editBgOpacity, setEditBgOpacity] = useState(0.5);
  const coverImage = useIslandStore((s) => s.coverImage);
  const [resolvedCoverImage, setResolvedCoverImage] = useState<string | null>(null);
  const editCustomColorRef = useRef<HTMLInputElement>(null);
  const addCustomColorRef = useRef<HTMLInputElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const colorRafRef = useRef<number | null>(null);

  const handleEditColorInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (colorRafRef.current !== null) cancelAnimationFrame(colorRafRef.current);
    colorRafRef.current = requestAnimationFrame(() => {
      setEditData(prev => ({ ...prev, color: v }));
      colorRafRef.current = null;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    normalizeImageSource(coverImage ?? undefined).then((resolved) => {
      if (cancelled) return;
      setResolvedCoverImage(resolved ?? null);
    }).catch(() => {
      if (cancelled) return;
      setResolvedCoverImage(null);
    });
    return () => { cancelled = true; };
  }, [coverImage]);

  const handleAddColorInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (colorRafRef.current !== null) cancelAnimationFrame(colorRafRef.current);
    colorRafRef.current = requestAnimationFrame(() => {
      setNewColor(v);
      colorRafRef.current = null;
    });
  }, []);

  /** 加载 */
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(STORE_KEY).then(async (data) => {
      if (cancelled) return;
      if (Array.isArray(data)) {
        const normalized = await Promise.all((data as CountdownItem[]).map(async (item) => ({
          ...item,
          backgroundImage: await normalizeImageSource(item.backgroundImage),
        })));
        if (!cancelled) setItems(normalized);
      }
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
      backgroundImage: newBgImage,
      backgroundOpacity: newBgImage ? newBgOpacity : undefined,
    }]);
    setNewName('');
    setNewDesc('');
    setNewBgImage(undefined);
    setNewBgOpacity(0.5);
    setSelectedDate(null);
  }, [selectedDate, newName, newColor, newType, newDesc, newBgImage, newBgOpacity]);

  /** 删除 */
  const removeItem = useCallback((id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (editingId === id) setEditingId(null);
  }, [editingId]);

  /** 开始编辑 */
  const startEdit = useCallback((item: CountdownItem) => {
    setEditingId(item.id);
    setEditData({ name: item.name, description: item.description || '', color: item.color, type: item.type });
    setEditBgImage(item.backgroundImage);
    setEditBgOpacity(item.backgroundOpacity ?? 0.5);
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
        backgroundImage: editBgImage,
        backgroundOpacity: editBgImage ? editBgOpacity : undefined,
      };
    }));
    setEditingId(null);
  }, [editingId, editData, editBgImage, editBgOpacity]);

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

  const getEventTypeLabel = (type: EventType): string => {
    return t(`countdown.types.${type}`, {
      defaultValue: type === 'countdown'
        ? '倒数日'
        : type === 'anniversary'
          ? '纪念日'
          : type === 'birthday'
            ? '生日'
            : type === 'holiday'
              ? '节日'
              : '考试',
    });
  };

  const formatDayText = (days: number): string => {
    if (days > 0) return t('countdown.days.after', { defaultValue: '{{days}} 天后', days });
    if (days === 0) return t('countdown.days.today', { defaultValue: '就是今天' });
    return t('countdown.days.before', { defaultValue: '{{days}} 天前', days: Math.abs(days) });
  };

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
            <div className="cd-editor-title">{t('countdown.editTitle', { defaultValue: '编辑事件' })}</div>
            <input
              className="cd-input"
              value={editData.name || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('countdown.namePlaceholder', { defaultValue: '事件名称' })}
            />
            <textarea
              className="cd-textarea"
              value={editData.description || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('countdown.descPlaceholder', { defaultValue: '描述（可选）' })}
              rows={2}
            />
            <div className="cd-form-row">
              <span className="cd-form-label">{t('countdown.form.type', { defaultValue: '类型' })}</span>
              <div className="cd-type-selector">
                {EVENT_TYPES.map(type => (
                  <button
                    key={type}
                    className={`cd-type-btn ${editData.type === type ? 'active' : ''}`}
                    onClick={() => setEditData(prev => ({ ...prev, type }))}
                    type="button"
                    title={getEventTypeLabel(type)}
                  >
                    <span className="cd-type-label">{getEventTypeLabel(type)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="cd-form-row">
              <span className="cd-form-label">{t('countdown.form.color', { defaultValue: '颜色' })}</span>
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
                  title={t('countdown.form.customColor', { defaultValue: '自定义颜色' })}
                >
                  <span className="cd-color-custom-icon">+</span>
                </button>
                <input
                  ref={editCustomColorRef}
                  type="color"
                  className="cd-color-native-hidden"
                  value={editData.color || '#69c0ff'}
                  onChange={handleEditColorInput}
                />
              </div>
            </div>
            <div className="cd-form-row">
              <span className="cd-form-label">{t('countdown.form.background', { defaultValue: '背景' })}</span>
              <div className="cd-bg-row">
                <button
                  className={`cd-bg-btn ${editBgImage && resolvedCoverImage && editBgImage === resolvedCoverImage ? 'active' : ''}`}
                  type="button"
                  title={resolvedCoverImage
                    ? t('countdown.form.useAlbumCover', { defaultValue: '使用当前专辑封面' })
                    : t('countdown.form.noPlayingSong', { defaultValue: '暂无正在播放的歌曲' })}
                  disabled={!resolvedCoverImage}
                  onClick={() => { if (resolvedCoverImage) setEditBgImage(resolvedCoverImage); }}
                >
                  {resolvedCoverImage ? (
                    <img src={resolvedCoverImage} className="cd-bg-btn-thumb" alt="" />
                  ) : (
                    <span className="cd-bg-btn-icon">♪</span>
                  )}
                </button>
                <span className="cd-bg-label">{t('countdown.form.albumBackground', { defaultValue: '专辑背景' })}</span>
                <button
                  className="cd-bg-btn"
                  type="button"
                  title={t('countdown.form.selectImageFile', { defaultValue: '从文件选择图片' })}
                  onClick={async () => {
                    const path = await window.api.openImageDialog();
                    if (path) {
                      const normalized = await normalizeImageSource(path);
                      if (normalized) setEditBgImage(normalized);
                    }
                  }}
                >
                  <span className="cd-bg-btn-icon">…</span>
                </button>
                <span className="cd-bg-label">{t('countdown.form.customBackground', { defaultValue: '自定义背景' })}</span>
                {editBgImage && (
                  <button
                    className="cd-bg-btn cd-bg-btn-clear"
                    type="button"
                    title={t('countdown.form.clearBackground', { defaultValue: '清除背景' })}
                    onClick={() => setEditBgImage(undefined)}
                  >
                    <span className="cd-bg-btn-icon">x</span>
                  </button>
                )}
              </div>
            </div>
            {editBgImage && (
              <div className="cd-form-row">
                <span className="cd-form-label">{t('countdown.form.opacity', { defaultValue: '透明度' })}</span>
                <input
                  type="range"
                  className="cd-opacity-slider"
                  min={0} max={1} step={0.05}
                  value={editBgOpacity}
                  onChange={(e) => setEditBgOpacity(parseFloat(e.target.value))}
                />
                <span className="cd-opacity-value">{Math.round(editBgOpacity * 100)}%</span>
              </div>
            )}
            <div className="cd-form-actions">
              <button className="cd-btn save" onClick={saveEdit} type="button">{t('countdown.actions.save', { defaultValue: '保存' })}</button>
              <button className="cd-btn cancel" onClick={() => setEditingId(null)} type="button">{t('countdown.actions.cancel', { defaultValue: '取消' })}</button>
            </div>
          </div>
        ) : (
          <div className="cd-editor-form">
            <div className="cd-editor-title">
              {selectedDate
                ? t('countdown.newTitleWithDate', { defaultValue: '新建事件 - {{date}}', date: toLocalDateStr(selectedDate) })
                : t('countdown.newTitlePlaceholder', { defaultValue: '< 选择日期以添加事件' })}
            </div>
            <input
              className="cd-input"
              placeholder={t('countdown.namePlaceholder', { defaultValue: '事件名称' })}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
            />
            <textarea
              className="cd-textarea"
              placeholder={t('countdown.descPlaceholder', { defaultValue: '描述（可选）' })}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
            />
            <div className="cd-form-row">
              <span className="cd-form-label">{t('countdown.form.type', { defaultValue: '类型' })}</span>
              <div className="cd-type-selector">
                {EVENT_TYPES.map(type => (
                  <button
                    key={type}
                    className={`cd-type-btn ${newType === type ? 'active' : ''}`}
                    onClick={() => setNewType(type)}
                    type="button"
                    title={getEventTypeLabel(type)}
                  >
                    <span className="cd-type-label">{getEventTypeLabel(type)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="cd-form-row">
              <span className="cd-form-label">{t('countdown.form.color', { defaultValue: '颜色' })}</span>
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
                  title={t('countdown.form.customColor', { defaultValue: '自定义颜色' })}
                >
                  <span className="cd-color-custom-icon">+</span>
                </button>
                <input
                  ref={addCustomColorRef}
                  type="color"
                  className="cd-color-native-hidden"
                  value={newColor}
                  onChange={handleAddColorInput}
                />
              </div>
            </div>
            <div className="cd-form-row">
              <span className="cd-form-label">{t('countdown.form.background', { defaultValue: '背景' })}</span>
              <div className="cd-bg-row">
                <button
                  className={`cd-bg-btn ${newBgImage && resolvedCoverImage && newBgImage === resolvedCoverImage ? 'active' : ''}`}
                  type="button"
                  title={resolvedCoverImage
                    ? t('countdown.form.useAlbumCover', { defaultValue: '使用当前专辑封面' })
                    : t('countdown.form.noPlayingSong', { defaultValue: '暂无正在播放的歌曲' })}
                  disabled={!resolvedCoverImage}
                  onClick={() => { if (resolvedCoverImage) setNewBgImage(resolvedCoverImage); }}
                >
                  {resolvedCoverImage ? (
                    <img src={resolvedCoverImage} className="cd-bg-btn-thumb" alt="" />
                  ) : (
                    <span className="cd-bg-btn-icon">♪</span>
                  )}
                </button>
                <span className="cd-bg-label">专辑背景</span>
                <button
                  className="cd-bg-btn"
                  type="button"
                  title="从文件选择图片"
                  onClick={async () => {
                    const path = await window.api.openImageDialog();
                    if (path) {
                      const normalized = await normalizeImageSource(path);
                      if (normalized) setNewBgImage(normalized);
                    }
                  }}
                >
                  <span className="cd-bg-btn-icon">…</span>
                </button>
                <span className="cd-bg-label">{t('countdown.form.customBackground', { defaultValue: '自定义背景' })}</span>
                {newBgImage && (
                  <button
                    className="cd-bg-btn cd-bg-btn-clear"
                    type="button"
                    title={t('countdown.form.clearBackground', { defaultValue: '清除背景' })}
                    onClick={() => setNewBgImage(undefined)}
                  >
                    <span className="cd-bg-btn-icon">x</span>
                  </button>
                )}
              </div>
            </div>
            {newBgImage && (
              <div className="cd-form-row">
                <span className="cd-form-label">{t('countdown.form.opacity', { defaultValue: '透明度' })}</span>
                <input
                  type="range"
                  className="cd-opacity-slider"
                  min={0} max={1} step={0.05}
                  value={newBgOpacity}
                  onChange={(e) => setNewBgOpacity(parseFloat(e.target.value))}
                />
                <span className="cd-opacity-value">{Math.round(newBgOpacity * 100)}%</span>
              </div>
            )}
            <div className="cd-form-actions">
              <button
                className="cd-btn save"
                onClick={addItem}
                disabled={!selectedDate || !newName.trim()}
                type="button"
              >
                {t('countdown.actions.add', { defaultValue: '添加' })}
              </button>
            </div>
          </div>
        )}

        {/* 右：卡片预览 */}
        <div className="cd-preview">
          <div className="cd-preview-label">{t('countdown.preview', { defaultValue: '预览' })}</div>
          {editItem ? (
            <div
              className={`cd-card cd-card-${editData.type || editItem.type}`}
              style={{ borderColor: editData.color || editItem.color }}
            >
              {editBgImage && <div className="cd-card-bg" style={{ backgroundImage: `url(${editBgImage})`, opacity: editBgOpacity }} />}
              <div className="cd-card-overlay" style={{ background: `linear-gradient(135deg, ${editData.color || editItem.color}30, ${editData.color || editItem.color}10)` }} />
              <div className="cd-card-content">
                <div className="cd-card-top-row">
                  <span className="cd-card-type-badge" style={{ background: `${editData.color || editItem.color}50`, color: '#fff' }}>{getEventTypeLabel(editData.type || editItem.type)}</span>
                </div>
                <div className="cd-card-name">{(editData.name || '').trim() || editItem.name}</div>
                {(editData.description || '').trim() && <div className="cd-card-desc">{(editData.description || '').trim()}</div>}
                <div className="cd-card-bottom">
                  <span className="cd-card-date">{editItem.date}</span>
                  <span className="cd-card-days" style={{ color: editData.color || editItem.color }}>
                    {(() => { const d = diffDays(editItem.date); return formatDayText(d); })()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`cd-card cd-card-${newType}`}
              style={{ borderColor: newColor }}
            >
              {newBgImage && <div className="cd-card-bg" style={{ backgroundImage: `url(${newBgImage})`, opacity: newBgOpacity }} />}
              <div className="cd-card-overlay" style={{ background: `linear-gradient(135deg, ${newColor}30, ${newColor}10)` }} />
              <div className="cd-card-content">
                <div className="cd-card-top-row">
                  <span className="cd-card-type-badge" style={{ background: `${newColor}50`, color: '#fff' }}>{getEventTypeLabel(newType)}</span>
                </div>
                <div className="cd-card-name">{newName.trim() || t('countdown.namePlaceholder', { defaultValue: '事件名称' })}</div>
                {newDesc.trim() && <div className="cd-card-desc">{newDesc.trim()}</div>}
                <div className="cd-card-bottom">
                  <span className="cd-card-date">{selectedDate ? toLocalDateStr(selectedDate) : t('countdown.datePlaceholder', { defaultValue: 'YYYY-MM-DD' })}</span>
                  <span className="cd-card-days" style={{ color: newColor }}>
                    {selectedDate ? (() => { const d = diffDays(toLocalDateStr(selectedDate)); return formatDayText(d); })() : t('countdown.days.placeholder', { defaultValue: '-- 天' })}
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
          <div className="cd-cards-empty">{t('countdown.empty', { defaultValue: '选择日期并添加事件' })}</div>
        ) : (
          sorted.map(item => {
            const days = diffDays(item.date);
            return (
              <div
                key={item.id}
                className={`cd-card cd-card-${item.type}`}
                style={{ borderColor: item.color }}
                onClick={() => startEdit(item)}
              >
                {item.backgroundImage && <div className="cd-card-bg" style={{ backgroundImage: `url(${item.backgroundImage})`, opacity: item.backgroundOpacity ?? 0.5 }} />}
                <div className="cd-card-overlay" style={{ background: `linear-gradient(135deg, ${item.color}30, ${item.color}10)` }} />
                <div className="cd-card-content">
                  <div className="cd-card-top-row">
                    <span className="cd-card-type-badge" style={{ background: `${item.color}50`, color: '#fff' }}>{getEventTypeLabel(item.type)}</span>
                    <button
                      className="cd-card-delete"
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      type="button"
                      title={t('countdown.actions.delete', { defaultValue: '删除' })}
                    >x</button>
                  </div>
                  <div className="cd-card-name">{item.name}</div>
                  {item.description && <div className="cd-card-desc">{item.description}</div>}
                  <div className="cd-card-bottom">
                    <span className="cd-card-date">{item.date}</span>
                    <span className="cd-card-days" style={{ color: item.color }}>
                      {formatDayText(days)}
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
