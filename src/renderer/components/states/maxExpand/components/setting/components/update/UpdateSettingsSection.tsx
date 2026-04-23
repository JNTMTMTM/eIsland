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
import { SvgIcon } from '../../../../../../../utils/SvgIcon';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'latest';

interface UpdateSourceOption {
  key: string;
  label: string;
  proOnly?: boolean;
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
  isProUser: boolean;
  updateAutoPromptEnabled: boolean;
  announcementShowMode: 'always' | 'version-update-only';
  updateStatus: UpdateStatus;
  updateVersion: string;
  downloadProgress: DownloadProgressData | null;
  currentSourceLabel: string;
  updateError: string;
  onUpdateSourceChange: (value: string) => void;
  onUpdateAutoPromptEnabledChange: (enabled: boolean) => void;
  onAnnouncementShowModeChange: (mode: 'always' | 'version-update-only') => void;
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
  isProUser,
  updateAutoPromptEnabled,
  announcementShowMode,
  updateStatus,
  updateVersion,
  downloadProgress,
  currentSourceLabel,
  updateError,
  onUpdateSourceChange,
  onUpdateAutoPromptEnabledChange,
  onAnnouncementShowModeChange,
  onCheckUpdate,
  onDownloadUpdate,
  onInstallUpdate,
}: UpdateSettingsSectionProps): ReactElement {
  const { t } = useTranslation();

  const hasLatest = updateStatus === 'available' || updateStatus === 'downloading' || updateStatus === 'ready';

  return (
    <div className="max-expand-settings-section settings-update">
      <div className="max-expand-settings-title">{t('settings.labels.update', { defaultValue: '更新设置' })}</div>

      <div className="settings-cards">

        {/* 卡片 1:版本与更新源 */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.update.versionCardTitle', { defaultValue: '版本信息' })}</div>
            <div className="settings-card-subtitle">{t('settings.update.versionCardHint', { defaultValue: '查看当前版本并选择更新源,应用所有补丁包均通过该更新源下载' })}</div>
          </div>

          <div className="settings-card-subgroup">
            <div className="settings-card-subgroup-title">{t('settings.update.currentVersion', { defaultValue: '当前版本' })}</div>
            <div className="settings-music-hint" style={{ fontSize: 12 }}>
              <span style={{ fontWeight: 500, color: 'rgba(var(--color-text-rgb), 0.85)' }}>eIsland v{aboutVersion || '…'}</span>
              {hasLatest && (
                <>
                  <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
                  <span style={{ opacity: 0.6 }}>{t('settings.update.latestVersion', { defaultValue: '最新版本' })}</span>
                  <span style={{ fontWeight: 500, marginLeft: 6, color: 'var(--accent-color, #4fc3f7)' }}>v{updateVersion}</span>
                </>
              )}
            </div>
          </div>

          <div className="settings-card-subgroup">
            <div className="settings-card-subgroup-title">{t('settings.update.source', { defaultValue: '更新源' })}</div>
            <div className="settings-music-hint" style={{ marginBottom: 6, whiteSpace: 'pre-line' }}>
              {t('settings.update.sourceHint', {
                defaultValue: 'Cloudflare R2：全球访问稳定，综合速度均衡\nTencent COS：国内网络通常更快\nAliyun OSS：国内节点覆盖广，峰值速度高\nGitHub Releases：海外链路较稳，国内可能偏慢',
              })}
            </div>
            <div className="settings-card-inline-row">
              {updateSources.map((s) => (
                <label key={s.key} className="settings-card-check">
                  <input
                    type="radio"
                    name="update-source"
                    value={s.key}
                    checked={updateSource === s.key}
                    disabled={Boolean(s.proOnly && !isProUser)}
                    onChange={() => onUpdateSourceChange(s.key)}
                  />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    {s.proOnly ? (
                      <img
                        src={SvgIcon.VIP}
                        alt="VIP"
                        width={16}
                        height={16}
                      />
                    ) : null}
                    {s.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="settings-card-subgroup">
            <div className="settings-card-subgroup-title">{t('settings.update.autoPromptTitle', { defaultValue: '更新提示' })}</div>
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={updateAutoPromptEnabled}
                onChange={(e) => onUpdateAutoPromptEnabledChange(e.target.checked)}
              />
              <span>{t('settings.update.autoPromptEnabled', { defaultValue: '自动提示版本更新' })}</span>
            </label>
            <label className="settings-card-check" style={{ marginTop: 6 }}>
              <input
                type="radio"
                name="announcement-show-mode"
                checked={announcementShowMode === 'always'}
                onChange={() => onAnnouncementShowModeChange('always')}
              />
              <span>{t('settings.update.announcementShowModeAlways', { defaultValue: '每次都显示公告' })}</span>
            </label>
            <label className="settings-card-check" style={{ marginTop: 6 }}>
              <input
                type="radio"
                name="announcement-show-mode"
                checked={announcementShowMode === 'version-update-only'}
                onChange={() => onAnnouncementShowModeChange('version-update-only')}
              />
              <span>{t('settings.update.announcementShowModeVersionOnly', { defaultValue: '仅版本更新时显示公告' })}</span>
            </label>
          </div>
        </div>

        {/* 卡片 2:检查与下载 */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.update.actionCardTitle', { defaultValue: '检查与安装' })}</div>
            <div className="settings-card-subtitle">{t('settings.update.actionCardHint', { defaultValue: '手动触发检查,有新版本时可下载安装;下载完成后点击"安装并重启"应用更新' })}</div>
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

      </div>
    </div>
  );
}
