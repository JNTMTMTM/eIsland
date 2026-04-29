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
import type { OverviewWidgetType, OverviewLayoutConfig } from '../../expand/components/OverviewTab';
import { OVERVIEW_WIDGET_OPTIONS } from '../../expand/components/OverviewTab';
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
  APP_SETTINGS_PAGES,
  WEATHER_SETTINGS_PAGES,
  WEATHER_SETTINGS_PAGE_LABELS,
  MAIL_SETTINGS_PAGES,
  MAIL_SETTINGS_PAGE_LABELS,
  MUSIC_SETTINGS_PAGES,
  MUSIC_SETTINGS_PAGE_LABELS,
  NAV_CARDS,
  DEFAULT_NAV_ORDER,
  NAV_CARDS_MAP,
  type SettingsSidebarTabKey,
  type AppSettingsPageKey,
  type WeatherSettingsPageKey,
  type MailSettingsPageKey,
  type MusicSettingsPageKey,
  type SettingsTabLabelKey,
  type NavCardDef,
} from './setting/utils/settingsConfig';
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
import { fetchUpdateSourceUrl } from '../../../../api/user/userAccountApi';
import { request as requestUserAccountApi } from '../../../../api/user/userAccountApi.client';
import {
  readAnnouncementShowMode,
  writeAnnouncementShowMode,
  type AnnouncementShowMode,
} from '../../../../api/announcement/announcementApi';

import { setThemeMode as applyThemeMode, getThemeMode, type ThemeMode } from '../../../../utils/theme';
import { getLanguage, setLanguage, type AppLanguage } from '../../../../i18n';
import { readLocalToken, subscribeUserAccountSessionChanged } from '../../../../utils/userAccount';
import { SvgIcon } from '../../../../utils/SvgIcon';

const CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY = 'clipboard-url-suppress-in-url-favorites';
const LOCAL_ISLAND_BG_SYNC_EVENT = 'island-bg-local-sync';
const ISLAND_BG_MEDIA_STORE_KEY = 'island-bg-media';
const ISLAND_BG_IMAGE_STORE_KEY = 'island-bg-image';
const ISLAND_BG_VIDEO_FIT_STORE_KEY = 'island-bg-video-fit';
const ISLAND_BG_VIDEO_MUTED_STORE_KEY = 'island-bg-video-muted';
const ISLAND_BG_VIDEO_LOOP_STORE_KEY = 'island-bg-video-loop';
const ISLAND_BG_VIDEO_VOLUME_STORE_KEY = 'island-bg-video-volume';
const ISLAND_BG_VIDEO_RATE_STORE_KEY = 'island-bg-video-rate';
const ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY = 'island-bg-video-hw-decode';
const ISLAND_BG_SYNC_SYSTEM_WALLPAPER_STORE_KEY = 'island-bg-sync-system-wallpaper';
const STANDALONE_WINDOW_MAC_CONTROLS_STORE_KEY = 'standalone-window-mac-controls';
const ISLAND_DISPLAY_STORE_KEY = 'island-display-id';
const UPDATE_SOURCE_STORE_KEY = 'update-source';
const UPDATE_AUTO_PROMPT_STORE_KEY = 'update-auto-prompt-enabled';
const WEATHER_ALERT_ENABLED_STORE_KEY = 'weather-alert-enabled';
const MAIL_CONFIG_STORE_KEY = 'mail-account-config';
const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';
type SettingsOpenTabIntent = 'update' | 'about-feedback' | 'user-orders';
let _lastSettingsSidebarTab: SettingsSidebarTabKey = 'index';

type IslandBgMediaType = 'image' | 'video';

interface IslandBgMediaConfig {
  type: IslandBgMediaType;
  source: string;
}

interface MailAccountConfig {
  emailAddress: string;
  imapHost: string;
  imapPort: string;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  authUser: string;
  authSecret: string;
}

const DEFAULT_MAIL_ACCOUNT_CONFIG: MailAccountConfig = {
  emailAddress: '',
  imapHost: '',
  imapPort: '993',
  imapSecure: true,
  smtpHost: '',
  smtpPort: '465',
  smtpSecure: true,
  authUser: '',
  authSecret: '',
};

function isDirectBgMediaUrl(source: string): boolean {
  return source.startsWith('data:')
    || source.startsWith('http://')
    || source.startsWith('https://')
    || source.startsWith('blob:')
    || source.startsWith('file:')
    || source.startsWith('/')
    || source.startsWith('./')
    || source.startsWith('../')
    || source.startsWith('assets/');
}

function toMediaUrl(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return `eisland-media://local/${encodeURIComponent(normalized)}`;
}

function normalizeBgMediaConfig(value: unknown): IslandBgMediaConfig | null {
  if (typeof value === 'string') {
    const source = value.trim();
    return source ? { type: 'image', source } : null;
  }
  if (!value || typeof value !== 'object') return null;

  const candidate = value as { type?: unknown; source?: unknown; image?: unknown; url?: unknown };
  const sourceRaw = typeof candidate.source === 'string'
    ? candidate.source
    : typeof candidate.image === 'string'
      ? candidate.image
      : typeof candidate.url === 'string'
        ? candidate.url
        : null;
  if (!sourceRaw) return null;

  const source = sourceRaw.trim();
  if (!source) return null;

  if (candidate.type === 'video') {
    return { type: 'video', source };
  }
  return { type: 'image', source };
}

