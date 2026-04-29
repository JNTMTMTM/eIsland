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

import { useEffect, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import { SvgIcon } from '../../../utils/SvgIcon';
import { getWebsiteFaviconUrl, getWebsiteFaviconUrls, getWebsiteHostname } from '../../../api/site/siteMetaApi';
import { fetchUpdateSourceUrl } from '../../../api/user/userAccountApi';
import { readLocalToken } from '../../../utils/userAccount';
import '../../../styles/notification/notification.css';

interface UrlFavoriteItem {
  id: number;
  url: string;
  title: string;
  note: string;
  createdAt: number;
}

const URL_FAVORITES_STORE_KEY = 'url-favorites';
const URL_FAVORITES_FOCUS_KEY = 'url-favorites-focus-url';
const UPDATE_SOURCE_STORE_KEY = 'update-source';
const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';

type UpdateSourceKey = 'cloudflare-r2' | 'tencent-cos' | 'aliyun-oss' | 'github';

interface DownloadProgressData {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

function normalizeUpdateSource(value: unknown): UpdateSourceKey {
  if (value === 'github') return 'github';
  if (value === 'tencent-cos') return 'tencent-cos';
  if (value === 'aliyun-oss') return 'aliyun-oss';
  return 'cloudflare-r2';
}

function isProOnlySource(source: UpdateSourceKey): boolean {
  return source === 'tencent-cos' || source === 'aliyun-oss';
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 100 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
  const rounded = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function resolveNotificationIconUrl(iconValue: string | null | undefined): string {
  if (!iconValue) return '';
  const normalized = iconValue.trim();
  if (!normalized) return '';
  const lowered = normalized.toLowerCase();
  if (
    lowered.startsWith('http://')
    || lowered.startsWith('https://')
    || lowered.startsWith('data:')
    || lowered.startsWith('blob:')
    || lowered.startsWith('file:')
    || lowered.startsWith('app:')
    || lowered.startsWith('chrome:')
    || lowered.startsWith('//')
  ) {
    return normalized;
  }
  try {
    return new URL(normalized, window.location.href).toString();
  } catch {
    return normalized;
  }
}

function normalizeUrl(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text}`;
}

function sanitizeFavorites(data: unknown): UrlFavoriteItem[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const row = item as Partial<UrlFavoriteItem>;
      const url = typeof row.url === 'string' ? normalizeUrl(row.url) : '';
      if (!url) return null;
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      const note = typeof row.note === 'string' ? row.note.trim() : '';
      const createdAt = typeof row.createdAt === 'number' && Number.isFinite(row.createdAt) ? row.createdAt : Date.now();
      const id = typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : createdAt;
      return {
        id,
        url,
        title: title || url,
        note,
        createdAt,
      };
    })
    .filter((item): item is UrlFavoriteItem => Boolean(item));
}

function persistFavorites(items: UrlFavoriteItem[]): void {
  try { localStorage.setItem('eIsland_url_favorites', JSON.stringify(items)); } catch { /* noop */ }
  window.api.storeWrite(URL_FAVORITES_STORE_KEY, items).catch(() => {});
}

interface NotificationContentProps {
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  body: string;
  /** 通知图标（可选） */
  icon?: string;
  /** 通知类型 */
  type?: 'default' | 'source-switch' | 'update-available' | 'update-downloading' | 'update-ready' | 'weather-alert-startup' | 'clipboard-url' | 'restart-required';
  /** 请求切换到的播放源 ID（仅 source-switch） */
  sourceAppId?: string;
  /** 更新版本号（用于 update-available / update-ready） */
  updateVersion?: string;
  /** 当前更新源展示文案（仅 update-available） */
  updateSourceLabel?: string;
  /** 天气预警发布时间文案（仅 weather-alert-startup） */
  weatherAlertTime?: string;
  /** 启动自动检查更新时要使用的更新源（仅 weather-alert-startup） */
  startupUpdateSource?: UpdateSourceKey;
  /** 启动自动检查更新时解析后的更新源地址（仅 weather-alert-startup） */
  startupUpdateResolvedUrl?: string;
  /** 检测到的 URL 列表（仅 clipboard-url） */
  urls?: string[];
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
  updateVersion,
  updateSourceLabel,
  weatherAlertTime,
  startupUpdateSource,
  startupUpdateResolvedUrl,
  urls,
}: NotificationContentProps): ReactElement {
  const { t } = useTranslation();
  const { setIdle, setLyrics, setNotification, setMaxExpand, setMaxExpandTab } = useIslandStore();
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [favoriteUrlSet, setFavoriteUrlSet] = useState<Set<string>>(new Set());
  const [useClipboardVectorFallbackIcon, setUseClipboardVectorFallbackIcon] = useState(false);
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState<DownloadProgressData | null>(null);
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

  useEffect(() => {
    setCurrentUrlIndex(0);
  }, [type, urls]);

  useEffect(() => {
    setClipboardFaviconIndex(0);
  }, [type, currentClipboardUrl]);

  useEffect(() => {
    setUseClipboardVectorFallbackIcon(false);
  }, [type, currentClipboardUrl, icon]);

  useEffect(() => {
    if (type !== 'update-downloading') {
      setUpdateDownloadProgress(null);
      return;
    }
    const unsub = window.api?.onUpdaterProgress?.((progress) => {
      setUpdateDownloadProgress(progress);
    });
    return () => {
      unsub?.();
    };
  }, [type]);

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

  useEffect(() => {
    if (type !== 'clipboard-url') return;
    let cancelled = false;
    window.api.storeRead(URL_FAVORITES_STORE_KEY).then((data) => {
      if (cancelled) return;
      const items = sanitizeFavorites(data);
      if (items.length > 0) {
        setFavoriteUrlSet(new Set(items.map(item => item.url.toLowerCase())));
        return;
      }
      try {
        const raw = localStorage.getItem('eIsland_url_favorites');
        const fallbackItems = raw ? sanitizeFavorites(JSON.parse(raw) as unknown[]) : [];
        setFavoriteUrlSet(new Set(fallbackItems.map(item => item.url.toLowerCase())));
      } catch {
        setFavoriteUrlSet(new Set());
      }
    }).catch(() => {
      try {
        const raw = localStorage.getItem('eIsland_url_favorites');
        const fallbackItems = raw ? sanitizeFavorites(JSON.parse(raw) as unknown[]) : [];
        if (!cancelled) setFavoriteUrlSet(new Set(fallbackItems.map(item => item.url.toLowerCase())));
      } catch {
        if (!cancelled) setFavoriteUrlSet(new Set());
      }
    });

    return () => {
      cancelled = true;
    };
  }, [type, urls]);

  const isOfficialSite = (() => {
    if (type !== 'clipboard-url' || !currentClipboardUrl) return false;
    const hostname = getWebsiteHostname(currentClipboardUrl).toLowerCase();
    return hostname === 'pyisland.com' || hostname.endsWith('.pyisland.com');
  })();

  const dismiss = (): void => {
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

  const handleDismissUpdate = (): void => {
    dismiss();
  };

  const handleCloseWeatherAlertAndContinueUpdateCheck = (): void => {
    void window.api?.updaterCheck(startupUpdateSource, startupUpdateResolvedUrl).catch(() => {});
    dismiss();
  };

  const handleRestartNow = (): void => {
    void window.api?.restartApp?.().catch(() => {});
    dismiss();
  };

  const handleRestartLater = (): void => {
    dismiss();
  };

  const handleOpenUrl = (url: string): void => {
    window.api?.clipboardOpenUrl(url);
    dismiss();
  };

  const handleOpenAllUrls = (): void => {
    if (!urls?.length) return;
    urls.forEach((url) => {
      window.api?.clipboardOpenUrl(url);
    });
    dismiss();
  };

  const handleDismissUrl = (): void => {
    dismiss();
  };

  const handleAddDomainToBlacklist = (): void => {
    if (!currentClipboardDomain) return;
    window.api?.clipboardUrlBlacklistAddDomain(currentClipboardDomain).finally(() => {
      dismiss();
    });
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
        <div className="notification-icon">
          {resolvedDisplayIcon ? (
            <img
              src={resolvedDisplayIcon}
              alt=""
              className="notification-icon-img"
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
