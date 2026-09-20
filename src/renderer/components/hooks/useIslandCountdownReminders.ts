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
 * @file useIslandCountdownReminders.ts
 * @description 在主灵动岛全局运行日期提醒，独立于页面展开状态。
 * @author 鸡哥
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../utils/SvgIcon';
import { useCountdownItems } from '../states/maxExpand/components/countdown/hooks/useCountdownItems';
import { countdownText, toLocalDateStr } from '../states/maxExpand/components/countdown/utils/countdownUtils';
import { dueCountdownReminders } from '../states/maxExpand/components/countdown/utils/countdownReminders';
import type { NotificationData } from '../../store/types';

const REMINDER_LOG_KEY = 'countdown-reminder-log';

/**
 * 检查当天提醒，使用持久化日志避免重启或切换状态重复通知。
 * @param setNotificationRef - 主状态机通知入口
 */
export function useIslandCountdownReminders(setNotificationRef: React.MutableRefObject<(data: NotificationData) => void>): void {
  const { t } = useTranslation();
  const { items, loaded } = useCountdownItems();
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    let busy = false;
    const check = async (): Promise<void> => {
      if (busy || cancelled) return;
      busy = true;
      try {
        const now = new Date();
        const today = toLocalDateStr(now);
        const raw = await window.api.storeRead(REMINDER_LOG_KEY) as { date?: string; keys?: string[] } | null;
        const sent = raw?.date === today && Array.isArray(raw.keys) ? raw.keys : [];
        const due = dueCountdownReminders(items, sent, now);
        if (!due.length || cancelled) return;
        const saved = await window.api.storeWrite(REMINDER_LOG_KEY, { date: today, keys: [...sent, ...due.map((value) => value.key)] });
        if (!saved || cancelled) return;
        setNotificationRef.current({ title: t('countdown.manage.reminderTitle'),
          body: due.map(({ item }) => `${item.name} · ${countdownText(item, t, now)}`).join('\n'), icon: SvgIcon.TIMER });
      } catch {
        // 存储暂不可用时等待下次检查，避免无法去重的重复通知。
      } finally { busy = false; }
    };
    void check();
    const timer = window.setInterval(() => void check(), 30000);
    const refresh = (): void => { void check(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [items, loaded, t, setNotificationRef]);
}