async function resolveBgMediaPreviewUrl(media: IslandBgMediaConfig): Promise<string | null> {
  if (media.type === 'image') {
    if (isDirectBgMediaUrl(media.source)) return media.source;
    return window.api.loadWallpaperFile?.(media.source) ?? null;
  }
  if (isDirectBgMediaUrl(media.source)) return media.source;
  return toMediaUrl(media.source);
}

function applyIslandOpacity(opacity: number): void {
  const safe = Math.max(10, Math.min(100, Math.round(opacity)));
  document.documentElement.style.setProperty('--island-opacity', String(safe));
}

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

interface RunningWindowItem {
  id: string;
  title: string;
  processName: string;
  processPath: string | null;
  processId: number | null;
  iconDataUrl: string | null;
}

type PluginMarketPageKey = 'wallpaper' | 'plugin' | 'contribution' | 'edit';
type UpdateSourceKey = 'cloudflare-r2' | 'tencent-cos' | 'aliyun-oss' | 'github';

const PRO_UPDATE_SOURCE_SET: ReadonlySet<UpdateSourceKey> = new Set<UpdateSourceKey>(['tencent-cos', 'aliyun-oss']);

const normalizeRoleValue = (value: string): string => {
  return value.trim().toLowerCase().replace(/^role_/, '');
};

const getRoleFromToken = (token: string | null | undefined): string | null => {
  if (!token) return null;
  const rawToken = token.trim().replace(/^bearer\s+/i, '');
  const parts = rawToken.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalizedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = JSON.parse(atob(normalizedPayload)) as { role?: unknown };
    return typeof decoded.role === 'string' ? normalizeRoleValue(decoded.role) : null;
  } catch {
    return null;
  }
};

const isProOnlyUpdateSource = (source: UpdateSourceKey): boolean => {
  return PRO_UPDATE_SOURCE_SET.has(source);
};

