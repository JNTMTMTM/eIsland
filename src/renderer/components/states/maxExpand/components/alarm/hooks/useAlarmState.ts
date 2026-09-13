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
 * @file useAlarmState.ts
 * @description 闹钟 Tab 集中式状态管理 Hook。
 * @author 鸡哥
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_SYSTEM_ALARM_RINGTONE,
  normalizeSystemAlarmRingtone,
  stopPreviewAlarmSound,
  subscribePreviewAlarmSoundState,
  type SystemAlarmRingtone,
} from '../../../../../../utils/audio/alarmSound';
import type { AlarmItem, Weekday } from '../types/alarmTypes';
import { STORE_KEY } from '../types/alarmTypes';
import { persistAlarms, normalizeAlarms } from '../utils/alarmUtils';

/** useAlarmState Hook 返回类型 */
export interface AlarmState {
  alarms: AlarmItem[];
  loaded: boolean;
  previewPlaying: boolean;
  /** 编辑态 */
  editingId: number | null;
  editHour: number;
  editMinute: number;
  editSecond: number;
  editLabel: string;
  editRepeat: Weekday[];
  editRingtone: SystemAlarmRingtone;
  editLoop: boolean;
  setEditHour: (v: number) => void;
  setEditMinute: (v: number) => void;
  setEditSecond: (v: number) => void;
  setEditLabel: (v: string) => void;
  setEditRepeat: (v: Weekday[]) => void;
  setEditRingtone: (v: SystemAlarmRingtone) => void;
  setEditLoop: (v: boolean) => void;
  /** 新建态 */
  adding: boolean;
  newHour: number;
  newMinute: number;
  newSecond: number;
  newLabel: string;
  newRepeat: Weekday[];
  newRingtone: SystemAlarmRingtone;
  newLoop: boolean;
  setNewHour: (v: number) => void;
  setNewMinute: (v: number) => void;
  setNewSecond: (v: number) => void;
  setNewLabel: (v: string) => void;
  setNewRepeat: (v: Weekday[]) => void;
  setNewRingtone: (v: SystemAlarmRingtone) => void;
  setNewLoop: (v: boolean) => void;
  /** 操作 */
  setAdding: (v: boolean) => void;
  weekdayLabel: (d: Weekday) => string;
  repeatSummary: (repeat: Weekday[]) => string;
  nextRingDesc: (alarm: AlarmItem) => string;
  addAlarm: () => void;
  closeEditor: () => void;
  deleteAlarm: (id: number) => void;
  toggleEnabled: (id: number) => void;
  startEdit: (alarm: AlarmItem) => void;
  saveEdit: () => void;
  /** 派生 */
  sortedAlarms: AlarmItem[];
  showEditor: boolean;
}

