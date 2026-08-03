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
 * @file useIslandStartupAnnouncements.ts
 * @description 启动阶段更新检查与公告展示 Hook。
 * @author 鸡哥
 */

import { useEffect } from 'react';
import useIslandStore from '../../store/isLandStore';
import { SvgIcon } from '../../utils/SvgIcon';
import { fetchStartupWeatherAlerts } from '../../api/weather/weatherApi';
import { fetchUpdateSourceUrl } from '../../api/user/userAccountApi';
import {
  fetchAnnouncements,
  readAnnouncementLastShownAppVersion,
  readAnnouncementShowMode,
  writeAnnouncementLastShownAppVersion,
  type AnnouncementData,
} from '../../api/announcement/announcementApi';
import { readLocalToken } from '../../utils/userAccount';
import {
  UPDATE_SOURCE_STORE_KEY,
  UPDATE_AUTO_PROMPT_STORE_KEY,
  WEATHER_ALERT_ENABLED_STORE_KEY,
  normalizeUpdateSource,
  isProOnlyUpdateSource,
  getRoleFromToken,
} from '../config/dynamicIslandConfig';
import type { UpdateSourceKey } from '../config/dynamicIslandConfig';

interface UseIslandStartupAnnouncementsOptions {
  language: string | undefined;
  state: string;
  setAnnouncement: () => void;
  startupAutoCheckHandledRef: React.MutableRefObject<boolean>;
  pendingAnnouncementAfterGuideRef: React.MutableRefObject<boolean>;
  pendingAnnouncementAppVersionRef: React.MutableRefObject<string>;
  setNotificationRef: React.MutableRefObject<(data: {
    title: string;
    body: string;
    icon?: string;
    type?: 'default' | 'source-switch' | 'update-available' | 'update-downloading' | 'update-ready' | 'weather-alert-startup' | 'clipboard-url' | 'restart-required';
    sourceAppId?: string;
    updateVersion?: string;
    updateSourceLabel?: string;
    weatherAlertTime?: string;
    startupUpdateSource?: UpdateSourceKey;
    startupUpdateResolvedUrl?: string;
    urls?: string[];
  }) => void>;
  t: (key: string, options?: Record<string, unknown>) => string;
}

/**
 * 创建公告展示标记，使同一应用版本内新增或更新公告仍可再次触发。
 * @param appVersion - 当前应用版本。
 * @param announcements - 当前生效的公告列表。
 * @returns 包含应用版本和公告指纹的稳定字符串。
 */
export function createAnnouncementShownMarker(
  appVersion: string,
  announcements: AnnouncementData[],
): string {
  const fingerprints = announcements
    .map((announcement) => `${announcement.id ?? ''}@${announcement.updatedAt ?? ''}`)
    .sort();
  return JSON.stringify({ appVersion, fingerprints });
}

/**
 * @description 处理启动更新提醒、天气预警与公告触发逻辑。
 * @param options - 启动公告与更新检查配置。
 */
