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
 * @file SettingsTab.tsx
 * @description 最大展开模式 — 设置 Tab
 * @author 鸡哥
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import type { OverviewClockStyle, OverviewWidgetType, OverviewLayoutConfig } from '../../expand/components/OverviewTab';
import { OVERVIEW_CLOCK_STYLE_OPTIONS, OVERVIEW_WIDGET_OPTIONS, normalizeOverviewLayoutConfig } from '../../expand/components/OverviewTab';
import {
  loadNetworkConfig,
  saveNetworkConfig,
  DEFAULT_NETWORK_TIMEOUT_MS,
  DEFAULT_STATIC_ASSET_NODE_FREE,
  normalizeStaticAssetNode,
  type StaticAssetNode,
  type WeatherProvider,
  type WeatherLocationPriority,
  DEFAULT_WEATHER_PRIMARY_PROVIDER,
  DEFAULT_WEATHER_LOCATION_PRIORITY,
  loadWeatherProviderConfig,
  saveWeatherProviderConfig,
  loadWeatherLocationConfig,
  saveWeatherLocationConfig,
} from '../../../../store/utils/storage';
import {
  LYRICS_SOURCE_OPTIONS,
  WEATHER_PROVIDER_OPTIONS,
  WEATHER_LOCATION_PRIORITY_OPTIONS,
  SETTINGS_TAB_LABELS,
  NETWORK_TIMEOUT_OPTIONS,
  LAYOUT_STORE_KEY,
  DEFAULT_LAYOUT,
  EXPAND_NAV_LAYOUT_STORE_KEY,
  DEFAULT_EXPAND_NAV_LAYOUT,
  normalizeExpandNavLayoutConfig,
  type ExpandNavLayoutConfig,
  MAXEXPAND_NAV_LAYOUT_STORE_KEY,
  DEFAULT_MAXEXPAND_NAV_LAYOUT,
  normalizeMaxExpandNavLayoutConfig,
  type MaxExpandNavLayoutConfig,
  APP_SETTINGS_PAGES,
  WEATHER_SETTINGS_PAGES,
  WEATHER_SETTINGS_PAGE_LABELS,
  MAIL_SETTINGS_PAGES,
  MAIL_SETTINGS_PAGE_LABELS,
  MUSIC_SETTINGS_PAGES,
  MUSIC_SETTINGS_PAGE_LABELS,
  AI_SETTINGS_PAGES,
  AI_SETTINGS_PAGE_LABELS,
  NAV_CARDS,
  DEFAULT_NAV_ORDER,
  NAV_CARDS_MAP,
  type AppSettingsPageKey,
  type WeatherSettingsPageKey,
  type MailSettingsPageKey,
  type MusicSettingsPageKey,
  type AiSettingsPageKey,
  type SettingsTabLabelKey,
  type NavCardDef,
} from './setting/utils/settingsConfig';
import {
  CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY,
  ISLAND_BG_MEDIA_STORE_KEY,
  ISLAND_BG_IMAGE_STORE_KEY,
  ISLAND_BG_VIDEO_FIT_STORE_KEY,
  ISLAND_BG_VIDEO_MUTED_STORE_KEY,
  ISLAND_BG_VIDEO_LOOP_STORE_KEY,
  ISLAND_BG_VIDEO_VOLUME_STORE_KEY,
  ISLAND_BG_VIDEO_RATE_STORE_KEY,
  ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY,
  ISLAND_BG_SYNC_SYSTEM_WALLPAPER_STORE_KEY,
  STANDALONE_WINDOW_MAC_CONTROLS_STORE_KEY,
  ISLAND_DISPLAY_STORE_KEY,
  UPDATE_SOURCE_STORE_KEY,
  WEATHER_ALERT_ENABLED_STORE_KEY,
  MAIL_CONFIG_STORE_KEY,
  MAIL_ACCOUNTS_STORE_KEY,
  MAIL_FETCH_LIMIT_STORE_KEY,
  SETTINGS_OPEN_TAB_STORE_KEY,
  ISLAND_AUTO_DIM_ENABLED_STORE_KEY,
  ISLAND_AUTO_DIM_DELAY_STORE_KEY,
  DEFAULT_AUTO_DIM_DELAY_SEC,
  AUTO_HIDE_FULLSCREEN_WINDOWS_STORE_KEY,
  UPDATE_SOURCES,
  PLUGIN_MARKET_PAGES,
  generateMailAccountId,
  normalizeBgMediaConfig,
  resolveBgMediaPreviewUrl,
  applyIslandOpacity,
  getRoleFromToken,
  type SettingsOpenTabIntent,
  type MailAccountConfig,
  type RunningWindowItem,
  type PluginMarketPageKey,
  type UpdateSourceKey,
} from './setting/config/settingsTabConfig';
import { useSettingsSidebarTabState, useUserSessionState } from './setting/hooks/useSettingsTabState';
import useUpdateSettingsState from './setting/hooks/useUpdateSettingsState';
import useBackgroundMediaSettingsState from './setting/hooks/useBackgroundMediaSettingsState';
import { UpdateSettingsSection } from './setting/components/update/UpdateSettingsSection';
import { IndexSettingsSection } from './setting/components/index/IndexSettingsSection';
import { AppSettingsSection } from './setting/components/app/AppSettingsSection';
import { NetworkSettingsSection } from './setting/components/network/NetworkSettingsSection';
import { MailSettingsSection } from './setting/components/mail/MailSettingsSection';
import { WeatherSettingsSection } from './setting/components/weather/WeatherSettingsSection';
import { ShortcutSettingsSection } from './setting/components/shortcut/ShortcutSettingsSection';
import { MusicSettingsSection } from './setting/components/music/MusicSettingsSection';
import { AiSettingsSection } from './setting/components/ai/AiSettingsSection';
import { UserSettingsSection } from './setting/components/user/UserSettingsSection';
import { AboutSettingsSection } from './setting/components/about/AboutSettingsSection';
import { OverviewPreview } from './setting/components/app/preview/OverviewPreview';
import { WallpaperMarketSection } from './setting/components/pluginMarket/WallpaperMarketSection';
import { WallpaperContributionSection } from './setting/components/pluginMarket/WallpaperContributionSection';
import { WallpaperEditSection } from './setting/components/pluginMarket/WallpaperEditSection';

import { resolveDistrictLocationByKeyword } from '../../../../api/weather/adcodeApi';
import { request as requestUserAccountApi } from '../../../../api/user/userAccountApi.client';

import { setThemeMode as applyThemeMode, getThemeMode, type ThemeMode } from '../../../../utils/theme';
import { getLanguage, setLanguage, type AppLanguage } from '../../../../i18n';
import { readLocalToken } from '../../../../utils/userAccount';
import { SvgIcon } from '../../../../utils/SvgIcon';