const PLUGIN_MARKET_PAGES: PluginMarketPageKey[] = ['wallpaper', 'plugin', 'contribution', 'edit'];

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
    };
    return OVERVIEW_WIDGET_OPTIONS.map((option) => ({
      ...option,
      label: t(labelKeyMap[option.value], { defaultValue: option.label }),
    }));
  }, [t]);
  const opacitySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsSidebarTabKey>(() => _lastSettingsSidebarTab);
  const [sessionToken, setSessionToken] = useState<string | null>(() => readLocalToken());
  const [hasLoginSession, setHasLoginSession] = useState<boolean>(() => Boolean(readLocalToken()));
  const [appSettingsPage, setAppSettingsPage] = useState<AppSettingsPageKey>('layout-preview');
  const [weatherSettingsPage, setWeatherSettingsPage] = useState<WeatherSettingsPageKey>('location');
  const [mailSettingsPage, setMailSettingsPage] = useState<MailSettingsPageKey>('account');
  const [musicSettingsPage, setMusicSettingsPage] = useState<MusicSettingsPageKey>('whitelist');
  const [userInitialProfilePage, setUserInitialProfilePage] = useState<'info' | 'pro' | 'orders'>('info');
  const [aboutInitialPage, setAboutInitialPage] = useState<'development' | 'feedback'>('development');
  const [pluginMarketPage, setPluginMarketPage] = useState<PluginMarketPageKey>('wallpaper');
  const [wallpaperMarketRefreshKey, setWallpaperMarketRefreshKey] = useState(0);
  const { aiConfig, setAiConfig, fetchWeatherData, setGuide, setLogin, setRegister, setNotification } = useIslandStore();
  const settingsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  useEffect(() => {
    _lastSettingsSidebarTab = activeTab;
  }, [activeTab]);

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

  useEffect(() => {
    const applySession = (): void => {
      const token = readLocalToken();
      setSessionToken(token);
      setHasLoginSession(Boolean(token));
    };
    applySession();
    return subscribeUserAccountSessionChanged(applySession);
  }, []);

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
  const pluginMarketPageRef = useRef(pluginMarketPage);
  pluginMarketPageRef.current = pluginMarketPage;
  const currentPluginMarketPageLabel = t(`settings.pluginMarket.pages.${pluginMarketPage}`, {
    defaultValue: pluginMarketPage === 'wallpaper'
      ? '壁纸'
      : pluginMarketPage === 'plugin'
        ? '插件'
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
    smtp: t('settings.mailPages.smtp', { defaultValue: MAIL_SETTINGS_PAGE_LABELS.smtp }),
  }), [t]);

  const translatedMusicSettingsPageLabels = useMemo<Record<MusicSettingsPageKey, string>>(() => ({
    whitelist: t('settings.musicPages.whitelist', { defaultValue: MUSIC_SETTINGS_PAGE_LABELS.whitelist }),
    lyrics: t('settings.musicPages.lyrics', { defaultValue: MUSIC_SETTINGS_PAGE_LABELS.lyrics }),
    smtc: t('settings.musicPages.smtc', { defaultValue: MUSIC_SETTINGS_PAGE_LABELS.smtc }),
  }), [t]);

  const [layoutConfig, setLayoutConfig] = useState<OverviewLayoutConfig>(DEFAULT_LAYOUT);

  /** 歌曲设置相关状态 */
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [whitelistDraft, setWhitelistDraft] = useState<string>('');
  const [whitelistInputError, setWhitelistInputError] = useState<string>('');
  const [lyricsSource, setLyricsSource] = useState<string>('auto');
  const [lyricsKaraoke, setLyricsKaraoke] = useState<boolean>(false);
  const [lyricsClock, setLyricsClock] = useState<boolean>(true);
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
  const [mailEmailAddress, setMailEmailAddress] = useState<string>(DEFAULT_MAIL_ACCOUNT_CONFIG.emailAddress);
  const [mailImapHost, setMailImapHost] = useState<string>(DEFAULT_MAIL_ACCOUNT_CONFIG.imapHost);
  const [mailImapPort, setMailImapPort] = useState<string>(DEFAULT_MAIL_ACCOUNT_CONFIG.imapPort);
  const [mailImapSecure, setMailImapSecure] = useState<boolean>(DEFAULT_MAIL_ACCOUNT_CONFIG.imapSecure);
  const [mailSmtpHost, setMailSmtpHost] = useState<string>(DEFAULT_MAIL_ACCOUNT_CONFIG.smtpHost);
  const [mailSmtpPort, setMailSmtpPort] = useState<string>(DEFAULT_MAIL_ACCOUNT_CONFIG.smtpPort);
  const [mailSmtpSecure, setMailSmtpSecure] = useState<boolean>(DEFAULT_MAIL_ACCOUNT_CONFIG.smtpSecure);
  const [mailAuthUser, setMailAuthUser] = useState<string>(DEFAULT_MAIL_ACCOUNT_CONFIG.authUser);
  const [mailAuthSecret, setMailAuthSecret] = useState<string>(DEFAULT_MAIL_ACCOUNT_CONFIG.authSecret);
  const [mailConfigLoaded, setMailConfigLoaded] = useState(false);
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
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getThemeMode);
  const [standaloneMacControls, setStandaloneMacControls] = useState<boolean>(false);
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(getLanguage);
  const [islandOpacity, setIslandOpacity] = useState<number>(100);
  const [bgMedia, setBgMedia] = useState<IslandBgMediaConfig | null>(null);
  const [bgMediaPreviewUrl, setBgMediaPreviewUrl] = useState<string | null>(null);
  const [bgVideoFit, setBgVideoFit] = useState<'cover' | 'contain'>('cover');
  const [bgVideoMuted, setBgVideoMuted] = useState<boolean>(true);
  const [bgVideoLoop, setBgVideoLoop] = useState<boolean>(true);
  const [bgVideoVolume, setBgVideoVolume] = useState<number>(0.6);
  const [bgVideoRate, setBgVideoRate] = useState<number>(1);
  const [bgVideoHwDecode, setBgVideoHwDecode] = useState<boolean>(true);
  const [syncDesktopWallpaperOnBackgroundChange, setSyncDesktopWallpaperOnBackgroundChange] = useState<boolean>(false);
  const [bgImageOpacity, setBgImageOpacity] = useState<number>(30);
  const [bgImageBlur, setBgImageBlur] = useState<number>(0);
  const bgOpacitySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgBlurSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [islandPositionOffset, setIslandPositionOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [islandPositionInput, setIslandPositionInput] = useState<{ x: string; y: string }>({ x: '0', y: '0' });
  const [islandDisplaySelection, setIslandDisplaySelection] = useState<string>('primary');
  const [islandDisplayOptions, setIslandDisplayOptions] = useState<Array<{ id: string; label: string }>>([
    { id: 'primary', label: t('settings.app.position.displayPrimaryOption', { defaultValue: '主显示器（推荐）' }) },
  ]);
  const [aboutVersion, setAboutVersion] = useState<string>('');

  /** 自动更新相关状态 */
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'latest'>('idle');
  const [updateVersion, setUpdateVersion] = useState<string>('');
  const [updateError, setUpdateError] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<{ percent: number; transferred: number; total: number; bytesPerSecond: number } | null>(null);
  const [updateAutoPromptEnabled, setUpdateAutoPromptEnabled] = useState<boolean>(true);
  const [announcementShowMode, setAnnouncementShowMode] = useState<AnnouncementShowMode>('version-update-only');
  const [updateSource, setUpdateSource] = useState<UpdateSourceKey>('cloudflare-r2');
  const UPDATE_SOURCES: { key: UpdateSourceKey; label: string; proOnly?: boolean }[] = [
    { key: 'cloudflare-r2', label: 'Cloudflare R2' },
    { key: 'tencent-cos', label: 'Tencent COS', proOnly: true },
    { key: 'aliyun-oss', label: 'Aliyun OSS', proOnly: true },
    { key: 'github', label: 'GitHub Releases' },
  ];
  const currentSourceLabel = UPDATE_SOURCES.find((s) => s.key === updateSource)?.label ?? updateSource;

  const handleUpdateSourceChange = (value: string): void => {
    const nextSource: UpdateSourceKey = value === 'github'
      ? 'github'
      : value === 'tencent-cos'
        ? 'tencent-cos'
        : value === 'aliyun-oss'
          ? 'aliyun-oss'
        : 'cloudflare-r2';
    if (isProOnlyUpdateSource(nextSource) && !isProUser) {
      setUpdateStatus('error');
      setUpdateError(t('settings.update.proOnlyError', { defaultValue: '该更新源仅 PRO 用户可用' }));
      return;
    }
    setUpdateSource(nextSource);
    setUpdateError('');
    window.api.storeWrite(UPDATE_SOURCE_STORE_KEY, nextSource).catch(() => {});
  };

  useEffect(() => {
    if (isProUser) return;
    if (!isProOnlyUpdateSource(updateSource)) return;
    setUpdateSource('cloudflare-r2');
    window.api.storeWrite(UPDATE_SOURCE_STORE_KEY, 'cloudflare-r2').catch(() => {});
  }, [isProUser, updateSource]);

  const resolveUpdateSourceUrl = async (source: UpdateSourceKey): Promise<string | undefined> => {
    if (!isProOnlyUpdateSource(source)) {
      return undefined;
    }
    if (!isProUser) {
      throw new Error(t('settings.update.proOnlyError', { defaultValue: '该更新源仅 PRO 用户可用' }));
    }
    if (!sessionToken) {
      throw new Error(t('settings.update.proOnlyNeedLogin', { defaultValue: '请先登录 PRO 账号后再使用该更新源' }));
    }
    const result = await fetchUpdateSourceUrl(sessionToken, source);
    if (!result.ok || !result.data?.url) {
      throw new Error(result.message || t('settings.update.sourceResolveFailed', { defaultValue: '获取更新源地址失败' }));
    }
    return result.data.url;
  };

  const handleUpdateAutoPromptEnabledChange = (enabled: boolean): void => {
    setUpdateAutoPromptEnabled(enabled);
    window.api.storeWrite(UPDATE_AUTO_PROMPT_STORE_KEY, enabled).catch(() => {});
  };

  const handleAnnouncementShowModeChange = (mode: AnnouncementShowMode): void => {
    setAnnouncementShowMode(mode);
    void writeAnnouncementShowMode(mode);
  };

  const persistIslandOpacity = (opacity: number): void => {
    window.api.islandOpacitySet(opacity).catch(() => {});
  };

  const applyBgMedia = (media: IslandBgMediaConfig | null, previewUrl: string | null): void => {
    const el = document.getElementById('island-bg-layer');
    if (el) {
      if (media?.type === 'image' && previewUrl) {
        el.style.backgroundImage = `url(${previewUrl})`;
        el.style.opacity = String(bgImageOpacity / 100);
        el.style.filter = `blur(${bgImageBlur}px)`;
      } else if (media?.type === 'video' && previewUrl) {
        el.style.backgroundImage = '';
        el.style.opacity = String(bgImageOpacity / 100);
        el.style.filter = `blur(${bgImageBlur}px)`;
      } else {
        el.style.backgroundImage = '';
        el.style.opacity = '0';
        el.style.filter = 'none';
      }
    }
    setBgMedia(media);
    setBgMediaPreviewUrl(previewUrl);
    window.dispatchEvent(new CustomEvent(LOCAL_ISLAND_BG_SYNC_EVENT, {
      detail: {
        media,
        previewUrl,
        image: media?.type === 'image' ? previewUrl : null,
      },
    }));
  };

  const applyBgOpacity = (value: number): void => {
    const el = document.getElementById('island-bg-layer');
    if (el) el.style.opacity = String(value / 100);
    window.dispatchEvent(new CustomEvent(LOCAL_ISLAND_BG_SYNC_EVENT, {
      detail: { opacity: value },
    }));
  };

  const applyBgBlur = (value: number): void => {
    const el = document.getElementById('island-bg-layer');
    if (el) {
      el.style.filter = value > 0 ? `blur(${value}px)` : 'none';
    }
    window.dispatchEvent(new CustomEvent(LOCAL_ISLAND_BG_SYNC_EVENT, {
      detail: { blur: value },
    }));
  };

  const applyBgVideoFit = (value: 'cover' | 'contain'): void => {
    window.dispatchEvent(new CustomEvent(LOCAL_ISLAND_BG_SYNC_EVENT, {
      detail: { videoFit: value },
    }));
  };

  const applyBgVideoMuted = (value: boolean): void => {
    window.dispatchEvent(new CustomEvent(LOCAL_ISLAND_BG_SYNC_EVENT, {
      detail: { videoMuted: value },
    }));
  };

  const applyBgVideoLoop = (value: boolean): void => {
    window.dispatchEvent(new CustomEvent(LOCAL_ISLAND_BG_SYNC_EVENT, {
      detail: { videoLoop: value },
    }));
  };

  const applyBgVideoVolume = (value: number): void => {
    const safe = Math.max(0, Math.min(1, value));
    window.dispatchEvent(new CustomEvent(LOCAL_ISLAND_BG_SYNC_EVENT, {
      detail: { videoVolume: safe },
    }));
  };

  const applyBgVideoRate = (value: number): void => {
    const safe = Math.max(0.25, Math.min(3, value));
    window.dispatchEvent(new CustomEvent(LOCAL_ISLAND_BG_SYNC_EVENT, {
      detail: { videoRate: safe },
    }));
  };

  const applyBgVideoHwDecode = (value: boolean): void => {
    window.dispatchEvent(new CustomEvent(LOCAL_ISLAND_BG_SYNC_EVENT, {
      detail: { videoHwDecode: value },
    }));
  };

  const persistBgMedia = (media: IslandBgMediaConfig | null): void => {
    window.api.storeWrite(ISLAND_BG_MEDIA_STORE_KEY, media).catch(() => {});
    const legacyImage = media?.type === 'image' ? media.source : null;
    window.api.storeWrite(ISLAND_BG_IMAGE_STORE_KEY, legacyImage).catch(() => {});
  };

  const persistBgVideoFit = (value: 'cover' | 'contain'): void => {
    window.api.storeWrite(ISLAND_BG_VIDEO_FIT_STORE_KEY, value).catch(() => {});
  };

  const persistBgVideoMuted = (value: boolean): void => {
    window.api.storeWrite(ISLAND_BG_VIDEO_MUTED_STORE_KEY, value).catch(() => {});
  };

  const persistBgVideoLoop = (value: boolean): void => {
    window.api.storeWrite(ISLAND_BG_VIDEO_LOOP_STORE_KEY, value).catch(() => {});
  };

  const persistBgVideoVolume = (value: number): void => {
    const safe = Math.max(0, Math.min(1, value));
    window.api.storeWrite(ISLAND_BG_VIDEO_VOLUME_STORE_KEY, safe).catch(() => {});
  };

  const persistBgVideoRate = (value: number): void => {
    const safe = Math.max(0.25, Math.min(3, value));
    window.api.storeWrite(ISLAND_BG_VIDEO_RATE_STORE_KEY, safe).catch(() => {});
  };

  const persistBgVideoHwDecode = (value: boolean): void => {
    window.api.storeWrite(ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY, value).catch(() => {});
  };

  const resolveDesktopWallpaperPreviewUrl = (previewUrl: string | null): string | null => {
    if (!previewUrl) return null;
    const trimmed = previewUrl.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://')) {
      return trimmed;
    }
    try {
      return new URL(trimmed, window.location.href).toString();
    } catch {
      return trimmed;
    }
  };

  const syncSystemDesktopWallpaperIfNeeded = async (
    media: IslandBgMediaConfig | null,
    previewUrl: string | null,
  ): Promise<void> => {
    if (!syncDesktopWallpaperOnBackgroundChange) return;
    if (!media) return;

    if (media.type === 'video') {
      const sourcePath = !isDirectBgMediaUrl(media.source) ? media.source : null;
      if (sourcePath) {
        const coverPath = await window.api.wallpaperVideoCover(sourcePath).catch(() => null);
        if (coverPath) {
          await window.api.setSystemDesktopWallpaper({ sourcePath: coverPath, previewUrl: coverPath }).catch(() => false);
          return;
        }
      }
    }

    const sourcePath = !isDirectBgMediaUrl(media.source) ? media.source : null;
    const normalizedPreview = resolveDesktopWallpaperPreviewUrl(previewUrl);
    await window.api.setSystemDesktopWallpaper({ sourcePath, previewUrl: normalizedPreview }).catch(() => false);
  };

  const persistBgOpacity = (value: number): void => {
    window.api.storeWrite('island-bg-opacity', value).catch(() => {});
  };

  const persistBgBlur = (value: number): void => {
    window.api.storeWrite('island-bg-blur', value).catch(() => {});
  };

  const handleSelectBgImage = async (): Promise<void> => {
    const filePath = await window.api.openImageDialog();
    if (!filePath) return;
    const dataUrl = await window.api.loadWallpaperFile(filePath);
    if (!dataUrl) return;
    const media: IslandBgMediaConfig = { type: 'image', source: filePath };
    applyBgMedia(media, dataUrl);
    persistBgMedia(media);
    void syncSystemDesktopWallpaperIfNeeded(media, dataUrl);
  };

  const handleSelectBgVideo = async (): Promise<void> => {
    const filePath = await window.api.openVideoDialog();
    if (!filePath) return;
    const media: IslandBgMediaConfig = { type: 'video', source: filePath };
    const previewUrl = await resolveBgMediaPreviewUrl(media);
    if (!previewUrl) return;
    applyBgMedia(media, previewUrl);
    persistBgMedia(media);
    void syncSystemDesktopWallpaperIfNeeded(media, previewUrl);
  };

  const handleClearBgImage = (): void => {
    applyBgMedia(null, null);
    persistBgMedia(null);
    window.api.storeWrite(ISLAND_BG_IMAGE_STORE_KEY, null).catch(() => {});
    window.api.settingsPreview('store:island-bg-image', null).catch(() => {});
    window.api.setSystemDesktopWallpaper({ clear: true }).catch(() => false);
    window.api.clearWallpaperCache?.().catch(() => {});
  };

  const handleSelectBuiltinBgImage = (src: string, defaultOpacity: number): void => {
    const media: IslandBgMediaConfig = { type: 'image', source: src };
    setBgImageOpacity(defaultOpacity);
    applyBgMedia(media, src);
    applyBgOpacity(defaultOpacity);
    persistBgMedia(media);
    persistBgOpacity(defaultOpacity);
    void syncSystemDesktopWallpaperIfNeeded(media, src);
  };

  const handleApplyMarketplaceWallpaper = (mediaUrl: string, options?: { type?: 'image' | 'video' }): void => {
    if (!mediaUrl) return;
    const mediaType: 'image' | 'video' = options?.type === 'video' ? 'video' : 'image';
    const media: IslandBgMediaConfig = { type: mediaType, source: mediaUrl };
    applyBgMedia(media, mediaUrl);
    persistBgMedia(media);
    void syncSystemDesktopWallpaperIfNeeded(media, mediaUrl);
    if (mediaType === 'image') {
      window.api.settingsPreview('store:island-bg-image', mediaUrl).catch(() => {});
    }
    window.api.settingsPreview('store:island-bg-media', media).catch(() => {});
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
    window.api.storeRead(MAIL_CONFIG_STORE_KEY).then((value) => {
      if (cancelled || !value || typeof value !== 'object') return;
      const next = value as Partial<MailAccountConfig>;

      setMailEmailAddress(typeof next.emailAddress === 'string' ? next.emailAddress : DEFAULT_MAIL_ACCOUNT_CONFIG.emailAddress);
      setMailImapHost(typeof next.imapHost === 'string' ? next.imapHost : DEFAULT_MAIL_ACCOUNT_CONFIG.imapHost);
      setMailImapPort(typeof next.imapPort === 'string' ? next.imapPort : DEFAULT_MAIL_ACCOUNT_CONFIG.imapPort);
      setMailImapSecure(typeof next.imapSecure === 'boolean' ? next.imapSecure : DEFAULT_MAIL_ACCOUNT_CONFIG.imapSecure);
      setMailSmtpHost(typeof next.smtpHost === 'string' ? next.smtpHost : DEFAULT_MAIL_ACCOUNT_CONFIG.smtpHost);
      setMailSmtpPort(typeof next.smtpPort === 'string' ? next.smtpPort : DEFAULT_MAIL_ACCOUNT_CONFIG.smtpPort);
      setMailSmtpSecure(typeof next.smtpSecure === 'boolean' ? next.smtpSecure : DEFAULT_MAIL_ACCOUNT_CONFIG.smtpSecure);
      setMailAuthUser(typeof next.authUser === 'string' ? next.authUser : DEFAULT_MAIL_ACCOUNT_CONFIG.authUser);
      setMailAuthSecret(typeof next.authSecret === 'string' ? next.authSecret : DEFAULT_MAIL_ACCOUNT_CONFIG.authSecret);
    }).catch(() => {});
    setMailConfigLoaded(true);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!mailConfigLoaded) return;
    const config: MailAccountConfig = {
      emailAddress: mailEmailAddress.trim(),
      imapHost: mailImapHost.trim(),
      imapPort: mailImapPort.trim(),
      imapSecure: mailImapSecure,
      smtpHost: mailSmtpHost.trim(),
      smtpPort: mailSmtpPort.trim(),
      smtpSecure: mailSmtpSecure,
      authUser: mailAuthUser.trim(),
      authSecret: mailAuthSecret,
    };
    window.api.storeWrite(MAIL_CONFIG_STORE_KEY, config).catch(() => {});
  }, [
    mailConfigLoaded,
    mailEmailAddress,
    mailImapHost,
    mailImapPort,
    mailImapSecure,
    mailSmtpHost,
    mailSmtpPort,
    mailSmtpSecure,
    mailAuthUser,
    mailAuthSecret,
  ]);

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
    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (channel === 'settings:open-tab') {
        if (value === 'update') {
          setActiveTab('update');
        }
        if (value === 'about-feedback') {
          setActiveTab('about');
          setAboutInitialPage('feedback');
        }
        if (value === 'user-orders') {
          setActiveTab('user');
          setUserInitialProfilePage('orders');
        }
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
    });
    return () => {
      cancelled = true;
      unsub();
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
    window.api.musicLyricsKaraokeGet().then((enabled) => {
      if (cancelled) return;
      setLyricsKaraoke(enabled);
    }).catch(() => {});
    window.api.musicLyricsClockGet().then((enabled) => {
      if (cancelled) return;
      setLyricsClock(enabled);
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
      if (data && typeof data === 'object' && 'left' in (data as object) && 'right' in (data as object)) {
        setLayoutConfig(data as OverviewLayoutConfig);
      }
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
      setUpdateSource(value === 'github' ? 'github' : value === 'tencent-cos' ? 'tencent-cos' : value === 'aliyun-oss' ? 'aliyun-oss' : 'cloudflare-r2');
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
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(UPDATE_AUTO_PROMPT_STORE_KEY).then((value) => {
      if (cancelled) return;
      setUpdateAutoPromptEnabled(typeof value === 'boolean' ? value : true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    readAnnouncementShowMode().then((mode) => {
      if (cancelled) return;
      setAnnouncementShowMode(mode);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /** 监听下载进度 */
  useEffect(() => {
    const unsub = window.api.onUpdaterProgress?.((progress) => {
      setDownloadProgress(progress);
    });
    return () => { unsub?.(); };
  }, []);

  useEffect(() => {
    const unsub = window.api.onUpdaterAvailable?.((data) => {
      if (!updateAutoPromptEnabled) return;
      setUpdateVersion(data.version);
      setUpdateStatus('available');
      setUpdateError('');
    });
    return () => { unsub?.(); };
  }, [updateAutoPromptEnabled]);

  /** 检查更新（通过 electron-updater） */
  const handleCheckUpdate = async (): Promise<void> => {
    setUpdateStatus('checking');
    setUpdateError('');
    setDownloadProgress(null);
    try {
      const resolvedUrl = await resolveUpdateSourceUrl(updateSource);
      const result = await window.api.updaterCheck(updateSource, resolvedUrl);
      if (result.error) {
        setUpdateStatus('error');
        setUpdateError(result.error);
      } else if (result.available && result.version) {
        setUpdateStatus('available');
        setUpdateVersion(result.version);
      } else {
        setUpdateStatus('latest');
      }
    } catch (err) {
      setUpdateStatus('error');
      setUpdateError(`检查更新失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  /** 下载更新 */
  const handleDownloadUpdate = async (): Promise<void> => {
    setUpdateStatus('downloading');
    setDownloadProgress(null);
    try {
      const resolvedUrl = await resolveUpdateSourceUrl(updateSource);
      const ok = await window.api.updaterDownload(updateSource, resolvedUrl);
      if (ok) {
        setUpdateStatus('ready');
      } else {
        setUpdateStatus('error');
        setUpdateError('下载失败，请稍后重试');
      }
    } catch (err) {
      setUpdateStatus('error');
      setUpdateError(`下载失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  /** 安装更新 */
  const handleInstallUpdate = (): void => {
    window.api.updaterInstall().catch(() => {});
  };

  const updateLayout = (side: 'left' | 'right', value: OverviewWidgetType): void => {
    const updated = { ...layoutConfig, [side]: value };
    setLayoutConfig(updated);
    window.api.storeWrite(LAYOUT_STORE_KEY, updated).catch(() => {});
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

  const isDuplicateHotkey = (acc: string, exclude: 'hide' | 'quit' | 'screenshot' | 'next-song' | 'play-pause-song' | 'reset-position' | 'toggle-tray' | 'show-settings-window' | 'open-clipboard-history' | 'toggle-passthrough' | 'toggle-ui-lock'): boolean => {
    const pairs: Array<{ key: 'hide' | 'quit' | 'screenshot' | 'next-song' | 'play-pause-song' | 'reset-position' | 'toggle-tray' | 'show-settings-window' | 'open-clipboard-history' | 'toggle-passthrough' | 'toggle-ui-lock'; value: string }> = [
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
      setHotkeyError('重复快捷键');
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
        setHotkeyError('快捷键注册失败，请尝试其他组合');
      }
    }).catch(() => {
      setHotkeyError('快捷键注册失败');
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
      setQuitHotkeyError('重复快捷键');
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
        setQuitHotkeyError('快捷键注册失败，请尝试其他组合');
      }
    }).catch(() => {
      setQuitHotkeyError('快捷键注册失败');
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
      setScreenshotHotkeyError('重复快捷键');
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
        setScreenshotHotkeyError('快捷键注册失败，请尝试其他组合');
      }
    }).catch(() => {
      setScreenshotHotkeyError('快捷键注册失败');
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
      setResetPositionHotkeyError('重复快捷键');
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
        setResetPositionHotkeyError('快捷键注册失败，请尝试其他组合');
      }
    }).catch(() => {
      setResetPositionHotkeyError('快捷键注册失败');
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
      setToggleTrayHotkeyError('重复快捷键');
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
        setToggleTrayHotkeyError('快捷键注册失败，请尝试其他组合');
      }
    }).catch(() => {
      setToggleTrayHotkeyError('快捷键注册失败');
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
      setShowSettingsWindowHotkeyError('重复快捷键');
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
        setShowSettingsWindowHotkeyError('快捷键注册失败，请尝试其他组合');
      }
    }).catch(() => {
      setShowSettingsWindowHotkeyError('快捷键注册失败');
    });
  };

  const handleOpenClipboardHistoryHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setOpenClipboardHistoryHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'open-clipboard-history')) {
      setOpenClipboardHistoryHotkeyError('重复快捷键');
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
        setOpenClipboardHistoryHotkeyError('快捷键注册失败，请尝试其他组合');
      }
    }).catch(() => {
      setOpenClipboardHistoryHotkeyError('快捷键注册失败');
    });
  };

  const handleTogglePassthroughHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setTogglePassthroughHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'toggle-passthrough')) {
      setTogglePassthroughHotkeyError('重复快捷键');
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
        setTogglePassthroughHotkeyError('快捷键注册失败，请尝试其他组合');
      }
    }).catch(() => {
      setTogglePassthroughHotkeyError('快捷键注册失败');
    });
  };

  const handleToggleUiLockHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setToggleUiLockHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'toggle-ui-lock')) {
      setToggleUiLockHotkeyError('重复快捷键');
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
        setToggleUiLockHotkeyError('快捷键注册失败，请尝试其他组合');
      }
    }).catch(() => {
      setToggleUiLockHotkeyError('快捷键注册失败');
    });
  };

  const handleNextSongHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setNextSongHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'next-song')) {
      setNextSongHotkeyError('重复快捷键');
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
        setNextSongHotkeyError('快捷键注册失败，请尝试其他组合');
      }
    }).catch(() => {
      setNextSongHotkeyError('快捷键注册失败');
    });
  };

  const handlePlayPauseSongHotkeyKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setPlayPauseSongHotkeyError('');
    const acc = keyEventToAccelerator(e);
    if (!acc) return;
    if (isDuplicateHotkey(acc, 'play-pause-song')) {
      setPlayPauseSongHotkeyError('重复快捷键');
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
        setPlayPauseSongHotkeyError('快捷键注册失败，请尝试其他组合');
      }
    }).catch(() => {
      setPlayPauseSongHotkeyError('快捷键注册失败');
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
      setWhitelistInputError('已在白名单中');
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
        setMusicSmtcConfigMessage({ type: 'error', text: '请输入有效毫秒值（>= 1000）或开启“永不取消订阅”' });
        return;
      }
    }

    const ok = await window.api.musicSmtcUnsubscribeMsSet(valueMs);
    if (!ok) {
      setMusicSmtcConfigMessage({ type: 'error', text: '保存失败，请稍后重试' });
      return;
    }

    if (musicSmtcNeverUnsubscribe) {
      setMusicSmtcConfigMessage({ type: 'success', text: '已保存：永不自动取消订阅' });
      return;
    }

    setMusicSmtcConfigMessage({ type: 'success', text: `已保存：${Math.round(valueMs)} ms 自动取消订阅` });
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
              setActiveTab={setActiveTab}
              onAction={(actionId) => {
                if (actionId === 'guide') {
                  setGuide();
                  window.api.settingsPreview('guide:show', true).catch(() => {});
                  return;
                }
                if (actionId === 'user-pro') {
                  setUserInitialProfilePage('pro');
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
              updateLayout={updateLayout}
              hideProcessFilter={hideProcessFilter}
              setHideProcessFilter={setHideProcessFilter}
              refreshRunningProcesses={refreshRunningProcesses}
              hideProcessLoading={hideProcessLoading}
              hideProcessList={hideProcessList}
              toggleHideProcess={toggleHideProcess}
              runningProcesses={runningProcesses}
              hideProcessKeyword={hideProcessKeyword}
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
              emailAddress={mailEmailAddress}
              imapHost={mailImapHost}
              imapPort={mailImapPort}
              imapSecure={mailImapSecure}
              smtpHost={mailSmtpHost}
              smtpPort={mailSmtpPort}
              smtpSecure={mailSmtpSecure}
              authUser={mailAuthUser}
              authSecret={mailAuthSecret}
              setEmailAddress={setMailEmailAddress}
              setImapHost={setMailImapHost}
              setImapPort={setMailImapPort}
              setImapSecure={setMailImapSecure}
              setSmtpHost={setMailSmtpHost}
              setSmtpPort={setMailSmtpPort}
              setSmtpSecure={setMailSmtpSecure}
              setAuthUser={setMailAuthUser}
              setAuthSecret={setMailAuthSecret}
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
              lyricsKaraoke={lyricsKaraoke}
              setLyricsKaraoke={setLyricsKaraoke}
              lyricsClock={lyricsClock}
              setLyricsClock={setLyricsClock}
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
            />
          )}

          {activeTab === 'pluginMarket' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title settings-app-title-line">
                <span>{t('settings.labels.pluginMarket', { defaultValue: '插件市场' })}</span>
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
                    {pluginMarketPage === 'plugin' && (
                      <div className="max-expand-settings-section" />
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
                      className={`settings-app-page-dot ${pluginMarketPage === 'plugin' ? 'active' : ''}`}
                      data-label={t('settings.pluginMarket.pages.plugin', { defaultValue: '插件' })}
                      onClick={() => setPluginMarketPage('plugin')}
                      title={t('settings.pluginMarket.pages.plugin', { defaultValue: '插件' })}
                      aria-label={t('settings.pluginMarket.pages.plugin', { defaultValue: '插件' })}
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
                    {t('settings.pluginMarket.auth.entryTitle', { defaultValue: '登录后即可访问插件市场内容' })}
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
