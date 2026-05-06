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
 * @file AlarmTab.tsx
 * @description 最大展开模式 闹钟 Tab — 多闹钟管理，支持新建、编辑、删除、重复日选择、开关
 * @author 鸡哥
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../utils/SvgIcon';

/** 星期几 0=周日 ... 6=周六 */
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** 单条闹钟 */
interface AlarmItem {
  id: number;
  hour: number;
  minute: number;
  label: string;
  enabled: boolean;
  repeat: Weekday[];
  createdAt: number;
}

const STORE_KEY = 'alarms';

const ALL_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** 通过 IPC 写入文件 */
function persistAlarms(items: AlarmItem[]): void {
  window.api.storeWrite(STORE_KEY, items).catch(() => {});
}

/** 规范化旧数据 */
function normalizeAlarms(items: AlarmItem[]): AlarmItem[] {
  return items.map((a) => ({
    ...a,
    hour: a.hour ?? 0,
    minute: a.minute ?? 0,
    label: a.label ?? '',
    enabled: a.enabled ?? true,
    repeat: Array.isArray(a.repeat) ? a.repeat : [],
    createdAt: a.createdAt ?? Date.now(),
  }));
}

/** 格式化时间 HH:MM */
function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Alarm Tab
 * @description 最大展开模式下的闹钟管理面板
 */
