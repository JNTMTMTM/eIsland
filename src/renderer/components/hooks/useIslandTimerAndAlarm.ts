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
 * @file useIslandTimerAndAlarm.ts
 * @description 计时器与闹钟触发处理 Hook。
 * @author 鸡哥
 */

import { useEffect, useRef } from 'react';
import scheduleDeadline from '../../utils/scheduleDeadline';
import { SvgIcon } from '../../utils/SvgIcon';
import type { NotificationData, TimerData } from '../../store/types';
import {
  ALARM_SOUND_STOP_EVENT,
  normalizeSystemAlarmRingtone,
  playAlarmSound,
  stopAlarmSound,
} from '../../utils/audio/alarmSound';

const ALARM_STORE_KEY = 'alarms';
const ALARM_SOUND_ENABLED_STORE_KEY = 'alarm-sound-enabled';
const ALARM_NOTIFICATION_STORE_KEY = 'alarm-notification-enabled';

interface AlarmItemSnapshot {
  id: number;
  hour: number;
  minute: number;
  second: number;
  label?: string;
  enabled?: boolean;
  repeat?: number[];
  ringtone?: unknown;
  loop?: boolean;
}

interface UseIslandTimerAndAlarmOptions {
  language: string | undefined;
  timerData: TimerData;
  setTimerData: (data: Partial<TimerData>) => void;
  setNotificationRef: React.MutableRefObject<(data: NotificationData) => void>;
  t: (key: string, options?: Record<string, unknown>) => string;
}

/**
 * @description 处理倒计时与闹钟提醒通知。
 * @param options - 计时器与闹钟配置。
 */
