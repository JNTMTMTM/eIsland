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
 * @file useSettingsNavigation.ts
 * @description 设置子页、翻译标签和登录会话状态
 * @author 鸡哥
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { OVERVIEW_CLOCK_STYLE_OPTIONS, OVERVIEW_WIDGET_OPTIONS } from '../../../../expand/components/OverviewTab';
import { getRoleFromToken, type PluginMarketPageKey } from '../config/settingsTabConfig';
import { OVERVIEW_CLOCK_STYLE_LABEL_KEYS, OVERVIEW_WIDGET_LABEL_KEYS } from '../config/settingsViewConfig';
import {
  AI_SETTINGS_PAGE_LABELS,
  MAIL_SETTINGS_PAGE_LABELS,
  MUSIC_SETTINGS_PAGE_LABELS,
  NETWORK_SETTINGS_PAGE_LABELS,
  SETTINGS_TAB_LABELS,
  UPDATE_SETTINGS_PAGE_LABELS,
  WEATHER_SETTINGS_PAGE_LABELS,
  type AiSettingsPageKey,
  type AppSettingsPageKey,
  type MailSettingsPageKey,
  type MusicSettingsPageKey,
  type NetworkSettingsPageKey,
  type SettingsTabLabelKey,
  type UpdateSettingsPageKey,
  type WeatherSettingsPageKey,
} from '../utils/settingsConfig';
import { useSettingsSidebarTabState, useUserSessionState } from './useSettingsTabState';

import type { useTranslation } from 'react-i18next';

interface SettingsNavigationOptions {
  t: ReturnType<typeof useTranslation>['t'];
}

/**
 * 设置子页、翻译标签和登录会话状态。
 * @param options - 当前设置上下文
 * @returns 供设置视图组合使用的状态与操作
 */
