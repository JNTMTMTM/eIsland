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
 * @file AutostartSettingsPage.tsx
 * @description 设置页面 - 软件设置实用工具与开机自启子界面
 * @author 鸡哥
 */

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettingsSectionProps } from './types';

type AutostartSettingsPageProps = Pick<AppSettingsSectionProps, 'autostartMode' | 'setAutostartMode'>;

/**
 * 渲染实用工具与开机自启设置页面
 * @param autostartMode - 当前开机自启模式
 * @param setAutostartMode - 更新开机自启模式方法
 * @returns 实用工具与开机自启设置页面
 */
export function AutostartSettingsPage({ autostartMode, setAutostartMode }: AutostartSettingsPageProps): ReactElement {
  const { t } = useTranslation();
  const [clearLogsStatus, setClearLogsStatus] = useState<'idle' | 'clearing' | string>('idle');
  const clearLogsResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearLogsResetTimerRef.current) {
        clearTimeout(clearLogsResetTimerRef.current);
        clearLogsResetTimerRef.current = null;
      }
    };
  }, []);

  const scheduleClearLogsStatusReset = (): void => {
    if (clearLogsResetTimerRef.current) {
      clearTimeout(clearLogsResetTimerRef.current);
    }
    clearLogsResetTimerRef.current = setTimeout(() => {
      setClearLogsStatus('idle');
      clearLogsResetTimerRef.current = null;
    }, 3000);
  };

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.labels.autostart', { defaultValue: '实用工具' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.autostart.toolsHint', { defaultValue: '常用应用操作与日志工具' })}</div>
          </div>
          <div className="settings-hotkey-row" style={{ gap: 8 }}>
            <button className="settings-hotkey-btn" type="button" onClick={() => { window.api.quitApp(); }}>{t('settings.app.autostart.quit', { defaultValue: '关闭灵动岛' })}</button>
            <button className="settings-hotkey-btn" type="button" onClick={() => { window.api.restartApp().catch(() => {}); }}>{t('settings.app.autostart.restart', { defaultValue: '重启灵动岛' })}</button>
            <button className="settings-hotkey-btn" type="button" onClick={() => { window.api.openLogsFolder().catch(() => {}); }}>{t('settings.app.autostart.openLogs', { defaultValue: '打开日志文件夹' })}</button>
            <button
              className="settings-hotkey-btn"
              type="button"
              disabled={clearLogsStatus === 'clearing'}
              onClick={() => {
                setClearLogsStatus('clearing');
                window.api.clearLogsCache().then((res) => {
                  if (res.success) {
                    const kb = (res.freedBytes / 1024).toFixed(1);
                    setClearLogsStatus(t('settings.app.autostart.logsCleared', { defaultValue: '已清理 {{kb}} KB', kb }));
                  } else {
                    setClearLogsStatus(t('settings.app.autostart.logsClearFailed', { defaultValue: '清理失败' }));
                  }
                  scheduleClearLogsStatusReset();
                }).catch(() => {
                  setClearLogsStatus(t('settings.app.autostart.logsClearFailed', { defaultValue: '清理失败' }));
                  scheduleClearLogsStatusReset();
                });
              }}
            >
              {clearLogsStatus === 'clearing'
                ? t('settings.app.autostart.logsClearing', { defaultValue: '清理中…' })
                : clearLogsStatus === 'idle'
                  ? t('settings.app.autostart.clearLogs', { defaultValue: '清理日志缓存' })
                  : clearLogsStatus}
            </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.autostart.title', { defaultValue: '开机自启' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.autostart.hint', { defaultValue: '设置系统启动时是否自动运行灵动岛' })}</div>
          </div>
          <div className="settings-lyrics-source-options">
            {([
              { value: 'disabled', label: t('settings.app.autostart.options.disabled', { defaultValue: '禁用' }) },
              { value: 'enabled', label: t('settings.app.autostart.options.enabled', { defaultValue: '启用' }) },
              { value: 'high-priority', label: t('settings.app.autostart.options.highPriority', { defaultValue: '高优先级' }) },
            ] as Array<{ value: 'disabled' | 'enabled' | 'high-priority'; label: string }>).map((opt) => (
              <button
                key={opt.value}
                className={`settings-lyrics-source-btn ${autostartMode === opt.value ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  setAutostartMode(opt.value);
                  window.api.autostartSet(opt.value).catch(() => {});
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="settings-music-hint">
            {autostartMode === 'disabled' && t('settings.app.autostart.status.disabled', { defaultValue: '当前已禁用开机自启。' })}
            {autostartMode === 'enabled' && t('settings.app.autostart.status.enabled', { defaultValue: '系统登录后将自动启动灵动岛。' })}
            {autostartMode === 'high-priority' && t('settings.app.autostart.status.highPriority', { defaultValue: '以高优先级启动，更早完成加载。' })}
          </div>
        </div>
      </div>
    </div>
  );
}
