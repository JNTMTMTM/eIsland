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

import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { UpdateSettingsPageDots } from './UpdateSettingsPageDots';
import { SettingsPageNavigationToggle } from '../SettingsPageNavigation';
import type { UpdateSettingsPageKey } from '../../utils/settingsConfig';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'latest';

interface DownloadProgressData {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

interface UpdateSettingsSectionProps {
  aboutVersion: string;
  updateAutoPromptEnabled: boolean;
  announcementShowMode: 'always' | 'version-update-only';
  updateStatus: UpdateStatus;
  updateVersion: string;
  downloadProgress: DownloadProgressData | null;
  currentSourceLabel: string;
  updateError: string;
  onUpdateAutoPromptEnabledChange: (enabled: boolean) => void;
  onAnnouncementShowModeChange: (mode: 'always' | 'version-update-only') => void;
  onCheckUpdate: () => void;
  onDownloadUpdate: () => void;
  onInstallUpdate: () => void;
  onResetGuide: () => void;
  guideResetStatus: 'idle' | 'success' | 'error';
  currentUpdateSettingsPageLabel: string;
  updateSettingsPage: UpdateSettingsPageKey;
  updateSettingsPages: UpdateSettingsPageKey[];
  updateSettingsPageLabels: Record<string, string>;
  setUpdateSettingsPage: (page: UpdateSettingsPageKey) => void;
}

/**
 * 渲染更新设置区块
 * @param props - 更新检查与下载配置参数
 * @returns 更新设置区域
 */
export function UpdateSettingsSection({
  aboutVersion,
  updateAutoPromptEnabled,
  announcementShowMode,
  updateStatus,
  updateVersion,
  downloadProgress,
  currentSourceLabel,
  updateError,
  onUpdateAutoPromptEnabledChange,
  onAnnouncementShowModeChange,
  onCheckUpdate,
  onDownloadUpdate,
  onInstallUpdate,
  onResetGuide,
  guideResetStatus,
  currentUpdateSettingsPageLabel,
  updateSettingsPage,
  updateSettingsPages,
  updateSettingsPageLabels,
  setUpdateSettingsPage,
}: UpdateSettingsSectionProps): ReactElement {
  const { t } = useTranslation();
  const [pageNavigationExpanded, setPageNavigationExpanded] = useState(false);

  const hasLatest = updateStatus === 'available' || updateStatus === 'downloading' || updateStatus === 'ready';

  /** 渲染检查更新页 */
  const renderUpdateCheckPage = (): ReactElement => (
    <div className="settings-cards">

      {/* 卡片 1:版本信息 */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">{t('settings.update.versionCardTitle', { defaultValue: '版本信息' })}</div>
          <div className="settings-card-subtitle">{t('settings.update.versionCardHint', { defaultValue: '查看当前版本信息，更新源可在网络配置中设置' })}</div>
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
              <button className="settings-about-update-btn" style={{ width: '100%' }} type="button" onClick={onCheckUpdate}>{t('settings.update.actions.check', { defaultValue: '检查更新' })}</button>
            )}
            {updateStatus === 'checking' && (
              <button className="settings-about-update-btn" style={{ width: '100%' }} type="button" disabled>{t('settings.update.actions.checking', { defaultValue: '检查中…' })}</button>
            )}
            {updateStatus === 'latest' && (
              <button className="settings-about-update-btn" style={{ width: '100%' }} type="button" onClick={onCheckUpdate}>{t('settings.update.actions.latest', { defaultValue: '已是最新版本' })}</button>
            )}
            {updateStatus === 'available' && (
              <button className="settings-about-update-btn update-available" style={{ width: '100%' }} type="button" onClick={onDownloadUpdate}>
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
              <button className="settings-about-update-btn update-ready" style={{ width: '100%' }} type="button" onClick={onInstallUpdate}>
                {t('settings.update.actions.installRestart', { defaultValue: '安装并重启' })}
              </button>
            )}
            {updateStatus === 'error' && (
              <button className="settings-about-update-btn" style={{ width: '100%' }} type="button" onClick={onCheckUpdate}>{t('settings.update.actions.retry', { defaultValue: '重试' })}</button>
            )}
          </div>
          {updateStatus === 'error' && updateError && (
            <div className="settings-about-update-error" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{updateError.replace(/\\n/g, '\n')}</div>
          )}
        </div>
      </div>

    </div>
  );

  /** 渲染信息同步页 */
  const renderInfoSyncPage = (): ReactElement => (
    <div className="settings-cards">

      {/* 卡片 1:更新提示 */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">{t('settings.update.autoPromptTitle', { defaultValue: '更新提示' })}</div>
          <div className="settings-card-subtitle">{t('settings.update.autoPromptHintStatic', { defaultValue: '控制是否自动提示版本更新和公告展示策略' })}</div>
        </div>

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

      {/* 卡片 2:引导界面 */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">{t('settings.update.guideCardTitle', { defaultValue: '引导界面' })}</div>
          <div className="settings-card-subtitle">{t('settings.update.guideCardHint', { defaultValue: '重新显示首次启动引导界面' })}</div>
        </div>

        <button className="settings-about-update-btn" type="button" onClick={onResetGuide}>
          {t('settings.update.actions.resetGuide', { defaultValue: '下次启动显示引导' })}
        </button>
        {guideResetStatus === 'success' && (
          <div className="settings-user-feedback settings-user-feedback--success" style={{ marginTop: 4 }}>
            {t('settings.update.guideResetSuccess', { defaultValue: '设置成功，下次启动将显示引导界面' })}
          </div>
        )}
        {guideResetStatus === 'error' && (
          <div className="settings-user-feedback settings-user-feedback--error" style={{ marginTop: 4 }}>
            {t('settings.update.guideResetError', { defaultValue: '设置失败，请稍后重试' })}
          </div>
        )}
      </div>

    </div>
  );

  /** 渲染当前页面 */
  const renderCurrentPage = (): ReactElement | null => {
    switch (updateSettingsPage) {
      case 'update-check':
        return renderUpdateCheckPage();
      case 'info-sync':
        return renderInfoSyncPage();
      default:
        return null;
    }
  };

  return (
    <div className="max-expand-settings-section settings-update">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>{t('settings.labels.update', { defaultValue: '更新设置' })}</span>
        <span className="settings-app-title-sub">- {currentUpdateSettingsPageLabel}</span>
        <SettingsPageNavigationToggle
          expanded={pageNavigationExpanded}
          label={t(pageNavigationExpanded ? 'settings.navigation.collapse' : 'settings.navigation.expand')}
          onToggle={() => setPageNavigationExpanded((current) => !current)}
        />
      </div>
      <div className="settings-app-pages-layout">
        <div className="settings-app-page-main">{renderCurrentPage()}</div>
        <UpdateSettingsPageDots
          updateSettingsPage={updateSettingsPage}
          expanded={pageNavigationExpanded}
          updateSettingsPages={updateSettingsPages}
          settingsTabLabels={updateSettingsPageLabels}
          setUpdateSettingsPage={setUpdateSettingsPage}
        />
      </div>
    </div>
  );
}
