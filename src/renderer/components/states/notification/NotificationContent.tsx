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

import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import { SvgIcon } from '../../../utils/SvgIcon';
import { ALARM_SOUND_STOP_EVENT } from '../../../utils/audio/alarmSound';
import { getWebsiteFaviconUrl, getWebsiteFaviconUrls, getWebsiteHostname } from '../../../api/site/siteMetaApi';
import { fetchUpdateSourceUrl } from '../../../api/user/userAccountApi';
import { readLocalToken } from '../../../utils/userAccount';
import { URL_FAVORITES_STORE_KEY, URL_FAVORITES_FOCUS_KEY, UPDATE_SOURCE_STORE_KEY, SETTINGS_OPEN_TAB_STORE_KEY } from './config/notificationConstants';
import type { NotificationContentProps, UrlFavoriteItem, UpdateSourceKey } from './config/notificationTypes';
import { formatBytes, formatEta, normalizeUrl, resolveNotificationIconUrl, normalizeUpdateSource, isProOnlySource, sanitizeFavorites, persistFavorites } from './utils/notificationHelpers';
import { useNotificationFavorites } from './hooks/useNotificationFavorites';
import { useUpdateDownloadProgress } from './hooks/useUpdateDownloadProgress';
import { useResetOnTypeChange } from './hooks/useResetOnTypeChange';
import '../../../styles/notification/notification.css';

/**
 * Notification 状态内容组件
 * @description 通知状态，用于显示应用推送或系统通知
 */