export function useIslandTimerAndAlarm(options: UseIslandTimerAndAlarmOptions): void {
  const {
    language,
    timerData,
    setTimerData,
    setNotificationRef,
    t,
  } = options;

  const timerWorkRef = useRef({ deadline: 0, published: 0, interval: null as ReturnType<typeof setInterval> | null, cancel: () => {} });
  const alarmFiredSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleStop = (): void => {
      stopAlarmSound();
    };

    window.addEventListener(ALARM_SOUND_STOP_EVENT, handleStop);
    return () => {
      window.removeEventListener(ALARM_SOUND_STOP_EVENT, handleStop);
      stopAlarmSound();
    };
  }, []);

  useEffect(() => {
    const work = timerWorkRef.current;
    const clear = (): void => {
      if (work.interval !== null) clearInterval(work.interval);
      work.interval = null;
      work.cancel();
      work.cancel = () => {};
      work.deadline = 0;
    };
    if (timerData?.state !== 'running' || timerData.remainingSeconds <= 0) { clear(); return; }
    if (work.deadline && timerData.remainingSeconds === work.published) return;
    clear();
    work.deadline = Date.now() + timerData.remainingSeconds * 1000;
    work.published = timerData.remainingSeconds;
    const tick = (): void => {
      if (!work.deadline) return;
      const next = Math.max(0, Math.ceil((work.deadline - Date.now()) / 1000));
      work.published = next;
      if (next === 0) {
        clear();
        setTimerData({ state: 'idle', remainingSeconds: 0, inputHours: '00', inputMinutes: '00', inputSeconds: '00' });
        setNotificationRef.current({
          title: t('notification.timer.title', { defaultValue: '计时器' }),
          body: t('notification.timer.finished', { defaultValue: '倒计时已结束' }),
          icon: SvgIcon.TIMER,
        });
      } else setTimerData({ remainingSeconds: next });
    };
    work.interval = setInterval(tick, 1000);
    work.cancel = scheduleDeadline(work.deadline, tick);
  }, [timerData?.state, timerData?.remainingSeconds, setTimerData, language, setNotificationRef, t]);

  useEffect(() => () => {
    const work = timerWorkRef.current;
    if (work.interval !== null) clearInterval(work.interval);
    work.cancel();
    work.deadline = 0;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let alarms: AlarmItemSnapshot[] = [];
    let soundEnabled = true;
    let notificationEnabled = true;
    let cancelDeadline = (): void => {};
    const modified = new Set<string>();
    const nextTime = (alarm: AlarmItemSnapshot, after: number): number => {
      if (!alarm?.enabled || ![alarm.hour, alarm.minute, alarm.second].every(Number.isInteger)
        || alarm.hour < 0 || alarm.hour > 23 || alarm.minute < 0 || alarm.minute > 59 || alarm.second < 0 || alarm.second > 59) return Infinity;
      for (let offset = 0; offset <= 7; offset += 1) {
        const date = new Date(after);
        date.setDate(date.getDate() + offset);
        date.setHours(alarm.hour, alarm.minute, alarm.second, 0);
        if (date.getTime() > after && (!alarm.repeat?.length || alarm.repeat.includes(date.getDay()))) return date.getTime();
      }
      return Infinity;
    };
    const schedule = (): void => {
      cancelDeadline();
      if (cancelled) return;
      const now = Date.now();
      const occurrences = alarms.map((alarm) => ({ alarm, at: nextTime(alarm, now) }));
      const due = Math.min(...occurrences.map((entry) => entry.at));
      if (!Number.isFinite(due)) return;
      cancelDeadline = scheduleDeadline(due, () => {
        if (cancelled) return;
        occurrences.filter((entry) => entry.at <= Date.now()).forEach(({ alarm, at }) => {
          const firedKey = alarm.id + '-' + at;
          if (alarmFiredSetRef.current.has(firedKey)) return;
          alarmFiredSetRef.current.add(firedKey);
          const timeStr = [alarm.hour, alarm.minute, alarm.second].map((part) => String(part).padStart(2, '0')).join(':');
          if (notificationEnabled) setNotificationRef.current({
            title: t('notification.alarm.title', { defaultValue: '闹钟提醒' }),
            body: alarm.label
              ? t('notification.alarm.bodyWithLabel', { defaultValue: '{{time}} — {{label}}', time: timeStr, label: alarm.label })
              : t('notification.alarm.body', { defaultValue: '{{time}}', time: timeStr }),
            icon: SvgIcon.TIMER,
          });
          if (soundEnabled) playAlarmSound({ ringtone: normalizeSystemAlarmRingtone(alarm.ringtone), loop: alarm.loop !== false });
          if (!alarm.repeat?.length) {
            alarms = alarms.map((item) => item.id === alarm.id ? { ...item, enabled: false } : item);
            void window.api?.setAlarmEnabled(alarm.id, false).catch(() => {});
          }
        });
        if (alarmFiredSetRef.current.size > 200) alarmFiredSetRef.current.clear();
        schedule();
      });
    };
    const apply = (key: string, value: unknown): void => {
      if (key === ALARM_STORE_KEY) alarms = Array.isArray(value) ? value as AlarmItemSnapshot[] : [];
      if (key === ALARM_SOUND_ENABLED_STORE_KEY) soundEnabled = value !== false;
      if (key === ALARM_NOTIFICATION_STORE_KEY) notificationEnabled = value !== false;
    };
    const keys = [ALARM_STORE_KEY, ALARM_SOUND_ENABLED_STORE_KEY, ALARM_NOTIFICATION_STORE_KEY];
    const unsubscribe = window.api?.onSettingsChanged?.((channel, value) => {
      if (channel === 'runtime:clock-changed') { schedule(); return; }
      const key = channel.replace(/^store:/, '');
      if (!keys.includes(key)) return;
      modified.add(key);
      apply(key, value);
      schedule();
    });
    void Promise.all(keys.map(async (key) => {
      const value = await window.api?.storeRead(key).catch(() => null);
      if (!cancelled && !modified.has(key)) apply(key, value);
    })).then(() => { if (!cancelled) schedule(); });
    return () => { cancelled = true; cancelDeadline(); unsubscribe?.(); };
  }, [language, setNotificationRef, t]);
}