export function useIslandStartupAnnouncements(options: UseIslandStartupAnnouncementsOptions): void {
  const {
    language,
    state,
    setAnnouncement,
    startupAutoCheckHandledRef,
    pendingAnnouncementAfterGuideRef,
    pendingAnnouncementAppVersionRef,
    setNotificationRef,
    t,
  } = options;

  useEffect(() => {
    const unsub = window.api?.onUpdaterStartupAutoCheckRequest?.(() => {
      if (startupAutoCheckHandledRef.current) return;
      startupAutoCheckHandledRef.current = true;
      void (async () => {
        const autoPromptValue = await window.api?.storeRead?.(UPDATE_AUTO_PROMPT_STORE_KEY).catch(() => null);
        const autoPromptEnabled = typeof autoPromptValue === 'boolean' ? autoPromptValue : true;
        if (!autoPromptEnabled) return;

        const token = readLocalToken();
        const isProUser = getRoleFromToken(token) === 'pro';
        const sourceRaw = await window.api?.storeRead?.(UPDATE_SOURCE_STORE_KEY).catch(() => null);
        let startupSource = normalizeUpdateSource(sourceRaw);
        let startupResolvedUrl: string | undefined;

        if (isProOnlyUpdateSource(startupSource)) {
          if (!token || !isProUser) {
            startupSource = 'cloudflare-r2';
          } else {
            const resolved = await fetchUpdateSourceUrl(token, startupSource);
            if (resolved.ok && resolved.data?.url) {
              startupResolvedUrl = resolved.data.url;
            } else {
              startupSource = 'cloudflare-r2';
            }
          }
        }

        const continueStartupUpdateCheck = async (): Promise<void> => {
          await window.api?.updaterCheck(startupSource, startupResolvedUrl).catch(() => {});
        };

        const weatherAlertEnabledValue = await window.api?.storeRead?.(WEATHER_ALERT_ENABLED_STORE_KEY).catch(() => null);
        const weatherAlertEnabled = typeof weatherAlertEnabledValue === 'boolean' ? weatherAlertEnabledValue : true;
        if (!weatherAlertEnabled || !isProUser || !token) {
          await continueStartupUpdateCheck();
          return;
        }

        try {
          const weatherAlertPayload = await fetchStartupWeatherAlerts(token);
          if (weatherAlertPayload.alerts.length > 0) {
            const firstAlert = weatherAlertPayload.alerts[0];
            const firstAlertTitle = firstAlert.title
              || firstAlert.typeName
              || t('notification.weatherAlert.defaultTitle', { defaultValue: '天气预警' });
            const city = weatherAlertPayload.location.city
              || t('notification.weatherAlert.unknownCity', { defaultValue: '当前位置' });
            const body = weatherAlertPayload.alerts.length > 1
              ? t('notification.weatherAlert.bodyWithMore', {
                  defaultValue: '{{city}}：{{title}}，另有 {{count}} 条预警。',
                  city,
                  title: firstAlertTitle,
                  count: weatherAlertPayload.alerts.length - 1,
                })
              : t('notification.weatherAlert.bodySingle', {
                  defaultValue: '{{city}}：{{title}}',
                  city,
                  title: firstAlertTitle,
                });
            setNotificationRef.current({
              title: t('notification.weatherAlert.title', { defaultValue: '天气预警提醒' }),
              body,
              icon: SvgIcon.WEATHER,
              type: 'weather-alert-startup',
              weatherAlertTime: firstAlert.pubTime,
              startupUpdateSource: startupSource,
              startupUpdateResolvedUrl: startupResolvedUrl,
            });
            return;
          }
        } catch (error) {
          console.warn('[Updater] startup weather alert pre-check failed:', error);
        }

        await continueStartupUpdateCheck();
      })();
    });
    return () => {
      unsub?.();
    };
  }, [language, t, startupAutoCheckHandledRef, setNotificationRef]);

  useEffect(() => {
    const unsub = window.api?.onUpdaterNotAvailable?.(() => {
      void (async () => {
        const current = useIslandStore.getState().state as string;
        if (current === 'login' || current === 'register' || current === 'resetPassword' || current === 'payment') return;

        const mode = await readAnnouncementShowMode();
        const currentVersion = await window.api?.updaterVersion?.() ?? '';
        const announcements = await fetchAnnouncements();
        if (announcements.length === 0) return;

        const shownMarker = createAnnouncementShownMarker(currentVersion, announcements);
        if (mode === 'version-update-only') {
          const lastShownMarker = await readAnnouncementLastShownAppVersion();
          if (lastShownMarker === shownMarker) return;
        }

        const applyShownMarker = async (): Promise<void> => {
          if (mode !== 'version-update-only' || !currentVersion) return;
          await writeAnnouncementLastShownAppVersion(shownMarker);
        };

        if (current === 'guide') {
          pendingAnnouncementAfterGuideRef.current = true;
          pendingAnnouncementAppVersionRef.current = mode === 'version-update-only' ? shownMarker : '';
          return;
        }

        setAnnouncement();
        await applyShownMarker();
      })();
    });
    return () => {
      unsub?.();
    };
  }, [setAnnouncement, pendingAnnouncementAfterGuideRef, pendingAnnouncementAppVersionRef]);

  useEffect(() => {
    if (!pendingAnnouncementAfterGuideRef.current) return;
    if (state === 'guide' || state === 'login' || state === 'register' || state === 'resetPassword' || state === 'payment') return;

    pendingAnnouncementAfterGuideRef.current = false;
    setAnnouncement();

    const pendingVersion = pendingAnnouncementAppVersionRef.current;
    pendingAnnouncementAppVersionRef.current = '';
    if (pendingVersion) {
      void writeAnnouncementLastShownAppVersion(pendingVersion);
    }
  }, [state, setAnnouncement, pendingAnnouncementAfterGuideRef, pendingAnnouncementAppVersionRef]);
}
