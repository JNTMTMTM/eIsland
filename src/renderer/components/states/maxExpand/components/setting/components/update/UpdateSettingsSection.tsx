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
 * @file UpdateSettingsSection.tsx
 * @description 设置页面 - 更新设置区块
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'latest';

interface UpdateSourceOption {
  key: string;
  label: string;
}

interface DownloadProgressData {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

interface UpdateSettingsSectionProps {
  aboutVersion: string;
  updateSource: string;
  updateSources: UpdateSourceOption[];
  updateStatus: UpdateStatus;
  updateVersion: string;
  downloadProgress: DownloadProgressData | null;
  currentSourceLabel: string;
  updateError: string;
  onUpdateSourceChange: (value: string) => void;
  onCheckUpdate: () => void;
  onDownloadUpdate: () => void;
  onInstallUpdate: () => void;
}

/**
 * 渲染更新设置区块
 * @param props - 更新检查与下载配置参数
 * @returns 更新设置区域
 */
export function UpdateSettingsSection({
  aboutVersion,
  updateSource,
  updateSources,
  updateStatus,
  updateVersion,
  downloadProgress,
  currentSourceLabel,
  updateError,
  onUpdateSourceChange,
  onCheckUpdate,
  onDownloadUpdate,
  onInstallUpdate,
}: UpdateSettingsSectionProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="max-expand-settings-section settings-update">
      <div className="max-expand-settings-title">{t('settings.labels.update', { defaultValue: '更新设置' })}</div>

      <div className="settings-update-info-grid" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 0, fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span><span style={{ opacity: 0.6 }}>{t('settings.update.currentVersion', { defaultValue: '当前版本' })}</span> <span style={{ fontWeight: 500 }}>eIsland v{aboutVersion || '…'}</span></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ opacity: 0.6 }}>{t('settings.update.source', { defaultValue: '更新源' })}</span>
            {updateSources.map((s) => (
              <label key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginLeft: 4 }}>
                <input
                  type="radio"
                  name="update-source"
                  value={s.key}
                  checked={updateSource === s.key}
                  onChange={() => onUpdateSourceChange(s.key)}
                  style={{ margin: 0 }}
                />
                <span>{s.label}</span>
              </label>
            ))}
          </span>
        </div>
        {(updateStatus === 'available' || updateStatus === 'downloading' || updateStatus === 'ready') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ opacity: 0.6 }}>{t('settings.update.latestVersion', { defaultValue: '最新版本' })}</span>
            <span style={{ fontWeight: 500, color: 'var(--accent-color, #4fc3f7)' }}>v{updateVersion}</span>
          </div>
        )}
      </div>

      <div className="settings-about-update">
        <div className="settings-about-update-row">
          {updateStatus === 'idle' && (
            <button className="settings-about-update-btn" type="button" onClick={onCheckUpdate}>{t('settings.update.actions.check', { defaultValue: '检查更新' })}</button>
          )}
          {updateStatus === 'checking' && (
            <button className="settings-about-update-btn" type="button" disabled>{t('settings.update.actions.checking', { defaultValue: '检查中…' })}</button>
          )}
          {updateStatus === 'latest' && (
            <button className="settings-about-update-btn" type="button" onClick={onCheckUpdate}>{t('settings.update.actions.latest', { defaultValue: '已是最新版本' })}</button>
          )}
          {updateStatus === 'available' && (
            <button className="settings-about-update-btn update-available" type="button" onClick={onDownloadUpdate}>
              {t('settings.update.actions.download', { defaultValue: '下载更新' })}
            </button>
          )}
          {updateStatus === 'downloading' && (
            <div className="settings-about-update-progress">
              <div style={{ marginBottom: 4, fontSize: 12, opacity: 0.7 }}>
                {t('settings.update.downloadingFrom', { defaultValue: '正在从 {{source}} 下载更新…', source: currentSourceLabel })}
              </div>
              <div className="settings-about-update-progress-bar">
                <div
                  className="settings-about-update-progress-fill"
                  style={{ width: `${downloadProgress?.percent ?? 0}%` }}
                />
              </div>
              <span className="settings-about-update-progress-text">
                {downloadProgress
                  ? `${Math.round(downloadProgress.percent)}% · ${(downloadProgress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
                  : t('settings.update.preparingDownload', { defaultValue: '准备下载…' })}
              </span>
            </div>
          )}
          {updateStatus === 'ready' && (
            <button className="settings-about-update-btn update-ready" type="button" onClick={onInstallUpdate}>
              {t('settings.update.actions.installRestart', { defaultValue: '安装并重启' })}
            </button>
          )}
          {updateStatus === 'error' && (
            <button className="settings-about-update-btn" type="button" onClick={onCheckUpdate}>{t('settings.update.actions.retry', { defaultValue: '重试' })}</button>
          )}
        </div>
        {updateStatus === 'error' && updateError && (
          <div className="settings-about-update-error" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{updateError.replace(/\\n/g, '\n')}</div>
        )}
      </div>
    </div>
  );
}
