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
 * @file BreakReminderWidget.tsx
 * @description Overview 休息提醒小组件，展示各提醒事项的剩余时间。
 * @author 鸡哥
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon, normalizeSvgIconPath } from '../../../../../../../utils/SvgIcon';

const BREAK_REMINDER_STORE_KEY = 'break-reminder-items';
const BREAK_REMINDER_LAST_FIRED_KEY = 'break-reminder-last-fired';

interface BreakReminderItem {
  id: string;
  name: string;
  intervalMinutes: number;
  enabled: boolean;
  icon?: string;
}

interface BreakReminderWidgetProps {
  openBreakReminderPage: () => void;
}

/** 休息提醒小组件，展示各提醒事项的剩余时间（精确到分钟）。 */
export function BreakReminderWidget({ openBreakReminderPage }: BreakReminderWidgetProps): React.ReactElement {
  const { t } = useTranslation();
  const [items, setItems] = useState<BreakReminderItem[]>([]);
  const [lastFired, setLastFired] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;

    const loadItems = (data: unknown): void => {
      if (Array.isArray(data)) setItems(data as BreakReminderItem[]);
    };
    const loadFired = (data: unknown): void => {
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setLastFired(data as Record<string, number>);
      }
    };

    window.api.storeRead(BREAK_REMINDER_STORE_KEY).then((v) => { if (!cancelled) loadItems(v); }).catch(() => {});
    window.api.storeRead(BREAK_REMINDER_LAST_FIRED_KEY).then((v) => { if (!cancelled) loadFired(v); }).catch(() => {});

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${BREAK_REMINDER_STORE_KEY}`) loadItems(value);
      if (channel === `store:${BREAK_REMINDER_LAST_FIRED_KEY}`) loadFired(value);
    });

    return () => { cancelled = true; unsub(); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const enabledItems = items.filter((i) => i && i.enabled && i.intervalMinutes > 0 && i.name?.trim());

  return (
    <div className="ov-dash-widget ov-dash-break-reminder-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link" onClick={openBreakReminderPage}>
          {t('overview.breakReminder.title', { defaultValue: '休息提醒' })}
        </span>
        <span className="ov-dash-break-reminder-count">
          {t('overview.breakReminder.count', { defaultValue: '{{count}} 项', count: enabledItems.length })}
        </span>
      </div>
      {enabledItems.length === 0 ? (
        <div className="ov-dash-break-reminder-empty">
          {t('overview.breakReminder.empty', { defaultValue: '暂无启用的提醒' })}
        </div>
      ) : (
        <div className="ov-dash-break-reminder-list">
          {enabledItems.map((item) => {
            const intervalMs = item.intervalMinutes * 60_000;
            const fired = lastFired[item.id];
            let remainMs = intervalMs;
            if (fired) {
              const elapsed = now - fired;
              remainMs = Math.max(0, intervalMs - elapsed);
            }
            const remainMin = Math.ceil(remainMs / 60_000);
            const progress = Math.min(1, 1 - remainMs / intervalMs);

            return (
              <div key={item.id} className="ov-dash-break-reminder-item">
                <img
                  src={normalizeSvgIconPath(item.icon || SvgIcon.BREAK)}
                  alt=""
                  width={16}
                  height={16}
                  className="ov-dash-break-reminder-icon"
                />
                <span className="ov-dash-break-reminder-name">{item.name}</span>
                <div className="ov-dash-break-reminder-bar">
                  <div
                    className="ov-dash-break-reminder-bar-fill"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <span className="ov-dash-break-reminder-remain">
                  {remainMin > 0
                    ? t('overview.breakReminder.remain', { defaultValue: '{{min}} 分钟', min: remainMin })
                    : t('overview.breakReminder.due', { defaultValue: '即将提醒' })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
