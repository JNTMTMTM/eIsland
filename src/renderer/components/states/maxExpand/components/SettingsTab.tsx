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
import useIslandStore from '../../../../store/slices';
import type { OverviewWidgetType, OverviewLayoutConfig } from '../../expand/components/OverviewTab';
import { OVERVIEW_WIDGET_OPTIONS } from '../../expand/components/OverviewTab';
import {
  loadNetworkConfig,
  saveNetworkConfig,
  DEFAULT_NETWORK_TIMEOUT_MS,
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
  MUSIC_SETTINGS_PAGES,
  MUSIC_SETTINGS_PAGE_LABELS,
  NAV_CARDS,
  DEFAULT_NAV_ORDER,
  NAV_CARDS_MAP,
  type SettingsSidebarTabKey,
  type AppSettingsPageKey,
  type WeatherSettingsPageKey,
  type MusicSettingsPageKey,
  type NavCardDef,
} from './setting/utils/settingsConfig';
import { UpdateSettingsSection } from './setting/components/update/UpdateSettingsSection';
import { IndexSettingsSection } from './setting/components/index/IndexSettingsSection';
import { AppSettingsSection } from './setting/components/app/AppSettingsSection';
import { NetworkSettingsSection } from './setting/components/network/NetworkSettingsSection';
import { WeatherSettingsSection } from './setting/components/weather/WeatherSettingsSection';
import { ShortcutSettingsSection } from './setting/components/shortcut/ShortcutSettingsSection';
import { MusicSettingsSection } from './setting/components/music/MusicSettingsSection';
import { AiSettingsSection } from './setting/components/ai/AiSettingsSection';
import { AboutSettingsSection } from './setting/components/about/AboutSettingsSection';
import { OverviewPreview } from './setting/components/app/preview/OverviewPreview';

import { resolveDistrictLocationByKeyword } from '../../../../api/adcodeApi';

import { setThemeMode as applyThemeMode, getThemeMode, type ThemeMode } from '../../../../utils/theme';

const CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY = 'clipboard-url-suppress-in-url-favorites';

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

/**
 * 渲染设置面板主视图
 * @description 提供应用设置、AI 配置与关于软件三类设置入口
 * @returns 设置 Tab 组件
 */
