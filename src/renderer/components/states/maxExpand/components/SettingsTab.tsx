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
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';
import useIslandStore from '../../../../store/slices';
import type { OverviewWidgetType, OverviewLayoutConfig } from '../../expand/components/OverviewTab';
import { OVERVIEW_WIDGET_OPTIONS } from '../../expand/components/OverviewTab';
import { SvgIcon } from '../../../../utils/SvgIcon';
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
  SETTINGS_TABS,
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

import { resolveDistrictLocationByKeyword } from '../../../../api/adcodeApi';

import { setThemeMode as applyThemeMode, getThemeMode, type ThemeMode } from '../../../../utils/theme';

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

/** 倒数日数据 */
interface PreviewCountdownItem {
  id: number;
  name: string;
  date: string;
  color: string;
  type: string;
  description?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
}

const CD_TYPE_LABELS: Record<string, string> = {
  countdown: '倒数日',
  anniversary: '纪念日',
  birthday: '生日',
  holiday: '节日',
  exam: '考试',
};

function previewDiffDays(targetStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** 设置界面灵动岛静态预览 */
function OverviewPreview({ layoutConfig }: { layoutConfig: OverviewLayoutConfig }): ReactElement {
  const [cdItems, setCdItems] = useState<PreviewCountdownItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead('countdown-dates').then((data) => {
      if (cancelled) return;
      if (Array.isArray(data)) setCdItems(data as PreviewCountdownItem[]);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const cdSorted = [...cdItems].sort((a, b) => {
    const da = Math.abs(previewDiffDays(a.date));
    const db = Math.abs(previewDiffDays(b.date));
    return da - db;
  }).slice(0, 2);

  const renderWidget = (type: OverviewWidgetType): ReactNode => {
    switch (type) {
      case 'shortcuts':
        return (
          <div className="ov-dash-apps-wrap">
            <div className="ov-dash-apps-header">
              <span className="ov-dash-apps-title">快捷启动</span>
              <span className="ov-dash-apps-count">预览</span>
            </div>
            <div className="ov-dash-apps">
              {['应用A', '应用B', '应用C'].map(name => (
                <div key={name} className="ov-dash-app-item" style={{ cursor: 'default' }}>
                  <div className="ov-dash-app-icon-placeholder">📂</div>
                  <span className="ov-dash-app-name">{name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'todo':
        return (
          <div className="ov-dash-todo">
            <div className="ov-dash-todo-header">
              <span className="ov-dash-todo-title">待办事项</span>
              <div className="ov-dash-todo-stats">
                <span className="ov-dash-todo-stat done">✓ 2</span>
                <span className="ov-dash-todo-stat undone">○ 3</span>
              </div>
            </div>
            <div className="ov-dash-todo-list">
              {['示例待办 A', '示例待办 B', '示例待办 C'].map(text => (
                <div key={text} className="ov-dash-todo-item">
                  <div className="ov-dash-todo-row" style={{ cursor: 'default' }}>
                    <span className="ov-dash-todo-check" style={{ cursor: 'default' }}>○</span>
                    <span className="ov-dash-todo-text">{text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'song':
        return (
          <div className="ov-dash-widget ov-dash-song-widget">
            <div className="ov-dash-widget-header">
              <span className="ov-dash-widget-title">正在播放</span>
            </div>
            <div className="ov-dash-song-content">
              <div className="ov-dash-song-body">
                <div className="ov-dash-song-cover" style={{ background: 'rgba(var(--color-text-rgb),0.08)' }} />
                <div className="ov-dash-song-info">
                  <div className="ov-dash-song-title">示例歌曲</div>
                  <div className="ov-dash-song-artist">示例艺术家</div>
                  <div className="ov-dash-song-album">示例专辑</div>
                </div>
              </div>
              <div className="ov-dash-song-controls">
                <span className="ov-dash-song-btn" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.PREVIOUS_SONG} alt="" className="ov-dash-song-btn-icon ov-dash-song-btn-icon--sm" />
                </span>
                <span className="ov-dash-song-btn ov-dash-song-btn-play" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.PAUSE} alt="" className="ov-dash-song-btn-icon" />
                </span>
                <span className="ov-dash-song-btn" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.NEXT_SONG} alt="" className="ov-dash-song-btn-icon ov-dash-song-btn-icon--sm" />
                </span>
              </div>
            </div>
          </div>
        );
      case 'countdown':
        return (
          <div className="ov-dash-widget ov-dash-countdown-widget">
            <div className="ov-dash-widget-header">
              <span className="ov-dash-widget-title">倒数日</span>
            </div>
            {cdSorted.length === 0 ? (
              <div className="ov-dash-countdown-empty">暂无倒数日</div>
            ) : (
              <div className="ov-dash-countdown-cards">
                {cdSorted.map(item => {
                  const days = previewDiffDays(item.date);
                  const typeLabel = CD_TYPE_LABELS[item.type] || item.type;
                  return (
                    <div
                      key={item.id}
                      className={`cd-card cd-card-${item.type} ov-cd-card`}
                      style={{ borderColor: item.color, cursor: 'default' }}
                    >
                      {item.backgroundImage && (
                        <div className="cd-card-bg" style={{ backgroundImage: `url(${item.backgroundImage})`, opacity: item.backgroundOpacity ?? 0.5 }} />
                      )}
                      <div className="cd-card-overlay" style={{ background: `linear-gradient(135deg, ${item.color}30, ${item.color}10)` }} />
                      <div className="cd-card-content">
                        <div className="cd-card-top-row">
                          <span className="cd-card-type-badge" style={{ background: `${item.color}50`, color: '#fff' }}>{typeLabel}</span>
                        </div>
                        <div className="cd-card-name">{item.name}</div>
                        {item.description && <div className="cd-card-desc">{item.description}</div>}
                        <div className="cd-card-bottom">
                          <span className="cd-card-date">{item.date}</span>
                          <span className="cd-card-days" style={{ color: item.color }}>
                            {days > 0 ? `${days} 天后` : days === 0 ? '就是今天' : `${Math.abs(days)} 天前`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'pomodoro':
        return (
          <div className="ov-dash-widget ov-dash-pomodoro-widget">
            <div className="ov-dash-widget-header">
              <span className="ov-dash-widget-title">番茄钟</span>
              <span className="ov-dash-pomodoro-count">
                <img src={SvgIcon.POMODORO} alt="番茄" className="ov-dash-pomodoro-icon" />
                3
                <button className="ov-dash-pomodoro-count-reset" type="button" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.REVERT} alt="重置" className="ov-dash-pomodoro-count-reset-icon" />
                </button>
              </span>
            </div>
            <div className="ov-dash-pomodoro-body">
              <div className="ov-dash-pomodoro-ring-wrap">
                <svg className="ov-dash-pomodoro-ring" viewBox="0 0 84 84">
                  <circle className="ov-dash-pomodoro-ring-bg" cx="42" cy="42" r="38" />
                  <circle
                    className="ov-dash-pomodoro-ring-progress"
                    cx="42" cy="42" r="38"
                    style={{ stroke: '#ff6b6b', strokeDasharray: 2 * Math.PI * 38, strokeDashoffset: 2 * Math.PI * 38 * 0.3 }}
                  />
                </svg>
                <div className="ov-dash-pomodoro-ring-inner">
                  <div className="ov-dash-pomodoro-time">25:00</div>
                  <div className="ov-dash-pomodoro-phase" style={{ color: '#ff6b6b' }}>专注中</div>
                </div>
              </div>
              <div className="ov-dash-pomodoro-timeline">
                <div className="ov-dash-pomodoro-tl-item ov-dash-pomodoro-tl-item--empty">
                  <div className="ov-dash-pomodoro-tl-dot" />
                </div>
                <div className="ov-dash-pomodoro-tl-item ov-dash-pomodoro-tl-item--current">
                  <div className="ov-dash-pomodoro-tl-dot ov-dash-pomodoro-tl-dot--current" style={{ background: '#ff6b6b', boxShadow: '0 0 5px #ff6b6b99' }} />
                  <div className="ov-dash-pomodoro-tl-info">
                    <span className="ov-dash-pomodoro-tl-name ov-dash-pomodoro-tl-name--current">专注中</span>
                    <span className="ov-dash-pomodoro-tl-dur ov-dash-pomodoro-tl-dur--current" style={{ color: '#ff6b6b' }}>25:00</span>
                  </div>
                </div>
                <div className="ov-dash-pomodoro-tl-item">
                  <div className="ov-dash-pomodoro-tl-dot" />
                  <div className="ov-dash-pomodoro-tl-info">
                    <span className="ov-dash-pomodoro-tl-name">短休息</span>
                    <span className="ov-dash-pomodoro-tl-dur">5m</span>
                  </div>
                </div>
              </div>
              <div className="ov-dash-pomodoro-controls">
                <button className="ov-dash-pomodoro-btn" type="button" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.CONTINUE} alt="开始" className="ov-dash-pomodoro-btn-icon" />
                </button>
                <button className="ov-dash-pomodoro-btn" type="button" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.REVERT} alt="重置" className="ov-dash-pomodoro-btn-icon" />
                </button>
                <button className="ov-dash-pomodoro-btn" type="button" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.NEXT_SONG} alt="跳过" className="ov-dash-pomodoro-btn-icon" />
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="expand-tab-panel overview-dashboard">
      <div className="ov-dash-slot ov-dash-slot-left">
        {renderWidget(layoutConfig.left)}
      </div>
      <div className="ov-dash-time">
        <span className="ov-dash-date">2026年01月01日 星期四</span>
        <span className="ov-dash-clock">12:00:00</span>
        <span className="ov-dash-lunar">乙巳年 腊月十二</span>
        <div className="ov-dash-yiji">
          <div className="ov-dash-yiji-row">
            <span className="ov-dash-yiji-label yi">宜</span>
            <span className="ov-dash-yiji-items">祈福 · 出行 · 开市</span>
          </div>
          <div className="ov-dash-yiji-row">
            <span className="ov-dash-yiji-label ji">忌</span>
            <span className="ov-dash-yiji-items">动土 · 安葬 · 破土</span>
          </div>
        </div>
      </div>
      <div className="ov-dash-slot ov-dash-slot-right">
        {renderWidget(layoutConfig.right)}
      </div>
    </div>
  );
}

/**
 * 设置 Tab
 * @description 最大展开模式下的设置面板
 */

interface RunningProcessItem {
  name: string;
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
  const { aiConfig, setAiConfig, fetchWeatherData } = useIslandStore();
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
  const [autostartMode, setAutostartMode] = useState<string>('disabled');
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
  const [runningProcesses, setRunningProcesses] = useState<RunningProcessItem[]>([]);
  const [hideProcessList, setHideProcessList] = useState<string[]>([]);
  const [hideProcessFilter, setHideProcessFilter] = useState<string>('');
  const [hideProcessLoading, setHideProcessLoading] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getThemeMode);
  const [islandOpacity, setIslandOpacity] = useState<number>(100);
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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => {
      if (opacitySaveTimerRef.current) {
        clearTimeout(opacitySaveTimerRef.current);
        opacitySaveTimerRef.current = null;
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
    window.api.autostartGet().then((mode) => {
      if (cancelled) return;
      setAutostartMode(mode);
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
      const list = await window.api.getRunningNonSystemProcessesWithIcons();
      setRunningProcesses(
        Array.isArray(list)
          ? list.filter((item): item is RunningProcessItem => Boolean(item && typeof item.name === 'string'))
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
    window.api.getRunningNonSystemProcessesWithIcons().then((list) => {
      if (cancelled) return;
      if (Array.isArray(list)) {
        setRunningProcesses(list.filter((item): item is RunningProcessItem => Boolean(item && typeof item.name === 'string')));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /** 滚轮切换设置侧边栏 Tab */
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

      e.preventDefault();
      e.stopPropagation();
      const cur = activeTabRef.current;
      const idx = SETTINGS_TABS.indexOf(cur);
      let nextIdx: number;
      if (e.deltaY > 0) {
        nextIdx = Math.min(idx + 1, SETTINGS_TABS.length - 1);
      } else {
        nextIdx = Math.max(idx - 1, 0);
      }
      if (nextIdx !== idx) setActiveTab(SETTINGS_TABS[nextIdx]);
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
    if ((quitHotkey && acc === quitHotkey) || (screenshotHotkey && acc === screenshotHotkey) || (resetPositionHotkey && acc === resetPositionHotkey)) {
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
    if ((hideHotkey && acc === hideHotkey) || (screenshotHotkey && acc === screenshotHotkey) || (resetPositionHotkey && acc === resetPositionHotkey)) {
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
    if ((hideHotkey && acc === hideHotkey) || (quitHotkey && acc === quitHotkey) || (resetPositionHotkey && acc === resetPositionHotkey)) {
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
    if ((hideHotkey && acc === hideHotkey) || (quitHotkey && acc === quitHotkey) || (screenshotHotkey && acc === screenshotHotkey)) {
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
              autostartMode={autostartMode}
              setAutostartMode={setAutostartMode}
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