/** 闹钟集中式状态管理 Hook */
export function useAlarmState(): AlarmState {
  const { t } = useTranslation();

  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const skipPersistOnceRef = useRef(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  /* 编辑态 */
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editHour, setEditHour] = useState(0);
  const [editMinute, setEditMinute] = useState(0);
  const [editSecond, setEditSecond] = useState(0);
  const [editLabel, setEditLabel] = useState('');
  const [editRepeat, setEditRepeat] = useState<Weekday[]>([]);
  const [editRingtone, setEditRingtone] = useState<SystemAlarmRingtone>(DEFAULT_SYSTEM_ALARM_RINGTONE);
  const [editLoop, setEditLoop] = useState(true);

  /* 新建态 */
  const [adding, setAdding] = useState(false);
  const [newHour, setNewHour] = useState(8);
  const [newMinute, setNewMinute] = useState(0);
  const [newSecond, setNewSecond] = useState(0);
  const [newLabel, setNewLabel] = useState('');
  const [newRepeat, setNewRepeat] = useState<Weekday[]>([]);
  const [newRingtone, setNewRingtone] = useState<SystemAlarmRingtone>(DEFAULT_SYSTEM_ALARM_RINGTONE);
  const [newLoop, setNewLoop] = useState(true);

  /** 启动时从文件加载 */
  useEffect(() => {
    let cancelled = false;
    let receivedUpdate = false;
    const applyAlarms = (data: unknown): void => {
      if (!Array.isArray(data)) return;
      skipPersistOnceRef.current = true;
      setAlarms(normalizeAlarms(data as AlarmItem[]));
    };

    window.api.storeRead(STORE_KEY).then((data) => {
      if (cancelled) return;
      skipPersistOnceRef.current = true;
      if (!receivedUpdate && Array.isArray(data)) {
        setAlarms(normalizeAlarms(data as AlarmItem[]));
      }
      setLoaded(true);
    }).catch(() => {
      if (!cancelled) {
        skipPersistOnceRef.current = true;
        setLoaded(true);
      }
    });

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${STORE_KEY}`) {
        receivedUpdate = true;
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

  useEffect(() => {
    const unsubscribe = subscribePreviewAlarmSoundState((state) => {
      setPreviewPlaying(state.playing);
    });
    return () => {
      unsubscribe();
      stopPreviewAlarmSound();
    };
  }, []);

  /** 星期几简写 */
  const weekdayLabel = useCallback((d: Weekday): string => {
    const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return t(`maxExpand.alarm.weekday.${keys[d]}`, { defaultValue: ['日', '一', '二', '三', '四', '五', '六'][d] });
  }, [t]);

  /** 重复描述 */
  const repeatSummary = useCallback((repeat: Weekday[]): string => {
    if (repeat.length === 0) return t('maxExpand.alarm.repeatOnce', { defaultValue: '仅一次' });
    if (repeat.length === 7) return t('maxExpand.alarm.repeatEveryday', { defaultValue: '每天' });
    const weekdays: Weekday[] = [1, 2, 3, 4, 5];
    const weekend: Weekday[] = [0, 6];
    if (weekdays.every((d) => repeat.includes(d)) && !weekend.some((d) => repeat.includes(d))) {
      return t('maxExpand.alarm.repeatWeekdays', { defaultValue: '工作日' });
    }
    if (weekend.every((d) => repeat.includes(d)) && !weekdays.some((d) => repeat.includes(d))) {
      return t('maxExpand.alarm.repeatWeekend', { defaultValue: '周末' });
    }
    return repeat.map((d) => weekdayLabel(d)).join(' ');
  }, [t, weekdayLabel]);

  /** 检查是否已有相同时间的闹钟 */
  const isDuplicateTime = (h: number, m: number, s: number, excludeId?: number): boolean => {
    return alarms.some((a) => a.hour === h && a.minute === m && a.second === s && a.id !== excludeId);
  };

  /** 关闭编辑面板（新建 / 编辑共用） */
  const closeEditor = (): void => {
    stopPreviewAlarmSound();
    setAdding(false);
    setEditingId(null);
    const _now = new Date();
    setNewHour(_now.getHours());
    setNewMinute(_now.getMinutes());
    setNewSecond(_now.getSeconds());
    setNewLabel('');
    setNewRepeat([]);
    setNewRingtone(DEFAULT_SYSTEM_ALARM_RINGTONE);
    setNewLoop(true);
    setEditRingtone(DEFAULT_SYSTEM_ALARM_RINGTONE);
    setEditLoop(true);
  };

  /** 添加闹钟 */
  const addAlarm = (): void => {
    if (isDuplicateTime(newHour, newMinute, newSecond)) return;
    const item: AlarmItem = {
      id: Date.now(),
      hour: newHour,
      minute: newMinute,
      second: newSecond,
      label: newLabel.trim(),
      enabled: true,
      repeat: [...newRepeat],
      ringtone: newRingtone,
      loop: newLoop,
      createdAt: Date.now(),
    };
    setAlarms((prev) => [...prev, item]);
    closeEditor();
  };

  /** 删除闹钟 */
  const deleteAlarm = (id: number): void => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    if (editingId === id) setEditingId(null);
  };

  /** 切换开关 */
  const toggleEnabled = (id: number): void => {
    const alarm = alarms.find((item) => item.id === id);
    if (!alarm) return;
    // 等待保存后的广播更新 UI，不用本地快照覆盖整个闹钟列表。
    window.api.setAlarmEnabled(id, !alarm.enabled).catch(() => {});
  };

  /** 进入编辑 */
  const startEdit = (alarm: AlarmItem): void => {
    setAdding(false);
    setEditingId(alarm.id);
    setEditHour(alarm.hour);
    setEditMinute(alarm.minute);
    setEditSecond(alarm.second);
    setEditLabel(alarm.label);
    setEditRepeat([...alarm.repeat]);
    setEditRingtone(normalizeSystemAlarmRingtone(alarm.ringtone));
    setEditLoop(typeof alarm.loop === 'boolean' ? alarm.loop : true);
  };

  /** 保存编辑 */
  const saveEdit = (): void => {
    if (editingId === null) return;
    if (isDuplicateTime(editHour, editMinute, editSecond, editingId)) return;
    setAlarms((prev) => prev.map((a) => a.id === editingId ? {
      ...a,
      hour: editHour,
      minute: editMinute,
      second: editSecond,
      label: editLabel.trim(),
      repeat: [...editRepeat],
      ringtone: editRingtone,
      loop: editLoop,
    } : a));
    closeEditor();
  };

  /** 计算距下次响铃的时间描述 */
  const nextRingDesc = useCallback((alarm: AlarmItem): string => {
    if (!alarm.enabled) return t('maxExpand.alarm.disabled', { defaultValue: '已关闭' });
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
          ? t('maxExpand.alarm.ringIn', { defaultValue: '{{h}}小时{{m}}分钟后', h, m })
          : t('maxExpand.alarm.ringInMin', { defaultValue: '{{m}}分钟后', m });
      }
      return t('maxExpand.alarm.ringTomorrow', { defaultValue: '明天' });
    }

    for (let offset = 0; offset < 7; offset++) {
      const checkDay = ((todayDay + offset) % 7) as Weekday;
      if (!alarm.repeat.includes(checkDay)) continue;
      if (offset === 0 && alarmMinutes > todayMinutes) {
        const diff = alarmMinutes - todayMinutes;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return h > 0
          ? t('maxExpand.alarm.ringIn', { defaultValue: '{{h}}小时{{m}}分钟后', h, m })
          : t('maxExpand.alarm.ringInMin', { defaultValue: '{{m}}分钟后', m });
      }
      if (offset === 0) continue;
      if (offset === 1) return t('maxExpand.alarm.ringTomorrow', { defaultValue: '明天' });
      return t('maxExpand.alarm.ringInDays', { defaultValue: '{{n}}天后', n: offset });
    }
    return '';
  }, [t]);

  /** 排序：按时间升序 */
  const sortedAlarms = [...alarms].sort((a, b) => {
    const ta = a.hour * 60 + a.minute;
    const tb = b.hour * 60 + b.minute;
    return ta - tb;
  });

  /** 是否展示右侧编辑面板 */
  const showEditor = adding || editingId !== null;

  return {
    alarms, loaded, previewPlaying,
    editingId, editHour, editMinute, editSecond, editLabel, editRepeat, editRingtone, editLoop,
    setEditHour, setEditMinute, setEditSecond, setEditLabel, setEditRepeat, setEditRingtone, setEditLoop,
    adding, newHour, newMinute, newSecond, newLabel, newRepeat, newRingtone, newLoop,
    setNewHour, setNewMinute, setNewSecond, setNewLabel, setNewRepeat, setNewRingtone, setNewLoop,
    setAdding,
    weekdayLabel, repeatSummary, nextRingDesc,
    addAlarm, closeEditor, deleteAlarm, toggleEnabled, startEdit, saveEdit,
    sortedAlarms, showEditor,
  };
}