export function AlarmTab(): React.ReactElement {
  const { t } = useTranslation();
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const skipPersistOnceRef = useRef(false);

  /* 编辑态 */
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editHour, setEditHour] = useState(0);
  const [editMinute, setEditMinute] = useState(0);
  const [editLabel, setEditLabel] = useState('');
  const [editRepeat, setEditRepeat] = useState<Weekday[]>([]);

  /* 新建态 */
  const [adding, setAdding] = useState(false);
  const [newHour, setNewHour] = useState(8);
  const [newMinute, setNewMinute] = useState(0);
  const [newLabel, setNewLabel] = useState('');
  const [newRepeat, setNewRepeat] = useState<Weekday[]>([]);

  /** 启动时从文件加载 */
  useEffect(() => {
    let cancelled = false;
    const applyAlarms = (data: unknown): void => {
      if (!Array.isArray(data)) return;
      skipPersistOnceRef.current = true;
      setAlarms(normalizeAlarms(data as AlarmItem[]));
    };

    window.api.storeRead(STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data) && data.length > 0) {
        setAlarms(normalizeAlarms(data as AlarmItem[]));
      }
      setLoaded(true);
    }).catch(() => {
      if (!cancelled) setLoaded(true);
    });

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${STORE_KEY}`) {
        applyAlarms(value);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  /** alarms 变化时持久化 */
  useEffect(() => {
    if (!loaded) return;
    if (skipPersistOnceRef.current) {
      skipPersistOnceRef.current = false;
      return;
    }
    persistAlarms(alarms);
  }, [alarms, loaded]);

  /** 星期几简写 */
  const weekdayLabel = useCallback((d: Weekday): string => {
    const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return t(`alarm.weekday.${keys[d]}`, { defaultValue: ['日', '一', '二', '三', '四', '五', '六'][d] });
  }, [t]);

  /** 重复描述 */
  const repeatSummary = useCallback((repeat: Weekday[]): string => {
    if (repeat.length === 0) return t('alarm.repeatOnce', { defaultValue: '仅一次' });
    if (repeat.length === 7) return t('alarm.repeatEveryday', { defaultValue: '每天' });
    const weekdays: Weekday[] = [1, 2, 3, 4, 5];
    const weekend: Weekday[] = [0, 6];
    if (weekdays.every((d) => repeat.includes(d)) && !weekend.some((d) => repeat.includes(d))) {
      return t('alarm.repeatWeekdays', { defaultValue: '工作日' });
    }
    if (weekend.every((d) => repeat.includes(d)) && !weekdays.some((d) => repeat.includes(d))) {
      return t('alarm.repeatWeekend', { defaultValue: '周末' });
    }
    return repeat.map((d) => weekdayLabel(d)).join(' ');
  }, [t, weekdayLabel]);

  /** 切换星期 */
  const toggleWeekday = (list: Weekday[], day: Weekday): Weekday[] => {
    return list.includes(day) ? list.filter((d) => d !== day) : [...list, day];
  };

  /** 添加闹钟 */
  const addAlarm = (): void => {
    const item: AlarmItem = {
      id: Date.now(),
      hour: newHour,
      minute: newMinute,
      label: newLabel.trim(),
      enabled: true,
      repeat: [...newRepeat],
      createdAt: Date.now(),
    };
    setAlarms((prev) => [...prev, item]);
    setAdding(false);
    setNewHour(8);
    setNewMinute(0);
    setNewLabel('');
    setNewRepeat([]);
  };

  /** 删除闹钟 */
  const deleteAlarm = (id: number): void => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    if (editingId === id) setEditingId(null);
  };

  /** 切换开关 */
  const toggleEnabled = (id: number): void => {
    setAlarms((prev) => prev.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  /** 进入编辑 */
  const startEdit = (alarm: AlarmItem): void => {
    setEditingId(alarm.id);
    setEditHour(alarm.hour);
    setEditMinute(alarm.minute);
    setEditLabel(alarm.label);
    setEditRepeat([...alarm.repeat]);
  };

  /** 保存编辑 */
  const saveEdit = (): void => {
    if (editingId === null) return;
    setAlarms((prev) => prev.map((a) => a.id === editingId ? {
      ...a,
      hour: editHour,
      minute: editMinute,
      label: editLabel.trim(),
      repeat: [...editRepeat],
    } : a));
    setEditingId(null);
  };

  /** 取消编辑 */
  const cancelEdit = (): void => {
    setEditingId(null);
  };

  /** 计算距下次响铃的时间描述 */
  const nextRingDesc = useCallback((alarm: AlarmItem): string => {
    if (!alarm.enabled) return t('alarm.disabled', { defaultValue: '已关闭' });
    const now = new Date();
    const todayMinutes = now.getHours() * 60 + now.getMinutes();
    const alarmMinutes = alarm.hour * 60 + alarm.minute;
    const todayDay = now.getDay() as Weekday;

    if (alarm.repeat.length === 0) {
      const diff = alarmMinutes - todayMinutes;
      if (diff > 0) {
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return h > 0
          ? t('alarm.ringIn', { defaultValue: '{{h}}小时{{m}}分钟后', h, m })
          : t('alarm.ringInMin', { defaultValue: '{{m}}分钟后', m });
      }
      return t('alarm.ringTomorrow', { defaultValue: '明天' });
    }

    for (let offset = 0; offset < 7; offset++) {
      const checkDay = ((todayDay + offset) % 7) as Weekday;
      if (!alarm.repeat.includes(checkDay)) continue;
      if (offset === 0 && alarmMinutes > todayMinutes) {
        const diff = alarmMinutes - todayMinutes;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return h > 0
          ? t('alarm.ringIn', { defaultValue: '{{h}}小时{{m}}分钟后', h, m })
          : t('alarm.ringInMin', { defaultValue: '{{m}}分钟后', m });
      }
      if (offset === 0) continue;
      if (offset === 1) return t('alarm.ringTomorrow', { defaultValue: '明天' });
      return t('alarm.ringInDays', { defaultValue: '{{n}}天后', n: offset });
    }
    return '';
  }, [t]);

  /** 排序：按时间升序 */
  const sortedAlarms = [...alarms].sort((a, b) => {
    const ta = a.hour * 60 + a.minute;
    const tb = b.hour * 60 + b.minute;
    return ta - tb;
  });

  return (
    <div className="alarm-tab-container">
      <div className="alarm-tab-header">
        <div className="alarm-tab-title">{t('alarm.title', { defaultValue: '闹钟' })}</div>
        <button
          className="alarm-tab-add-btn"
          type="button"
          onClick={() => { setAdding(!adding); setEditingId(null); }}
          title={t('alarm.add', { defaultValue: '新建闹钟' })}
        >
+
        </button>
      </div>

      {/* 新建表单 */}
      {adding && (
        <div className="alarm-editor alarm-editor--adding">
          <div className="alarm-editor-time-row">
            <input
              className="alarm-editor-time-input"
              type="number"
              min={0}
              max={23}
              value={newHour}
              onChange={(e) => setNewHour(Math.max(0, Math.min(23, Number(e.target.value) || 0)))}
            />
            <span className="alarm-editor-time-sep">:</span>
            <input
              className="alarm-editor-time-input"
              type="number"
              min={0}
              max={59}
              value={newMinute}
              onChange={(e) => setNewMinute(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
            />
          </div>
          <input
            className="alarm-editor-label-input"
            type="text"
            placeholder={t('alarm.labelPlaceholder', { defaultValue: '闹钟备注（可选）' })}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <div className="alarm-editor-weekdays">
            {ALL_WEEKDAYS.map((d) => (
              <button
                key={d}
                className={`alarm-weekday-btn${newRepeat.includes(d) ? ' alarm-weekday-btn--active' : ''}`}
                type="button"
                onClick={() => setNewRepeat(toggleWeekday(newRepeat, d))}
              >
                {weekdayLabel(d)}
              </button>
            ))}
          </div>
          <div className="alarm-editor-actions">
            <button className="alarm-editor-cancel-btn" type="button" onClick={() => setAdding(false)}>
              {t('alarm.cancel', { defaultValue: '取消' })}
            </button>
            <button className="alarm-editor-save-btn" type="button" onClick={addAlarm}>
              {t('alarm.save', { defaultValue: '保存' })}
            </button>
          </div>
        </div>
      )}

      {/* 闹钟列表 */}
      <div className="alarm-tab-list">
        {!loaded && <div className="alarm-tab-loading">{t('alarm.loading', { defaultValue: '加载中…' })}</div>}
        {loaded && sortedAlarms.length === 0 && !adding && (
          <div className="alarm-tab-empty">{t('alarm.empty', { defaultValue: '暂无闹钟，点击右上角新建' })}</div>
        )}
        {sortedAlarms.map((alarm) => (
          editingId === alarm.id ? (
            /* 编辑态 */
            <div key={alarm.id} className="alarm-editor alarm-editor--editing">
              <div className="alarm-editor-time-row">
                <input
                  className="alarm-editor-time-input"
                  type="number"
                  min={0}
                  max={23}
                  value={editHour}
                  onChange={(e) => setEditHour(Math.max(0, Math.min(23, Number(e.target.value) || 0)))}
                />
                <span className="alarm-editor-time-sep">:</span>
                <input
                  className="alarm-editor-time-input"
                  type="number"
                  min={0}
                  max={59}
                  value={editMinute}
                  onChange={(e) => setEditMinute(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                />
              </div>
              <input
                className="alarm-editor-label-input"
                type="text"
                placeholder={t('alarm.labelPlaceholder', { defaultValue: '闹钟备注（可选）' })}
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
              />
              <div className="alarm-editor-weekdays">
                {ALL_WEEKDAYS.map((d) => (
                  <button
                    key={d}
                    className={`alarm-weekday-btn${editRepeat.includes(d) ? ' alarm-weekday-btn--active' : ''}`}
                    type="button"
                    onClick={() => setEditRepeat(toggleWeekday(editRepeat, d))}
                  >
                    {weekdayLabel(d)}
                  </button>
                ))}
              </div>
              <div className="alarm-editor-actions">
                <button className="alarm-editor-cancel-btn" type="button" onClick={cancelEdit}>
                  {t('alarm.cancel', { defaultValue: '取消' })}
                </button>
                <button className="alarm-editor-save-btn" type="button" onClick={saveEdit}>
                  {t('alarm.save', { defaultValue: '保存' })}
                </button>
              </div>
            </div>
          ) : (
            /* 展示态 */
            <div key={alarm.id} className={`alarm-card${alarm.enabled ? '' : ' alarm-card--disabled'}`}>
              <div className="alarm-card-left" onClick={() => startEdit(alarm)}>
                <div className="alarm-card-time">{formatTime(alarm.hour, alarm.minute)}</div>
                <div className="alarm-card-meta">
                  {alarm.label && <span className="alarm-card-label">{alarm.label}</span>}
                  <span className="alarm-card-repeat">{repeatSummary(alarm.repeat)}</span>
                  <span className="alarm-card-next">{nextRingDesc(alarm)}</span>
                </div>
              </div>
              <div className="alarm-card-right">
                <button
                  className={`alarm-toggle${alarm.enabled ? ' alarm-toggle--on' : ''}`}
                  type="button"
                  onClick={() => toggleEnabled(alarm.id)}
                  title={alarm.enabled ? t('alarm.turnOff', { defaultValue: '关闭' }) : t('alarm.turnOn', { defaultValue: '开启' })}
                >
                  <span className="alarm-toggle-track">
                    <span className="alarm-toggle-thumb" />
                  </span>
                </button>
                <button
                  className="alarm-delete-btn"
                  type="button"
                  onClick={() => deleteAlarm(alarm.id)}
                  title={t('alarm.delete', { defaultValue: '删除' })}
                >
                  <img src={SvgIcon.DELETE} alt="" className="alarm-tab-btn-icon" />
                </button>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
