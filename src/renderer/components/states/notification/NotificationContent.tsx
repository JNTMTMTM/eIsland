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
 * @file NotificationContent.tsx
 * @description Notification 状态内容组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import useIslandStore from '../../../store/slices';
import '../../../styles/notification/notification.css';

interface NotificationContentProps {
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  body: string;
  /** 通知图标（可选） */
  icon?: string;
  /** 通知类型 */
  type?: 'default' | 'source-switch' | 'update-available' | 'update-ready';
  /** 请求切换到的播放源 ID（仅 source-switch） */
  sourceAppId?: string;
   /** 更新版本号（用于 update-available / update-ready） */
  updateVersion?: string;
}

/**
 * Notification 状态内容组件
 * @description 通知状态，用于显示应用推送或系统通知
 */
export function NotificationContent({
  title,
  body,
  icon,
  type,
  sourceAppId: _sourceAppId,
  updateVersion: _updateVersion,
}: NotificationContentProps): ReactElement {
  const { setIdle, setLyrics, setNotification } = useIslandStore();

  const dismiss = (): void => {
    const store = useIslandStore.getState();
    if (store.isMusicPlaying && store.coverImage && (store.syncedLyrics?.length || store.lyricsLoading)) {
      setLyrics();
    } else {
      setIdle();
    }
  };

  const handleSnooze = (minutes: number): void => {
    window.setTimeout(() => {
      setNotification({ title, body, icon });
    }, minutes * 60 * 1000);
    dismiss();
  };

  const handleComplete = (): void => {
    dismiss();
  };

  const handleIgnore = (): void => {
    dismiss();
  };

  const handleAcceptSwitch = (): void => {
    window.api?.mediaAcceptSourceSwitch();
    dismiss();
  };

  const handleRejectSwitch = (): void => {
    window.api?.mediaRejectSourceSwitch();
    dismiss();
  };

  const handleInstallUpdate = (): void => {
    void window.api?.updaterInstall().catch(() => {});
    dismiss();
  };

  const handleGoToUpdate = (): void => {
    window.api?.updaterDownload().catch(() => {});
    dismiss();
  };

  const handleDismissUpdate = (): void => {
    dismiss();
  };

  return (
    <div className="notification-content">
      <div className="notification-main-row">
        <div className="notification-icon">
          {icon ? (
            <img src={icon} alt="" className="notification-icon-img" />
          ) : (
            <div className="notification-icon-default" />
          )}
        </div>
        <div className="notification-info">
          <span className="notification-title">{title}</span>
          <span className="notification-body">{body}</span>
        </div>
      </div>

      {type === 'update-ready' ? (
        <div className="notification-actions notification-actions--right">
          <div className="notification-decision-actions">
            <button type="button" className="notification-action-btn notification-action-complete" onClick={handleInstallUpdate}>安装并重启</button>
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={handleDismissUpdate}>稍后</button>
          </div>
        </div>
      ) : type === 'update-available' ? (
        <div className="notification-actions notification-actions--right">
          <div className="notification-decision-actions">
            <button type="button" className="notification-action-btn notification-action-complete" onClick={handleGoToUpdate}>下载更新</button>
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={handleDismissUpdate}>稍后</button>
          </div>
        </div>
      ) : type === 'source-switch' ? (
        <div className="notification-actions">
          <div className="notification-decision-actions">
            <button type="button" className="notification-action-btn notification-action-complete" onClick={handleAcceptSwitch}>切换</button>
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={handleRejectSwitch}>忽略</button>
          </div>
        </div>
      ) : (
        <div className="notification-actions">
          <div className="notification-snooze-actions">
            <button type="button" className="notification-action-btn notification-action-snooze" onClick={() => handleSnooze(5)}>稍后 5m</button>
            <button type="button" className="notification-action-btn notification-action-snooze" onClick={() => handleSnooze(15)}>稍后 15m</button>
            <button type="button" className="notification-action-btn notification-action-snooze" onClick={() => handleSnooze(60)}>稍后 1h</button>
          </div>
          <div className="notification-decision-actions">
            <button type="button" className="notification-action-btn notification-action-complete" onClick={handleComplete}>完成</button>
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={handleIgnore}>忽略</button>
          </div>
        </div>
      )}
    </div>
  );
}
