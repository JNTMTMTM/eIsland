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
 * @file ClipboardHistorySettingsSection.tsx
 * @description 设置页面 - 软件设置/剪贴板历史区块
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

const CLIPBOARD_HISTORY_STORE_KEY = 'clipboard-history-recent';
const CLIPBOARD_HISTORY_LOCAL_STORAGE_KEY = 'eIsland_clipboard_history_recent';
const CLIPBOARD_HISTORY_ENABLED_STORE_KEY = 'clipboard-history-enabled';
const CLIPBOARD_HISTORY_LIMIT_STORE_KEY = 'clipboard-history-limit';
const CLIPBOARD_HISTORY_EXIT_MAX_EXPAND_ON_COPY_STORE_KEY = 'clipboard-history-exit-max-expand-on-copy';
const DEFAULT_HISTORY_LIMIT = 10;

const HISTORY_LIMIT_OPTIONS: number[] = [10, 20, 30, 50];

/**
 * 渲染软件设置中的剪贴板历史设置区块
 * @returns 剪贴板历史设置区块
 */
export function ClipboardHistorySettingsSection(): ReactElement {
  const { t } = useTranslation();
  const [historyEnabled, setHistoryEnabled] = useState<boolean>(true);
  const [historyLimit, setHistoryLimit] = useState<number>(DEFAULT_HISTORY_LIMIT);
  const [exitMaxExpandOnCopy, setExitMaxExpandOnCopy] = useState<boolean>(false);
  const [clearStatus, setClearStatus] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(CLIPBOARD_HISTORY_ENABLED_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'boolean') {
        setHistoryEnabled(value);
      }
    }).catch(() => {});

    window.api.storeRead(CLIPBOARD_HISTORY_LIMIT_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'number' && Number.isFinite(value)) {
        const safe = Math.max(1, Math.min(50, Math.round(value)));
        setHistoryLimit(safe);
      }
    }).catch(() => {});

    window.api.storeRead(CLIPBOARD_HISTORY_EXIT_MAX_EXPAND_ON_COPY_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'boolean') {
        setExitMaxExpandOnCopy(value);
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChangeEnabled = (next: boolean): void => {
    const prev = historyEnabled;
    setHistoryEnabled(next);
    window.api.storeWrite(CLIPBOARD_HISTORY_ENABLED_STORE_KEY, next).catch(() => {
      setHistoryEnabled(prev);
    });
  };

  const handleChangeLimit = (next: number): void => {
    const prev = historyLimit;
    setHistoryLimit(next);
    window.api.storeWrite(CLIPBOARD_HISTORY_LIMIT_STORE_KEY, next).catch(() => {
      setHistoryLimit(prev);
    });
  };

  const handleChangeExitMaxExpandOnCopy = (next: boolean): void => {
    const prev = exitMaxExpandOnCopy;
    setExitMaxExpandOnCopy(next);
    window.api.storeWrite(CLIPBOARD_HISTORY_EXIT_MAX_EXPAND_ON_COPY_STORE_KEY, next).catch(() => {
      setExitMaxExpandOnCopy(prev);
    });
  };

  const handleClearHistory = (): void => {
    setClearStatus('');
    try {
      localStorage.removeItem(CLIPBOARD_HISTORY_LOCAL_STORAGE_KEY);
    } catch {
      // noop
    }
    window.api.storeWrite(CLIPBOARD_HISTORY_STORE_KEY, []).then(() => {
      setClearStatus(t('settings.clipboardHistory.messages.clearSuccess', { defaultValue: '剪贴板历史已清空' }));
    }).catch(() => {
      setClearStatus(t('settings.clipboardHistory.messages.clearFailed', { defaultValue: '清空失败，请稍后重试' }));
    });
  };

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.clipboardHistory.enabled.title', { defaultValue: '历史记录开关' })}</div>
            <div className="settings-card-subtitle">{t('settings.clipboardHistory.enabled.hint', { defaultValue: '关闭后不再追加新的剪贴板记录，已有记录会保留。' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={historyEnabled}
                onChange={(e) => handleChangeEnabled(e.target.checked)}
              />
              {t('settings.clipboardHistory.enabled.toggle', { defaultValue: '启用剪贴板历史记录' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.clipboardHistory.limit.title', { defaultValue: '最大保留条数' })}</div>
            <div className="settings-card-subtitle">{t('settings.clipboardHistory.limit.hint', { defaultValue: '新记录会在前端按该条数滚动保存。' })}</div>
          </div>
          <div className="settings-lyrics-source-options">
            {HISTORY_LIMIT_OPTIONS.map((value) => (
              <button
                key={value}
                className={`settings-lyrics-source-btn ${historyLimit === value ? 'active' : ''}`}
                type="button"
                onClick={() => handleChangeLimit(value)}
              >
                {t(`settings.clipboardHistory.limit.options.${value}`, { defaultValue: `${value} 条` })}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.clipboardHistory.exitMaxExpandOnCopy.title', { defaultValue: '复制后自动退出' })}</div>
            <div className="settings-card-subtitle">{t('settings.clipboardHistory.exitMaxExpandOnCopy.hint', { defaultValue: '复制历史项后自动退出最大展开；有歌曲时回到歌曲态，无歌曲时回到 idle。' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={exitMaxExpandOnCopy}
                onChange={(e) => handleChangeExitMaxExpandOnCopy(e.target.checked)}
              />
              {t('settings.clipboardHistory.exitMaxExpandOnCopy.toggle', { defaultValue: '启用复制后退出最大展开' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.clipboardHistory.actions.title', { defaultValue: '数据管理' })}</div>
            <div className="settings-card-subtitle">{t('settings.clipboardHistory.actions.hint', { defaultValue: '可一键清空已保存的剪贴板历史记录。' })}</div>
          </div>
          <div className="settings-hotkey-row" style={{ gap: 8 }}>
            <button className="settings-hotkey-btn" type="button" onClick={handleClearHistory}>
              {t('settings.clipboardHistory.actions.clear', { defaultValue: '清空历史记录' })}
            </button>
          </div>
          {clearStatus ? <div className="settings-music-hint">{clearStatus}</div> : null}
        </div>
      </div>
    </div>
  );
}
