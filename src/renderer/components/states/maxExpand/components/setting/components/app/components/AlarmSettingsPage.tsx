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
 * @file AlarmSettingsPage.tsx
 * @description 设置页面 - 软件设置/闹钟配置区块
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

const ALARM_SOUND_ENABLED_STORE_KEY = 'alarm-sound-enabled';
const ALARM_SNOOZE_DURATION_STORE_KEY = 'alarm-snooze-duration';
const ALARM_AUTO_DISMISS_STORE_KEY = 'alarm-auto-dismiss';
const ALARM_NOTIFICATION_STORE_KEY = 'alarm-notification-enabled';

const SNOOZE_OPTIONS: number[] = [1, 3, 5, 10, 15];
const AUTO_DISMISS_OPTIONS: number[] = [1, 3, 5, 10, 0];

/**
 * 渲染软件设置中的闹钟配置区块
 * @returns 闹钟配置区块
 */
export function AlarmSettingsPage(): ReactElement {
  const { t } = useTranslation();
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [snoozeDuration, setSnoozeDuration] = useState<number>(5);
  const [autoDismiss, setAutoDismiss] = useState<number>(5);
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(ALARM_SOUND_ENABLED_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'boolean') setSoundEnabled(value);
    }).catch(() => {});

    window.api.storeRead(ALARM_SNOOZE_DURATION_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'number' && Number.isFinite(value)) {
        setSnoozeDuration(Math.max(1, Math.min(30, Math.round(value))));
      }
    }).catch(() => {});

    window.api.storeRead(ALARM_AUTO_DISMISS_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'number' && Number.isFinite(value)) {
        setAutoDismiss(Math.max(0, Math.min(30, Math.round(value))));
      }
    }).catch(() => {});

    window.api.storeRead(ALARM_NOTIFICATION_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'boolean') setNotificationEnabled(value);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const handleChangeSoundEnabled = (next: boolean): void => {
    const prev = soundEnabled;
    setSoundEnabled(next);
    window.api.storeWrite(ALARM_SOUND_ENABLED_STORE_KEY, next).catch(() => { setSoundEnabled(prev); });
  };

  const handleChangeSnoozeDuration = (next: number): void => {
    const prev = snoozeDuration;
    setSnoozeDuration(next);
    window.api.storeWrite(ALARM_SNOOZE_DURATION_STORE_KEY, next).catch(() => { setSnoozeDuration(prev); });
  };

  const handleChangeAutoDismiss = (next: number): void => {
    const prev = autoDismiss;
    setAutoDismiss(next);
    window.api.storeWrite(ALARM_AUTO_DISMISS_STORE_KEY, next).catch(() => { setAutoDismiss(prev); });
  };

  const handleChangeNotificationEnabled = (next: boolean): void => {
    const prev = notificationEnabled;
    setNotificationEnabled(next);
    window.api.storeWrite(ALARM_NOTIFICATION_STORE_KEY, next).catch(() => { setNotificationEnabled(prev); });
  };

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.alarm.sound.title', { defaultValue: '提醒音' })}</div>
            <div className="settings-card-subtitle">{t('settings.alarm.sound.hint', { defaultValue: '闹钟到点时播放提示音效。' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => handleChangeSoundEnabled(e.target.checked)}
              />
              {t('settings.alarm.sound.toggle', { defaultValue: '启用闹钟提醒音' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.alarm.notification.title', { defaultValue: '系统通知' })}</div>
            <div className="settings-card-subtitle">{t('settings.alarm.notification.hint', { defaultValue: '闹钟触发时发送系统通知提醒。' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={notificationEnabled}
                onChange={(e) => handleChangeNotificationEnabled(e.target.checked)}
              />
              {t('settings.alarm.notification.toggle', { defaultValue: '启用系统通知' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.alarm.snooze.title', { defaultValue: '贪睡时长' })}</div>
            <div className="settings-card-subtitle">{t('settings.alarm.snooze.hint', { defaultValue: '点击贪睡后延迟再次提醒的分钟数。' })}</div>
          </div>
          <div className="settings-lyrics-source-options">
            {SNOOZE_OPTIONS.map((value) => (
              <button
                key={value}
                className={`settings-lyrics-source-btn ${snoozeDuration === value ? 'active' : ''}`}
                type="button"
                onClick={() => handleChangeSnoozeDuration(value)}
              >
                {t(`settings.alarm.snooze.options.${value}`, { defaultValue: `${value} 分钟` })}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.alarm.autoDismiss.title', { defaultValue: '自动关闭' })}</div>
            <div className="settings-card-subtitle">{t('settings.alarm.autoDismiss.hint', { defaultValue: '闹钟响铃后自动关闭的分钟数，设为"不自动关闭"则需手动操作。' })}</div>
          </div>
          <div className="settings-lyrics-source-options">
            {AUTO_DISMISS_OPTIONS.map((value) => (
              <button
                key={value}
                className={`settings-lyrics-source-btn ${autoDismiss === value ? 'active' : ''}`}
                type="button"
                onClick={() => handleChangeAutoDismiss(value)}
              >
                {value === 0
                  ? t('settings.alarm.autoDismiss.never', { defaultValue: '不自动关闭' })
                  : t(`settings.alarm.autoDismiss.options.${value}`, { defaultValue: `${value} 分钟` })}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