/** 单行配置项 */
function SettingsField({
  label,
  value,
  placeholder,
  type = 'text',
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (v: string) => void;
}): ReactElement {
  return (
    <label className="settings-field">
      <span className="settings-field-label">{label}</span>
      <input
        className="settings-field-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/**
 * 设置 Tab
 * @description 最大展开模式下的设置面板
 */

/**
 * 渲染设置面板主视图
 * @description 提供应用设置、AI 配置与关于软件三类设置入口
 * @returns 设置 Tab 组件
 */
export function SettingsTab(): ReactElement {
  const { t } = useTranslation();
  const translatedOverviewWidgetOptions = useMemo(() => {
    const labelKeyMap: Record<OverviewWidgetType, string> = {
      shortcuts: 'settings.app.layout.widgetNames.shortcuts',
      todo: 'settings.app.layout.widgetNames.todo',
      song: 'settings.app.layout.widgetNames.song',
      countdown: 'settings.app.layout.widgetNames.countdown',
      pomodoro: 'settings.app.layout.widgetNames.pomodoro',
      urlFavorites: 'settings.app.layout.widgetNames.urlFavorites',
      album: 'settings.app.layout.widgetNames.album',
      mokugyo: 'settings.app.layout.widgetNames.mokugyo',
      breakReminder: 'settings.app.layout.widgetNames.breakReminder',
    };
    return OVERVIEW_WIDGET_OPTIONS.map((option) => ({
      ...option,
      label: t(labelKeyMap[option.value]),
    }));
  }, [t]);
  const translatedOverviewClockStyleOptions = useMemo(() => {
    const labelKeyMap: Record<OverviewClockStyle, string> = {
      classic: 'settings.app.layout.clockStyleNames.classic',
      gradient: 'settings.app.layout.clockStyleNames.gradient',
      minimal: 'settings.app.layout.clockStyleNames.minimal',
    };
    return OVERVIEW_CLOCK_STYLE_OPTIONS.map((option) => ({
      ...option,
      label: t(labelKeyMap[option.value]),
    }));
  }, [t]);
  const opacitySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useSettingsSidebarTabState();
  const { sessionToken, hasLoginSession } = useUserSessionState();
  const [appSettingsPage, setAppSettingsPage] = useState<AppSettingsPageKey>('layout-preview');
  const [weatherSettingsPage, setWeatherSettingsPage] = useState<WeatherSettingsPageKey>('location');
  const [mailSettingsPage, setMailSettingsPage] = useState<MailSettingsPageKey>('account');
  const [musicSettingsPage, setMusicSettingsPage] = useState<MusicSettingsPageKey>('whitelist');
  const [aiSettingsPage, setAiSettingsPage] = useState<AiSettingsPageKey>('general');
  const [userInitialProfilePage, setUserInitialProfilePage] = useState<'info' | 'pro' | 'recharge' | 'orders'>('info');
  const [aboutInitialPage, setAboutInitialPage] = useState<'development' | 'feedback'>('development');
  const [pluginMarketPage, setPluginMarketPage] = useState<PluginMarketPageKey>('wallpaper');
  const [wallpaperMarketRefreshKey, setWallpaperMarketRefreshKey] = useState(0);
  const { aiConfig, setAiConfig, fetchWeatherData, setLogin, setRegister, setNotification } = useIslandStore();
  const settingsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  useEffect(() => {
    if (activeTab !== 'user') {
      setUserInitialProfilePage('info');
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'about') {
      setAboutInitialPage('development');
    }
  }, [activeTab]);

  /** 加载独立窗口控制按钮样式配置 */
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(STANDALONE_WINDOW_MAC_CONTROLS_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'boolean') {
        setStandaloneMacControls(value);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /** 加载展开导航布局配置 */
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(EXPAND_NAV_LAYOUT_STORE_KEY).then((data) => {
      if (cancelled) return;
      setExpandNavLayout(normalizeExpandNavLayoutConfig(data));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const isProUser = useMemo(() => getRoleFromToken(sessionToken) === 'pro', [sessionToken]);

  const getSettingsLabel = (key: SettingsTabLabelKey): string => {
    return t(`settings.labels.${key}`, { defaultValue: SETTINGS_TAB_LABELS[key] });
  };
  const appSettingsPageRef = useRef(appSettingsPage);
  const currentAppSettingsPageLabel = getSettingsLabel(appSettingsPage);
  appSettingsPageRef.current = appSettingsPage;
  const weatherSettingsPageRef = useRef(weatherSettingsPage);
  const currentWeatherSettingsPageLabel = t(`settings.weatherPages.${weatherSettingsPage}`, { defaultValue: WEATHER_SETTINGS_PAGE_LABELS[weatherSettingsPage] || '定位配置' });
  weatherSettingsPageRef.current = weatherSettingsPage;
  const mailSettingsPageRef = useRef(mailSettingsPage);
  const currentMailSettingsPageLabel = t(`settings.mailPages.${mailSettingsPage}`, { defaultValue: MAIL_SETTINGS_PAGE_LABELS[mailSettingsPage] || '账户' });
  mailSettingsPageRef.current = mailSettingsPage;
  const musicSettingsPageRef = useRef(musicSettingsPage);
  const currentMusicSettingsPageLabel = t(`settings.musicPages.${musicSettingsPage}`, { defaultValue: MUSIC_SETTINGS_PAGE_LABELS[musicSettingsPage] || '白名单' });
  musicSettingsPageRef.current = musicSettingsPage;
  const aiSettingsPageRef = useRef(aiSettingsPage);
  const currentAiSettingsPageLabel = t(`settings.aiPages.${aiSettingsPage}`, { defaultValue: AI_SETTINGS_PAGE_LABELS[aiSettingsPage] || '通用配置' });
  aiSettingsPageRef.current = aiSettingsPage;
  const pluginMarketPageRef = useRef(pluginMarketPage);
  pluginMarketPageRef.current = pluginMarketPage;
  const currentPluginMarketPageLabel = t(`settings.pluginMarket.pages.${pluginMarketPage}`, {
    defaultValue: pluginMarketPage === 'wallpaper'
      ? '壁纸'
      : pluginMarketPage === 'edit'
          ? '修改壁纸'
          : '贡献',
  });

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

  const translatedMailSettingsPageLabels = useMemo<Record<MailSettingsPageKey, string>>(() => ({
    account: t('settings.mailPages.account', { defaultValue: MAIL_SETTINGS_PAGE_LABELS.account }),
    imap: t('settings.mailPages.imap', { defaultValue: MAIL_SETTINGS_PAGE_LABELS.imap }),
    preferences: t('settings.mailPages.preferences', { defaultValue: MAIL_SETTINGS_PAGE_LABELS.preferences }),
  }), [t]);

  const translatedMusicSettingsPageLabels = useMemo<Record<MusicSettingsPageKey, string>>(() => ({
    whitelist: t('settings.musicPages.whitelist', { defaultValue: MUSIC_SETTINGS_PAGE_LABELS.whitelist }),
    lyrics: t('settings.musicPages.lyrics', { defaultValue: MUSIC_SETTINGS_PAGE_LABELS.lyrics }),
    smtc: t('settings.musicPages.smtc', { defaultValue: MUSIC_SETTINGS_PAGE_LABELS.smtc }),
  }), [t]);

  const [layoutConfig, setLayoutConfig] = useState<OverviewLayoutConfig>(DEFAULT_LAYOUT);
  const [expandNavLayout, setExpandNavLayout] = useState<ExpandNavLayoutConfig>(DEFAULT_EXPAND_NAV_LAYOUT);
  const [maxExpandNavLayout, setMaxExpandNavLayout] = useState<MaxExpandNavLayoutConfig>(DEFAULT_MAXEXPAND_NAV_LAYOUT);

  /** 歌曲设置相关状态 */
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [whitelistDraft, setWhitelistDraft] = useState<string>('');
  const [whitelistInputError, setWhitelistInputError] = useState<string>('');
  const [lyricsSource, setLyricsSource] = useState<string>('auto');
  const [lyricsEnabled, setLyricsEnabled] = useState<boolean>(true);
  const [lyricsTranslationEnabled, setLyricsTranslationEnabled] = useState<boolean>(true);
  const [lyricsKaraoke, setLyricsKaraoke] = useState<boolean>(false);
  const [lyricsClock, setLyricsClock] = useState<boolean>(true);
  const [lyricsCalibrateEnabled, setLyricsCalibrateEnabled] = useState<boolean>(true);
  const [lyricsCalibrateDelay, setLyricsCalibrateDelay] = useState<number>(20);
  const [expandLeaveIdle, setExpandLeaveIdle] = useState<boolean>(false);
  const [maxExpandLeaveIdle, setMaxExpandLeaveIdle] = useState<boolean>(false);
  const [clipboardUrlMonitorEnabled, setClipboardUrlMonitorEnabled] = useState<boolean>(true);
  const [clipboardUrlDetectMode, setClipboardUrlDetectMode] = useState<'https-only' | 'http-https' | 'domain-only'>('http-https');
  const [clipboardUrlBlacklist, setClipboardUrlBlacklist] = useState<string[]>([]);
  const [clipboardUrlSuppressInFavorites, setClipboardUrlSuppressInFavorites] = useState<boolean>(true);
  const [autostartMode, setAutostartMode] = useState<'disabled' | 'enabled' | 'high-priority'>('disabled');
  const [navOrder, setNavOrder] = useState<string[]>(DEFAULT_NAV_ORDER);
  const [hiddenNavOrder, setHiddenNavOrder] = useState<string[]>([]);
  const [navEditMode, setNavEditMode] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdxRef = useRef<number | null>(null);
  const [detectingSourceAppId, setDetectingSourceAppId] = useState(false);
  const [detectedSources, setDetectedSources] = useState<Array<{ sourceAppId: string; isPlaying: boolean; hasTitle: boolean; thumbnail: string | null }>>([]);
  const [musicSmtcUnsubscribeInput, setMusicSmtcUnsubscribeInput] = useState<string>('5000');
  const [musicSmtcNeverUnsubscribe, setMusicSmtcNeverUnsubscribe] = useState(true);
  const [musicSmtcConfigMessage, setMusicSmtcConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /** 网络配置相关状态 */
  const [networkTimeoutMs, setNetworkTimeoutMs] = useState<number>(DEFAULT_NETWORK_TIMEOUT_MS);
  const [customTimeoutInput, setCustomTimeoutInput] = useState<string>('');
  const [staticAssetNode, setStaticAssetNode] = useState<StaticAssetNode>(DEFAULT_STATIC_ASSET_NODE_FREE);
  const [mailAccounts, setMailAccounts] = useState<MailAccountConfig[]>([]);
  const [activeMailAccountId, setActiveMailAccountId] = useState<string>('');
  const [mailConfigLoaded, setMailConfigLoaded] = useState(false);
  const [mailFetchLimit, setMailFetchLimit] = useState<number>(10);
  const staticAssetNodeOptions = useMemo<Array<{ label: string; value: StaticAssetNode; proOnly?: boolean }>>(() => ([
    { label: 'Cloudflare R2', value: 'r2' },
    { label: 'Tencent COS', value: 'cos', proOnly: true },
    { label: 'Aliyun OSS', value: 'oss', proOnly: true },
  ]), []);
  const [weatherPrimaryProvider, setWeatherPrimaryProvider] = useState<WeatherProvider>(DEFAULT_WEATHER_PRIMARY_PROVIDER);
  const [weatherLocationPriority, setWeatherLocationPriority] = useState<WeatherLocationPriority>(DEFAULT_WEATHER_LOCATION_PRIORITY);
  const [weatherCustomCityInput, setWeatherCustomCityInput] = useState<string>('');
  const [weatherAlertEnabled, setWeatherAlertEnabled] = useState<boolean>(true);
  const [weatherLocationConfigMessage, setWeatherLocationConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [weatherCustomLocationTesting, setWeatherCustomLocationTesting] = useState(false);
  const [weatherCustomLocationTestMessage, setWeatherCustomLocationTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [runningProcesses, setRunningProcesses] = useState<RunningWindowItem[]>([]);
  const [hideProcessList, setHideProcessList] = useState<string[]>([]);
  const [hideProcessFilter, setHideProcessFilter] = useState<string>('');
  const [hideProcessLoading, setHideProcessLoading] = useState(false);
  const [autoHideFullscreenWindows, setAutoHideFullscreenWindowsState] = useState<boolean>(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getThemeMode);
  const [standaloneMacControls, setStandaloneMacControls] = useState<boolean>(false);
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(getLanguage);
  const [islandOpacity, setIslandOpacity] = useState<number>(100);
  const [autoDimEnabled, setAutoDimEnabled] = useState<boolean>(false);
  const [autoDimDelaySec, setAutoDimDelaySec] = useState<number>(DEFAULT_AUTO_DIM_DELAY_SEC);
  const {
    bgMedia,
    setBgMedia,
    bgMediaPreviewUrl,
    setBgMediaPreviewUrl,
    bgVideoFit,
    setBgVideoFit,
    bgVideoMuted,
    setBgVideoMuted,
    bgVideoLoop,
    setBgVideoLoop,
    bgVideoVolume,
    setBgVideoVolume,
    bgVideoRate,
    setBgVideoRate,
    bgVideoHwDecode,
    setBgVideoHwDecode,
    syncDesktopWallpaperOnBackgroundChange,
    setSyncDesktopWallpaperOnBackgroundChange,
    bgImageOpacity,
    setBgImageOpacity,
    bgImageBlur,
    setBgImageBlur,
    bgOpacitySaveTimerRef,
    bgBlurSaveTimerRef,
    applyBgOpacity,
    applyBgBlur,
    applyBgVideoFit,
    applyBgVideoMuted,
    applyBgVideoLoop,
    applyBgVideoVolume,
    applyBgVideoRate,
    applyBgVideoHwDecode,
    persistBgVideoFit,
    persistBgVideoMuted,
    persistBgVideoLoop,
    persistBgVideoVolume,
    persistBgVideoRate,
    persistBgVideoHwDecode,
    persistBgOpacity,
    persistBgBlur,
    handleSelectBgImage,
    handleSelectBgVideo,
    handleClearBgImage,
    handleSelectBuiltinBgImage,
    handleApplyMarketplaceWallpaper,
  } = useBackgroundMediaSettingsState();
  const [islandPositionOffset, setIslandPositionOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [islandPositionInput, setIslandPositionInput] = useState<{ x: string; y: string }>({ x: '0', y: '0' });
  const [islandDisplaySelection, setIslandDisplaySelection] = useState<string>('primary');
  const [islandDisplayOptions, setIslandDisplayOptions] = useState<Array<{ id: string; label: string }>>([
    { id: 'primary', label: t('settings.app.position.displayPrimaryOption', { defaultValue: '主显示器（推荐）' }) },
  ]);
  const [aboutVersion, setAboutVersion] = useState<string>('');

  const {
    updateStatus,
    updateVersion,
    updateError,
    downloadProgress,
    updateAutoPromptEnabled,
    announcementShowMode,
    updateSource,
    setUpdateSource,
    currentSourceLabel,
    handleUpdateSourceChange,
    handleUpdateAutoPromptEnabledChange,
    handleAnnouncementShowModeChange,
    handleCheckUpdate,
    handleDownloadUpdate,
    handleInstallUpdate,
    handleResetGuide,
    guideResetStatus,
  } = useUpdateSettingsState({
    t,
    isProUser,
    sessionToken,
  });

  const persistIslandOpacity = (opacity: number): void => {
    window.api.islandOpacitySet(opacity).catch(() => {});
  };

  const handleAutoDimEnabledChange = (enabled: boolean): void => {
    setAutoDimEnabled(enabled);
    window.api.storeWrite(ISLAND_AUTO_DIM_ENABLED_STORE_KEY, enabled).catch(() => {});
    window.api.settingsPreview(`store:${ISLAND_AUTO_DIM_ENABLED_STORE_KEY}`, enabled).catch(() => {});
    window.dispatchEvent(new CustomEvent('island-auto-dim-local-sync', { detail: { autoDimEnabled: enabled } }));
  };

  const handleAutoDimDelayChange = (sec: number): void => {
    const safe = Math.max(1, Math.min(120, Math.round(sec)));
    setAutoDimDelaySec(safe);
    window.api.storeWrite(ISLAND_AUTO_DIM_DELAY_STORE_KEY, safe).catch(() => {});
    window.api.settingsPreview(`store:${ISLAND_AUTO_DIM_DELAY_STORE_KEY}`, safe).catch(() => {});
    window.dispatchEvent(new CustomEvent('island-auto-dim-local-sync', { detail: { autoDimDelaySec: safe } }));
  };

  const visibleCards = useMemo(() => {
    const seen = new Set<string>();
    return navOrder.reduce<NavCardDef[]>((ordered, id) => {
      if (seen.has(id)) return ordered;
      const card = NAV_CARDS_MAP.get(id);
      if (card) {
        ordered.push(card);
        seen.add(id);
      }
      return ordered;
    }, []);
  }, [navOrder]);

  const hiddenCards = useMemo(() => {
    const visibleSet = new Set(visibleCards.map((c) => c.id));
    const seen = new Set<string>();

    const fromHidden = hiddenNavOrder.reduce<NavCardDef[]>((acc, id) => {
      if (seen.has(id) || visibleSet.has(id)) return acc;
      const card = NAV_CARDS_MAP.get(id);
      if (card) {
        acc.push(card);
        seen.add(id);
      }
      return acc;
    }, []);

    const remaining = NAV_CARDS.filter((card) => !visibleSet.has(card.id) && !seen.has(card.id));

    return [...fromHidden, ...remaining];
  }, [hiddenNavOrder, visibleCards]);

  const applyAppLanguage = (language: AppLanguage): void => {
    setAppLanguage(language);
    setLanguage(language).catch(() => {});
    window.api.settingsPreview('i18n:language', language).catch(() => {});
  };

  const persistNavConfig = (visibleOrder: string[], hiddenOrder: string[]): void => {
    window.api.navOrderSet({ visibleOrder, hiddenOrder }).catch(() => {});
  };

  const resetNavConfig = (): void => {
    const nextVisible = [...DEFAULT_NAV_ORDER];
    const nextHidden: string[] = [];
    setNavOrder(nextVisible);
    setHiddenNavOrder(nextHidden);
    persistNavConfig(nextVisible, nextHidden);
  };

  /** 快捷键相关状态 */
  const [hideHotkey, setHideHotkey] = useState<string>('Alt+X');
  const [hotkeyRecording, setHotkeyRecording] = useState(false);
  const [hotkeyError, setHotkeyError] = useState<string>('');
  const hotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 关闭快捷键相关状态 */
  const [quitHotkey, setQuitHotkey] = useState<string>('Alt+C');
  const [quitHotkeyRecording, setQuitHotkeyRecording] = useState(false);
  const [quitHotkeyError, setQuitHotkeyError] = useState<string>('');
  const quitHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 截图快捷键相关状态 */
  const [screenshotHotkey, setScreenshotHotkey] = useState<string>('Alt+A');
  const [screenshotHotkeyRecording, setScreenshotHotkeyRecording] = useState(false);
  const [screenshotHotkeyError, setScreenshotHotkeyError] = useState<string>('');
  const screenshotHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 切歌快捷键相关状态 */
  const [nextSongHotkey, setNextSongHotkey] = useState<string>('');
  const [nextSongHotkeyRecording, setNextSongHotkeyRecording] = useState(false);
  const [nextSongHotkeyError, setNextSongHotkeyError] = useState<string>('');
  const nextSongHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 暂停/播放快捷键相关状态 */
  const [playPauseSongHotkey, setPlayPauseSongHotkey] = useState<string>('');
  const [playPauseSongHotkeyRecording, setPlayPauseSongHotkeyRecording] = useState(false);
  const [playPauseSongHotkeyError, setPlayPauseSongHotkeyError] = useState<string>('');
  const playPauseSongHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 还原默认位置快捷键相关状态 */
  const [resetPositionHotkey, setResetPositionHotkey] = useState<string>('');
  const [resetPositionHotkeyRecording, setResetPositionHotkeyRecording] = useState(false);
  const [resetPositionHotkeyError, setResetPositionHotkeyError] = useState<string>('');
  const resetPositionHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 切换托盘图标快捷键相关状态 */
  const [toggleTrayHotkey, setToggleTrayHotkey] = useState<string>('');
  const [toggleTrayHotkeyRecording, setToggleTrayHotkeyRecording] = useState(false);
  const [toggleTrayHotkeyError, setToggleTrayHotkeyError] = useState<string>('');
  const toggleTrayHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 显示配置窗口快捷键相关状态 */
  const [showSettingsWindowHotkey, setShowSettingsWindowHotkey] = useState<string>('');
  const [showSettingsWindowHotkeyRecording, setShowSettingsWindowHotkeyRecording] = useState(false);
  const [showSettingsWindowHotkeyError, setShowSettingsWindowHotkeyError] = useState<string>('');
  const showSettingsWindowHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 打开剪贴板历史快捷键相关状态 */
  const [openClipboardHistoryHotkey, setOpenClipboardHistoryHotkey] = useState<string>('');
  const [openClipboardHistoryHotkeyRecording, setOpenClipboardHistoryHotkeyRecording] = useState(false);
  const [openClipboardHistoryHotkeyError, setOpenClipboardHistoryHotkeyError] = useState<string>('');
  const openClipboardHistoryHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 切换鼠标穿透快捷键相关状态 */
  const [togglePassthroughHotkey, setTogglePassthroughHotkey] = useState<string>('');
  const [togglePassthroughHotkeyRecording, setTogglePassthroughHotkeyRecording] = useState(false);
  const [togglePassthroughHotkeyError, setTogglePassthroughHotkeyError] = useState<string>('');
  const togglePassthroughHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 切换 UI 状态锁定快捷键相关状态 */
  const [toggleUiLockHotkey, setToggleUiLockHotkey] = useState<string>('');
  const [toggleUiLockHotkeyRecording, setToggleUiLockHotkeyRecording] = useState(false);
  const [toggleUiLockHotkeyError, setToggleUiLockHotkeyError] = useState<string>('');
  const toggleUiLockHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** Agent 语音输入快捷键相关状态 */
  const [agentVoiceInputHotkey, setAgentVoiceInputHotkey] = useState<string>('');
  const [agentVoiceInputHotkeyRecording, setAgentVoiceInputHotkeyRecording] = useState(false);
  const [agentVoiceInputHotkeyError, setAgentVoiceInputHotkeyError] = useState<string>('');
  const agentVoiceInputHotkeyInputRef = useRef<HTMLInputElement>(null);

  /** 切换形态模式快捷键相关状态 */
  const [toggleShapeModeHotkey, setToggleShapeModeHotkey] = useState<string>('');
  const [toggleShapeModeHotkeyRecording, setToggleShapeModeHotkeyRecording] = useState(false);
  const [toggleShapeModeHotkeyError, setToggleShapeModeHotkeyError] = useState<string>('');
  const toggleShapeModeHotkeyInputRef = useRef<HTMLInputElement>(null);

  const hideProcessKeyword = hideProcessFilter.trim().toLowerCase();


  /** 加载网络配置 */
  useEffect(() => {
    const cfg = loadNetworkConfig();
    setNetworkTimeoutMs(cfg.timeoutMs);
    setCustomTimeoutInput(String(cfg.timeoutMs / 1000));
    setStaticAssetNode(normalizeStaticAssetNode(cfg.staticAssetNode, isProUser));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const accountsRaw = await window.api.storeRead(MAIL_ACCOUNTS_STORE_KEY);
        if (cancelled) return;
        if (Array.isArray(accountsRaw) && accountsRaw.length > 0) {
          const loaded = (accountsRaw as Partial<MailAccountConfig>[]).map((raw) => ({
            id: typeof raw.id === 'string' && raw.id ? raw.id : generateMailAccountId(),
            label: typeof raw.label === 'string' ? raw.label : '',
            emailAddress: typeof raw.emailAddress === 'string' ? raw.emailAddress : '',
            imapHost: typeof raw.imapHost === 'string' ? raw.imapHost : '',
            imapPort: typeof raw.imapPort === 'string' ? raw.imapPort : '993',
            imapSecure: typeof raw.imapSecure === 'boolean' ? raw.imapSecure : true,
            authUser: typeof raw.authUser === 'string' ? raw.authUser : '',
            authSecret: typeof raw.authSecret === 'string' ? raw.authSecret : '',
          }));
          setMailAccounts(loaded);
          setActiveMailAccountId(loaded[0].id);
          setMailConfigLoaded(true);
          return;
        }
        const legacyRaw = await window.api.storeRead(MAIL_CONFIG_STORE_KEY);
        if (cancelled) return;
        if (legacyRaw && typeof legacyRaw === 'object' && !Array.isArray(legacyRaw)) {
          const legacy = legacyRaw as Record<string, unknown>;
          if (typeof legacy.imapHost === 'string' && legacy.imapHost.trim()) {
            const migrated: MailAccountConfig = {
              id: generateMailAccountId(),
              label: typeof legacy.emailAddress === 'string' ? legacy.emailAddress : '',
              emailAddress: typeof legacy.emailAddress === 'string' ? legacy.emailAddress : '',
              imapHost: typeof legacy.imapHost === 'string' ? legacy.imapHost : '',
              imapPort: typeof legacy.imapPort === 'string' ? legacy.imapPort : '993',
              imapSecure: typeof legacy.imapSecure === 'boolean' ? legacy.imapSecure : true,
              authUser: typeof legacy.authUser === 'string' ? legacy.authUser : '',
              authSecret: typeof legacy.authSecret === 'string' ? legacy.authSecret : '',
            };
            setMailAccounts([migrated]);
            setActiveMailAccountId(migrated.id);
            setMailConfigLoaded(true);
            return;
          }
        }
      } catch { /* ignore */ }
      if (!cancelled) setMailConfigLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!mailConfigLoaded) return;
    window.api.storeWrite(MAIL_ACCOUNTS_STORE_KEY, mailAccounts).catch(() => {});
  }, [mailConfigLoaded, mailAccounts]);

  useEffect(() => {
    window.api.storeRead(MAIL_FETCH_LIMIT_STORE_KEY).then((value) => {
      if (typeof value === 'number' && value >= 1 && value <= 30) setMailFetchLimit(value);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!mailConfigLoaded) return;
    window.api.storeWrite(MAIL_FETCH_LIMIT_STORE_KEY, mailFetchLimit).catch(() => {});
  }, [mailConfigLoaded, mailFetchLimit]);

  useEffect(() => {
    const normalized = normalizeStaticAssetNode(staticAssetNode, isProUser);
    if (normalized === staticAssetNode) {
      return;
    }
    setStaticAssetNode(normalized);
    saveNetworkConfig({ timeoutMs: networkTimeoutMs, staticAssetNode: normalized });
  }, [isProUser, staticAssetNode, networkTimeoutMs]);

  useEffect(() => {
    const cfg = loadWeatherProviderConfig();
    setWeatherPrimaryProvider(cfg.primaryProvider);
  }, []);

  useEffect(() => {
    if (isProUser) return;
    if (weatherPrimaryProvider !== 'qweather-pro') return;
    setWeatherPrimaryProvider('open-meteo');
    saveWeatherProviderConfig({ primaryProvider: 'open-meteo' });
  }, [isProUser, weatherPrimaryProvider]);

  useEffect(() => {
    const cfg = loadWeatherLocationConfig();
    setWeatherLocationPriority(cfg.priority);
    setWeatherCustomCityInput(cfg.customLocation?.city || '');
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(WEATHER_ALERT_ENABLED_STORE_KEY).then((value) => {
      if (cancelled) return;
      setWeatherAlertEnabled(typeof value === 'boolean' ? value : true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.getIslandPositionOffset().then((offset) => {
      if (cancelled || !offset) return;
      const x = typeof offset.x === 'number' && Number.isFinite(offset.x) ? Math.round(offset.x) : 0;
      const y = typeof offset.y === 'number' && Number.isFinite(offset.y) ? Math.round(offset.y) : 0;
      setIslandPositionOffset({ x, y });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      window.api.getIslandDisplays().catch(() => [] as Array<{ id: string; width: number; height: number; isPrimary: boolean }>),
      window.api.getIslandDisplaySelection().catch(() => 'primary'),
    ]).then(([displays, savedSelection]) => {
      if (cancelled) return;
      const primaryOption = {
        id: 'primary',
        label: t('settings.app.position.displayPrimaryOption', { defaultValue: '主显示器（推荐）' }),
      };
      const dynamicOptions = displays.map((display, index) => {
        const base = t('settings.app.position.displayOption', {
          defaultValue: '显示器 {{index}}（{{width}}×{{height}}）',
          index: index + 1,
          width: display.width,
          height: display.height,
        });
        const suffix = display.isPrimary
          ? t('settings.app.position.displayPrimarySuffix', { defaultValue: ' · 主显示器' })
          : '';
        return {
          id: display.id,
          label: `${base}${suffix}`,
        };
      });
      const nextOptions = [primaryOption, ...dynamicOptions];
      setIslandDisplayOptions(nextOptions);

      const normalizedSaved = (() => {
        if (savedSelection === 'primary') return 'primary';
        if (typeof savedSelection === 'number' && Number.isFinite(savedSelection)) return String(Math.trunc(savedSelection));
        if (typeof savedSelection === 'string' && /^-?\d+$/.test(savedSelection.trim())) return savedSelection.trim();
        return 'primary';
      })();
      const optionIds = new Set(nextOptions.map((item) => item.id));
      setIslandDisplaySelection(optionIds.has(normalizedSaved) ? normalizedSaved : 'primary');
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    window.api.islandOpacityGet().then((val) => {
      if (cancelled) return;
      const safe = typeof val === 'number' ? Math.max(10, Math.min(100, Math.round(val))) : 100;
      setIslandOpacity(safe);
      applyIslandOpacity(safe);
    }).catch(() => {});
    window.api.storeRead(ISLAND_AUTO_DIM_ENABLED_STORE_KEY).then((val) => {
      if (cancelled) return;
      if (typeof val === 'boolean') setAutoDimEnabled(val);
    }).catch(() => {});
    window.api.storeRead(ISLAND_AUTO_DIM_DELAY_STORE_KEY).then((val) => {
      if (cancelled) return;
      if (typeof val === 'number' && Number.isFinite(val)) setAutoDimDelaySec(Math.max(1, Math.min(120, Math.round(val))));
    }).catch(() => {});
    Promise.all([
      window.api.storeRead(ISLAND_BG_MEDIA_STORE_KEY),
      window.api.storeRead(ISLAND_BG_IMAGE_STORE_KEY) as Promise<string | null>,
      window.api.storeRead(ISLAND_BG_VIDEO_FIT_STORE_KEY) as Promise<'cover' | 'contain' | null>,
      window.api.storeRead(ISLAND_BG_VIDEO_MUTED_STORE_KEY) as Promise<boolean | null>,
      window.api.storeRead(ISLAND_BG_VIDEO_LOOP_STORE_KEY) as Promise<boolean | null>,
      window.api.storeRead('island-bg-opacity') as Promise<number | null>,
      window.api.storeRead('island-bg-blur') as Promise<number | null>,
      window.api.storeRead(ISLAND_BG_VIDEO_VOLUME_STORE_KEY) as Promise<number | null>,
      window.api.storeRead(ISLAND_BG_VIDEO_RATE_STORE_KEY) as Promise<number | null>,
      window.api.storeRead(ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY) as Promise<boolean | null>,
      window.api.storeRead(ISLAND_BG_SYNC_SYSTEM_WALLPAPER_STORE_KEY) as Promise<boolean | null>,
    ]).then(async ([mediaRaw, legacyImage, videoFit, videoMuted, videoLoop, opacity, blur, videoVolume, videoRate, videoHwDecode, syncDesktopWallpaper]) => {
      if (cancelled) return;
      if (videoFit === 'cover' || videoFit === 'contain') {
        setBgVideoFit(videoFit);
      }
      if (typeof videoMuted === 'boolean') {
        setBgVideoMuted(videoMuted);
      }
      if (typeof videoLoop === 'boolean') {
        setBgVideoLoop(videoLoop);
      }
      if (typeof videoVolume === 'number' && Number.isFinite(videoVolume)) {
        setBgVideoVolume(Math.max(0, Math.min(1, videoVolume)));
      }
      if (typeof videoRate === 'number' && Number.isFinite(videoRate)) {
        setBgVideoRate(Math.max(0.25, Math.min(3, videoRate)));
      }
      if (typeof videoHwDecode === 'boolean') {
        setBgVideoHwDecode(videoHwDecode);
      }
      if (typeof syncDesktopWallpaper === 'boolean') {
        setSyncDesktopWallpaperOnBackgroundChange(syncDesktopWallpaper);
      }
      if (typeof opacity === 'number' && Number.isFinite(opacity)) setBgImageOpacity(Math.max(0, Math.min(100, Math.round(opacity))));
      if (typeof blur === 'number' && Number.isFinite(blur)) setBgImageBlur(Math.max(0, Math.min(20, Math.round(blur))));
      const mediaFromStore = normalizeBgMediaConfig(mediaRaw);
      const media = mediaRaw === undefined
        ? (mediaFromStore ?? (typeof legacyImage === 'string' ? normalizeBgMediaConfig(legacyImage) : null))
        : mediaFromStore;
      if (!media) {
        setBgMedia(null);
        setBgMediaPreviewUrl(null);
        return;
      }
      const previewUrl = await resolveBgMediaPreviewUrl(media);
      if (cancelled) return;
      if (!previewUrl) {
        setBgMedia(null);
        setBgMediaPreviewUrl(null);
        return;
      }
      setBgMedia(media);
      setBgMediaPreviewUrl(previewUrl);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => {
      if (opacitySaveTimerRef.current) {
        clearTimeout(opacitySaveTimerRef.current);
        opacitySaveTimerRef.current = null;
      }
      if (bgOpacitySaveTimerRef.current) {
        clearTimeout(bgOpacitySaveTimerRef.current);
        bgOpacitySaveTimerRef.current = null;
      }
      if (bgBlurSaveTimerRef.current) {
        clearTimeout(bgBlurSaveTimerRef.current);
        bgBlurSaveTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = window.api.onIslandPositionOffsetChanged((offset) => {
      if (!offset) return;
      const x = typeof offset.x === 'number' && Number.isFinite(offset.x) ? Math.round(offset.x) : 0;
      const y = typeof offset.y === 'number' && Number.isFinite(offset.y) ? Math.round(offset.y) : 0;
      setIslandPositionOffset({ x, y });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const applyOpenTabIntent = (value: unknown): void => {
      if (value === 'update') {
        setActiveTab('update');
      }
      if (value === 'mail') {
        setActiveTab('mail');
      }
      if (value === 'about-feedback') {
        setActiveTab('about');
        setAboutInitialPage('feedback');
      }
      if (value === 'user-orders') {
        setActiveTab('user');
        setUserInitialProfilePage('orders');
      }
      if (value === 'user-info') {
        setActiveTab('user');
        setUserInitialProfilePage('info');
      }
      if (value === 'ai') {
        setActiveTab('ai');
      }
      if (value === 'performance-monitor') {
        setActiveTab('app');
        setAppSettingsPage('performance-monitor');
      }
      if (value === 'expand-layout') {
        setActiveTab('app');
        setAppSettingsPage('expand-layout');
      }
      if (value) {
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => {});
      }
    };
    const handleLocalIntent = (e: Event): void => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string' && detail) applyOpenTabIntent(detail);
    };
    window.addEventListener('settings-open-tab-intent', handleLocalIntent);
    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (channel === `store:${SETTINGS_OPEN_TAB_STORE_KEY}`) {
        applyOpenTabIntent(value);
      }
      if (channel === 'i18n:language' && (value === 'zh-CN' || value === 'en-US')) {
        setAppLanguage(value);
      }
      if (channel === `store:${STANDALONE_WINDOW_MAC_CONTROLS_STORE_KEY}`) {
        if (typeof value === 'boolean') {
          setStandaloneMacControls(value);
        }
      }
      if (channel === 'store:island-bg-opacity') {
        const safe = typeof value === 'number' && Number.isFinite(value)
          ? Math.max(0, Math.min(100, Math.round(value)))
          : 30;
        setBgImageOpacity(safe);
      }
      if (channel === 'store:island-bg-blur') {
        const safe = typeof value === 'number' && Number.isFinite(value)
          ? Math.max(0, Math.min(20, Math.round(value)))
          : 0;
        setBgImageBlur(safe);
      }
      if (channel === 'store:island-bg-media') {
        const media = normalizeBgMediaConfig(value);
        if (!media) {
          setBgMedia(null);
          setBgMediaPreviewUrl(null);
          return;
        }
        resolveBgMediaPreviewUrl(media).then((previewUrl) => {
          if (cancelled) return;
          if (!previewUrl) {
            setBgMedia(null);
            setBgMediaPreviewUrl(null);
            return;
          }
          setBgMedia(media);
          setBgMediaPreviewUrl(previewUrl);
        }).catch(() => {});
      }
      if (channel === `store:${ISLAND_BG_VIDEO_FIT_STORE_KEY}`) {
        if (value === 'cover' || value === 'contain') {
          setBgVideoFit(value);
        }
      }
      if (channel === `store:${ISLAND_BG_VIDEO_MUTED_STORE_KEY}`) {
        if (typeof value === 'boolean') {
          setBgVideoMuted(value);
        }
      }
      if (channel === `store:${ISLAND_BG_VIDEO_LOOP_STORE_KEY}`) {
        if (typeof value === 'boolean') {
          setBgVideoLoop(value);
        }
      }
      if (channel === `store:${ISLAND_BG_VIDEO_VOLUME_STORE_KEY}`) {
        if (typeof value === 'number' && Number.isFinite(value)) {
          setBgVideoVolume(Math.max(0, Math.min(1, value)));
        }
      }
      if (channel === `store:${ISLAND_BG_VIDEO_RATE_STORE_KEY}`) {
        if (typeof value === 'number' && Number.isFinite(value)) {
          setBgVideoRate(Math.max(0.25, Math.min(3, value)));
        }
      }
      if (channel === `store:${ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY}`) {
        if (typeof value === 'boolean') {
          setBgVideoHwDecode(value);
        }
      }
      if (channel === `store:${ISLAND_BG_SYNC_SYSTEM_WALLPAPER_STORE_KEY}`) {
        if (typeof value === 'boolean') {
          setSyncDesktopWallpaperOnBackgroundChange(value);
        }
      }
      if (channel === `store:${ISLAND_AUTO_DIM_ENABLED_STORE_KEY}`) {
        if (typeof value === 'boolean') setAutoDimEnabled(value);
      }
      if (channel === `store:${ISLAND_AUTO_DIM_DELAY_STORE_KEY}`) {
        if (typeof value === 'number' && Number.isFinite(value)) setAutoDimDelaySec(Math.max(1, Math.min(120, Math.round(value))));
      }
      if (channel === `store:${AUTO_HIDE_FULLSCREEN_WINDOWS_STORE_KEY}`) {
        setAutoHideFullscreenWindowsState(value === true);
      }
      if (channel === 'store:music-whitelist' && Array.isArray(value)) {
        setWhitelist(value);
      }
      if (channel === 'music:lyrics-karaoke' && typeof value === 'boolean') {
        setLyricsKaraoke(value);
      }
      if (channel === 'store:update-source' && typeof value === 'string' && value) {
        const nextSource: UpdateSourceKey = UPDATE_SOURCES.some(s => s.key === value) ? value as UpdateSourceKey : 'cloudflare-r2';
        setUpdateSource(nextSource);
      }
    });
    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener('settings-open-tab-intent', handleLocalIntent);
    };
  }, []);

  useEffect(() => {
    setIslandPositionInput({
      x: String(islandPositionOffset.x),
      y: String(islandPositionOffset.y),
    });
  }, [islandPositionOffset.x, islandPositionOffset.y]);

  /** 加载歌曲设置 */
  useEffect(() => {
    let cancelled = false;
    window.api.musicWhitelistGet().then((list) => {
      if (cancelled) return;
      setWhitelist(list);
    }).catch(() => {});
    window.api.musicLyricsSourceGet().then((src) => {
      if (cancelled) return;
      setLyricsSource(src);
    }).catch(() => {});
    window.api.musicLyricsEnabledGet().then((enabled) => {
      if (cancelled) return;
      setLyricsEnabled(enabled);
    }).catch(() => {});
    window.api.musicLyricsTranslationEnabledGet().then((enabled) => {
      if (cancelled) return;
      setLyricsTranslationEnabled(enabled);
    }).catch(() => {});
    window.api.musicLyricsKaraokeGet().then((enabled) => {
      if (cancelled) return;
      setLyricsKaraoke(enabled);
    }).catch(() => {});
    window.api.musicLyricsClockGet().then((enabled) => {
      if (cancelled) return;
      setLyricsClock(enabled);
    }).catch(() => {});
    window.api.musicLyricsCalibrateEnabledGet().then((enabled) => {
      if (cancelled) return;
      setLyricsCalibrateEnabled(enabled);
    }).catch(() => {});
    window.api.musicLyricsCalibrateDelayGet().then((delay) => {
      if (cancelled) return;
      setLyricsCalibrateDelay(delay);
    }).catch(() => {});
    window.api.expandMouseleaveIdleGet().then((v) => {
      if (cancelled) return;
      setExpandLeaveIdle(v);
    }).catch(() => {});
    window.api.maxexpandMouseleaveIdleGet().then((v) => {
      if (cancelled) return;
      setMaxExpandLeaveIdle(v);
    }).catch(() => {});
    window.api.springAnimationGet().then((v) => {
      if (cancelled) return;
      useIslandStore.getState().setSpringAnimation(v);
    }).catch(() => {});
    window.api.animationSpeedGet().then((v) => {
      if (cancelled) return;
      const valid = v === 'slow' || v === 'medium' || v === 'fast' ? v : 'medium';
      useIslandStore.getState().setAnimationSpeed(valid);
    }).catch(() => {});
    window.api.clipboardUrlMonitorGet().then((v) => {
      if (cancelled) return;
      setClipboardUrlMonitorEnabled(v);
    }).catch(() => {});
    window.api.clipboardUrlDetectModeGet().then((mode) => {
      if (cancelled) return;
      setClipboardUrlDetectMode(mode);
    }).catch(() => {});
    window.api.clipboardUrlBlacklistGet().then((list) => {
      if (cancelled) return;
      setClipboardUrlBlacklist(Array.isArray(list) ? list : []);
    }).catch(() => {});
    window.api.storeRead(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'boolean') {
        setClipboardUrlSuppressInFavorites(value);
        try {
          localStorage.setItem(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY, value ? '1' : '0');
        } catch { /* noop */ }
        return;
      }
      setClipboardUrlSuppressInFavorites(true);
      try {
        localStorage.setItem(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY, '1');
      } catch { /* noop */ }
    }).catch(() => {
      if (cancelled) return;
      setClipboardUrlSuppressInFavorites(true);
      try {
        localStorage.setItem(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY, '1');
      } catch { /* noop */ }
    });
    window.api.autostartGet().then((mode) => {
      if (cancelled) return;
      setAutostartMode(mode as 'disabled' | 'enabled' | 'high-priority');
    }).catch(() => {});
    window.api.navOrderGet().then((navConfig) => {
      if (cancelled) return;
      const visibleRaw = Array.isArray(navConfig.visibleOrder) ? navConfig.visibleOrder : [];
      const hiddenRaw = Array.isArray(navConfig.hiddenOrder) ? navConfig.hiddenOrder : [];
      if (visibleRaw.length > 0 || hiddenRaw.length > 0) {
        const validVisible = visibleRaw.filter((id, idx) => NAV_CARDS_MAP.has(id) && visibleRaw.indexOf(id) === idx);
        const ensuredVisible = ['user-pro', ...validVisible.filter((id) => id !== 'user-pro')];
        const validHidden = hiddenRaw
          .filter((id, idx) => NAV_CARDS_MAP.has(id) && hiddenRaw.indexOf(id) === idx && !ensuredVisible.includes(id))
          .filter((id) => id !== 'user-pro');
        setNavOrder(ensuredVisible);
        setHiddenNavOrder(validHidden);
      }
    }).catch(() => {});
    window.api.musicSmtcUnsubscribeMsGet().then((valueMs) => {
      if (cancelled) return;
      const safeValue = typeof valueMs === 'number' && Number.isFinite(valueMs) ? Math.round(valueMs) : 0;
      if (safeValue <= 0) {
        setMusicSmtcNeverUnsubscribe(true);
        setMusicSmtcUnsubscribeInput('5000');
      } else {
        setMusicSmtcNeverUnsubscribe(false);
        setMusicSmtcUnsubscribeInput(String(safeValue));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /** 加载总览布局配置 */
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(LAYOUT_STORE_KEY).then((data) => {
      if (cancelled) return;
      setLayoutConfig(normalizeOverviewLayoutConfig(data));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /** 加载全展开导航布局配置 */
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(MAXEXPAND_NAV_LAYOUT_STORE_KEY).then((data) => {
      if (cancelled) return;
      setMaxExpandNavLayout(normalizeMaxExpandNavLayoutConfig(data));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /** 加载快捷键配置 */
  useEffect(() => {
    let cancelled = false;
    window.api.hotkeyGet().then((key) => {
      if (cancelled) return;
      setHideHotkey(key || '');
    }).catch(() => {});
    window.api.quitHotkeyGet().then((key) => {
      if (cancelled) return;
      setQuitHotkey(key || '');
    }).catch(() => {});
    window.api.screenshotHotkeyGet().then((key) => {
      if (cancelled) return;
      setScreenshotHotkey(key || '');
    }).catch(() => {});
    window.api.nextSongHotkeyGet().then((key) => {
      if (cancelled) return;
      setNextSongHotkey(key || '');
    }).catch(() => {});
    window.api.playPauseSongHotkeyGet().then((key) => {
      if (cancelled) return;
      setPlayPauseSongHotkey(key || '');
    }).catch(() => {});
    window.api.resetPositionHotkeyGet().then((key) => {
      if (cancelled) return;
      setResetPositionHotkey(key || '');
    }).catch(() => {});
    window.api.toggleTrayHotkeyGet().then((key) => {
      if (cancelled) return;
      setToggleTrayHotkey(key || '');
    }).catch(() => {});
    window.api.showSettingsWindowHotkeyGet().then((key) => {
      if (cancelled) return;
      setShowSettingsWindowHotkey(key || '');
    }).catch(() => {});
    window.api.openClipboardHistoryHotkeyGet().then((key) => {
      if (cancelled) return;
      setOpenClipboardHistoryHotkey(key || '');
    }).catch(() => {});
    window.api.togglePassthroughHotkeyGet().then((key) => {
      if (cancelled) return;
      setTogglePassthroughHotkey(key || '');
    }).catch(() => {});
    window.api.toggleUiLockHotkeyGet().then((key) => {
      if (cancelled) return;
      setToggleUiLockHotkey(key || '');
    }).catch(() => {});
    window.api.agentVoiceInputHotkeyGet().then((key) => {
      if (cancelled) return;
      setAgentVoiceInputHotkey(key || '');
    }).catch(() => {});
    window.api.toggleShapeModeHotkeyGet().then((key) => {
      if (cancelled) return;
      setToggleShapeModeHotkey(key || '');
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /** 组件卸载时兜底恢复快捷键响应 */
  useEffect(() => {
    return () => {
      window.api.hotkeyResume().catch(() => {});
    };
  }, []);

  /** 获取当前版本号 */
  useEffect(() => {
    window.api.updaterVersion?.().then((v) => {
      if (v) setAboutVersion(v);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(UPDATE_SOURCE_STORE_KEY).then((value) => {
      if (cancelled) return;
      setUpdateSource(UPDATE_SOURCES.some(s => s.key === value) ? value as UpdateSourceKey : 'cloudflare-r2');
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(SETTINGS_OPEN_TAB_STORE_KEY).then((value) => {
      if (cancelled) return;
      const intent = value as SettingsOpenTabIntent | null;
      if (intent === 'update') {
        setActiveTab('update');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => {});
      }
      if (intent === 'mail') {
        setActiveTab('mail');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => {});
      }
      if (intent === 'about-feedback') {
        setActiveTab('about');
        setAboutInitialPage('feedback');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => {});
      }
      if (intent === 'user-orders') {
        setActiveTab('user');
        setUserInitialProfilePage('orders');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => {});
      }
      if (intent === 'user-info') {
        setActiveTab('user');
        setUserInitialProfilePage('info');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => {});
      }
      if (intent === 'ai') {
        setActiveTab('ai');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => {});
      }
      if (intent === 'performance-monitor') {
        setActiveTab('app');
        setAppSettingsPage('performance-monitor');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => {});
      }
      if (intent === 'expand-layout') {
        setActiveTab('app');
        setAppSettingsPage('expand-layout');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => {});
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const updateLayout = (side: 'left' | 'right', value: OverviewWidgetType): void => {
    const updated = { ...layoutConfig, [side]: value };
    setLayoutConfig(updated);
    window.api.storeWrite(LAYOUT_STORE_KEY, updated).catch(() => {});
  };

  const updateClockStyle = (value: OverviewClockStyle): void => {
    const updated = { ...layoutConfig, clockStyle: value };
    setLayoutConfig(updated);
    window.api.storeWrite(LAYOUT_STORE_KEY, updated).catch(() => {});
  };

  const updateGradientColor = (value: string): void => {
    const match = /^#([0-9a-fA-F]{6})$/.exec(value);
    if (!match) {
      return;
    }
    const hex = match[1];
    const ri = parseInt(hex.slice(0, 2), 16) / 255;
    const gi = parseInt(hex.slice(2, 4), 16) / 255;
    const bi = parseInt(hex.slice(4, 6), 16) / 255;
    const max = Math.max(ri, gi, bi), min = Math.min(ri, gi, bi);
    let h = 0;
    const l = (max + min) / 2;
    const s = max === min ? 0 : (l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min));
    if (max !== min) {
      const d = max - min;
      if (max === ri) h = ((gi - bi) / d + (gi < bi ? 6 : 0)) * 60;
      else if (max === gi) h = ((bi - ri) / d + 2) * 60;
      else h = ((ri - gi) / d + 4) * 60;
    }
    const hslToHex = (hue: number, sat: number, lit: number): string => {
      const hh = ((hue % 360) + 360) % 360;
      const c = (1 - Math.abs(2 * lit - 1)) * sat;
      const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
      const m = lit - c / 2;
      let rr: number, gg: number, bb: number;
      if (hh < 60) { rr = c; gg = x; bb = 0; }
      else if (hh < 120) { rr = x; gg = c; bb = 0; }
      else if (hh < 180) { rr = 0; gg = c; bb = x; }
      else if (hh < 240) { rr = 0; gg = x; bb = c; }
      else if (hh < 300) { rr = x; gg = 0; bb = c; }
      else { rr = c; gg = 0; bb = x; }
      const toH = (n: number): string => Math.max(0, Math.min(255, Math.round((n + m) * 255))).toString(16).padStart(2, '0');
      return `#${toH(rr)}${toH(gg)}${toH(bb)}`;
    };
    const start = hslToHex(h - 25, Math.min(1, s * 1.08), Math.min(0.78, l + 0.1));
    const end = hslToHex(h + 25, Math.min(1, s * 1.05), Math.max(0.3, l - 0.06));

    const updated = {
      ...layoutConfig,
      gradientColors: {
        start,
        middle: value,
        end,
      },
    };
    setLayoutConfig(updated);
    window.api.storeWrite(LAYOUT_STORE_KEY, updated).catch(() => {});
  };

  const updateExpandNavLayout = (layout: ExpandNavLayoutConfig): void => {
    const normalized = normalizeExpandNavLayoutConfig(layout);
    setExpandNavLayout(normalized);
    window.api.storeWrite(EXPAND_NAV_LAYOUT_STORE_KEY, normalized).catch(() => {});
    window.dispatchEvent(new CustomEvent('expand-nav-layout-changed', { detail: normalized }));
  };

  const updateMaxExpandNavLayout = (layout: MaxExpandNavLayoutConfig): void => {
    const normalized = normalizeMaxExpandNavLayoutConfig(layout);
    setMaxExpandNavLayout(normalized);
    window.api.storeWrite(MAXEXPAND_NAV_LAYOUT_STORE_KEY, normalized).catch(() => {});
    window.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: normalized }));
  };

  const applyIslandPositionOffset = (x: number, y: number): void => {
    const next = {
      x: Math.max(-2000, Math.min(2000, Math.round(x))),
      y: Math.max(-1200, Math.min(1200, Math.round(y))),
    };
    setIslandPositionOffset(next);
    window.api.setIslandPositionOffset(next).catch(() => {});
  };

  const applyIslandPositionInput = (): void => {
    const parsedX = Number(islandPositionInput.x.trim());
    const parsedY = Number(islandPositionInput.y.trim());
    if (!Number.isFinite(parsedX) || !Number.isFinite(parsedY)) {
      setIslandPositionInput({
        x: String(islandPositionOffset.x),
        y: String(islandPositionOffset.y),
      });
      return;
    }

    applyIslandPositionOffset(parsedX, parsedY);
  };

  const cancelIslandPositionInput = (): void => {
    setIslandPositionInput({
      x: String(islandPositionOffset.x),
      y: String(islandPositionOffset.y),
    });
  };

  const handleIslandDisplaySelectionChange = (selection: string): void => {
    const normalized = selection === 'primary' || /^-?\d+$/.test(selection.trim()) ? selection.trim() : 'primary';
    if (normalized === islandDisplaySelection) {
      return;
    }
    setIslandDisplaySelection(normalized);
    window.api.setIslandDisplaySelection(normalized).catch(() => {
      window.api.storeWrite(ISLAND_DISPLAY_STORE_KEY, normalized).catch(() => {});
    });

    const restartRequiredNotification = {
      title: t('settings.app.notifications.configChanged.title', { defaultValue: '配置变更' }),
      body: t('settings.app.notifications.displayChanged.body', { defaultValue: '目标显示器已变更，是否立即重启生效？' }),
      icon: SvgIcon.SETTING,
      type: 'restart-required',
    } as const;

    setNotification(restartRequiredNotification);
    window.api.settingsPreview('notification:show', restartRequiredNotification).catch(() => {});
  };

  const islandPositionInputChanged =
    islandPositionInput.x.trim() !== String(islandPositionOffset.x)
    || islandPositionInput.y.trim() !== String(islandPositionOffset.y);

  const applyWeatherLocationPriority = async (nextPriority: WeatherLocationPriority): Promise<void> => {
    setWeatherLocationPriority(nextPriority);

    const unknownError = t('settings.common.unknownError', { defaultValue: '未知错误' });
    try {
      const city = weatherCustomCityInput.trim();
      const existing = loadWeatherLocationConfig().customLocation;
      let customLocation = existing;

      if (city) {
        const resolved = await resolveDistrictLocationByKeyword(city);
        customLocation = {
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          city: resolved.city,
        };
      }

      saveWeatherLocationConfig({
        priority: nextPriority,
        customLocation: customLocation || null,
      });

      setWeatherLocationConfigMessage({
        type: nextPriority === 'custom' && !customLocation ? 'error' : 'success',
        text: nextPriority === 'custom' && !customLocation
          ? t('settings.weather.messages.customMissingFallback', {
              defaultValue: '已切换为自定义位置优先，但未配置城市，将自动回退到 IP 定位',
            })
          : t('settings.weather.messages.priorityApplied', {
              defaultValue: '定位来源优先级已立即生效',
            }),
      });
      setWeatherCustomLocationTestMessage(null);
      fetchWeatherData(undefined, true).catch(() => {});
    } catch (error) {
      setWeatherLocationConfigMessage({
        type: 'error',
        text: t('settings.weather.messages.switchPriorityFailed', {
          defaultValue: '切换优先级失败：{{error}}',
          error: error instanceof Error ? error.message : unknownError,
        }),
      });
    }
  };

  const saveWeatherLocationSettings = async (): Promise<void> => {
    const city = weatherCustomCityInput.trim();
    const unknownError = t('settings.common.unknownError', { defaultValue: '未知错误' });
    if (weatherLocationPriority === 'custom' && !city) {
      setWeatherLocationConfigMessage({
        type: 'error',
        text: t('settings.weather.messages.customNeedsCity', { defaultValue: '选择“自定义位置优先”时请先输入城市名称' }),
      });
      return;
    }

    try {
      let customLocation: { latitude: number; longitude: number; city: string } | null = null;
      if (city) {
        const resolved = await resolveDistrictLocationByKeyword(city);
        customLocation = {
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          city: resolved.city,
        };
      }

      saveWeatherLocationConfig({
        priority: weatherLocationPriority,
        customLocation,
      });
      setWeatherLocationConfigMessage({
        type: 'success',
        text: customLocation
          ? t('settings.weather.messages.configSavedWithCity', {
              defaultValue: '天气定位配置已保存（{{city}} {{lat}}, {{lng}}）',
              city: customLocation.city,
              lat: customLocation.latitude.toFixed(4),
              lng: customLocation.longitude.toFixed(4),
            })
          : t('settings.weather.messages.configSaved', { defaultValue: '天气定位配置已保存' }),
      });
      setWeatherCustomLocationTestMessage(null);
      fetchWeatherData(undefined, true).catch(() => {});
    } catch (error) {
      setWeatherLocationConfigMessage({
        type: 'error',
        text: t('settings.weather.messages.cityResolveFailed', {
          defaultValue: '城市解析失败：{{error}}',
          error: error instanceof Error ? error.message : unknownError,
        }),
      });
    }
  };

  const testWeatherCustomLocation = async (): Promise<void> => {
    const city = weatherCustomCityInput.trim();
    const unknownError = t('settings.common.unknownError', { defaultValue: '未知错误' });
    if (!city) {
      setWeatherCustomLocationTestMessage({
        type: 'error',
        text: t('settings.weather.messages.cityRequired', { defaultValue: '请先输入城市名称后再测试' }),
      });
      return;
    }

    setWeatherCustomLocationTesting(true);
    setWeatherCustomLocationTestMessage(null);

    let custom: { latitude: number; longitude: number; city: string };
    try {
      custom = await resolveDistrictLocationByKeyword(city);
    } catch (error) {
      setWeatherCustomLocationTesting(false);
      setWeatherCustomLocationTestMessage({
        type: 'error',
        text: t('settings.weather.messages.cityResolveFailed', {
          defaultValue: '城市解析失败：{{error}}',
          error: error instanceof Error ? error.message : unknownError,
        }),
      });
      return;
    }

    const openMeteoParams = new URLSearchParams({
      latitude: String(custom.latitude),
      longitude: String(custom.longitude),
      current: 'temperature_2m',
      timezone: 'auto',
    });
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?${openMeteoParams.toString()}`;

    const uapiParams = new URLSearchParams({
      forecast: 'true',
      extended: 'true',
      lang: 'zh',
    });
    if (custom.city) uapiParams.set('city', custom.city);
    const uapiUrl = `https://uapis.cn/api/v1/misc/weather?${uapiParams.toString()}`;

    const testProvider = async (name: string, url: string): Promise<string> => {
      const resp = await window.api.netFetch(url, { timeoutMs: networkTimeoutMs });
      if (!resp.ok) {
        throw new Error(`${name} HTTP ${resp.status}`);
      }
      if (resp.body.trimStart().startsWith('<')) {
        throw new Error(t('settings.weather.messages.providerNonJson', { defaultValue: '{{name}} 返回了非 JSON', name }));
      }
      JSON.parse(resp.body);
      return t('settings.weather.messages.providerAvailable', { defaultValue: '{{name}} 可用', name });
    };
    const testQWeatherPro = async (): Promise<string> => {
      const token = readLocalToken();
      const name = 'QWeather Pro';
      if (!token) {
        throw new Error(t('settings.weather.messages.proLoginRequired', { defaultValue: '请先登录 PRO 账号' }));
      }
      const qweatherParams = new URLSearchParams({
        location: `${custom.longitude},${custom.latitude}`,
        lang: 'zh',
        unit: 'm',
      });
      const result = await requestUserAccountApi(`/v1/user/weather/daily-3d?${qweatherParams.toString()}`, {
        method: 'GET',
        auth: token,
        timeoutMs: networkTimeoutMs,
      });
      if (!result.ok) {
        throw new Error(`${name} ${result.code}: ${result.message}`);
      }
      return t('settings.weather.messages.providerAvailable', { defaultValue: '{{name}} 可用', name });
    };

    try {
      const [openMeteoResult, uapiResult, qweatherResult] = await Promise.allSettled([
        testProvider('Open-Meteo', openMeteoUrl),
        testProvider('UAPI', uapiUrl),
        testQWeatherPro(),
      ]);

      const messages: string[] = [];
      let hasFailure = false;

      if (openMeteoResult.status === 'fulfilled') {
        messages.push(openMeteoResult.value);
      } else {
        hasFailure = true;
        messages.push(t('settings.weather.messages.providerUnavailable', {
          defaultValue: '{{name}} 不可用：{{error}}',
          name: 'Open-Meteo',
          error: openMeteoResult.reason instanceof Error ? openMeteoResult.reason.message : unknownError,
        }));
      }

      if (uapiResult.status === 'fulfilled') {
        messages.push(uapiResult.value);
      } else {
        hasFailure = true;
        messages.push(t('settings.weather.messages.providerUnavailable', {
          defaultValue: '{{name}} 不可用：{{error}}',
          name: 'UAPI',
          error: uapiResult.reason instanceof Error ? uapiResult.reason.message : unknownError,
        }));
      }

      if (qweatherResult.status === 'fulfilled') {
        messages.push(qweatherResult.value);
      } else {
        hasFailure = true;
        messages.push(t('settings.weather.messages.providerUnavailable', {
          defaultValue: '{{name}} 不可用：{{error}}',
          name: 'QWeather Pro',
          error: qweatherResult.reason instanceof Error ? qweatherResult.reason.message : unknownError,
        }));
      }

      const separator = t('settings.weather.messages.detailSeparator', { defaultValue: '；' });
      setWeatherCustomLocationTestMessage({
        type: hasFailure ? 'error' : 'success',
        text: t('settings.weather.messages.testResult', {
          defaultValue: '{{city}}（{{lat}}, {{lng}}） - {{details}}',
          city: custom.city,
          lat: custom.latitude.toFixed(4),
          lng: custom.longitude.toFixed(4),
          details: messages.join(separator),
        }),
      });
    } finally {
      setWeatherCustomLocationTesting(false);
    }
  };

  const applyWeatherAlertEnabled = (enabled: boolean): void => {
    setWeatherAlertEnabled(enabled);
    window.api.storeWrite(WEATHER_ALERT_ENABLED_STORE_KEY, enabled).catch(() => {});
  };

  const toggleHideProcess = (processName: string): void => {
    const key = processName.trim().toLowerCase();
    if (!key) return;

    setHideProcessList((prev) => {
      const exists = prev.some((name) => name.trim().toLowerCase() === key);
      const next = exists
        ? prev.filter((name) => name.trim().toLowerCase() !== key)
        : [...prev, processName];
      window.api.hideProcessListSet(next).catch(() => {});
      return next;
    });
  };

  const setAutoHideFullscreenWindows = (enabled: boolean): void => {
    setAutoHideFullscreenWindowsState(enabled);
    window.api.autoHideFullscreenWindowsSet(enabled).catch(() => {});
  };

  const refreshRunningProcesses = async (): Promise<void> => {
    setHideProcessLoading(true);
    try {
      const list = await window.api.getOpenWindowsWithIcons();
      setRunningProcesses(
        Array.isArray(list)
          ? list.filter((item): item is RunningWindowItem => Boolean(item && typeof item.title === 'string'))
          : []
      );
    } catch {
      setRunningProcesses([]);
    } finally {
      setHideProcessLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    window.api.hideProcessListGet().then((list) => {
      if (cancelled) return;
      if (Array.isArray(list)) setHideProcessList(list);
    }).catch(() => {});
    window.api.autoHideFullscreenWindowsGet().then((enabled) => {
      if (cancelled) return;
      setAutoHideFullscreenWindowsState(enabled === true);
    }).catch(() => {});
    window.api.getOpenWindowsWithIcons().then((list) => {
      if (cancelled) return;
      if (Array.isArray(list)) {
        setRunningProcesses(list.filter((item): item is RunningWindowItem => Boolean(item && typeof item.title === 'string')));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /** 滚轮处理设置页内部分页（禁用跨设置 Tab 滚轮切换） */
  useEffect(() => {
    const el = settingsRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      if (target.closest('.settings-field-input')) return;
      if (target.closest('.settings-field-textarea')) return;
      if (target.closest('.settings-whitelist-input')) return;
      if (target.closest('.settings-about')) return;
      if (target.closest('.settings-update')) return;
      if (target.closest('.settings-index-section')) return;
      if (target.closest('.settings-index-cards')) return;

      if (target.closest('.settings-hide-process-list')) return;
      if (target.closest('.settings-hotkey-section')) return;

      if (activeTabRef.current === 'app' && target.closest('.settings-app-pages-layout')) {
        const mainEl = target.closest('.settings-app-page-main') as HTMLElement | null;
        if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) return;
        const pages = APP_SETTINGS_PAGES;
        const currentPage = appSettingsPageRef.current;
        const currentIdx = pages.indexOf(currentPage);
        if (currentIdx >= 0) {
          const nextIdx = e.deltaY > 0
            ? Math.min(currentIdx + 1, pages.length - 1)
            : Math.max(currentIdx - 1, 0);
          if (nextIdx !== currentIdx) {
            setAppSettingsPage(pages[nextIdx]);
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      if (activeTabRef.current === 'ai' && target.closest('.settings-app-pages-layout')) {
        const mainEl = target.closest('.settings-app-page-main') as HTMLElement | null;
        if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) return;
        const pages = AI_SETTINGS_PAGES;
        const currentPage = aiSettingsPageRef.current;
        const currentIdx = pages.indexOf(currentPage);
        if (currentIdx >= 0) {
          const nextIdx = e.deltaY > 0
            ? Math.min(currentIdx + 1, pages.length - 1)
            : Math.max(currentIdx - 1, 0);
          if (nextIdx !== currentIdx) {
            setAiSettingsPage(pages[nextIdx]);
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      if (activeTabRef.current === 'music' && target.closest('.settings-music-pages-layout')) {
        const mainEl = target.closest('.settings-app-page-main') as HTMLElement | null;
        if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) return;
        const pages = MUSIC_SETTINGS_PAGES;
        const currentPage = musicSettingsPageRef.current;
        const currentIdx = pages.indexOf(currentPage);
        if (currentIdx >= 0) {
          const nextIdx = e.deltaY > 0
            ? Math.min(currentIdx + 1, pages.length - 1)
            : Math.max(currentIdx - 1, 0);
          if (nextIdx !== currentIdx) {
            setMusicSettingsPage(pages[nextIdx]);
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      if (activeTabRef.current === 'weather' && target.closest('.settings-weather-pages-layout')) {
        const mainEl = target.closest('.settings-app-page-main') as HTMLElement | null;
        if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) return;
        const pages = WEATHER_SETTINGS_PAGES;
        const currentPage = weatherSettingsPageRef.current;
        const currentIdx = pages.indexOf(currentPage);
        if (currentIdx >= 0) {
          const nextIdx = e.deltaY > 0
            ? Math.min(currentIdx + 1, pages.length - 1)
            : Math.max(currentIdx - 1, 0);
          if (nextIdx !== currentIdx) {
            setWeatherSettingsPage(pages[nextIdx]);
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      if (activeTabRef.current === 'pluginMarket' && target.closest('.settings-app-page-dots')) {
        const pages = PLUGIN_MARKET_PAGES;
        const currentPage = pluginMarketPageRef.current;
        const currentIdx = pages.indexOf(currentPage);
        if (currentIdx >= 0) {
          const nextIdx = e.deltaY > 0
            ? Math.min(currentIdx + 1, pages.length - 1)
            : Math.max(currentIdx - 1, 0);
          if (nextIdx !== currentIdx) {
            setPluginMarketPage(pages[nextIdx]);
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      return;
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  /**
   * 将键盘事件转换为 Electron accelerator 字符串
   * @param e - React 键盘事件
   * @returns Electron accelerator 格式字符串，或空字符串（仅修饰键时）
   */
  const keyEventToAccelerator = (e: KeyboardEvent): string => {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Super');

    const ignoredKeys = ['Control', 'Alt', 'Shift', 'Meta'];
    if (ignoredKeys.includes(e.key)) return '';

    const keyMap: Record<string, string> = {
      ' ': 'Space', ArrowUp: 'Up', ArrowDown: 'Down',
      ArrowLeft: 'Left', ArrowRight: 'Right',
      Escape: 'Escape', Enter: 'Return', Backspace: 'Backspace',
      Delete: 'Delete', Tab: 'Tab', Home: 'Home', End: 'End',
      PageUp: 'PageUp', PageDown: 'PageDown', Insert: 'Insert',
    };
    const mapped = keyMap[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);
    parts.push(mapped);

    return parts.length >= 2 ? parts.join('+') : '';
  };

  const isDuplicateHotkey = (acc: string, exclude: 'hide' | 'quit' | 'screenshot' | 'next-song' | 'play-pause-song' | 'reset-position' | 'toggle-tray' | 'show-settings-window' | 'open-clipboard-history' | 'toggle-passthrough' | 'toggle-ui-lock' | 'agent-voice-input' | 'toggle-shape-mode'): boolean => {
    const pairs: Array<{ key: string; value: string }> = [
      { key: 'hide', value: hideHotkey },
      { key: 'quit', value: quitHotkey },
      { key: 'screenshot', value: screenshotHotkey },
      { key: 'next-song', value: nextSongHotkey },
      { key: 'play-pause-song', value: playPauseSongHotkey },
      { key: 'reset-position', value: resetPositionHotkey },
      { key: 'toggle-tray', value: toggleTrayHotkey },
      { key: 'show-settings-window', value: showSettingsWindowHotkey },
      { key: 'open-clipboard-history', value: openClipboardHistoryHotkey },
      { key: 'toggle-passthrough', value: togglePassthroughHotkey },
      { key: 'toggle-ui-lock', value: toggleUiLockHotkey },
      { key: 'agent-voice-input', value: agentVoiceInputHotkey },
      { key: 'toggle-shape-mode', value: toggleShapeModeHotkey },
    ];
    return pairs.some((item) => item.key !== exclude && item.value && item.value === acc);
  };

  /**
   * 隐藏快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'hide')) {
      setHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setHotkeyRecording(false);
      hotkeyInputRef.current?.blur();
      return;
    }

    window.api.hotkeySet(acc).then((ok) => {
      if (ok) {
        setHideHotkey(acc);
        setHotkeyRecording(false);
        hotkeyInputRef.current?.blur();
      } else {
        setHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  /**
   * 关闭快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleQuitHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setQuitHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'quit')) {
      setQuitHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setQuitHotkeyRecording(false);
      quitHotkeyInputRef.current?.blur();
      return;
    }

    window.api.quitHotkeySet(acc).then((ok) => {
      if (ok) {
        setQuitHotkey(acc);
        setQuitHotkeyRecording(false);
        quitHotkeyInputRef.current?.blur();
      } else {
        setQuitHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setQuitHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  /**
   * 截图快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleScreenshotHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setScreenshotHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'screenshot')) {
      setScreenshotHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setScreenshotHotkeyRecording(false);
      screenshotHotkeyInputRef.current?.blur();
      return;
    }

    window.api.screenshotHotkeySet(acc).then((ok) => {
      if (ok) {
        setScreenshotHotkey(acc);
        setScreenshotHotkeyRecording(false);
        screenshotHotkeyInputRef.current?.blur();
      } else {
        setScreenshotHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setScreenshotHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  /**
   * 还原位置快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleResetPositionHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setResetPositionHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'reset-position')) {
      setResetPositionHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setResetPositionHotkeyRecording(false);
      resetPositionHotkeyInputRef.current?.blur();
      return;
    }

    window.api.resetPositionHotkeySet(acc).then((ok) => {
      if (ok) {
        setResetPositionHotkey(acc);
        setResetPositionHotkeyRecording(false);
        resetPositionHotkeyInputRef.current?.blur();
      } else {
        setResetPositionHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setResetPositionHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  /**
   * 切换托盘图标快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleToggleTrayHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setToggleTrayHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'toggle-tray')) {
      setToggleTrayHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setToggleTrayHotkeyRecording(false);
      toggleTrayHotkeyInputRef.current?.blur();
      return;
    }

    window.api.toggleTrayHotkeySet(acc).then((ok) => {
      if (ok) {
        setToggleTrayHotkey(acc);
        setToggleTrayHotkeyRecording(false);
        toggleTrayHotkeyInputRef.current?.blur();
      } else {
        setToggleTrayHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setToggleTrayHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  /**
   * 显示配置窗口快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleShowSettingsWindowHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setShowSettingsWindowHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'show-settings-window')) {
      setShowSettingsWindowHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setShowSettingsWindowHotkeyRecording(false);
      showSettingsWindowHotkeyInputRef.current?.blur();
      return;
    }

    window.api.showSettingsWindowHotkeySet(acc).then((ok) => {
      if (ok) {
        setShowSettingsWindowHotkey(acc);
        setShowSettingsWindowHotkeyRecording(false);
        showSettingsWindowHotkeyInputRef.current?.blur();
      } else {
        setShowSettingsWindowHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setShowSettingsWindowHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  const handleOpenClipboardHistoryHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setOpenClipboardHistoryHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'open-clipboard-history')) {
      setOpenClipboardHistoryHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setOpenClipboardHistoryHotkeyRecording(false);
      openClipboardHistoryHotkeyInputRef.current?.blur();
      return;
    }

    window.api.openClipboardHistoryHotkeySet(acc).then((ok) => {
      if (ok) {
        setOpenClipboardHistoryHotkey(acc);
        setOpenClipboardHistoryHotkeyRecording(false);
        openClipboardHistoryHotkeyInputRef.current?.blur();
      } else {
        setOpenClipboardHistoryHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setOpenClipboardHistoryHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  const handleTogglePassthroughHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setTogglePassthroughHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'toggle-passthrough')) {
      setTogglePassthroughHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setTogglePassthroughHotkeyRecording(false);
      togglePassthroughHotkeyInputRef.current?.blur();
      return;
    }

    window.api.togglePassthroughHotkeySet(acc).then((ok) => {
      if (ok) {
        setTogglePassthroughHotkey(acc);
        setTogglePassthroughHotkeyRecording(false);
        togglePassthroughHotkeyInputRef.current?.blur();
      } else {
        setTogglePassthroughHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setTogglePassthroughHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  const handleToggleUiLockHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setToggleUiLockHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'toggle-ui-lock')) {
      setToggleUiLockHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setToggleUiLockHotkeyRecording(false);
      toggleUiLockHotkeyInputRef.current?.blur();
      return;
    }

    window.api.toggleUiLockHotkeySet(acc).then((ok) => {
      if (ok) {
        setToggleUiLockHotkey(acc);
        setToggleUiLockHotkeyRecording(false);
        toggleUiLockHotkeyInputRef.current?.blur();
      } else {
        setToggleUiLockHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setToggleUiLockHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  const handleAgentVoiceInputHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setAgentVoiceInputHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'agent-voice-input')) {
      setAgentVoiceInputHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setAgentVoiceInputHotkeyRecording(false);
      agentVoiceInputHotkeyInputRef.current?.blur();
      return;
    }

    window.api.agentVoiceInputHotkeySet(acc).then((ok) => {
      if (ok) {
        setAgentVoiceInputHotkey(acc);
        setAgentVoiceInputHotkeyRecording(false);
        agentVoiceInputHotkeyInputRef.current?.blur();
      } else {
        setAgentVoiceInputHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setAgentVoiceInputHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  /**
   * 切换形态模式快捷键录入键盘事件处理
   * @param e - React 键盘事件
   */
  const handleToggleShapeModeHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setToggleShapeModeHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'toggle-shape-mode')) {
      setToggleShapeModeHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setToggleShapeModeHotkeyRecording(false);
      toggleShapeModeHotkeyInputRef.current?.blur();
      return;
    }

    window.api.toggleShapeModeHotkeySet(acc).then((ok) => {
      if (ok) {
        setToggleShapeModeHotkey(acc);
        setToggleShapeModeHotkeyRecording(false);
        toggleShapeModeHotkeyInputRef.current?.blur();
      } else {
        setToggleShapeModeHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setToggleShapeModeHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  const handleNextSongHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setNextSongHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'next-song')) {
      setNextSongHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setNextSongHotkeyRecording(false);
      nextSongHotkeyInputRef.current?.blur();
      return;
    }

    window.api.nextSongHotkeySet(acc).then((ok) => {
      if (ok) {
        setNextSongHotkey(acc);
        setNextSongHotkeyRecording(false);
        nextSongHotkeyInputRef.current?.blur();
      } else {
        setNextSongHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setNextSongHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  const handlePlayPauseSongHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setPlayPauseSongHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'play-pause-song')) {
      setPlayPauseSongHotkeyError(t('settings.hotkey.duplicateHotkey', { defaultValue: '重复快捷键' }));
      setPlayPauseSongHotkeyRecording(false);
      playPauseSongHotkeyInputRef.current?.blur();
      return;
    }

    window.api.playPauseSongHotkeySet(acc).then((ok) => {
      if (ok) {
        setPlayPauseSongHotkey(acc);
        setPlayPauseSongHotkeyRecording(false);
        playPauseSongHotkeyInputRef.current?.blur();
      } else {
        setPlayPauseSongHotkeyError(t('settings.hotkey.registerFailedRetry', { defaultValue: '快捷键注册失败，请尝试其他组合' }));
      }
    }).catch(() => {
      setPlayPauseSongHotkeyError(t('settings.hotkey.registerFailed', { defaultValue: '快捷键注册失败' }));
    });
  };

  const handleDetectSourceAppId = async (): Promise<void> => {
    if (detectingSourceAppId) return;
    setDetectingSourceAppId(true);
    setDetectedSources([]);
    try {
      const result = await window.api.musicDetectSourceAppId();
      if (result.ok && result.sources.length > 0) {
        setDetectedSources(result.sources);
      }
    } catch { /* ignore */ }
    setDetectingSourceAppId(false);
  };

  const handleAddWhitelist = (): void => {
    const nextItem = whitelistDraft.trim();
    if (!nextItem) return;

    const exists = whitelist.some((item) => item.toLowerCase() === nextItem.toLowerCase());
    if (exists) {
      setWhitelistDraft('');
      setWhitelistInputError(t('settings.music.whitelist.alreadyExists', { defaultValue: '已在白名单中' }));
      return;
    }

    const next = [...whitelist, nextItem];
    setWhitelist(next);
    setWhitelistDraft('');
    setWhitelistInputError('');
    window.api.musicWhitelistSet(next).catch(() => {});
  };

  const saveMusicSmtcUnsubscribeConfig = async (): Promise<void> => {
    const valueMs = musicSmtcNeverUnsubscribe ? 0 : Number(musicSmtcUnsubscribeInput.trim());

    if (!musicSmtcNeverUnsubscribe) {
      if (!Number.isFinite(valueMs) || valueMs < 1000) {
        setMusicSmtcConfigMessage({ type: 'error', text: t('settings.music.smtc.invalidMsValue', { defaultValue: '请输入有效毫秒值（>= 1000）或开启「永不取消订阅」' }) });
        return;
      }
    }

    const ok = await window.api.musicSmtcUnsubscribeMsSet(valueMs);
    if (!ok) {
      setMusicSmtcConfigMessage({ type: 'error', text: t('settings.music.smtc.saveFailed', { defaultValue: '保存失败，请稍后重试' }) });
      return;
    }

    if (musicSmtcNeverUnsubscribe) {
      setMusicSmtcConfigMessage({ type: 'success', text: t('settings.music.smtc.savedNeverUnsubscribe', { defaultValue: '已保存：永不自动取消订阅' }) });
      return;
    }

    setMusicSmtcConfigMessage({ type: 'success', text: t('settings.music.smtc.savedAutoUnsubscribe', { defaultValue: '已保存：{{ms}} ms 自动取消订阅', ms: Math.round(valueMs) }) });
  };

  return (
    <div className="max-expand-settings" ref={settingsRef}>
      <div className="max-expand-settings-layout">
        <div className="max-expand-settings-sidebar">
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'index' ? 'active' : ''}`}
            onClick={() => setActiveTab('index')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('index')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'app' ? 'active' : ''}`}
            onClick={() => setActiveTab('app')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('app')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'network' ? 'active' : ''}`}
            onClick={() => setActiveTab('network')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('network')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'mail' ? 'active' : ''}`}
            onClick={() => setActiveTab('mail')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('mail')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'weather' ? 'active' : ''}`}
            onClick={() => setActiveTab('weather')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('weather')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'music' ? 'active' : ''}`}
            onClick={() => setActiveTab('music')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('music')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('ai')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'shortcut' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortcut')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('shortcut')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('user')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'update' ? 'active' : ''}`}
            onClick={() => setActiveTab('update')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('update')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'pluginMarket' ? 'active' : ''}`}
            onClick={() => setActiveTab('pluginMarket')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('pluginMarket')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('about')}
          </button>
        </div>

        <div className="max-expand-settings-panel">
          {activeTab === 'index' && (
            <IndexSettingsSection
              visibleCards={visibleCards}
              hiddenCards={hiddenCards}
              navEditMode={navEditMode}
              dragOverIdx={dragOverIdx}
              navOrder={navOrder}
              hiddenNavOrder={hiddenNavOrder}
              dragIdxRef={dragIdxRef}
              setDragOverIdx={setDragOverIdx}
              setNavOrder={setNavOrder}
              setHiddenNavOrder={setHiddenNavOrder}
              setNavEditMode={setNavEditMode}
              resetNavConfig={resetNavConfig}
              persistNavConfig={persistNavConfig}
              setAppSettingsPage={setAppSettingsPage}
              setMusicSettingsPage={setMusicSettingsPage}
              setAiSettingsPage={setAiSettingsPage}
              setActiveTab={setActiveTab}
              onAction={(actionId) => {
                if (actionId === 'user-pro') {
                  setUserInitialProfilePage('pro');
                  setActiveTab('user');
                  return;
                }
                if (actionId === 'user-recharge') {
                  setUserInitialProfilePage('recharge');
                  setActiveTab('user');
                }
              }}
            />
          )}

          {activeTab === 'app' && (
            <AppSettingsSection
              currentAppSettingsPageLabel={currentAppSettingsPageLabel}
              appSettingsPage={appSettingsPage}
              layoutConfig={layoutConfig}
              OverviewPreviewComponent={OverviewPreview}
              overviewWidgetOptions={translatedOverviewWidgetOptions}
              overviewClockStyleOptions={translatedOverviewClockStyleOptions}
              updateLayout={updateLayout}
              updateClockStyle={updateClockStyle}
              updateGradientColor={updateGradientColor}
              expandNavLayout={expandNavLayout}
              updateExpandNavLayout={updateExpandNavLayout}
              maxExpandNavLayout={maxExpandNavLayout}
              updateMaxExpandNavLayout={updateMaxExpandNavLayout}
              hideProcessFilter={hideProcessFilter}
              setHideProcessFilter={setHideProcessFilter}
              refreshRunningProcesses={refreshRunningProcesses}
              hideProcessLoading={hideProcessLoading}
              hideProcessList={hideProcessList}
              toggleHideProcess={toggleHideProcess}
              runningProcesses={runningProcesses}
              hideProcessKeyword={hideProcessKeyword}
              autoHideFullscreenWindows={autoHideFullscreenWindows}
              setAutoHideFullscreenWindows={setAutoHideFullscreenWindows}
              islandPositionOffset={islandPositionOffset}
              applyIslandPositionOffset={applyIslandPositionOffset}
              islandPositionInput={islandPositionInput}
              setIslandPositionInput={setIslandPositionInput}
              applyIslandPositionInput={applyIslandPositionInput}
              islandPositionInputChanged={islandPositionInputChanged}
              cancelIslandPositionInput={cancelIslandPositionInput}
              islandDisplaySelection={islandDisplaySelection}
              islandDisplayOptions={islandDisplayOptions}
              setIslandDisplaySelection={handleIslandDisplaySelectionChange}
              themeMode={themeMode}
              setThemeModeState={setThemeModeState}
              applyThemeMode={applyThemeMode}
              standaloneMacControls={standaloneMacControls}
              setStandaloneMacControls={setStandaloneMacControls}
              appLanguage={appLanguage}
              applyAppLanguage={applyAppLanguage}
              islandOpacity={islandOpacity}
              applyIslandOpacity={applyIslandOpacity}
              opacitySaveTimerRef={opacitySaveTimerRef}
              setIslandOpacity={setIslandOpacity}
              persistIslandOpacity={persistIslandOpacity}
              autoDimEnabled={autoDimEnabled}
              handleAutoDimEnabledChange={handleAutoDimEnabledChange}
              autoDimDelaySec={autoDimDelaySec}
              handleAutoDimDelayChange={handleAutoDimDelayChange}
              expandLeaveIdle={expandLeaveIdle}
              setExpandLeaveIdle={setExpandLeaveIdle}
              maxExpandLeaveIdle={maxExpandLeaveIdle}
              setMaxExpandLeaveIdle={setMaxExpandLeaveIdle}
              clipboardUrlMonitorEnabled={clipboardUrlMonitorEnabled}
              setClipboardUrlMonitorEnabled={setClipboardUrlMonitorEnabled}
              clipboardUrlDetectMode={clipboardUrlDetectMode}
              setClipboardUrlDetectMode={setClipboardUrlDetectMode}
              clipboardUrlBlacklist={clipboardUrlBlacklist}
              setClipboardUrlBlacklist={setClipboardUrlBlacklist}
              clipboardUrlSuppressInFavorites={clipboardUrlSuppressInFavorites}
              setClipboardUrlSuppressInFavorites={setClipboardUrlSuppressInFavorites}
              autostartMode={autostartMode}
              setAutostartMode={setAutostartMode}
              bgMediaType={bgMedia?.type ?? null}
              bgMediaPreviewUrl={bgMediaPreviewUrl}
              bgVideoFit={bgVideoFit}
              setBgVideoFit={setBgVideoFit}
              bgVideoMuted={bgVideoMuted}
              setBgVideoMuted={setBgVideoMuted}
              bgVideoLoop={bgVideoLoop}
              setBgVideoLoop={setBgVideoLoop}
              bgVideoVolume={bgVideoVolume}
              setBgVideoVolume={setBgVideoVolume}
              bgVideoRate={bgVideoRate}
              setBgVideoRate={setBgVideoRate}
              bgVideoHwDecode={bgVideoHwDecode}
              setBgVideoHwDecode={setBgVideoHwDecode}
              syncDesktopWallpaperOnBackgroundChange={syncDesktopWallpaperOnBackgroundChange}
              setSyncDesktopWallpaperOnBackgroundChange={setSyncDesktopWallpaperOnBackgroundChange}
              bgImageOpacity={bgImageOpacity}
              bgImageBlur={bgImageBlur}
              setBgImageOpacity={setBgImageOpacity}
              setBgImageBlur={setBgImageBlur}
              applyBgOpacity={applyBgOpacity}
              applyBgBlur={applyBgBlur}
              applyBgVideoFit={applyBgVideoFit}
              applyBgVideoMuted={applyBgVideoMuted}
              applyBgVideoLoop={applyBgVideoLoop}
              applyBgVideoVolume={applyBgVideoVolume}
              applyBgVideoRate={applyBgVideoRate}
              applyBgVideoHwDecode={applyBgVideoHwDecode}
              persistBgOpacity={persistBgOpacity}
              persistBgBlur={persistBgBlur}
              persistBgVideoFit={persistBgVideoFit}
              persistBgVideoMuted={persistBgVideoMuted}
              persistBgVideoLoop={persistBgVideoLoop}
              persistBgVideoVolume={persistBgVideoVolume}
              persistBgVideoRate={persistBgVideoRate}
              persistBgVideoHwDecode={persistBgVideoHwDecode}
              bgOpacitySaveTimerRef={bgOpacitySaveTimerRef}
              bgBlurSaveTimerRef={bgBlurSaveTimerRef}
              handleSelectBgImage={handleSelectBgImage}
              handleSelectBgVideo={handleSelectBgVideo}
              handleClearBgImage={handleClearBgImage}
              handleSelectBuiltinBgImage={handleSelectBuiltinBgImage}
              appSettingsPages={APP_SETTINGS_PAGES}
              settingsTabLabels={translatedSettingsTabLabels}
              setAppSettingsPage={setAppSettingsPage}
            />
          )}

          {activeTab === 'network' && (
            <NetworkSettingsSection
              isProUser={isProUser}
              networkTimeoutMs={networkTimeoutMs}
              customTimeoutInput={customTimeoutInput}
              staticAssetNode={staticAssetNode}
              networkTimeoutOptions={NETWORK_TIMEOUT_OPTIONS}
              staticAssetNodeOptions={staticAssetNodeOptions}
              setNetworkTimeoutMs={setNetworkTimeoutMs}
              setCustomTimeoutInput={setCustomTimeoutInput}
              setStaticAssetNode={setStaticAssetNode}
              saveNetworkConfig={saveNetworkConfig}
            />
          )}

          {activeTab === 'mail' && (
            <MailSettingsSection
              currentMailSettingsPageLabel={currentMailSettingsPageLabel}
              mailSettingsPage={mailSettingsPage}
              mailAccounts={mailAccounts}
              activeMailAccountId={activeMailAccountId}
              setMailAccounts={setMailAccounts}
              setActiveMailAccountId={setActiveMailAccountId}
              mailFetchLimit={mailFetchLimit}
              setMailFetchLimit={setMailFetchLimit}
              mailSettingsPages={MAIL_SETTINGS_PAGES}
              mailSettingsPageLabels={translatedMailSettingsPageLabels}
              setMailSettingsPage={setMailSettingsPage}
            />
          )}

          {activeTab === 'weather' && (
            <WeatherSettingsSection
              currentWeatherSettingsPageLabel={currentWeatherSettingsPageLabel}
              weatherSettingsPage={weatherSettingsPage}
              weatherLocationPriorityOptions={WEATHER_LOCATION_PRIORITY_OPTIONS}
              weatherLocationPriority={weatherLocationPriority}
              applyWeatherLocationPriority={applyWeatherLocationPriority}
              setWeatherLocationConfigMessage={setWeatherLocationConfigMessage}
              weatherCustomCityInput={weatherCustomCityInput}
              setWeatherCustomCityInput={setWeatherCustomCityInput}
              testWeatherCustomLocation={testWeatherCustomLocation}
              setWeatherCustomLocationTesting={setWeatherCustomLocationTesting}
              setWeatherCustomLocationTestMessage={setWeatherCustomLocationTestMessage}
              weatherCustomLocationTesting={weatherCustomLocationTesting}
              saveWeatherLocationSettings={saveWeatherLocationSettings}
              weatherLocationConfigMessage={weatherLocationConfigMessage}
              weatherCustomLocationTestMessage={weatherCustomLocationTestMessage}
              weatherProviderOptions={WEATHER_PROVIDER_OPTIONS}
              weatherPrimaryProvider={weatherPrimaryProvider}
              isProUser={isProUser}
              setWeatherPrimaryProvider={setWeatherPrimaryProvider}
              saveWeatherProviderConfig={saveWeatherProviderConfig}
              weatherAlertEnabled={weatherAlertEnabled}
              setWeatherAlertEnabled={applyWeatherAlertEnabled}
              weatherSettingsPages={WEATHER_SETTINGS_PAGES}
              weatherSettingsPageLabels={translatedWeatherSettingsPageLabels}
              setWeatherSettingsPage={setWeatherSettingsPage}
            />
          )}

          {activeTab === 'shortcut' && (
            <ShortcutSettingsSection
              hotkeyInputRef={hotkeyInputRef}
              hotkeyRecording={hotkeyRecording}
              hotkeyError={hotkeyError}
              hideHotkey={hideHotkey}
              setHotkeyRecording={setHotkeyRecording}
              setHotkeyError={setHotkeyError}
              handleHotkeyKeyDown={handleHotkeyKeyDown}
              setHideHotkey={setHideHotkey}
              quitHotkeyInputRef={quitHotkeyInputRef}
              quitHotkeyRecording={quitHotkeyRecording}
              quitHotkeyError={quitHotkeyError}
              quitHotkey={quitHotkey}
              setQuitHotkeyRecording={setQuitHotkeyRecording}
              setQuitHotkeyError={setQuitHotkeyError}
              handleQuitHotkeyKeyDown={handleQuitHotkeyKeyDown}
              setQuitHotkey={setQuitHotkey}
              screenshotHotkeyInputRef={screenshotHotkeyInputRef}
              screenshotHotkeyRecording={screenshotHotkeyRecording}
              screenshotHotkeyError={screenshotHotkeyError}
              screenshotHotkey={screenshotHotkey}
              setScreenshotHotkeyRecording={setScreenshotHotkeyRecording}
              setScreenshotHotkeyError={setScreenshotHotkeyError}
              handleScreenshotHotkeyKeyDown={handleScreenshotHotkeyKeyDown}
              setScreenshotHotkey={setScreenshotHotkey}
              nextSongHotkeyInputRef={nextSongHotkeyInputRef}
              nextSongHotkeyRecording={nextSongHotkeyRecording}
              nextSongHotkeyError={nextSongHotkeyError}
              nextSongHotkey={nextSongHotkey}
              setNextSongHotkeyRecording={setNextSongHotkeyRecording}
              setNextSongHotkeyError={setNextSongHotkeyError}
              handleNextSongHotkeyKeyDown={handleNextSongHotkeyKeyDown}
              setNextSongHotkey={setNextSongHotkey}
              playPauseSongHotkeyInputRef={playPauseSongHotkeyInputRef}
              playPauseSongHotkeyRecording={playPauseSongHotkeyRecording}
              playPauseSongHotkeyError={playPauseSongHotkeyError}
              playPauseSongHotkey={playPauseSongHotkey}
              setPlayPauseSongHotkeyRecording={setPlayPauseSongHotkeyRecording}
              setPlayPauseSongHotkeyError={setPlayPauseSongHotkeyError}
              handlePlayPauseSongHotkeyKeyDown={handlePlayPauseSongHotkeyKeyDown}
              setPlayPauseSongHotkey={setPlayPauseSongHotkey}
              resetPositionHotkeyInputRef={resetPositionHotkeyInputRef}
              resetPositionHotkeyRecording={resetPositionHotkeyRecording}
              resetPositionHotkeyError={resetPositionHotkeyError}
              resetPositionHotkey={resetPositionHotkey}
              setResetPositionHotkeyRecording={setResetPositionHotkeyRecording}
              setResetPositionHotkeyError={setResetPositionHotkeyError}
              handleResetPositionHotkeyKeyDown={handleResetPositionHotkeyKeyDown}
              setResetPositionHotkey={setResetPositionHotkey}
              toggleTrayHotkeyInputRef={toggleTrayHotkeyInputRef}
              toggleTrayHotkeyRecording={toggleTrayHotkeyRecording}
              toggleTrayHotkeyError={toggleTrayHotkeyError}
              toggleTrayHotkey={toggleTrayHotkey}
              setToggleTrayHotkeyRecording={setToggleTrayHotkeyRecording}
              setToggleTrayHotkeyError={setToggleTrayHotkeyError}
              handleToggleTrayHotkeyKeyDown={handleToggleTrayHotkeyKeyDown}
              setToggleTrayHotkey={setToggleTrayHotkey}
              showSettingsWindowHotkeyInputRef={showSettingsWindowHotkeyInputRef}
              showSettingsWindowHotkeyRecording={showSettingsWindowHotkeyRecording}
              showSettingsWindowHotkeyError={showSettingsWindowHotkeyError}
              showSettingsWindowHotkey={showSettingsWindowHotkey}
              setShowSettingsWindowHotkeyRecording={setShowSettingsWindowHotkeyRecording}
              setShowSettingsWindowHotkeyError={setShowSettingsWindowHotkeyError}
              handleShowSettingsWindowHotkeyKeyDown={handleShowSettingsWindowHotkeyKeyDown}
              setShowSettingsWindowHotkey={setShowSettingsWindowHotkey}
              openClipboardHistoryHotkeyInputRef={openClipboardHistoryHotkeyInputRef}
              openClipboardHistoryHotkeyRecording={openClipboardHistoryHotkeyRecording}
              openClipboardHistoryHotkeyError={openClipboardHistoryHotkeyError}
              openClipboardHistoryHotkey={openClipboardHistoryHotkey}
              setOpenClipboardHistoryHotkeyRecording={setOpenClipboardHistoryHotkeyRecording}
              setOpenClipboardHistoryHotkeyError={setOpenClipboardHistoryHotkeyError}
              handleOpenClipboardHistoryHotkeyKeyDown={handleOpenClipboardHistoryHotkeyKeyDown}
              setOpenClipboardHistoryHotkey={setOpenClipboardHistoryHotkey}
              togglePassthroughHotkeyInputRef={togglePassthroughHotkeyInputRef}
              togglePassthroughHotkeyRecording={togglePassthroughHotkeyRecording}
              togglePassthroughHotkeyError={togglePassthroughHotkeyError}
              togglePassthroughHotkey={togglePassthroughHotkey}
              setTogglePassthroughHotkeyRecording={setTogglePassthroughHotkeyRecording}
              setTogglePassthroughHotkeyError={setTogglePassthroughHotkeyError}
              handleTogglePassthroughHotkeyKeyDown={handleTogglePassthroughHotkeyKeyDown}
              setTogglePassthroughHotkey={setTogglePassthroughHotkey}
              toggleUiLockHotkeyInputRef={toggleUiLockHotkeyInputRef}
              toggleUiLockHotkeyRecording={toggleUiLockHotkeyRecording}
              toggleUiLockHotkeyError={toggleUiLockHotkeyError}
              toggleUiLockHotkey={toggleUiLockHotkey}
              setToggleUiLockHotkeyRecording={setToggleUiLockHotkeyRecording}
              setToggleUiLockHotkeyError={setToggleUiLockHotkeyError}
              handleToggleUiLockHotkeyKeyDown={handleToggleUiLockHotkeyKeyDown}
              setToggleUiLockHotkey={setToggleUiLockHotkey}
              agentVoiceInputHotkeyInputRef={agentVoiceInputHotkeyInputRef}
              agentVoiceInputHotkeyRecording={agentVoiceInputHotkeyRecording}
              agentVoiceInputHotkeyError={agentVoiceInputHotkeyError}
              agentVoiceInputHotkey={agentVoiceInputHotkey}
              setAgentVoiceInputHotkeyRecording={setAgentVoiceInputHotkeyRecording}
              setAgentVoiceInputHotkeyError={setAgentVoiceInputHotkeyError}
              handleAgentVoiceInputHotkeyKeyDown={handleAgentVoiceInputHotkeyKeyDown}
              setAgentVoiceInputHotkey={setAgentVoiceInputHotkey}
              toggleShapeModeHotkeyInputRef={toggleShapeModeHotkeyInputRef}
              toggleShapeModeHotkeyRecording={toggleShapeModeHotkeyRecording}
              toggleShapeModeHotkeyError={toggleShapeModeHotkeyError}
              toggleShapeModeHotkey={toggleShapeModeHotkey}
              setToggleShapeModeHotkeyRecording={setToggleShapeModeHotkeyRecording}
              setToggleShapeModeHotkeyError={setToggleShapeModeHotkeyError}
              handleToggleShapeModeHotkeyKeyDown={handleToggleShapeModeHotkeyKeyDown}
              setToggleShapeModeHotkey={setToggleShapeModeHotkey}
            />
          )}

          {activeTab === 'music' && (
            <MusicSettingsSection
              currentMusicSettingsPageLabel={currentMusicSettingsPageLabel}
              musicSettingsPage={musicSettingsPage}
              whitelist={whitelist}
              setWhitelist={setWhitelist}
              whitelistInputError={whitelistInputError}
              setWhitelistInputError={setWhitelistInputError}
              whitelistDraft={whitelistDraft}
              setWhitelistDraft={setWhitelistDraft}
              handleAddWhitelist={handleAddWhitelist}
              handleDetectSourceAppId={handleDetectSourceAppId}
              detectingSourceAppId={detectingSourceAppId}
              detectedSources={detectedSources}
              lyricsSourceOptions={LYRICS_SOURCE_OPTIONS}
              lyricsSource={lyricsSource}
              setLyricsSource={setLyricsSource}
              lyricsEnabled={lyricsEnabled}
              setLyricsEnabled={setLyricsEnabled}
              lyricsTranslationEnabled={lyricsTranslationEnabled}
              setLyricsTranslationEnabled={setLyricsTranslationEnabled}
              lyricsKaraoke={lyricsKaraoke}
              setLyricsKaraoke={setLyricsKaraoke}
              lyricsClock={lyricsClock}
              setLyricsClock={setLyricsClock}
              lyricsCalibrateEnabled={lyricsCalibrateEnabled}
              setLyricsCalibrateEnabled={setLyricsCalibrateEnabled}
              lyricsCalibrateDelay={lyricsCalibrateDelay}
              setLyricsCalibrateDelay={setLyricsCalibrateDelay}
              musicSmtcUnsubscribeInput={musicSmtcUnsubscribeInput}
              setMusicSmtcUnsubscribeInput={setMusicSmtcUnsubscribeInput}
              musicSmtcNeverUnsubscribe={musicSmtcNeverUnsubscribe}
              setMusicSmtcNeverUnsubscribe={setMusicSmtcNeverUnsubscribe}
              saveMusicSmtcUnsubscribeConfig={saveMusicSmtcUnsubscribeConfig}
              setMusicSmtcConfigMessage={setMusicSmtcConfigMessage}
              musicSmtcConfigMessage={musicSmtcConfigMessage}
              musicSettingsPages={MUSIC_SETTINGS_PAGES}
              musicSettingsPageLabels={translatedMusicSettingsPageLabels}
              setMusicSettingsPage={setMusicSettingsPage}
            />
          )}

          {activeTab === 'ai' && (
            <AiSettingsSection
              currentAiSettingsPageLabel={currentAiSettingsPageLabel}
              aiSettingsPage={aiSettingsPage}
              aiConfig={aiConfig}
              setAiConfig={setAiConfig}
              onAddWorkspace={async () => {
                const dir = await window.api.pickLocalSearchDirectory();
                if (!dir) return;
                const current = Array.isArray(aiConfig.workspaces) ? aiConfig.workspaces : [];
                if (current.some((w) => w.toLowerCase() === dir.toLowerCase())) return;
                setAiConfig({ workspaces: [...current, dir] });
              }}
              onRemoveWorkspace={(idx) => {
                const current = Array.isArray(aiConfig.workspaces) ? aiConfig.workspaces : [];
                setAiConfig({ workspaces: current.filter((_, i) => i !== idx) });
              }}
              SettingsFieldComponent={SettingsField}
              aiSettingsPages={AI_SETTINGS_PAGES}
              aiSettingsPageLabels={translatedSettingsTabLabels}
              setAiSettingsPage={setAiSettingsPage}
              isProUser={isProUser}
            />
          )}

          {activeTab === 'update' && (
            <UpdateSettingsSection
              aboutVersion={aboutVersion}
              updateSource={updateSource}
              updateSources={UPDATE_SOURCES}
              isProUser={isProUser}
              updateAutoPromptEnabled={updateAutoPromptEnabled}
              announcementShowMode={announcementShowMode}
              updateStatus={updateStatus}
              updateVersion={updateVersion}
              downloadProgress={downloadProgress}
              currentSourceLabel={currentSourceLabel}
              updateError={updateError}
              onUpdateSourceChange={handleUpdateSourceChange}
              onUpdateAutoPromptEnabledChange={handleUpdateAutoPromptEnabledChange}
              onAnnouncementShowModeChange={handleAnnouncementShowModeChange}
              onCheckUpdate={handleCheckUpdate}
              onDownloadUpdate={handleDownloadUpdate}
              onInstallUpdate={handleInstallUpdate}
              onResetGuide={handleResetGuide}
              guideResetStatus={guideResetStatus}
            />
          )}

          {activeTab === 'pluginMarket' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title settings-app-title-line">
                <span>{t('settings.labels.pluginMarket', { defaultValue: '壁纸市场' })}</span>
                {hasLoginSession && <span className="settings-app-title-sub">- {currentPluginMarketPageLabel}</span>}
                {hasLoginSession && (pluginMarketPage === 'wallpaper' || pluginMarketPage === 'edit') && (
                  <button
                    className="settings-app-title-refresh-btn"
                    type="button"
                    onClick={() => setWallpaperMarketRefreshKey((prev) => prev + 1)}
                    title={t('settings.pluginMarket.wallpaper.actions.refresh', { defaultValue: '刷新壁纸列表' })}
                    aria-label={t('settings.pluginMarket.wallpaper.actions.refresh', { defaultValue: '刷新壁纸列表' })}
                  >
                    <img src={SvgIcon.REVERT} alt="" className="settings-app-title-refresh-icon" />
                  </button>
                )}
              </div>
              {hasLoginSession ? (
                <div className="settings-app-pages-layout" style={{ marginTop: 0 }}>
                  <div className="settings-app-page-main">
                    {pluginMarketPage === 'wallpaper' && (
                      <WallpaperMarketSection
                        key={wallpaperMarketRefreshKey}
                        onApplyBackground={handleApplyMarketplaceWallpaper}
                        onGoContribution={() => setPluginMarketPage('contribution')}
                      />
                    )}
                    {pluginMarketPage === 'contribution' && (
                      <WallpaperContributionSection onGoWallpaper={() => setPluginMarketPage('wallpaper')} />
                    )}
                    {pluginMarketPage === 'edit' && (
                      <WallpaperEditSection
                        key={wallpaperMarketRefreshKey}
                        onGoWallpaper={() => setPluginMarketPage('wallpaper')}
                      />
                    )}
                  </div>
                  <div className="settings-app-page-dots">
                    <button
                      className={`settings-app-page-dot ${pluginMarketPage === 'wallpaper' ? 'active' : ''}`}
                      data-label={t('settings.pluginMarket.pages.wallpaper', { defaultValue: '壁纸' })}
                      onClick={() => setPluginMarketPage('wallpaper')}
                      title={t('settings.pluginMarket.pages.wallpaper', { defaultValue: '壁纸' })}
                      aria-label={t('settings.pluginMarket.pages.wallpaper', { defaultValue: '壁纸' })}
                    />
                    <button
                      className={`settings-app-page-dot ${pluginMarketPage === 'contribution' ? 'active' : ''}`}
                      data-label={t('settings.pluginMarket.pages.contribution', { defaultValue: '贡献' })}
                      onClick={() => setPluginMarketPage('contribution')}
                      title={t('settings.pluginMarket.pages.contribution', { defaultValue: '贡献' })}
                      aria-label={t('settings.pluginMarket.pages.contribution', { defaultValue: '贡献' })}
                    />
                    <button
                      className={`settings-app-page-dot ${pluginMarketPage === 'edit' ? 'active' : ''}`}
                      data-label={t('settings.pluginMarket.pages.edit', { defaultValue: '修改壁纸' })}
                      onClick={() => setPluginMarketPage('edit')}
                      title={t('settings.pluginMarket.pages.edit', { defaultValue: '修改壁纸' })}
                      aria-label={t('settings.pluginMarket.pages.edit', { defaultValue: '修改壁纸' })}
                    />
                  </div>
                </div>
              ) : (
                <div className="settings-user-auth">
                  <div className="settings-user-auth-entry-title">
                    {t('settings.pluginMarket.auth.entryTitle', { defaultValue: '登录后即可访问壁纸市场内容' })}
                  </div>
                  <div className="settings-user-auth-entry-actions">
                    <button
                      type="button"
                      className="settings-user-primary-btn"
                      onClick={() => setLogin()}
                    >
                      {t('settings.pluginMarket.auth.gotoLogin', { defaultValue: '前往登录' })}
                    </button>
                    <button
                      type="button"
                      className="settings-user-secondary-btn"
                      onClick={() => setRegister()}
                    >
                      {t('settings.pluginMarket.auth.gotoRegister', { defaultValue: '前往注册' })}
                    </button>
                  </div>
                  <div className="settings-user-auth-hint">
                    {t('settings.pluginMarket.auth.hint', { defaultValue: '登录后可浏览壁纸与插件内容。' })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'user' && <UserSettingsSection initialProfilePage={userInitialProfilePage} />}

          {activeTab === 'about' && <AboutSettingsSection aboutVersion={aboutVersion} initialPage={aboutInitialPage} />}
        </div>
      </div>
    </div>
  );
}
