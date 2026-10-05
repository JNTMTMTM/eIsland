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
 * @file useIslandNotificationSubscriptions.ts
 * @description 灵动岛通知事件订阅 Hook。
 * @author 鸡哥
 */

import { useEffect, useRef, useState } from 'react';
import useIslandStore from '../../store/isLandStore';
import type { NotificationData } from '../../store/types';
import { SvgIcon } from '../../utils/SvgIcon';
import { fetchVersion, reportUpdateDownloadCount } from '../../api/update/versionApi';
import { getWebsiteFaviconUrl, getWebsiteHostname } from '../../api/site/siteMetaApi';
import { CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY, UPDATE_SOURCE_STORE_KEY, getUpdateSourceLabel } from '../config/dynamicIslandConfig';

/** Agent 启动通知开关存储键名 */
const AGENT_NOTIFICATION_ENABLED_STORE_KEY = 'agent-notification-enabled';

interface UseIslandNotificationSubscriptionsOptions {
  language: string | undefined;
  t: (key: string, options?: Record<string, unknown>) => string;
  setNotificationRef: React.MutableRefObject<(data: NotificationData) => void>;
}

/**
 * @description 订阅更新、播放源与剪贴板通知事件。
 * @param options - 通知订阅配置。
 */
export function useIslandNotificationSubscriptions(options: UseIslandNotificationSubscriptionsOptions): void {
  const { language, t, setNotificationRef } = options;
  const updateNotifiedRef = useRef(false);
  const [agentNotificationEnabled, setAgentNotificationEnabled] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(AGENT_NOTIFICATION_ENABLED_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'boolean') setAgentNotificationEnabled(value);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const unsubSwitch = window.api?.onSourceSwitchRequest((data) => {
      setNotificationRef.current({
        title: t('notification.sourceSwitch.title', { defaultValue: '检测到其他播放源' }),
        body: `${data.title} - ${data.artist}（${data.sourceAppId}）`,
        icon: SvgIcon.MUSIC,
        type: 'source-switch',
        sourceAppId: data.sourceAppId,
      });
    });
    return () => {
      unsubSwitch?.();
    };
  }, [language, t, setNotificationRef]);

  useEffect(() => {
    const unsubAvailable = window.api?.onUpdaterAvailable?.((data) => {
      if (updateNotifiedRef.current) return;
      updateNotifiedRef.current = true;
      Promise.all([
        fetchVersion().catch(() => null),
        window.api?.storeRead?.(UPDATE_SOURCE_STORE_KEY).catch(() => null),
      ]).then(([info, source]) => {
        const desc = (info?.description ?? '').trim();
        const updateSourceLabel = getUpdateSourceLabel(source);
        setNotificationRef.current({
          title: t('notification.update.availableTitle', { defaultValue: '发现新版本' }),
          body: desc || t('notification.update.availableBody', { defaultValue: '是否立即下载？' }),
          icon: SvgIcon.UPDATE,
          type: 'update-available',
          updateVersion: data.version,
          updateSourceLabel,
        });
      });
    });
    return () => {
      unsubAvailable?.();
    };
  }, [language, t, setNotificationRef]);

  useEffect(() => {
    const unsubUpdate = window.api?.onUpdaterDownloaded?.((data) => {
      reportUpdateDownloadCount(data.version).catch(() => {});
      setNotificationRef.current({
        title: t('notification.update.readyTitle', { defaultValue: '更新就绪' }),
        body: t('notification.update.readyBody', {
          defaultValue: '新版本 v{{version}} 已下载完成，是否立即安装？',
          version: data.version,
        }),
        icon: SvgIcon.UPDATE,
        type: 'update-ready',
        updateVersion: data.version,
      });
    });
    return () => {
      unsubUpdate?.();
    };
  }, [language, t, setNotificationRef]);

  useEffect(() => {
    if (!agentNotificationEnabled) return;
    const unsubAgent = window.api?.onExternalAgentStarted?.((data) => {
      const joined = data.agentNames.join('、');
      setNotificationRef.current({
        title: t('notification.externalAgent.title', { defaultValue: '检测到桌面 Agent', agentName: joined }),
        body: t('notification.externalAgent.body', { defaultValue: '{{agentName}} 已开始工作', agentName: joined }),
        icon: SvgIcon.CODING,
        type: 'external-agent-active',
        agentName: joined,
      });
    });
    return () => {
      unsubAgent?.();
    };
  }, [agentNotificationEnabled, language, t, setNotificationRef]);

  useEffect(() => {
    if (!agentNotificationEnabled) return;
    const unsubAgentStopped = window.api?.onExternalAgentStopped?.((data) => {
      const joined = data.agentNames.join('、');
      setNotificationRef.current({
        title: t('notification.externalAgent.stoppedTitle', { defaultValue: '桌面 Agent 已关闭', agentName: joined }),
        body: t('notification.externalAgent.stoppedBody', { defaultValue: '{{agentName}} 已停止工作', agentName: joined }),
        icon: SvgIcon.CODING,
        type: 'external-agent-stopped',
        agentName: joined,
      });
    });
    return () => {
      unsubAgentStopped?.();
    };
  }, [agentNotificationEnabled, language, t, setNotificationRef]);

  useEffect(() => {
    const unsubClipboard = window.api?.onClipboardUrlsDetected?.(({ urls, title }) => {
      let suppressInFavorites = true;
      try {
        const raw = localStorage.getItem(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY);
        if (raw === '0') suppressInFavorites = false;
        if (raw === '1') suppressInFavorites = true;
      } catch {
        // noop
      }

      const store = useIslandStore.getState();
      const appVisible = store.state === 'maxExpand' && !(store.maxExpandAppModeEnabled && store.maxExpandLauncherVisible);
      const isToolboxTab = appVisible && store.maxExpandTab === 'toolbox';
      const isSettingTab = appVisible && store.maxExpandTab === 'settings';
      if (isToolboxTab || isSettingTab) return;
      if (
        suppressInFavorites
        && appVisible
        && (store.maxExpandTab === 'urlFavorites' || store.maxExpandTab === 'clipboardHistory' || store.maxExpandTab === 'aiChat')
      ) return;

      const faviconUrl = getWebsiteFaviconUrl(urls[0]);
      const hostname = getWebsiteHostname(urls[0]);
      setNotificationRef.current({
        title: t('notification.clipboard.detectedTitle', { defaultValue: '检测到链接' }),
        body: title || hostname || urls[0],
        icon: faviconUrl || SvgIcon.LINK,
        type: 'clipboard-url',
        urls,
      });
    });
    return () => {
      unsubClipboard?.();
    };
  }, [language, t, setNotificationRef]);
}
