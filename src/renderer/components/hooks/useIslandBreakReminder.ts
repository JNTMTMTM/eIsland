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
 * @file useIslandBreakReminder.ts
 * @description 休息提醒调度器 —— 按用户配置的间隔定时弹出通知
 * @author 鸡哥
 */

import { useEffect, useRef } from 'react';
import scheduleDeadline from '../../utils/scheduleDeadline';
import { SvgIcon } from '../../utils/SvgIcon';
import type { NotificationData } from '../../store/types';

const BREAK_REMINDER_STORE_KEY = 'break-reminder-items';
const BREAK_REMINDER_LAST_FIRED_KEY = 'break-reminder-last-fired';

interface BreakReminderItem {
  id: string;
  name: string;
  intervalMinutes: number;
  enabled: boolean;
  icon?: string;
}

interface UseIslandBreakReminderOptions {
  language: string | undefined;
  setNotificationRef: React.MutableRefObject<(data: NotificationData) => void>;
  t: (key: string, options?: Record<string, unknown>) => string;
}

/**
 * 休息提醒调度 hook
 * 缓存提醒配置并通过主进程在下一条提醒到期时唤醒，
 * 对每个启用的提醒条目按 intervalMinutes 触发通知。
 * @param options - 休息提醒调度配置。
 */
export function useIslandBreakReminder(options: UseIslandBreakReminderOptions): void {
  const { language, setNotificationRef, t } = options;

  /** 记录每个提醒条目上次触发的时间戳 (ms) */
  const lastFiredRef = useRef<Map<string, number>>(new Map());
  /** 缓存最近一次轮询到的提醒条目列表，供 snooze 事件查找间隔时长 */
  const itemsCacheRef = useRef<BreakReminderItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    let modified = false;
    let cancelDeadline = (): void => {};
    const check = (): void => {
      cancelDeadline();
      if (cancelled) return;
      try {
        const data = itemsCacheRef.current;
        if (!Array.isArray(data) || data.length === 0) return;

        let items = data as BreakReminderItem[];
        if (items.some((i) => i && !i.icon)) {
          items = items.map((i) => i.icon ? i : { ...i, icon: SvgIcon.BREAK });
          window.api?.storeWrite(BREAK_REMINDER_STORE_KEY, items).catch(() => {});
        }
        itemsCacheRef.current = items;

        const now = Date.now();
        const firedMap = lastFiredRef.current;
        let changed = false;

        items.forEach((item) => {
          if (!item || !item.enabled || !Number.isFinite(item.intervalMinutes) || item.intervalMinutes <= 0 || !item.name?.trim()) return;

          const intervalMs = item.intervalMinutes * 60_000;
          const lastFired = firedMap.get(item.id);

          if (lastFired === undefined) {
            // 首次发现该条目，初始化计时起点为当前时刻
            firedMap.set(item.id, now);
            changed = true;
            return;
          }

          if (now - lastFired >= intervalMs) {
            firedMap.set(item.id, now);
            changed = true;
            const name = item.name || t('settings.breakReminder.notificationTitle', { defaultValue: '休息提醒' });
            setNotificationRef.current({
              title: t('settings.breakReminder.notificationTitle', { defaultValue: '休息提醒' }),
              body: t('settings.breakReminder.notificationBody', { defaultValue: '该{{name}}啦！', name }),
              icon: item.icon || SvgIcon.BREAK,
              breakReminderItemId: item.id,
            });
          }
        });

        // 清理已不存在的条目
        const activeIds = new Set((data as BreakReminderItem[]).map((i) => i.id));
        Array.from(firedMap.keys()).forEach((key) => {
          if (!activeIds.has(key)) { firedMap.delete(key); changed = true; }
        });

        const nextDeadline = items.reduce((next, item) => {
          if (!item?.enabled || !item.name?.trim() || !Number.isFinite(item.intervalMinutes) || item.intervalMinutes <= 0) return next;
          return Math.min(next, (firedMap.get(item.id) ?? now) + item.intervalMinutes * 60_000);
        }, Infinity);
        if (Number.isFinite(nextDeadline)) cancelDeadline = scheduleDeadline(nextDeadline, check);
        if (changed) {
          const obj: Record<string, number> = {};
          firedMap.forEach((v, k) => { obj[k] = v; });
          window.api?.storeWrite(BREAK_REMINDER_LAST_FIRED_KEY, obj).catch(() => {});
        }
      } catch {
        // noop
      }
    };

    const unsubscribe = window.api?.onSettingsChanged?.((channel, value) => {
      if (channel !== 'store:' + BREAK_REMINDER_STORE_KEY || !Array.isArray(value)) return;
      modified = true;
      itemsCacheRef.current = value as BreakReminderItem[];
      check();
    });
    void window.api?.storeRead(BREAK_REMINDER_STORE_KEY).then((data) => {
      if (cancelled || modified) return;
      itemsCacheRef.current = Array.isArray(data) ? data as BreakReminderItem[] : [];
      check();
    }).catch(() => {});

    const handleSnoozeEvent = (e: Event): void => {
      const detail = (e as CustomEvent<{ itemId: string; snoozeMinutes: number }>).detail;
      if (!detail?.itemId || !detail.snoozeMinutes) return;
      const firedMap = lastFiredRef.current;
      const matched = itemsCacheRef.current.find((i) => i.id === detail.itemId);
      const intervalMs = matched ? matched.intervalMinutes * 60_000 : 0;
      const snoozeMs = detail.snoozeMinutes * 60_000;
      firedMap.set(detail.itemId, Date.now() + snoozeMs - (intervalMs || snoozeMs));
      const obj: Record<string, number> = {};
      firedMap.forEach((v, k) => { obj[k] = v; });
      window.api?.storeWrite(BREAK_REMINDER_LAST_FIRED_KEY, obj).catch(() => {});
      check();
    };
    window.addEventListener('break-reminder-snooze', handleSnoozeEvent);

    return () => {
      cancelled = true;
      cancelDeadline();
      unsubscribe?.();
      window.removeEventListener('break-reminder-snooze', handleSnoozeEvent);
    };
  }, [language, setNotificationRef, t]);
}