export function NotificationContent({
  title,
  body,
  icon,
  type,
  cliProvider,
  sourceAppId: _sourceAppId,
  updateVersion,
  updateSourceLabel,
  weatherAlertTime,
  startupUpdateSource,
  startupUpdateResolvedUrl,
  urls,
  breakReminderItemId,
  agentName: _agentName,
}: NotificationContentProps): ReactElement {
  const { t } = useTranslation();
  const { setIdle, setLyrics, setNotification, setMaxExpand, setMaxExpandTab, setCli, setCliProvider } = useIslandStore();
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [useClipboardVectorFallbackIcon, setUseClipboardVectorFallbackIcon] = useState(false);
  const [clipboardFaviconIndex, setClipboardFaviconIndex] = useState(0);
  const clipboardUrls = type === 'clipboard-url' ? (urls ?? []) : [];
  const hasMultipleClipboardUrls = clipboardUrls.length > 1;
  const currentClipboardUrl = clipboardUrls[currentUrlIndex] ?? '';
  const clipboardFaviconCandidates = type === 'clipboard-url'
    ? getWebsiteFaviconUrls(currentClipboardUrl)
    : [];
  const clipboardFavicon = clipboardFaviconCandidates[clipboardFaviconIndex] || '';
  const displayIcon = (() => {
    if (type !== 'clipboard-url' || !currentClipboardUrl) return icon;
    const faviconUrl = clipboardFavicon || getWebsiteFaviconUrl(currentClipboardUrl);
    return faviconUrl || icon;
  })();

  const weatherAlertTimeDisplay = (() => {
    if (type !== 'weather-alert-startup') return '';
    const raw = typeof weatherAlertTime === 'string' ? weatherAlertTime.trim() : '';
    if (!raw) {
      return t('notification.weatherAlert.timeUnknown', { defaultValue: '未知' });
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  })();
  const showWeatherAlertMeta = type === 'weather-alert-startup';

  const currentClipboardDomain = (() => {
    if (type !== 'clipboard-url' || !currentClipboardUrl) return '';
    return getWebsiteHostname(currentClipboardUrl).toLowerCase();
  })();
  const effectiveDisplayIcon = useClipboardVectorFallbackIcon && type === 'clipboard-url' ? SvgIcon.LINK : displayIcon;
  const resolvedDisplayIcon = resolveNotificationIconUrl(effectiveDisplayIcon);
  const isVectorIcon = typeof effectiveDisplayIcon === 'string' && /^\.?\/svg\//i.test(effectiveDisplayIcon) && !/^\.?\/svg\/agent\//i.test(effectiveDisplayIcon);

  const { favoriteUrlSet, setFavoriteUrlSet } = useNotificationFavorites(type, urls);
  const updateDownloadProgress = useUpdateDownloadProgress(type);
  useResetOnTypeChange(type, urls, currentClipboardUrl, icon, setCurrentUrlIndex, setClipboardFaviconIndex, setUseClipboardVectorFallbackIcon);

  const updateDownloadBody = (() => {
    if (type !== 'update-downloading') return '';
    if (!updateDownloadProgress || updateDownloadProgress.total <= 0) {
      return t('notification.update.downloadingPreparing', { defaultValue: '正在准备下载更新…' });
    }
    const percent = Math.max(0, Math.min(100, updateDownloadProgress.percent || (updateDownloadProgress.transferred / updateDownloadProgress.total) * 100));
    const speed = updateDownloadProgress.bytesPerSecond > 0
      ? `${formatBytes(updateDownloadProgress.bytesPerSecond)}/s`
      : t('notification.update.downloadingSpeedUnknown', { defaultValue: '计算中' });
    const remainingBytes = Math.max(0, updateDownloadProgress.total - updateDownloadProgress.transferred);
    const eta = updateDownloadProgress.bytesPerSecond > 0
      ? formatEta(remainingBytes / updateDownloadProgress.bytesPerSecond)
      : t('notification.update.downloadingEtaUnknown', { defaultValue: '计算中' });
    return t('notification.update.downloadingBodyProgress', {
      defaultValue: '已下载 {{percent}} · {{speed}} · 预计剩余 {{eta}}',
      percent: `${percent.toFixed(1)}%`,
      speed,
      eta,
    });
  })();

  const displayBody = (() => {
    if (type === 'update-downloading') return updateDownloadBody;
    if (type !== 'clipboard-url' || !currentClipboardUrl) return body;
    if (currentUrlIndex === 0 && body) return body;
    return getWebsiteHostname(currentClipboardUrl) || currentClipboardUrl;
  })();

  const isOfficialSite = (() => {
    if (type !== 'clipboard-url' || !currentClipboardUrl) return false;
    const hostname = getWebsiteHostname(currentClipboardUrl).toLowerCase();
    return hostname === 'pyisland.com' || hostname.endsWith('.pyisland.com');
  })();

  const dismiss = (): void => {
    window.dispatchEvent(new CustomEvent(ALARM_SOUND_STOP_EVENT));
    const store = useIslandStore.getState();
    if (store.isMusicPlaying && store.coverImage && (store.syncedLyrics?.length || store.lyricsLoading)) {
      setLyrics();
    } else {
      setIdle();
    }
  };

  const handleFavoriteCurrentUrl = (): void => {
    if (!currentClipboardUrl) return;
    const normalized = normalizeUrl(currentClipboardUrl);
    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (favoriteUrlSet.has(key)) return;

    const now = Date.now();
    const titleText = (displayBody || '').trim();
    const nextItem: UrlFavoriteItem = {
      id: now,
      url: normalized,
      title: titleText && titleText !== normalized ? titleText : normalized,
      note: '',
      createdAt: now,
    };

    window.api.storeRead(URL_FAVORITES_STORE_KEY).then((data) => {
      const existing = sanitizeFavorites(data);
      const duplicated = existing.some((item) => item.url.toLowerCase() === key);
      if (duplicated) {
        setFavoriteUrlSet((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        return;
      }
      const next = [nextItem, ...existing];
      persistFavorites(next);
      setFavoriteUrlSet(new Set(next.map((item) => item.url.toLowerCase())));
    }).catch(() => {
      try {
        const raw = localStorage.getItem('eIsland_url_favorites');
        const existing = raw ? sanitizeFavorites(JSON.parse(raw) as unknown[]) : [];
        const duplicated = existing.some((item) => item.url.toLowerCase() === key);
        if (duplicated) {
          setFavoriteUrlSet((prev) => {
            const next = new Set(prev);
            next.add(key);
            return next;
          });
          return;
        }
        const next = [nextItem, ...existing];
        persistFavorites(next);
        setFavoriteUrlSet(new Set(next.map((item) => item.url.toLowerCase())));
      } catch {
        setFavoriteUrlSet((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      }
    });
  };

  const handleJumpToFavorite = (): void => {
    if (!currentClipboardUrl) return;
    const normalized = normalizeUrl(currentClipboardUrl);
    if (!normalized) return;
    try {
      localStorage.setItem(URL_FAVORITES_FOCUS_KEY, normalized);
    } catch { /* noop */ }
    setMaxExpandTab('urlFavorites');
    setMaxExpand();
  };

  const handleSnooze = (minutes: number): void => {
    if (breakReminderItemId) {
      window.dispatchEvent(new CustomEvent('break-reminder-snooze', {
        detail: { itemId: breakReminderItemId, snoozeMinutes: minutes },
      }));
    }
    window.setTimeout(() => {
      setNotification({ title, body, icon, breakReminderItemId });
    }, minutes * 60 * 1000);
    dismiss();
  };

  const handleComplete = (): void => { dismiss(); };
  const handleIgnore = (): void => { dismiss(); };
  const handleAcceptSwitch = (): void => { window.api?.mediaAcceptSourceSwitch(); dismiss(); };
  const handleRejectSwitch = (): void => { window.api?.mediaRejectSourceSwitch(); dismiss(); };
  const handleInstallUpdate = (): void => { void window.api?.updaterInstall().catch(() => {}); dismiss(); };

  const handleGoToUpdate = (): void => {
    setNotification({
      title: t('notification.update.downloadingTitle', { defaultValue: '正在下载更新' }),
      body: t('notification.update.downloadingPreparing', { defaultValue: '正在准备下载更新…' }),
      icon: SvgIcon.UPDATE,
      type: 'update-downloading',
      updateVersion,
    });
    void (async () => {
      const sourceRaw = await window.api?.storeRead(UPDATE_SOURCE_STORE_KEY).catch(() => null);
      const source = normalizeUpdateSource(sourceRaw);
      if (isProOnlySource(source)) {
        const token = readLocalToken();
        if (!token) {
          setNotification({
            title: t('notification.update.availableTitle', { defaultValue: '发现新版本' }),
            body: t('settings.update.proOnlyNeedLogin', { defaultValue: '请先登录 PRO 账号后再使用该更新源' }),
            icon: SvgIcon.UPDATE,
          });
          return;
        }
        const resolved = await fetchUpdateSourceUrl(token, source);
        if (!resolved.ok || !resolved.data?.url) {
          setNotification({
            title: t('notification.update.availableTitle', { defaultValue: '发现新版本' }),
            body: resolved.message || t('settings.update.sourceResolveFailed', { defaultValue: '获取更新源地址失败' }),
            icon: SvgIcon.UPDATE,
            type: 'update-available',
            updateVersion,
            updateSourceLabel,
          });
          return;
        }
        const ok = await window.api?.updaterDownload(source, resolved.data.url).catch(() => false);
        if (!ok) {
          setNotification({
            title: t('notification.update.availableTitle', { defaultValue: '发现新版本' }),
            body: t('settings.update.downloadFailed', { defaultValue: '下载失败，请稍后重试' }),
            icon: SvgIcon.UPDATE,
            type: 'update-available',
            updateVersion,
            updateSourceLabel,
          });
        }
        return;
      }
      const ok = await window.api?.updaterDownload(source).catch(() => false);
      if (!ok) {
        setNotification({
          title: t('notification.update.availableTitle', { defaultValue: '发现新版本' }),
          body: t('settings.update.downloadFailed', { defaultValue: '下载失败，请稍后重试' }),
          icon: SvgIcon.UPDATE,
          type: 'update-available',
          updateVersion,
          updateSourceLabel,
        });
      }
    })();
  };

  const handleConfigureUpdateSource = (): void => {
    window.api?.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'update').catch(() => {});
    setMaxExpandTab('settings');
    setMaxExpand();
  };

  const handleDismissUpdate = (): void => { dismiss(); };

  const handleCloseWeatherAlertAndContinueUpdateCheck = (): void => {
    void window.api?.updaterCheck(startupUpdateSource, startupUpdateResolvedUrl).catch(() => {});
    dismiss();
  };

  const handleRestartNow = (): void => { void window.api?.restartApp?.().catch(() => {}); dismiss(); };  const handleRestartLater = (): void => { dismiss(); };
  const handleSwitchToCli = (): void => {
    void window.api?.cliGlowHide?.();
    if (cliProvider) setCliProvider(cliProvider);
    setMaxExpandTab('cli');
    setMaxExpand();
  };
  const handleSwitchToCliState = (): void => {
    void window.api?.cliGlowHide?.();
    if (cliProvider) setCliProvider(cliProvider);
    setCli();
  };
  const handleCliIgnore = (): void => { void window.api?.cliGlowHide?.(); dismiss(); };
  const handleOpenUrl = (url: string): void => { window.api?.clipboardOpenUrl(url); dismiss(); };

  const handleOpenAllUrls = (): void => {
    if (!urls?.length) return;
    urls.forEach((url) => { window.api?.clipboardOpenUrl(url); });
    dismiss();
  };

  const handleDismissUrl = (): void => { dismiss(); };

  const handleAddDomainToBlacklist = (): void => {
    if (!currentClipboardDomain) return;
    window.api?.clipboardUrlBlacklistAddDomain(currentClipboardDomain).finally(() => { dismiss(); });
  };

  const handlePrevUrl = (): void => {
    if (clipboardUrls.length <= 1) return;
    setCurrentUrlIndex((prev) => (prev - 1 + clipboardUrls.length) % clipboardUrls.length);
  };

  const handleNextUrl = (): void => {
    if (clipboardUrls.length <= 1) return;
    setCurrentUrlIndex((prev) => (prev + 1) % clipboardUrls.length);
  };

  const isCurrentUrlFavorited = (() => {
    if (type !== 'clipboard-url' || !currentClipboardUrl) return false;
    const normalized = normalizeUrl(currentClipboardUrl).toLowerCase();
    return favoriteUrlSet.has(normalized);
  })();

  return (
    <div className="notification-content">
      <div className={showWeatherAlertMeta ? 'notification-main-row notification-main-row--with-meta' : 'notification-main-row'}>
        <div className={`notification-icon${type === 'cli-session-detected' ? ' notification-icon--lg' : ''}`}>
          {resolvedDisplayIcon ? (
            <img
              src={resolvedDisplayIcon}
              alt=""
              className={isVectorIcon ? 'notification-icon-img notification-icon-img--vector' : 'notification-icon-img'}
              onError={() => {
                if (type === 'clipboard-url') {
                  if (clipboardFaviconIndex < clipboardFaviconCandidates.length - 1) {
                    setClipboardFaviconIndex((prev) => prev + 1);
                    return;
                  }
                  setUseClipboardVectorFallbackIcon(true);
                }
              }}
            />
          ) : (
            <div className="notification-icon-default" />
          )}
        </div>
        <div className="notification-info">
          <span className="notification-title">
            {title}
            {(type === 'update-available' || type === 'update-downloading' || type === 'update-ready') && updateVersion && (
              <span className="notification-update-version"> v{updateVersion}</span>
            )}
          </span>
          <div className="notification-body-row">
            <span className={type === 'clipboard-url' ? 'notification-body notification-body--single-line' : 'notification-body'}>{displayBody}</span>
            {isOfficialSite && <span className="notification-official-badge">{t('notification.clipboard.officialBadge', { defaultValue: '官网' })}</span>}
          </div>
        </div>
        {showWeatherAlertMeta && (
          <div className="notification-meta-right" title={weatherAlertTimeDisplay}>
            <span className="notification-meta-label">{t('notification.weatherAlert.timeLabel', { defaultValue: '预警时间' })}</span>
            <span className="notification-meta-value">{weatherAlertTimeDisplay}</span>
          </div>
        )}
      </div>

      {type === 'update-downloading' ? (
        <div className="notification-actions notification-actions--right">
          <div className="notification-decision-actions">
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={handleDismissUpdate}>{t('notification.actions.hide', { defaultValue: '隐藏' })}</button>
          </div>
        </div>
      ) : type === 'update-ready' ? (
        <div className="notification-actions notification-actions--right">
          <div className="notification-decision-actions">
            <button type="button" className="notification-action-btn notification-action-complete" onClick={handleInstallUpdate}>{t('notification.actions.installRestart', { defaultValue: '安装并重启' })}</button>
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={handleDismissUpdate}>{t('notification.actions.later', { defaultValue: '稍后' })}</button>
          </div>
        </div>
      ) : type === 'update-available' ? (
        <div className="notification-actions notification-actions--update-available">
          <div className="notification-update-source" title={updateSourceLabel ? t('notification.update.currentSource', { defaultValue: '当前更新源：{{source}}', source: updateSourceLabel }) : ''}>
            {updateSourceLabel ? t('notification.update.currentSource', { defaultValue: '当前更新源：{{source}}', source: updateSourceLabel }) : ''}
          </div>
          <div className="notification-decision-actions">
            <button type="button" className="notification-action-btn notification-action-complete" onClick={handleGoToUpdate}>{t('notification.actions.downloadNow', { defaultValue: '立即下载' })}</button>
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={handleConfigureUpdateSource}>{t('notification.actions.configureUpdateSource', { defaultValue: '自行配置更新源' })}</button>
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={handleDismissUpdate}>{t('notification.actions.ignore', { defaultValue: '忽略' })}</button>
          </div>
        </div>
      ) : type === 'weather-alert-startup' ? (
        <div className="notification-actions notification-actions--right notification-actions--weather-alert-startup">
          <div className="notification-decision-actions">
            <button
              type="button"
              className="notification-action-btn notification-action-complete"
              onClick={handleCloseWeatherAlertAndContinueUpdateCheck}
            >
              {t('notification.actions.closeAndContinueUpdateCheck', { defaultValue: '关闭并继续检查更新' })}
            </button>
          </div>
        </div>
      ) : type === 'restart-required' ? (
        <div className="notification-actions notification-actions--right">
          <div className="notification-decision-actions">
            <button type="button" className="notification-action-btn notification-action-complete" onClick={handleRestartNow}>{t('notification.actions.restartNow', { defaultValue: '立即重启' })}</button>
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={handleRestartLater}>{t('notification.actions.later', { defaultValue: '稍后' })}</button>
          </div>
        </div>
      ) : type === 'clipboard-url' && urls?.length ? (
        <div className="notification-actions notification-actions--clipboard-url">
          {hasMultipleClipboardUrls && (
            <div className="notification-url-nav">
              <button
                type="button"
                className="notification-action-btn notification-action-snooze notification-url-nav-btn"
                onClick={handlePrevUrl}
                aria-label={t('notification.clipboard.prevUrl', { defaultValue: '上一个链接' })}
              >
                <img src={SvgIcon.PREVIOUS} alt="" className="notification-url-nav-btn-icon" />
              </button>
              <span className="notification-url-index">{currentUrlIndex + 1}/{clipboardUrls.length}</span>
              <button
                type="button"
                className="notification-action-btn notification-action-snooze notification-url-nav-btn"
                onClick={handleNextUrl}
                aria-label={t('notification.clipboard.nextUrl', { defaultValue: '下一个链接' })}
              >
                <img src={SvgIcon.NEXT} alt="" className="notification-url-nav-btn-icon" />
              </button>
            </div>
          )}
          <div className="notification-url-list">
            <button
              type="button"
              className="notification-action-btn notification-action-url"
              onClick={() => handleOpenUrl(currentClipboardUrl)}
              title={currentClipboardUrl}
            >
              <img
                src={getWebsiteFaviconUrl(currentClipboardUrl)}
                alt=""
                className="notification-url-favicon"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {currentClipboardUrl.length > 48 ? currentClipboardUrl.slice(0, 48) + '…' : currentClipboardUrl}
            </button>
          </div>
          <div className="notification-decision-actions">
            <button
              type="button"
              className="notification-action-btn notification-action-complete"
              onClick={hasMultipleClipboardUrls ? handleOpenAllUrls : () => handleOpenUrl(currentClipboardUrl)}
            >
              {hasMultipleClipboardUrls
                ? t('notification.actions.openAllLinks', { defaultValue: '打开全部链接' })
                : t('notification.actions.openLink', { defaultValue: '打开链接' })}
            </button>
            {isCurrentUrlFavorited ? (
              <button
                type="button"
                className="notification-favorited-badge"
                onClick={handleJumpToFavorite}
                title={t('notification.clipboard.jumpToFavorites', { defaultValue: '前往 URL 收藏' })}
              >
                {t('notification.actions.favorited', { defaultValue: '已收藏' })}
              </button>
            ) : (
              <button
                type="button"
                className="notification-action-btn notification-action-favorite"
                onClick={handleFavoriteCurrentUrl}
              >
                {t('notification.actions.favorite', { defaultValue: '收藏' })}
              </button>
            )}
            {currentClipboardDomain && (
              <button
                type="button"
                className="notification-action-btn notification-action-snooze"
                onClick={handleAddDomainToBlacklist}
              >
                {t('notification.actions.addBlacklist', { defaultValue: '加入黑名单' })}
              </button>
            )}
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={handleDismissUrl}>{t('notification.actions.ignore', { defaultValue: '忽略' })}</button>
          </div>
        </div>
      ) : type === 'external-agent-active' || type === 'external-agent-stopped' ? (        <div className="notification-actions notification-actions--right">
          <div className="notification-decision-actions">
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={dismiss}>{t('notification.actions.gotIt', { defaultValue: '知道了' })}</button>
          </div>
        </div>
      ) : type === 'cli-session-detected' ? (
        <div className="notification-actions notification-actions--right notification-actions--cli-detected">
          <div className="notification-decision-actions">
            <button type="button" className="notification-action-btn notification-action-complete" onClick={handleSwitchToCli}>{t('notification.actions.switch', { defaultValue: '切换' })}</button>
            <button type="button" className="notification-action-btn notification-action-complete" onClick={handleSwitchToCliState}>{t('notification.actions.switchCliState', { defaultValue: '切换到灵动岛' })}</button>
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={handleCliIgnore}>{t('notification.actions.ignore', { defaultValue: '忽略' })}</button>
          </div>
        </div>
      ) : type === 'source-switch' ? (
        <div className="notification-actions">
          <div className="notification-decision-actions">
            <button type="button" className="notification-action-btn notification-action-complete" onClick={handleAcceptSwitch}>{t('notification.actions.switch', { defaultValue: '切换' })}</button>
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={handleRejectSwitch}>{t('notification.actions.ignore', { defaultValue: '忽略' })}</button>
          </div>
        </div>
      ) : (
        <div className="notification-actions">
          <div className="notification-snooze-actions">
            <button type="button" className="notification-action-btn notification-action-snooze" onClick={() => handleSnooze(5)}>{t('notification.actions.snooze5m', { defaultValue: '稍后 5m' })}</button>
            <button type="button" className="notification-action-btn notification-action-snooze" onClick={() => handleSnooze(15)}>{t('notification.actions.snooze15m', { defaultValue: '稍后 15m' })}</button>
            <button type="button" className="notification-action-btn notification-action-snooze" onClick={() => handleSnooze(60)}>{t('notification.actions.snooze1h', { defaultValue: '稍后 1h' })}</button>
          </div>
          <div className="notification-decision-actions">
            <button type="button" className="notification-action-btn notification-action-complete" onClick={handleComplete}>{t('notification.actions.complete', { defaultValue: '完成' })}</button>
            <button type="button" className="notification-action-btn notification-action-ignore" onClick={handleIgnore}>{t('notification.actions.ignore', { defaultValue: '忽略' })}</button>
          </div>
        </div>
      )}
    </div>
  );
}