export function useSettingsNavigation(options: SettingsNavigationOptions) {
  const { t } = options;
  const translatedOverviewWidgetOptions = useMemo(() => {
    return OVERVIEW_WIDGET_OPTIONS.map((option) => ({
      ...option,
      label: t(OVERVIEW_WIDGET_LABEL_KEYS[option.value]),
    }));
  }, [t]);
  const translatedOverviewClockStyleOptions = useMemo(() => {
    return OVERVIEW_CLOCK_STYLE_OPTIONS.map((option) => ({
      ...option,
      label: t(OVERVIEW_CLOCK_STYLE_LABEL_KEYS[option.value]),
    }));
  }, [t]);
  const [activeTab, setActiveTab] = useSettingsSidebarTabState();
  const { sessionToken, hasLoginSession } = useUserSessionState();
  const [appSettingsPage, setAppSettingsPage] = useState<AppSettingsPageKey>('layout-preview');
  const [weatherSettingsPage, setWeatherSettingsPage] = useState<WeatherSettingsPageKey>('location');
  const [mailSettingsPage, setMailSettingsPage] = useState<MailSettingsPageKey>('account');
  const [musicSettingsPage, setMusicSettingsPage] = useState<MusicSettingsPageKey>('whitelist');
  const [aiSettingsPage, setAiSettingsPage] = useState<AiSettingsPageKey>('general');
  const [networkSettingsPage, setNetworkSettingsPage] = useState<NetworkSettingsPageKey>('timeout');
  const [updateSettingsPage, setUpdateSettingsPage] = useState<UpdateSettingsPageKey>('update-check');
  const [userInitialProfilePage, setUserInitialProfilePage] = useState<'info' | 'pro' | 'recharge' | 'orders' | 'questionnaire'>('info');
  const [aboutInitialPage, setAboutInitialPage] = useState<'development' | 'feedback'>('development');
  const [pluginMarketPage, setPluginMarketPage] = useState<PluginMarketPageKey>('wallpaper');
  const [pluginMarketNavigationExpanded, setPluginMarketNavigationExpanded] = useState(false);
  const [wallpaperMarketRefreshKey, setWallpaperMarketRefreshKey] = useState(0);
  const [wallpaperSearchExpanded, setWallpaperSearchExpanded] = useState(false);
  const [wallpaperDetailOpen, setWallpaperDetailOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const isProUser = useMemo(() => getRoleFromToken(sessionToken) === 'pro', [sessionToken]);

  const getSettingsLabel = (key: SettingsTabLabelKey): string => {
    return t(`settings.labels.${key}`, { defaultValue: SETTINGS_TAB_LABELS[key] });
  };

  const currentAppSettingsPageLabel = getSettingsLabel(appSettingsPage);
  const currentWeatherSettingsPageLabel = t(`settings.weatherPages.${weatherSettingsPage}`, { defaultValue: WEATHER_SETTINGS_PAGE_LABELS[weatherSettingsPage] || '定位配置' });
  const currentMailSettingsPageLabel = t(`settings.mailPages.${mailSettingsPage}`, { defaultValue: MAIL_SETTINGS_PAGE_LABELS[mailSettingsPage] || '账户' });
  const currentMusicSettingsPageLabel = t(`settings.musicPages.${musicSettingsPage}`, { defaultValue: MUSIC_SETTINGS_PAGE_LABELS[musicSettingsPage] || '白名单' });
  const currentAiSettingsPageLabel = t(`settings.aiPages.${aiSettingsPage}`, { defaultValue: AI_SETTINGS_PAGE_LABELS[aiSettingsPage] || '通用配置' });
  const currentNetworkSettingsPageLabel = t(`settings.networkPages.${networkSettingsPage}`, { defaultValue: NETWORK_SETTINGS_PAGE_LABELS[networkSettingsPage] || '请求超时' });
  const currentUpdateSettingsPageLabel = t(`settings.updatePages.${updateSettingsPage}`, { defaultValue: UPDATE_SETTINGS_PAGE_LABELS[updateSettingsPage] || '检查更新' });
  const pluginMarketPageLabels: Record<PluginMarketPageKey, string> = {
    wallpaper: t('settings.pluginMarket.pages.wallpaper', { defaultValue: '壁纸' }),
    contribution: t('settings.pluginMarket.pages.contribution', { defaultValue: '贡献' }),
    edit: t('settings.pluginMarket.pages.edit', { defaultValue: '修改壁纸' }),
    apps: t('settings.pluginMarket.pages.apps', { defaultValue: '应用' }),
  };
  const currentPluginMarketPageLabel = pluginMarketPageLabels[pluginMarketPage];
  const translatedSettingsTabLabels = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    (Object.keys(SETTINGS_TAB_LABELS) as SettingsTabLabelKey[]).forEach((key) => {
      next[key] = getSettingsLabel(key);
    });
    return next;
  }, [t]);
  const translatedWeatherSettingsPageLabels = useMemo<Record<WeatherSettingsPageKey, string>>(() => ({
    location: t('settings.weatherPages.location', { defaultValue: WEATHER_SETTINGS_PAGE_LABELS.location }),
    provider: t('settings.weatherPages.provider', { defaultValue: WEATHER_SETTINGS_PAGE_LABELS.provider }),
  }), [t]);
  const translatedNetworkSettingsPageLabels = useMemo<Record<NetworkSettingsPageKey, string>>(() => ({
    timeout: t('settings.networkPages.timeout', { defaultValue: NETWORK_SETTINGS_PAGE_LABELS.timeout }),
    'data-center': t('settings.networkPages.data-center', { defaultValue: NETWORK_SETTINGS_PAGE_LABELS['data-center'] }),
  }), [t]);
  const translatedUpdateSettingsPageLabels = useMemo<Record<UpdateSettingsPageKey, string>>(() => ({
    'update-check': t('settings.updatePages.update-check', { defaultValue: UPDATE_SETTINGS_PAGE_LABELS['update-check'] }),
    'info-sync': t('settings.updatePages.info-sync', { defaultValue: UPDATE_SETTINGS_PAGE_LABELS['info-sync'] }),
  }), [t]);
  const translatedMailSettingsPageLabels = useMemo<Record<MailSettingsPageKey, string>>(() => ({
    account: t('settings.mailPages.account', { defaultValue: MAIL_SETTINGS_PAGE_LABELS.account }),
    imap: t('settings.mailPages.imap', { defaultValue: MAIL_SETTINGS_PAGE_LABELS.imap }),
    preferences: t('settings.mailPages.preferences', { defaultValue: MAIL_SETTINGS_PAGE_LABELS.preferences }),
  }), [t]);
  const translatedMusicSettingsPageLabels = useMemo<Record<MusicSettingsPageKey, string>>(() => ({
    whitelist: t('settings.musicPages.whitelist', { defaultValue: MUSIC_SETTINGS_PAGE_LABELS.whitelist }),
    lyrics: t('settings.musicPages.lyrics', { defaultValue: MUSIC_SETTINGS_PAGE_LABELS.lyrics }),
    smtc: t('settings.musicPages.smtc', { defaultValue: MUSIC_SETTINGS_PAGE_LABELS.smtc }),
    providers: t('settings.musicPages.providers', { defaultValue: MUSIC_SETTINGS_PAGE_LABELS.providers }),
  }), [t]);
  const [aboutVersion, setAboutVersion] = useState<string>('');
  const handleNavAction = useCallback((actionId: string): void => {
    if (actionId === 'user-pro') {
      setUserInitialProfilePage('pro');
      setActiveTab('user');
      return;
    }
    if (actionId === 'user-recharge') {
      setUserInitialProfilePage('recharge');
      setActiveTab('user');
      return;
    }
    if (actionId === 'user-questionnaire') {
      setUserInitialProfilePage('questionnaire');
      setActiveTab('user');
    }
  }, [setActiveTab]);

  return {
    translatedOverviewWidgetOptions,
    translatedOverviewClockStyleOptions,
    activeTab,
    setActiveTab,
    sessionToken,
    hasLoginSession,
    appSettingsPage,
    setAppSettingsPage,
    weatherSettingsPage,
    setWeatherSettingsPage,
    mailSettingsPage,
    setMailSettingsPage,
    musicSettingsPage,
    setMusicSettingsPage,
    aiSettingsPage,
    setAiSettingsPage,
    networkSettingsPage,
    setNetworkSettingsPage,
    updateSettingsPage,
    setUpdateSettingsPage,
    userInitialProfilePage,
    setUserInitialProfilePage,
    aboutInitialPage,
    setAboutInitialPage,
    pluginMarketPage,
    setPluginMarketPage,
    pluginMarketNavigationExpanded,
    setPluginMarketNavigationExpanded,
    wallpaperMarketRefreshKey,
    setWallpaperMarketRefreshKey,
    wallpaperSearchExpanded,
    setWallpaperSearchExpanded,
    wallpaperDetailOpen,
    setWallpaperDetailOpen,
    settingsRef,
    isProUser,
    getSettingsLabel,
    currentAppSettingsPageLabel,
    currentWeatherSettingsPageLabel,
    currentMailSettingsPageLabel,
    currentMusicSettingsPageLabel,
    currentAiSettingsPageLabel,
    currentNetworkSettingsPageLabel,
    currentUpdateSettingsPageLabel,
    pluginMarketPageLabels,
    currentPluginMarketPageLabel,
    translatedSettingsTabLabels,
    translatedWeatherSettingsPageLabels,
    translatedNetworkSettingsPageLabels,
    translatedUpdateSettingsPageLabels,
    translatedMailSettingsPageLabels,
    translatedMusicSettingsPageLabels,
    aboutVersion,
    setAboutVersion,
    handleNavAction,
  };
}