export function SettingsTab(): ReactElement {
  const opacitySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsSidebarTabKey>('index');
  const [appSettingsPage, setAppSettingsPage] = useState<AppSettingsPageKey>('layout-preview');
  const [weatherSettingsPage, setWeatherSettingsPage] = useState<WeatherSettingsPageKey>('location');
  const [musicSettingsPage, setMusicSettingsPage] = useState<MusicSettingsPageKey>('whitelist');
  const { aiConfig, setAiConfig, fetchWeatherData, setGuide } = useIslandStore();
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const appSettingsPageRef = useRef(appSettingsPage);
  const currentAppSettingsPageLabel = SETTINGS_TAB_LABELS[appSettingsPage] || '布局预览';
  appSettingsPageRef.current = appSettingsPage;
  const weatherSettingsPageRef = useRef(weatherSettingsPage);
  const currentWeatherSettingsPageLabel = WEATHER_SETTINGS_PAGE_LABELS[weatherSettingsPage] || '定位配置';
  weatherSettingsPageRef.current = weatherSettingsPage;
  const musicSettingsPageRef = useRef(musicSettingsPage);
  const currentMusicSettingsPageLabel = MUSIC_SETTINGS_PAGE_LABELS[musicSettingsPage] || '白名单';
  musicSettingsPageRef.current = musicSettingsPage;

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
  const [sourceAppDetectMessage, setSourceAppDetectMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [musicSmtcUnsubscribeInput, setMusicSmtcUnsubscribeInput] = useState<string>('5000');
  const [musicSmtcNeverUnsubscribe, setMusicSmtcNeverUnsubscribe] = useState(true);
  const [musicSmtcConfigMessage, setMusicSmtcConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /** 网络配置相关状态 */
  const [networkTimeoutMs, setNetworkTimeoutMs] = useState<number>(DEFAULT_NETWORK_TIMEOUT_MS);
  const [customTimeoutInput, setCustomTimeoutInput] = useState<string>('');
  const [weatherPrimaryProvider, setWeatherPrimaryProvider] = useState<WeatherProvider>(DEFAULT_WEATHER_PRIMARY_PROVIDER);
  const [weatherLocationPriority, setWeatherLocationPriority] = useState<WeatherLocationPriority>(DEFAULT_WEATHER_LOCATION_PRIORITY);
  const [weatherCustomCityInput, setWeatherCustomCityInput] = useState<string>('');
  const [weatherLocationConfigMessage, setWeatherLocationConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [weatherCustomLocationTesting, setWeatherCustomLocationTesting] = useState(false);
  const [weatherCustomLocationTestMessage, setWeatherCustomLocationTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [runningProcesses, setRunningProcesses] = useState<RunningWindowItem[]>([]);
  const [hideProcessList, setHideProcessList] = useState<string[]>([]);
  const [hideProcessFilter, setHideProcessFilter] = useState<string>('');
  const [hideProcessLoading, setHideProcessLoading] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getThemeMode);
  const [islandOpacity, setIslandOpacity] = useState<number>(100);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgImageOpacity, setBgImageOpacity] = useState<number>(30);
  const bgOpacitySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [islandPositionOffset, setIslandPositionOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [islandPositionInput, setIslandPositionInput] = useState<{ x: string; y: string }>({ x: '0', y: '0' });
  const [aboutVersion, setAboutVersion] = useState<string>('');

  /** 自动更新相关状态 */
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'latest'>('idle');
  const [updateVersion, setUpdateVersion] = useState<string>('');
  const [updateError, setUpdateError] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<{ percent: number; transferred: number; total: number; bytesPerSecond: number } | null>(null);
  const [updateSource, setUpdateSource] = useState<string>('cloudflare-r2');
  const UPDATE_SOURCES: { key: string; label: string }[] = [
    { key: 'cloudflare-r2', label: 'Cloudflare R2' },
  ];
  const currentSourceLabel = UPDATE_SOURCES.find((s) => s.key === updateSource)?.label ?? updateSource;

  const persistIslandOpacity = (opacity: number): void => {
    window.api.islandOpacitySet(opacity).catch(() => {});
  };

  const applyBgImage = (dataUrl: string | null): void => {
    const el = document.getElementById('island-bg-layer');
    if (!el) return;
    if (dataUrl) {
      el.style.backgroundImage = `url(${dataUrl})`;
      el.style.opacity = String(bgImageOpacity / 100);
    } else {
      el.style.backgroundImage = '';
      el.style.opacity = '0';
    }
  };

  const applyBgOpacity = (value: number): void => {
    const el = document.getElementById('island-bg-layer');
    if (el) el.style.opacity = String(value / 100);
  };

  const persistBgImage = (path: string | null): void => {
    window.api.storeWrite('island-bg-image', path).catch(() => {});
  };

  const persistBgOpacity = (value: number): void => {
    window.api.storeWrite('island-bg-opacity', value).catch(() => {});
  };

  const handleSelectBgImage = async (): Promise<void> => {
    const filePath = await window.api.openImageDialog();
    if (!filePath) return;
    const dataUrl = await window.api.loadWallpaperFile(filePath);
    if (!dataUrl) return;
    setBgImage(dataUrl);
    applyBgImage(dataUrl);
    persistBgImage(filePath);
  };

  const handleClearBgImage = (): void => {
    setBgImage(null);
    applyBgImage(null);
    persistBgImage(null);
    window.api.clearWallpaperCache?.().catch(() => {});
  };

  const handleSelectBuiltinBgImage = (src: string, defaultOpacity: number): void => {
    setBgImage(src);
    setBgImageOpacity(defaultOpacity);
    const el = document.getElementById('island-bg-layer');
    if (el) {
      el.style.backgroundImage = `url(${src})`;
      el.style.opacity = String(defaultOpacity / 100);
    }
    persistBgImage(src);
    persistBgOpacity(defaultOpacity);
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

  const hideProcessKeyword = hideProcessFilter.trim().toLowerCase();


  /** 加载网络配置 */
  useEffect(() => {
    const cfg = loadNetworkConfig();
    setNetworkTimeoutMs(cfg.timeoutMs);
    setCustomTimeoutInput(String(cfg.timeoutMs / 1000));
  }, []);

  useEffect(() => {
    const cfg = loadWeatherProviderConfig();
    setWeatherPrimaryProvider(cfg.primaryProvider);
  }, []);

  useEffect(() => {
    const cfg = loadWeatherLocationConfig();
    setWeatherLocationPriority(cfg.priority);
    setWeatherCustomCityInput(cfg.customLocation?.city || '');
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
    window.api.islandOpacityGet().then((val) => {
      if (cancelled) return;
      const safe = typeof val === 'number' ? Math.max(10, Math.min(100, Math.round(val))) : 100;
      setIslandOpacity(safe);
      applyIslandOpacity(safe);
    }).catch(() => {});
    Promise.all([
      window.api.storeRead('island-bg-image') as Promise<string | null>,
      window.api.storeRead('island-bg-opacity') as Promise<number | null>,
    ]).then(async ([img, opacity]) => {
      if (cancelled) return;
      if (typeof opacity === 'number' && Number.isFinite(opacity)) setBgImageOpacity(Math.max(0, Math.min(100, Math.round(opacity))));
      if (img && typeof img === 'string') {
        if (img.startsWith('data:') || img.startsWith('/') || img.startsWith('http')) {
          // Legacy data URL or Vite asset URL (built-in wallpaper)
          setBgImage(img);
        } else {
          // File path — load via IPC
          const dataUrl = await window.api.loadWallpaperFile?.(img);
          if (!cancelled && dataUrl) setBgImage(dataUrl);
        }
      }
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
        const validHidden = hiddenRaw.filter((id, idx) => NAV_CARDS_MAP.has(id) && hiddenRaw.indexOf(id) === idx && !validVisible.includes(id));
        setNavOrder(validVisible);
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

  /** 监听下载进度 */
  useEffect(() => {
    const unsub = window.api.onUpdaterProgress?.((progress) => {
      setDownloadProgress(progress);
    });
    return () => { unsub?.(); };
  }, []);

  /** 检查更新（通过 electron-updater） */
  const handleCheckUpdate = async (): Promise<void> => {
    setUpdateStatus('checking');
    setUpdateError('');
    setDownloadProgress(null);
    try {
      const result = await window.api.updaterCheck();
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
      const ok = await window.api.updaterDownload();
      if (ok) {
        setUpdateStatus('ready');
      } else {
        setUpdateStatus('error');
        setUpdateError('下载失败，请稍后重试');
      }
    } catch {
      setUpdateStatus('error');
      setUpdateError('下载失败，请检查网络连接');
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

  const islandPositionInputChanged =
    islandPositionInput.x.trim() !== String(islandPositionOffset.x)
    || islandPositionInput.y.trim() !== String(islandPositionOffset.y);

  const applyWeatherLocationPriority = async (nextPriority: WeatherLocationPriority): Promise<void> => {
    setWeatherLocationPriority(nextPriority);

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
          ? '已切换为自定义位置优先，但未配置城市，将自动回退到 IP 定位'
          : '定位来源优先级已立即生效',
      });
      setWeatherCustomLocationTestMessage(null);
      fetchWeatherData(undefined, true).catch(() => {});
    } catch (error) {
      setWeatherLocationConfigMessage({
        type: 'error',
        text: `切换优先级失败：${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  };

  const saveWeatherLocationSettings = async (): Promise<void> => {
    const city = weatherCustomCityInput.trim();
    if (weatherLocationPriority === 'custom' && !city) {
      setWeatherLocationConfigMessage({ type: 'error', text: '请选择“自定义位置优先”时请先输入城市名称' });
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
          ? `天气定位配置已保存（${customLocation.city} ${customLocation.latitude.toFixed(4)}, ${customLocation.longitude.toFixed(4)}）`
          : '天气定位配置已保存',
      });
      setWeatherCustomLocationTestMessage(null);
      fetchWeatherData(undefined, true).catch(() => {});
    } catch (error) {
      setWeatherLocationConfigMessage({
        type: 'error',
        text: `城市解析失败：${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  };

  const testWeatherCustomLocation = async (): Promise<void> => {
    const city = weatherCustomCityInput.trim();
    if (!city) {
      setWeatherCustomLocationTestMessage({ type: 'error', text: '请先输入城市名称后再测试' });
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
        text: `城市解析失败：${error instanceof Error ? error.message : '未知错误'}`,
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
        throw new Error(`${name} 返回了非 JSON`);
      }
      JSON.parse(resp.body);
      return `${name} 可用`;
    };

    try {
      const [openMeteoResult, uapiResult] = await Promise.allSettled([
        testProvider('Open-Meteo', openMeteoUrl),
        testProvider('UAPI', uapiUrl),
      ]);

      const messages: string[] = [];
      let hasFailure = false;

      if (openMeteoResult.status === 'fulfilled') {
        messages.push(openMeteoResult.value);
      } else {
        hasFailure = true;
        messages.push(`Open-Meteo 不可用：${openMeteoResult.reason instanceof Error ? openMeteoResult.reason.message : '未知错误'}`);
      }

      if (uapiResult.status === 'fulfilled') {
        messages.push(uapiResult.value);
      } else {
        hasFailure = true;
        messages.push(`UAPI 不可用：${uapiResult.reason instanceof Error ? uapiResult.reason.message : '未知错误'}`);
      }

      setWeatherCustomLocationTestMessage({
        type: hasFailure ? 'error' : 'success',
        text: `${custom.city}（${custom.latitude.toFixed(4)}, ${custom.longitude.toFixed(4)}） - ${messages.join('；')}`,
      });
    } finally {
      setWeatherCustomLocationTesting(false);
    }
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

      return;
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const startEditPrompt = (): void => {
    setPromptDraft(aiConfig.systemPrompt);
    setEditingPrompt(true);
    requestAnimationFrame(() => promptRef.current?.focus());
  };

  const savePrompt = (): void => {
    setAiConfig({ systemPrompt: promptDraft });
    setEditingPrompt(false);
  };

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

  const isDuplicateHotkey = (acc: string, exclude: 'hide' | 'quit' | 'screenshot' | 'next-song' | 'play-pause-song' | 'reset-position'): boolean => {
    const pairs: Array<{ key: 'hide' | 'quit' | 'screenshot' | 'next-song' | 'play-pause-song' | 'reset-position'; value: string }> = [
      { key: 'hide', value: hideHotkey },
      { key: 'quit', value: quitHotkey },
      { key: 'screenshot', value: screenshotHotkey },
      { key: 'next-song', value: nextSongHotkey },
      { key: 'play-pause-song', value: playPauseSongHotkey },
      { key: 'reset-position', value: resetPositionHotkey },
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
    setSourceAppDetectMessage(null);
    try {
      const result = await window.api.musicDetectSourceAppId();
      if (result.ok && result.sourceAppId) {
        setWhitelistDraft(result.sourceAppId);
        setSourceAppDetectMessage({ type: 'success', text: `获取成功：${result.sourceAppId}` });
      } else {
        setSourceAppDetectMessage({ type: 'error', text: result.message || '获取失败' });
      }
    } catch {
      setSourceAppDetectMessage({ type: 'error', text: '获取失败：脚本调用异常' });
    } finally {
      setDetectingSourceAppId(false);
    }
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
          <div className="max-expand-settings-sidebar-title">设置</div>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'index' ? 'active' : ''}`}
            onClick={() => setActiveTab('index')}
            type="button"
          >
            <span className="sidebar-dot" />
            {SETTINGS_TAB_LABELS.index}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'app' ? 'active' : ''}`}
            onClick={() => setActiveTab('app')}
            type="button"
          >
            <span className="sidebar-dot" />
            {SETTINGS_TAB_LABELS.app}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'network' ? 'active' : ''}`}
            onClick={() => setActiveTab('network')}
            type="button"
          >
            <span className="sidebar-dot" />
            {SETTINGS_TAB_LABELS.network}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'weather' ? 'active' : ''}`}
            onClick={() => setActiveTab('weather')}
            type="button"
          >
            <span className="sidebar-dot" />
            {SETTINGS_TAB_LABELS.weather}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'music' ? 'active' : ''}`}
            onClick={() => setActiveTab('music')}
            type="button"
          >
            <span className="sidebar-dot" />
            {SETTINGS_TAB_LABELS.music}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
            type="button"
          >
            <span className="sidebar-dot" />
            {SETTINGS_TAB_LABELS.ai}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'shortcut' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortcut')}
            type="button"
          >
            <span className="sidebar-dot" />
            {SETTINGS_TAB_LABELS.shortcut}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'update' ? 'active' : ''}`}
            onClick={() => setActiveTab('update')}
            type="button"
          >
            <span className="sidebar-dot" />
            {SETTINGS_TAB_LABELS.update}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
            type="button"
          >
            <span className="sidebar-dot" />
            {SETTINGS_TAB_LABELS.about}
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
                if (actionId === 'guide') setGuide();
              }}
            />
          )}

          {activeTab === 'app' && (
            <AppSettingsSection
              currentAppSettingsPageLabel={currentAppSettingsPageLabel}
              appSettingsPage={appSettingsPage}
              layoutConfig={layoutConfig}
              OverviewPreviewComponent={OverviewPreview}
              overviewWidgetOptions={OVERVIEW_WIDGET_OPTIONS}
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
              themeMode={themeMode}
              setThemeModeState={setThemeModeState}
              applyThemeMode={applyThemeMode}
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
              bgImage={bgImage}
              bgImageOpacity={bgImageOpacity}
              setBgImageOpacity={setBgImageOpacity}
              applyBgOpacity={applyBgOpacity}
              persistBgOpacity={persistBgOpacity}
              bgOpacitySaveTimerRef={bgOpacitySaveTimerRef}
              handleSelectBgImage={handleSelectBgImage}
              handleClearBgImage={handleClearBgImage}
              handleSelectBuiltinBgImage={handleSelectBuiltinBgImage}
              appSettingsPages={APP_SETTINGS_PAGES}
              settingsTabLabels={SETTINGS_TAB_LABELS}
              setAppSettingsPage={setAppSettingsPage}
            />
          )}

          {activeTab === 'network' && (
            <NetworkSettingsSection
              networkTimeoutMs={networkTimeoutMs}
              customTimeoutInput={customTimeoutInput}
              networkTimeoutOptions={NETWORK_TIMEOUT_OPTIONS}
              setNetworkTimeoutMs={setNetworkTimeoutMs}
              setCustomTimeoutInput={setCustomTimeoutInput}
              saveNetworkConfig={saveNetworkConfig}
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
              setWeatherPrimaryProvider={setWeatherPrimaryProvider}
              saveWeatherProviderConfig={saveWeatherProviderConfig}
              weatherSettingsPages={WEATHER_SETTINGS_PAGES}
              weatherSettingsPageLabels={WEATHER_SETTINGS_PAGE_LABELS}
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
              sourceAppDetectMessage={sourceAppDetectMessage}
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
              musicSettingsPageLabels={MUSIC_SETTINGS_PAGE_LABELS}
              setMusicSettingsPage={setMusicSettingsPage}
            />
          )}

          {activeTab === 'ai' && (
            <AiSettingsSection
              aiConfig={aiConfig}
              editingPrompt={editingPrompt}
              promptDraft={promptDraft}
              promptRef={promptRef}
              setAiConfig={setAiConfig}
              setPromptDraft={setPromptDraft}
              savePrompt={savePrompt}
              startEditPrompt={startEditPrompt}
              SettingsFieldComponent={SettingsField}
            />
          )}

          {activeTab === 'update' && (
            <UpdateSettingsSection
              aboutVersion={aboutVersion}
              updateSource={updateSource}
              updateSources={UPDATE_SOURCES}
              updateStatus={updateStatus}
              updateVersion={updateVersion}
              downloadProgress={downloadProgress}
              currentSourceLabel={currentSourceLabel}
              updateError={updateError}
              onUpdateSourceChange={setUpdateSource}
              onCheckUpdate={handleCheckUpdate}
              onDownloadUpdate={handleDownloadUpdate}
              onInstallUpdate={handleInstallUpdate}
            />
          )}

          {activeTab === 'about' && <AboutSettingsSection aboutVersion={aboutVersion} />}
        </div>
      </div>
    </div>
  );
}
