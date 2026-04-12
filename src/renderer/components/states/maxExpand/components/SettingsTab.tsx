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
import avatarImg from '../../../../assets/avatar/T.jpg';
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
/** 歌词源选项 */
const LYRICS_SOURCE_OPTIONS = [
  { value: 'auto', label: '自动（跟随播放器）' },
  { value: 'netease-only', label: '仅网易云' },
  { value: 'qqmusic-only', label: '仅 QQ音乐' },
  { value: 'kugou-only', label: '仅酷狗' },
  { value: 'sodamusic-only', label: '仅汽水音乐' },
  { value: 'lrclib-only', label: '仅 LRCLIB' },
];

const WEATHER_PROVIDER_OPTIONS: Array<{ value: WeatherProvider; label: string }> = [
  { value: 'open-meteo', label: 'Open-Meteo 优先' },
  { value: 'uapi', label: 'UAPI 优先' },
];

const WEATHER_LOCATION_PRIORITY_OPTIONS: Array<{ value: WeatherLocationPriority; label: string }> = [
  { value: 'ip', label: 'IP 定位优先' },
  { value: 'custom', label: '自定义位置优先' },
];

/** 设置页侧边栏 Tab 顺序 */
const SETTINGS_TABS: ('index' | 'app' | 'network' | 'weather' | 'music' | 'ai' | 'shortcut' | 'update' | 'about')[] = ['index', 'app', 'network', 'weather', 'music', 'ai', 'shortcut', 'update', 'about'];
type SettingsSidebarTabKey = (typeof SETTINGS_TABS)[number];
type AppSettingsPageKey = 'layout-preview' | 'hide-process-list' | 'position' | 'theme' | 'behavior' | 'autostart';
type WeatherSettingsPageKey = 'location' | 'provider';
type MusicSettingsPageKey = 'whitelist' | 'lyrics' | 'smtc';
type MusicNavCardKey = 'music-whitelist' | 'music-lyrics' | 'music-smtc';
type SettingsTabLabelKey = SettingsSidebarTabKey | AppSettingsPageKey | MusicNavCardKey;

const SETTINGS_TAB_LABELS: Record<SettingsTabLabelKey, string> = {
  index: '快速导航',
  app: '软件设置',
  'layout-preview': '布局预览',
  'hide-process-list': '隐藏进程管理',
  position: '位置校准',
  theme: '主题外观',
  behavior: '交互行为',
  autostart: '实用工具',
  network: '网络配置',
  weather: '天气配置',
  music: '歌曲设置',
  'music-whitelist': '播放器白名单',
  'music-lyrics': '歌词源',
  'music-smtc': 'SMTC',
  ai: 'AI Agent',
  shortcut: '快捷键',
  update: '更新设置',
  about: '关于软件',
};
const SETTINGS_TAB_DESCRIPTIONS: Record<Exclude<SettingsTabLabelKey, 'index'>, string> = {
  app: '布局预览与隐藏进程规则配置',
  'layout-preview': '进入布局预览并调整左右控件展示。',
  'hide-process-list': '管理隐藏进程名单与自动隐藏规则。',
  position: '动态调整灵动岛位置并保存',
  theme: '切换深色、浅色或跟随系统主题。',
  behavior: '配置鼠标移开后是否自动收回。',
  autostart: '应用控制、日志与开机启动配置。',
  network: '请求超时与网络行为设置',
  weather: '天气接口优先级设置',
  music: '播放器白名单与歌词来源',
  'music-whitelist': '配置允许接入灵动岛的播放器。',
  'music-lyrics': '选择歌词来源与显示模式。',
  'music-smtc': '系统媒体传输控制相关配置。',
  ai: 'AI 服务与 Prompt 配置',
  shortcut: '隐藏、关闭、截图快捷键',
  update: '检查与下载软件更新',
  about: '版本信息与项目链接',
};
const SETTINGS_TAB_ICONS: Partial<Record<SettingsTabLabelKey, string>> = {
  'layout-preview': SvgIcon.LAYOUT,
  'hide-process-list': SvgIcon.TASK_MANAGER,
  position: SvgIcon.MOVE,
  network: SvgIcon.NETWORK,
  weather: SvgIcon.WEATHER,
  music: SvgIcon.LRC,
  'music-whitelist': SvgIcon.MUSIC,
  'music-lyrics': SvgIcon.LRC,
  'music-smtc': SvgIcon.SMTC,
  ai: SvgIcon.AI,
  shortcut: SvgIcon.SHORTCUT_KEY,
  update: SvgIcon.REVERT,
  about: SvgIcon.ABOUT,
  theme: SvgIcon.THEME,
  behavior: SvgIcon.INTERACTION,
  autostart: SvgIcon.CONTINUE,
};

const NETWORK_TIMEOUT_OPTIONS = [
  { label: '5 秒', value: 5000 },
  { label: '10 秒（默认）', value: 10000 },
  { label: '15 秒', value: 15000 },
  { label: '20 秒', value: 20000 },
  { label: '30 秒', value: 30000 },
];

const LAYOUT_STORE_KEY = 'overview-layout';
const DEFAULT_LAYOUT: OverviewLayoutConfig = { left: 'shortcuts', right: 'todo' };
const APP_SETTINGS_PAGES: AppSettingsPageKey[] = ['layout-preview', 'hide-process-list', 'position', 'theme', 'behavior', 'autostart'];
const WEATHER_SETTINGS_PAGES: WeatherSettingsPageKey[] = ['location', 'provider'];
const WEATHER_SETTINGS_PAGE_LABELS: Record<WeatherSettingsPageKey, string> = {
  location: '定位配置',
  provider: '接口配置',
};
const MUSIC_SETTINGS_PAGES: MusicSettingsPageKey[] = ['whitelist', 'lyrics', 'smtc'];
const MUSIC_SETTINGS_PAGE_LABELS: Record<MusicSettingsPageKey, string> = {
  whitelist: '白名单',
  lyrics: '歌词源',
  smtc: 'SMTC',
};

interface NavCardDef {
  id: string;
  label: string;
  desc: string;
  icon?: string;
  tab: SettingsSidebarTabKey;
  appPage?: AppSettingsPageKey;
  musicPage?: MusicSettingsPageKey;
}

const NAV_CARDS: NavCardDef[] = [
  { id: 'layout-preview', label: SETTINGS_TAB_LABELS['layout-preview'], desc: SETTINGS_TAB_DESCRIPTIONS['layout-preview'], icon: SETTINGS_TAB_ICONS['layout-preview'], tab: 'app', appPage: 'layout-preview' },
  { id: 'hide-process-list', label: SETTINGS_TAB_LABELS['hide-process-list'], desc: SETTINGS_TAB_DESCRIPTIONS['hide-process-list'], icon: SETTINGS_TAB_ICONS['hide-process-list'], tab: 'app', appPage: 'hide-process-list' },
  { id: 'position', label: SETTINGS_TAB_LABELS.position, desc: SETTINGS_TAB_DESCRIPTIONS.position, icon: SETTINGS_TAB_ICONS.position, tab: 'app', appPage: 'position' },
  { id: 'theme', label: SETTINGS_TAB_LABELS.theme, desc: SETTINGS_TAB_DESCRIPTIONS.theme, icon: SETTINGS_TAB_ICONS.theme, tab: 'app', appPage: 'theme' },
  { id: 'behavior', label: SETTINGS_TAB_LABELS.behavior, desc: SETTINGS_TAB_DESCRIPTIONS.behavior, icon: SETTINGS_TAB_ICONS.behavior, tab: 'app', appPage: 'behavior' },
  { id: 'autostart', label: SETTINGS_TAB_LABELS.autostart, desc: SETTINGS_TAB_DESCRIPTIONS.autostart, icon: SETTINGS_TAB_ICONS.autostart, tab: 'app', appPage: 'autostart' },
  { id: 'network', label: SETTINGS_TAB_LABELS.network, desc: SETTINGS_TAB_DESCRIPTIONS.network, icon: SETTINGS_TAB_ICONS.network, tab: 'network' },
  { id: 'weather', label: SETTINGS_TAB_LABELS.weather, desc: SETTINGS_TAB_DESCRIPTIONS.weather, icon: SETTINGS_TAB_ICONS.weather, tab: 'weather' },
  { id: 'ai', label: SETTINGS_TAB_LABELS.ai, desc: SETTINGS_TAB_DESCRIPTIONS.ai, icon: SETTINGS_TAB_ICONS.ai, tab: 'ai' },
  { id: 'shortcut', label: SETTINGS_TAB_LABELS.shortcut, desc: SETTINGS_TAB_DESCRIPTIONS.shortcut, icon: SETTINGS_TAB_ICONS.shortcut, tab: 'shortcut' },
  { id: 'about', label: SETTINGS_TAB_LABELS.about, desc: SETTINGS_TAB_DESCRIPTIONS.about, icon: SETTINGS_TAB_ICONS.about, tab: 'about' },
  { id: 'music-whitelist', label: SETTINGS_TAB_LABELS['music-whitelist'], desc: SETTINGS_TAB_DESCRIPTIONS['music-whitelist'], icon: SETTINGS_TAB_ICONS['music-whitelist'], tab: 'music', musicPage: 'whitelist' },
  { id: 'music-lyrics', label: SETTINGS_TAB_LABELS['music-lyrics'], desc: SETTINGS_TAB_DESCRIPTIONS['music-lyrics'], icon: SETTINGS_TAB_ICONS['music-lyrics'], tab: 'music', musicPage: 'lyrics' },
  { id: 'music-smtc', label: SETTINGS_TAB_LABELS['music-smtc'], desc: SETTINGS_TAB_DESCRIPTIONS['music-smtc'], icon: SETTINGS_TAB_ICONS['music-smtc'], tab: 'music', musicPage: 'smtc' },
];

const DEFAULT_NAV_ORDER: string[] = NAV_CARDS.map((c) => c.id);
const NAV_CARDS_MAP = new Map(NAV_CARDS.map((c) => [c.id, c]));

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
            <div className="max-expand-settings-section settings-index-section">
              <div className="settings-index-header">
                <div className="max-expand-settings-title">
                  快速导航
                  <button
                    className="settings-nav-edit-btn"
                    type="button"
                    onClick={resetNavConfig}
                  >
                    恢复默认
                  </button>
                  <button
                    className={`settings-nav-edit-btn ${navEditMode ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      if (navEditMode) {
                        persistNavConfig(navOrder, hiddenNavOrder);
                      }
                      setNavEditMode(!navEditMode);
                    }}
                  >
                    {navEditMode ? '完成' : '编辑'}
                  </button>
                </div>
                <div className="settings-music-hint settings-index-hint">
                  {navEditMode ? '拖拽卡片可调整排列顺序，点击「完成」保存。' : '点击卡片可快速跳转到对应配置页。'}
                </div>
              </div>
              <div className="settings-index-cards" aria-label="设置快速导航">
                {visibleCards.map((card, idx) => (
                  navEditMode ? (
                    <div
                      key={card.id}
                      className={`settings-index-card editing${dragOverIdx === idx ? ' drag-over' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        dragIdxRef.current = idx;
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIdx(idx);
                      }}
                      onDragLeave={() => setDragOverIdx(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverIdx(null);
                        const from = dragIdxRef.current;
                        if (from === null || from === idx) return;
                        const newOrder = visibleCards.map((c) => c.id);
                        const [moved] = newOrder.splice(from, 1);
                        newOrder.splice(idx, 0, moved);
                        setNavOrder(newOrder);
                      }}
                      onDragEnd={() => {
                        dragIdxRef.current = null;
                        setDragOverIdx(null);
                      }}
                    >
                      <span className="settings-index-card-drag-handle">⠿</span>
                      <button
                        className="settings-index-card-remove"
                        type="button"
                        onClick={() => {
                          const nextVisible = navOrder.filter((id) => id !== card.id);
                          const nextHidden = hiddenNavOrder.includes(card.id) ? hiddenNavOrder : [...hiddenNavOrder, card.id];
                          setNavOrder(nextVisible);
                          setHiddenNavOrder(nextHidden);
                        }}
                        aria-label={`删除 ${card.label}`}
                      >
                        −
                      </button>
                      <span className="settings-index-card-title">{card.label}</span>
                      <span className="settings-index-card-desc">{card.desc}</span>
                      {card.icon && (
                        <img className="settings-index-card-layout-icon" src={card.icon} alt="" aria-hidden="true" />
                      )}
                    </div>
                  ) : (
                    <button
                      key={card.id}
                      className="settings-index-card"
                      type="button"
                      onClick={() => {
                        if (card.appPage) {
                          setAppSettingsPage(card.appPage);
                          setActiveTab('app');
                        } else if (card.musicPage) {
                          setMusicSettingsPage(card.musicPage);
                          setActiveTab('music');
                        } else {
                          setActiveTab(card.tab);
                        }
                      }}
                    >
                      <span className="settings-index-card-title">{card.label}</span>
                      <span className="settings-index-card-desc">{card.desc}</span>
                      {card.icon && (
                        <img className="settings-index-card-layout-icon" src={card.icon} alt="" aria-hidden="true" />
                      )}
                    </button>
                  )
                ))}
              </div>
              {navEditMode && (
                <div className="settings-nav-add-panel" aria-label="可添加导航卡片">
                  <div className="settings-music-label">可添加卡片</div>
                  {hiddenCards.length === 0 ? (
                    <div className="settings-music-hint">当前没有可添加的卡片</div>
                  ) : (
                    <div className="settings-nav-add-list">
                      {hiddenCards.map((card) => (
                        <button
                          key={card.id}
                          className="settings-nav-add-item"
                          type="button"
                          onClick={() => {
                            const nextVisible = navOrder.includes(card.id) ? navOrder : [...navOrder, card.id];
                            const nextHidden = hiddenNavOrder.filter((id) => id !== card.id);
                            setNavOrder(nextVisible);
                            setHiddenNavOrder(nextHidden);
                          }}
                        >
                          <span>{card.label}</span>
                          <span className="settings-nav-add-plus">+</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'app' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title settings-app-title-line">
                <span>软件设置</span>
                <span className="settings-app-title-sub">- {currentAppSettingsPageLabel}</span>
              </div>

              <div className="settings-app-pages-layout">
                <div className="settings-app-page-main">
                  {appSettingsPage === 'layout-preview' && (
                    <div className="settings-island-preview-section">
                      <div className="settings-island-preview-label">总览布局预览</div>
                      <div className="settings-island-preview-wrap">
                        <div className="settings-island-shell" key={`${layoutConfig.left}-${layoutConfig.right}`}>
                          <OverviewPreview layoutConfig={layoutConfig} />
                        </div>
                      </div>

                      <div className="settings-layout-controls">
                        <div className="settings-layout-control">
                          <span className="settings-layout-control-label">左侧控件</span>
                          <div className="settings-layout-options">
                            {OVERVIEW_WIDGET_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                className={`settings-layout-btn ${layoutConfig.left === opt.value ? 'active' : ''}`}
                                type="button"
                                onClick={() => updateLayout('left', opt.value)}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="settings-layout-control">
                          <span className="settings-layout-control-label">右侧控件</span>
                          <div className="settings-layout-options">
                            {OVERVIEW_WIDGET_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                className={`settings-layout-btn ${layoutConfig.right === opt.value ? 'active' : ''}`}
                                type="button"
                                onClick={() => updateLayout('right', opt.value)}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {appSettingsPage === 'hide-process-list' && (
                    <div className="settings-hide-processes">
                      <div className="settings-music-hint">识别到以下进程运行时，将立即隐藏灵动岛。新增进程下次重启生效，删除进程立即生效。</div>
                      <div className="settings-hide-process-toolbar">
                        <input
                          className="settings-whitelist-input"
                          type="text"
                          placeholder="搜索进程名（如 WeChat.exe）"
                          value={hideProcessFilter}
                          onChange={(e) => setHideProcessFilter(e.target.value)}
                        />
                        <button
                          className="settings-whitelist-add-btn"
                          type="button"
                          onClick={() => {
                            refreshRunningProcesses().catch(() => {});
                          }}
                          disabled={hideProcessLoading}
                        >
                          {hideProcessLoading ? '刷新中…' : '刷新进程'}
                        </button>
                      </div>

                      <div className="settings-hide-selected">
                        {hideProcessList.length === 0 ? (
                          <span className="settings-hide-selected-empty">暂无隐藏进程</span>
                        ) : hideProcessList.map((name) => (
                          <button
                            key={name}
                            className="settings-hide-selected-item"
                            type="button"
                            onClick={() => toggleHideProcess(name)}
                            title="移除该进程"
                          >
                            {name} ×
                          </button>
                        ))}
                      </div>

                      <div className="settings-hide-process-list">
                        {runningProcesses
                          .filter((process) => process.name.toLowerCase().includes(hideProcessKeyword))
                          .map((process) => {
                            const name = process.name;
                            const selected = hideProcessList.some((item) => item.trim().toLowerCase() === name.trim().toLowerCase());
                            const fallbackText = name.charAt(0).toUpperCase();
                            return (
                              <button
                                key={name}
                                className={`settings-hide-process-item ${selected ? 'active' : ''}`}
                                type="button"
                                onClick={() => toggleHideProcess(name)}
                              >
                                <span className={`settings-hide-process-check ${selected ? 'active' : ''}`}>{selected ? '✓' : ''}</span>
                                <span className="settings-hide-process-icon" aria-hidden="true">
                                  {process.iconDataUrl ? (
                                    <img src={process.iconDataUrl} alt="" />
                                  ) : (
                                    <span>{fallbackText || '•'}</span>
                                  )}
                                </span>
                                <span className="settings-hide-process-name">{name}</span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {appSettingsPage === 'position' && (
                    <div className="max-expand-settings-section">
                      <div className="settings-music-section">
                        <div className="settings-music-label">灵动岛位置偏移</div>
                        <div className="settings-music-hint">调整后立即生效并自动保存，重启后会按该位置校准。</div>

                        <div className="settings-hotkey-row">
                          <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x - 10, islandPositionOffset.y)}>左移 10</button>
                          <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x + 10, islandPositionOffset.y)}>右移 10</button>
                          <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x, islandPositionOffset.y - 10)}>上移 10</button>
                          <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x, islandPositionOffset.y + 10)}>下移 10</button>
                        </div>

                        <div className="settings-hotkey-row">
                          <label className="settings-field" style={{ flex: 1 }}>
                            <span className="settings-field-label">水平偏移 X（px）</span>
                            <input
                              className="settings-field-input"
                              type="number"
                              min={-2000}
                              max={2000}
                              value={islandPositionInput.x}
                              onChange={(e) => {
                                setIslandPositionInput((prev) => ({ ...prev, x: e.target.value }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  applyIslandPositionInput();
                                }
                              }}
                            />
                          </label>
                          <label className="settings-field" style={{ flex: 1 }}>
                            <span className="settings-field-label">垂直偏移 Y（px）</span>
                            <input
                              className="settings-field-input"
                              type="number"
                              min={-1200}
                              max={1200}
                              value={islandPositionInput.y}
                              onChange={(e) => {
                                setIslandPositionInput((prev) => ({ ...prev, y: e.target.value }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  applyIslandPositionInput();
                                }
                              }}
                            />
                          </label>
                        </div>

                        <div className="settings-hotkey-row">
                          <button
                            className="settings-hotkey-btn"
                            type="button"
                            onClick={applyIslandPositionInput}
                            disabled={!islandPositionInputChanged}
                          >
                            应用
                          </button>
                          <button
                            className="settings-hotkey-btn"
                            type="button"
                            onClick={cancelIslandPositionInput}
                            disabled={!islandPositionInputChanged}
                          >
                            取消
                          </button>
                          <button
                            className="settings-hotkey-btn"
                            type="button"
                            onClick={() => applyIslandPositionOffset(0, 0)}
                          >
                            重置为默认位置
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {appSettingsPage === 'theme' && (
                    <div className="max-expand-settings-section">
                      <div className="settings-music-section">
                        <div className="settings-music-label">主题模式</div>
                        <div className="settings-music-hint">选择深色、浅色或跟随系统主题，切换后立即生效</div>
                        <div className="settings-lyrics-source-options">
                          {([
                            { value: 'dark' as ThemeMode, label: '深色模式' },
                            { value: 'light' as ThemeMode, label: '浅色模式' },
                            { value: 'system' as ThemeMode, label: '跟随系统' },
                          ]).map((opt) => (
                            <button
                              key={opt.value}
                              className={`settings-lyrics-source-btn ${themeMode === opt.value ? 'active' : ''}`}
                              type="button"
                              onClick={() => {
                                setThemeModeState(opt.value);
                                applyThemeMode(opt.value).catch(() => {});
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        <div className="settings-music-label" style={{ marginTop: 14 }}>灵动岛透明度</div>
                        <div className="settings-music-hint">数值越低越透明（10% - 100%），调整后立即生效</div>
                        <div className="settings-opacity-slider-row">
                          <input
                            className="settings-opacity-slider"
                            type="range"
                            min={10}
                            max={100}
                            step={1}
                            value={islandOpacity}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              const safe = Number.isFinite(v) ? Math.max(10, Math.min(100, Math.round(v))) : 100;
                              setIslandOpacity(safe);
                              applyIslandOpacity(safe);
                              if (opacitySaveTimerRef.current) {
                                clearTimeout(opacitySaveTimerRef.current);
                              }
                              opacitySaveTimerRef.current = setTimeout(() => {
                                persistIslandOpacity(safe);
                                opacitySaveTimerRef.current = null;
                              }, 220);
                            }}
                            onBlur={() => {
                              if (opacitySaveTimerRef.current) {
                                clearTimeout(opacitySaveTimerRef.current);
                                opacitySaveTimerRef.current = null;
                              }
                              persistIslandOpacity(islandOpacity);
                            }}
                          />
                          <span className="settings-opacity-slider-value">{islandOpacity}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {appSettingsPage === 'behavior' && (
                    <div className="max-expand-settings-section">
                      <div className="settings-music-section">
                        <div className="settings-music-label">鼠标移开自动收回 (重启后生效)</div>
                        <div className="settings-music-hint">启用后，鼠标离开灵动岛时将自动回到空闲状态（若正在播放音乐则切到歌词态）</div>
                        <div className="settings-hotkey-row" style={{ alignItems: 'center', marginTop: 8 }}>
                          <label className="settings-music-hint" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={expandLeaveIdle}
                              onChange={(e) => {
                                setExpandLeaveIdle(e.target.checked);
                                window.api.expandMouseleaveIdleSet(e.target.checked).catch(() => {});
                              }}
                            />
                            展开态（Expand）鼠标移开后自动收回
                          </label>
                        </div>
                        <div className="settings-hotkey-row" style={{ alignItems: 'center', marginTop: 6 }}>
                          <label className="settings-music-hint" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={maxExpandLeaveIdle}
                              onChange={(e) => {
                                setMaxExpandLeaveIdle(e.target.checked);
                                window.api.maxexpandMouseleaveIdleSet(e.target.checked).catch(() => {});
                              }}
                            />
                            最大展开态（MaxExpand）鼠标移开后自动收回
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {appSettingsPage === 'autostart' && (
                    <div className="max-expand-settings-section">
                      <div className="settings-music-section">
                        <div className="settings-music-label">实用工具</div>
                        <div className="settings-music-hint">常用应用操作与日志工具</div>
                        <div className="settings-hotkey-row" style={{ marginTop: 8, gap: 8 }}>
                          <button
                            className="settings-hotkey-btn"
                            type="button"
                            onClick={() => {
                              window.api.quitApp();
                            }}
                          >
                            关闭灵动岛
                          </button>
                          <button
                            className="settings-hotkey-btn"
                            type="button"
                            onClick={() => {
                              window.api.restartApp().catch(() => {});
                            }}
                          >
                            重启灵动岛
                          </button>
                          <button
                            className="settings-hotkey-btn"
                            type="button"
                            onClick={() => {
                              window.api.openLogsFolder().catch(() => {});
                            }}
                          >
                            打开日志文件夹
                          </button>
                        </div>

                        <div className="settings-music-label" style={{ marginTop: 12 }}>开机自启</div>
                        <div className="settings-music-hint">设置系统启动时是否自动运行灵动岛</div>
                        <div className="settings-lyrics-source-options" style={{ marginTop: 8 }}>
                          {([
                            { value: 'disabled', label: '禁用' },
                            { value: 'enabled', label: '启用' },
                            { value: 'high-priority', label: '高优先级' },
                          ] as const).map((opt) => (
                            <button
                              key={opt.value}
                              className={`settings-lyrics-source-btn ${autostartMode === opt.value ? 'active' : ''}`}
                              type="button"
                              onClick={() => {
                                setAutostartMode(opt.value);
                                window.api.autostartSet(opt.value).catch(() => {});
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <div className="settings-music-hint" style={{ marginTop: 8 }}>
                          {autostartMode === 'disabled' && '当前已禁用开机自启。'}
                          {autostartMode === 'enabled' && '系统登录后将自动启动灵动岛。'}
                          {autostartMode === 'high-priority' && '以高优先级启动，更早完成加载。'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="settings-app-page-dots" aria-label="软件设置分页">
                  {APP_SETTINGS_PAGES.map((page) => (
                    <button
                      key={page}
                      className={`settings-app-page-dot ${appSettingsPage === page ? 'active' : ''}`}
                      data-label={SETTINGS_TAB_LABELS[page]}
                      type="button"
                      onClick={() => setAppSettingsPage(page)}
                      title={SETTINGS_TAB_LABELS[page]}
                      aria-label={SETTINGS_TAB_LABELS[page]}
                    />
                  ))}
                </div>
              </div>

            </div>
          )}
          {activeTab === 'network' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title">网络配置</div>
              <div className="settings-music-section">
                <div className="settings-music-label">请求超时时间</div>
                <div className="settings-music-hint">设置网络请求的最长等待时间，网络较差时可适当增大</div>
                <div className="settings-network-timeout-row">
                  <div className="settings-lyrics-source-options">
                    {NETWORK_TIMEOUT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        className={`settings-lyrics-source-btn ${networkTimeoutMs === opt.value ? 'active' : ''}`}
                        type="button"
                        onClick={() => {
                          setNetworkTimeoutMs(opt.value);
                          setCustomTimeoutInput(String(opt.value / 1000));
                          saveNetworkConfig({ timeoutMs: opt.value });
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className={`settings-network-custom${NETWORK_TIMEOUT_OPTIONS.every(o => o.value !== networkTimeoutMs) ? ' active' : ''}`}>
                    <input
                      className="settings-network-custom-input"
                      type="number"
                      min="1"
                      max="120"
                      value={customTimeoutInput}
                      onChange={(e) => setCustomTimeoutInput(e.target.value)}
                      onBlur={() => {
                        const sec = parseFloat(customTimeoutInput);
                        if (!isNaN(sec) && sec >= 1) {
                          const ms = Math.round(sec * 1000);
                          setNetworkTimeoutMs(ms);
                          saveNetworkConfig({ timeoutMs: ms });
                        } else {
                          setCustomTimeoutInput(String(networkTimeoutMs / 1000));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                    />
                    <span className="settings-network-custom-unit">秒</span>
                  </div>
                </div>
              </div>

            </div>
          )}
          {activeTab === 'weather' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title settings-app-title-line">
                <span>天气配置</span>
                <span className="settings-app-title-sub">- {currentWeatherSettingsPageLabel}</span>
              </div>

              <div className="settings-app-pages-layout settings-weather-pages-layout">
                <div className="settings-app-page-main">
                  {weatherSettingsPage === 'location' && (
                    <div className="settings-music-section">
                      <div className="settings-music-label">定位来源优先级</div>
                      <div className="settings-music-hint">选择天气定位优先使用 IP 自动定位或自定义位置</div>
                      <div className="settings-lyrics-source-options">
                        {WEATHER_LOCATION_PRIORITY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            className={`settings-lyrics-source-btn ${weatherLocationPriority === opt.value ? 'active' : ''}`}
                            type="button"
                            onClick={() => {
                              applyWeatherLocationPriority(opt.value).catch((error) => {
                                setWeatherLocationConfigMessage({
                                  type: 'error',
                                  text: `切换优先级失败：${error instanceof Error ? error.message : '未知错误'}`,
                                });
                              });
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <div className="settings-hotkey-row">
                        <label className="settings-field" style={{ flex: 1 }}>
                          <span className="settings-field-label">城市名称</span>
                          <input
                            className="settings-field-input"
                            type="text"
                            placeholder="例如：杭州 / Tokyo / New York"
                            value={weatherCustomCityInput}
                            onChange={(e) => {
                              setWeatherCustomCityInput(e.target.value);
                            }}
                          />
                        </label>
                      </div>

                      <div className="settings-hotkey-row">
                        <button
                          className="settings-hotkey-btn"
                          type="button"
                          onClick={() => {
                            testWeatherCustomLocation().catch((error) => {
                              setWeatherCustomLocationTesting(false);
                              setWeatherCustomLocationTestMessage({
                                type: 'error',
                                text: `测试失败：${error instanceof Error ? error.message : '未知错误'}`,
                              });
                            });
                          }}
                          disabled={weatherCustomLocationTesting}
                        >
                          {weatherCustomLocationTesting ? '测试中...' : '测试自定义位置（双接口）'}
                        </button>
                        <button
                          className="settings-hotkey-btn"
                          type="button"
                          onClick={() => {
                            saveWeatherLocationSettings().catch((error) => {
                              setWeatherLocationConfigMessage({
                                type: 'error',
                                text: `保存失败：${error instanceof Error ? error.message : '未知错误'}`,
                              });
                            });
                          }}
                        >
                          保存定位配置
                        </button>
                      </div>

                      {weatherLocationConfigMessage && (
                        <div className="settings-music-hint" style={{ color: weatherLocationConfigMessage.type === 'error' ? '#ff7f7f' : '#7be495' }}>
                          {weatherLocationConfigMessage.text}
                        </div>
                      )}
                      {weatherCustomLocationTestMessage && (
                        <div className="settings-music-hint" style={{ color: weatherCustomLocationTestMessage.type === 'error' ? '#ff7f7f' : '#7be495' }}>
                          {weatherCustomLocationTestMessage.text}
                        </div>
                      )}
                    </div>
                  )}

                  {weatherSettingsPage === 'provider' && (
                    <div className="settings-music-section">
                      <div className="settings-music-label">天气接口优先级</div>
                      <div className="settings-music-hint">可选择优先使用 Open-Meteo 或 UAPI，失败时自动切换到另一源</div>
                      <div className="settings-lyrics-source-options">
                        {WEATHER_PROVIDER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            className={`settings-lyrics-source-btn ${weatherPrimaryProvider === opt.value ? 'active' : ''}`}
                            type="button"
                            onClick={() => {
                              setWeatherPrimaryProvider(opt.value);
                              saveWeatherProviderConfig({ primaryProvider: opt.value });
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="settings-app-page-dots" aria-label="天气配置分页">
                  {WEATHER_SETTINGS_PAGES.map((page) => (
                    <button
                      key={page}
                      className={`settings-app-page-dot ${weatherSettingsPage === page ? 'active' : ''}`}
                      data-label={WEATHER_SETTINGS_PAGE_LABELS[page]}
                      type="button"
                      onClick={() => setWeatherSettingsPage(page)}
                      title={WEATHER_SETTINGS_PAGE_LABELS[page]}
                      aria-label={WEATHER_SETTINGS_PAGE_LABELS[page]}
                    />
                  ))}
                </div>
              </div>

            </div>
          )}
          {activeTab === 'shortcut' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title">快捷键</div>
              <div className="settings-hotkey-section">
                <div className="settings-hotkey-label">隐藏/显示快捷键</div>
                <div className="settings-hotkey-row">
                  <input
                    ref={hotkeyInputRef}
                    className={`settings-hotkey-input ${hotkeyRecording ? 'recording' : ''}${hotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={hotkeyRecording ? '请按下快捷键组合…' : (hideHotkey || '未设置')}
                    onFocus={() => {
                      setHotkeyRecording(true);
                      setHotkeyError('');
                      window.api.hotkeySuspend().catch(() => {});
                    }}
                    onBlur={() => {
                      setHotkeyRecording(false);
                      window.api.hotkeyResume().catch(() => {});
                    }}
                    onKeyDown={handleHotkeyKeyDown}
                  />
                  <button
                    className="settings-hotkey-btn"
                    type="button"
                    onClick={() => {
                      setHotkeyRecording(true);
                      hotkeyInputRef.current?.focus();
                    }}
                  >
                    {hotkeyRecording ? '录入中' : '修改'}
                  </button>
                  {hideHotkey && (
                    <button
                      className="settings-hotkey-btn"
                      type="button"
                      onClick={() => {
                        window.api.hotkeySet('').then((ok) => {
                          if (ok) {
                            setHideHotkey('');
                            setHotkeyError('');
                            setHotkeyRecording(false);
                            hotkeyInputRef.current?.blur();
                          }
                        }).catch(() => {});
                      }}
                    >
                      清除
                    </button>
                  )}
                </div>
                {hotkeyError && <div className="settings-hotkey-error">{hotkeyError}</div>}
                <div className="settings-hotkey-hint">点击“修改”后按下组合键（如 Alt+X、Ctrl+Shift+H）</div>
              </div>
              <div className="settings-hotkey-section">
                <div className="settings-hotkey-label">关闭灵动岛快捷键</div>
                <div className="settings-hotkey-row">
                  <input
                    ref={quitHotkeyInputRef}
                    className={`settings-hotkey-input ${quitHotkeyRecording ? 'recording' : ''}${quitHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={quitHotkeyRecording ? '请按下快捷键组合…' : (quitHotkey || '未设置')}
                    onFocus={() => {
                      setQuitHotkeyRecording(true);
                      setQuitHotkeyError('');
                      window.api.hotkeySuspend().catch(() => {});
                    }}
                    onBlur={() => {
                      setQuitHotkeyRecording(false);
                      window.api.hotkeyResume().catch(() => {});
                    }}
                    onKeyDown={handleQuitHotkeyKeyDown}
                  />
                  <button
                    className="settings-hotkey-btn"
                    type="button"
                    onClick={() => {
                      setQuitHotkeyRecording(true);
                      quitHotkeyInputRef.current?.focus();
                    }}
                  >
                    {quitHotkeyRecording ? '录入中' : '修改'}
                  </button>
                  {quitHotkey && (
                    <button
                      className="settings-hotkey-btn"
                      type="button"
                      onClick={() => {
                        window.api.quitHotkeySet('').then((ok) => {
                          if (ok) {
                            setQuitHotkey('');
                            setQuitHotkeyError('');
                            setQuitHotkeyRecording(false);
                            quitHotkeyInputRef.current?.blur();
                          }
                        }).catch(() => {});
                      }}
                    >
                      清除
                    </button>
                  )}
                </div>
                {quitHotkeyError && <div className="settings-hotkey-error">{quitHotkeyError}</div>}
                <div className="settings-hotkey-hint">按下此快捷键将立即关闭灵动岛应用（如 Alt+Q、Ctrl+Shift+Q）</div>
              </div>
              <div className="settings-hotkey-section">
                <div className="settings-hotkey-label">选区截图快捷键</div>
                <div className="settings-hotkey-row">
                  <input
                    ref={screenshotHotkeyInputRef}
                    className={`settings-hotkey-input ${screenshotHotkeyRecording ? 'recording' : ''}${screenshotHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={screenshotHotkeyRecording ? '请按下快捷键组合…' : (screenshotHotkey || '未设置')}
                    onFocus={() => {
                      setScreenshotHotkeyRecording(true);
                      setScreenshotHotkeyError('');
                      window.api.hotkeySuspend().catch(() => {});
                    }}
                    onBlur={() => {
                      setScreenshotHotkeyRecording(false);
                      window.api.hotkeyResume().catch(() => {});
                    }}
                    onKeyDown={handleScreenshotHotkeyKeyDown}
                  />
                  <button
                    className="settings-hotkey-btn"
                    type="button"
                    onClick={() => {
                      setScreenshotHotkeyRecording(true);
                      screenshotHotkeyInputRef.current?.focus();
                    }}
                  >
                    {screenshotHotkeyRecording ? '录入中' : '修改'}
                  </button>
                  {screenshotHotkey && (
                    <button
                      className="settings-hotkey-btn"
                      type="button"
                      onClick={() => {
                        window.api.screenshotHotkeySet('').then((ok) => {
                          if (ok) {
                            setScreenshotHotkey('');
                            setScreenshotHotkeyError('');
                            setScreenshotHotkeyRecording(false);
                            screenshotHotkeyInputRef.current?.blur();
                          }
                        }).catch(() => {});
                      }}
                    >
                      清除
                    </button>
                  )}
                </div>
                {screenshotHotkeyError && <div className="settings-hotkey-error">{screenshotHotkeyError}</div>}
                <div className="settings-hotkey-hint">按下此快捷键将触发截图选区流程（如 Alt+A、Ctrl+Shift+A）</div>
              </div>
              <div className="settings-hotkey-section">
                <div className="settings-hotkey-label">还原默认位置快捷键</div>
                <div className="settings-hotkey-row">
                  <input
                    ref={resetPositionHotkeyInputRef}
                    className={`settings-hotkey-input ${resetPositionHotkeyRecording ? 'recording' : ''}${resetPositionHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={resetPositionHotkeyRecording ? '请按下快捷键组合…' : (resetPositionHotkey || '未设置')}
                    onFocus={() => {
                      setResetPositionHotkeyRecording(true);
                      setResetPositionHotkeyError('');
                      window.api.hotkeySuspend().catch(() => {});
                    }}
                    onBlur={() => {
                      setResetPositionHotkeyRecording(false);
                      window.api.hotkeyResume().catch(() => {});
                    }}
                    onKeyDown={handleResetPositionHotkeyKeyDown}
                  />
                  <button
                    className="settings-hotkey-btn"
                    type="button"
                    onClick={() => {
                      setResetPositionHotkeyRecording(true);
                      resetPositionHotkeyInputRef.current?.focus();
                    }}
                  >
                    {resetPositionHotkeyRecording ? '录入中' : '修改'}
                  </button>
                  {resetPositionHotkey && (
                    <button
                      className="settings-hotkey-btn"
                      type="button"
                      onClick={() => {
                        window.api.resetPositionHotkeySet('').then((ok) => {
                          if (ok) {
                            setResetPositionHotkey('');
                            setResetPositionHotkeyError('');
                            setResetPositionHotkeyRecording(false);
                            resetPositionHotkeyInputRef.current?.blur();
                          }
                        }).catch(() => {});
                      }}
                    >
                      清除
                    </button>
                  )}
                </div>
                {resetPositionHotkeyError && <div className="settings-hotkey-error">{resetPositionHotkeyError}</div>}
                <div className="settings-hotkey-hint">按下此快捷键将把灵动岛恢复到默认顶部居中位置</div>
              </div>
            </div>
          )}
          {activeTab === 'music' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title settings-app-title-line">
                <span>歌曲设置</span>
                <span className="settings-app-title-sub">- {currentMusicSettingsPageLabel}</span>
              </div>

              <div className="settings-app-pages-layout settings-music-pages-layout">
                <div className="settings-app-page-main">
                  {musicSettingsPage === 'whitelist' && (
                    <div className="settings-music-section">
                      <div className="settings-music-label">播放器白名单</div>
                      <div className="settings-music-hint">只有白名单内的播放器才会触发歌曲信息获取</div>
                      <div className="settings-whitelist-list">
                        {whitelist.map((item, idx) => (
                          <div className="settings-whitelist-item" key={idx}>
                            <span className="settings-whitelist-name">{item}</span>
                            <button
                              className="settings-whitelist-remove"
                              type="button"
                              title="移除"
                              onClick={() => {
                                const next = whitelist.filter((_, i) => i !== idx);
                                setWhitelist(next);
                                window.api.musicWhitelistSet(next).catch(() => {});
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="settings-whitelist-add-row">
                        <input
                          className={`settings-whitelist-input${whitelistInputError ? ' error' : ''}`}
                          type="text"
                          placeholder={whitelistInputError || '输入播放器进程名（如 Spotify.exe）'}
                          value={whitelistDraft}
                          onFocus={() => {
                            if (whitelistInputError) setWhitelistInputError('');
                          }}
                          onChange={(e) => {
                            setWhitelistDraft(e.target.value);
                            if (whitelistInputError) setWhitelistInputError('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddWhitelist();
                          }}
                        />
                        <button
                          className="settings-whitelist-add-btn"
                          type="button"
                          onClick={() => {
                            handleAddWhitelist();
                          }}
                        >
                          添加
                        </button>
                      </div>
                      <div className="settings-whitelist-add-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                          className="settings-whitelist-add-btn"
                          type="button"
                          onClick={() => {
                            if (whitelistInputError) setWhitelistInputError('');
                            handleDetectSourceAppId().catch(() => {});
                          }}
                          disabled={detectingSourceAppId}
                        >
                          {detectingSourceAppId ? '获取中…' : '获取播放进程（测试）'}
                        </button>
                        {sourceAppDetectMessage && (
                          <div
                            className="settings-music-hint"
                            style={{
                              color: sourceAppDetectMessage.type === 'success' ? '#7df2a0' : '#ff8b8b',
                              marginLeft: 10,
                              marginBottom: 0,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {sourceAppDetectMessage.text}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {musicSettingsPage === 'lyrics' && (
                    <div className="settings-music-section">
                      <div className="settings-music-label">歌词源</div>
                      <div className="settings-music-hint">自动模式根据 SMTC 检测到的播放器进程选择对应源，失败后依次尝试其他源，最后使用 LRCLIB 兜底</div>
                      <div className="settings-lyrics-source-options">
                        {LYRICS_SOURCE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            className={`settings-lyrics-source-btn ${lyricsSource === opt.value ? 'active' : ''}`}
                            type="button"
                            onClick={() => {
                              setLyricsSource(opt.value);
                              window.api.musicLyricsSourceSet(opt.value).catch(() => {});
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div className="settings-music-label" style={{ marginTop: 12 }}>逐字扫光</div>
                      <div className="settings-music-hint">启用后歌词将以逐字高亮方式显示</div>
                      <div className="settings-hotkey-row" style={{ alignItems: 'center' }}>
                        <label className="settings-music-hint" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={lyricsKaraoke}
                            onChange={(e) => {
                              setLyricsKaraoke(e.target.checked);
                              window.api.musicLyricsKaraokeSet(e.target.checked).catch(() => {});
                            }}
                          />
                          启用逐字扫光效果
                        </label>
                      </div>
                      <div className="settings-music-label" style={{ marginTop: 12 }}>歌词时钟</div>
                      <div className="settings-music-hint">在歌词界面封面与歌词之间显示当前北京时间</div>
                      <div className="settings-hotkey-row" style={{ alignItems: 'center' }}>
                        <label className="settings-music-hint" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={lyricsClock}
                            onChange={(e) => {
                              setLyricsClock(e.target.checked);
                              window.api.musicLyricsClockSet(e.target.checked).catch(() => {});
                            }}
                          />
                          显示当前时间
                        </label>
                      </div>
                    </div>
                  )}

                  {musicSettingsPage === 'smtc' && (
                    <div className="settings-music-section">
                      <div className="settings-music-label">SMTC 自动取消订阅</div>
                      <div className="settings-music-hint">用于清理长时间无更新的播放会话，默认永不取消订阅</div>
                      <div className="settings-hotkey-row" style={{ alignItems: 'center' }}>
                        <label className="settings-field" style={{ flex: 1 }}>
                          <span className="settings-field-label">取消订阅时间（毫秒）</span>
                          <input
                            className="settings-field-input"
                            type="number"
                            min={1000}
                            step={1000}
                            value={musicSmtcUnsubscribeInput}
                            disabled={musicSmtcNeverUnsubscribe}
                            onChange={(e) => {
                              setMusicSmtcUnsubscribeInput(e.target.value);
                              if (musicSmtcConfigMessage) setMusicSmtcConfigMessage(null);
                            }}
                          />
                        </label>
                      </div>
                      <div className="settings-hotkey-row" style={{ alignItems: 'center' }}>
                        <label className="settings-music-hint" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={musicSmtcNeverUnsubscribe}
                            onChange={(e) => {
                              setMusicSmtcNeverUnsubscribe(e.target.checked);
                              if (musicSmtcConfigMessage) setMusicSmtcConfigMessage(null);
                            }}
                          />
                          永不取消订阅
                        </label>
                        <button
                          className="settings-hotkey-btn"
                          type="button"
                          onClick={() => {
                            saveMusicSmtcUnsubscribeConfig().catch((error) => {
                              setMusicSmtcConfigMessage({
                                type: 'error',
                                text: `保存失败：${error instanceof Error ? error.message : '未知错误'}`,
                              });
                            });
                          }}
                        >
                          保存
                        </button>
                      </div>
                      {musicSmtcConfigMessage && (
                        <div className="settings-music-hint" style={{ color: musicSmtcConfigMessage.type === 'error' ? '#ff8b8b' : '#7df2a0' }}>
                          {musicSmtcConfigMessage.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="settings-app-page-dots" aria-label="歌曲设置分页">
                  {MUSIC_SETTINGS_PAGES.map((page) => (
                    <button
                      key={page}
                      className={`settings-app-page-dot ${musicSettingsPage === page ? 'active' : ''}`}
                      data-label={MUSIC_SETTINGS_PAGE_LABELS[page]}
                      type="button"
                      onClick={() => setMusicSettingsPage(page)}
                      title={MUSIC_SETTINGS_PAGE_LABELS[page]}
                      aria-label={MUSIC_SETTINGS_PAGE_LABELS[page]}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'ai' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title">AI Agent</div>
              <div className="settings-field-group">
                <SettingsField
                  label="API Key"
                  value={aiConfig.apiKey}
                  placeholder="sk-..."
                  type="password"
                  onChange={(v) => setAiConfig({ apiKey: v })}
                />
                <SettingsField
                  label="API Endpoint"
                  value={aiConfig.endpoint}
                  placeholder="https://api.openai.com/v1"
                  onChange={(v) => setAiConfig({ endpoint: v })}
                />
                <SettingsField
                  label="模型"
                  value={aiConfig.model}
                  placeholder="gpt-4o-mini"
                  onChange={(v) => setAiConfig({ model: v })}
                />
                <SettingsField
                  label="MCP Endpoint"
                  value={aiConfig.mcpEndpoint}
                  placeholder="http://localhost:3000/mcp (可选)"
                  onChange={(v) => setAiConfig({ mcpEndpoint: v })}
                />
                <div className="settings-field">
                  <span className="settings-field-label">System Prompt</span>
                  <div className="settings-prompt-area">
                    {editingPrompt ? (
                      <>
                        <textarea
                          ref={promptRef}
                          className="settings-field-textarea"
                          placeholder="你是一个有用的助手。"
                          value={promptDraft}
                          onChange={(e) => setPromptDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); savePrompt(); }
                          }}
                          rows={3}
                        />
                        <button className="settings-prompt-btn save" onClick={savePrompt} type="button" title="保存 (Ctrl+Enter)">保存</button>
                      </>
                    ) : (
                      <>
                        <div className="settings-prompt-text">
                          {aiConfig.systemPrompt || <span className="settings-prompt-empty">未设置</span>}
                        </div>
                        <button className="settings-prompt-btn edit" onClick={startEditPrompt} type="button" title="编辑 Prompt">编辑</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'update' && (
            <div className="max-expand-settings-section settings-update">
              <div className="max-expand-settings-title">更新设置</div>

              <div className="settings-about-version" style={{ marginBottom: 12 }}>当前版本：eIsland v{aboutVersion}</div>

              <div className="settings-about-update">
                <div className="settings-about-update-row">
                  {updateStatus === 'idle' && (
                    <button className="settings-about-update-btn" type="button" onClick={handleCheckUpdate}>检查更新</button>
                  )}
                  {updateStatus === 'checking' && (
                    <button className="settings-about-update-btn" type="button" disabled>检查中…</button>
                  )}
                  {updateStatus === 'latest' && (
                    <button className="settings-about-update-btn" type="button" onClick={handleCheckUpdate}>已是最新版本</button>
                  )}
                  {updateStatus === 'available' && (
                    <button className="settings-about-update-btn update-available" type="button" onClick={handleDownloadUpdate}>
                      发现新版本 v{updateVersion}，点击下载
                    </button>
                  )}
                  {updateStatus === 'downloading' && (
                    <div className="settings-about-update-progress">
                      <div className="settings-about-update-progress-bar">
                        <div
                          className="settings-about-update-progress-fill"
                          style={{ width: `${downloadProgress?.percent ?? 0}%` }}
                        />
                      </div>
                      <span className="settings-about-update-progress-text">
                        {downloadProgress ? `${Math.round(downloadProgress.percent)}% · ${(downloadProgress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s` : '准备下载…'}
                      </span>
                    </div>
                  )}
                  {updateStatus === 'ready' && (
                    <button className="settings-about-update-btn update-ready" type="button" onClick={handleInstallUpdate}>
                      下载完成，点击安装并重启
                    </button>
                  )}
                  {updateStatus === 'error' && (
                    <button className="settings-about-update-btn" type="button" onClick={handleCheckUpdate}>重试</button>
                  )}
                </div>
                {updateStatus === 'error' && updateError && (
                  <div className="settings-about-update-error" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{updateError.replace(/\\n/g, '\n')}</div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'about' && (
            <div className="max-expand-settings-section settings-about">
              <div className="max-expand-settings-title">关于软件</div>

              {/* 作者信息 */}
              <div className="settings-about-author">
                <img className="settings-about-avatar" src={avatarImg} alt="作者头像" />
                <div className="settings-about-author-info">
                  <div className="settings-about-name">
                    <a className="settings-about-github" href="https://github.com/JNTMTMTM" target="_blank" rel="noreferrer" title="GitHub 主页">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                    </a>
                    鸡哥 <span className="settings-about-id">JNTMTMTM</span>
                  </div>
                  <div className="settings-about-version">eIsland v{aboutVersion}</div>
                </div>
              </div>

              {/* 免费声明 */}
              <div className="settings-about-notice">
                本软件开源免费，如果你在任何地方付费购买了本软件，请立即退款并给差评。
              </div>

              {/* 链接 */}
              <div className="settings-about-links">
                <div className="settings-about-row">
                  <span className="settings-about-label">官网</span>
                  <a className="settings-about-link" href="https://www.pyisland.com" target="_blank" rel="noreferrer">www.pyisland.com</a>
                </div>
                <div className="settings-about-row">
                  <span className="settings-about-label">文档站</span>
                  <a className="settings-about-link" href="https://docs.pyisland.com" target="_blank" rel="noreferrer">docs.pyisland.com</a>
                </div>
                <div className="settings-about-row">
                  <span className="settings-about-label">开源代码</span>
                  <a className="settings-about-link" href="https://github.com/JNTMTMTM/eIsland" target="_blank" rel="noreferrer">github.com/JNTMTMTM/eIsland</a>
                </div>
                <div className="settings-about-row">
                  <span className="settings-about-label">开源协议</span>
                  <span className="settings-about-value">GPL-3.0</span>
                </div>
                <div className="settings-about-row">
                  <span className="settings-about-label">图标库</span>
                  <a className="settings-about-link" href="https://www.iconfont.cn/" target="_blank" rel="noreferrer">iconfont.cn</a>
                </div>
              </div>

              {/* 开源依赖 */}
              <div className="settings-about-deps">
                <div className="settings-about-deps-title">开源框架 & 依赖</div>
                <div className="settings-about-deps-grid">
                  <span className="settings-about-dep">Electron</span>
                  <span className="settings-about-dep">React</span>
                  <span className="settings-about-dep">React DOM</span>
                  <span className="settings-about-dep">TypeScript</span>
                  <span className="settings-about-dep">Zustand</span>
                  <span className="settings-about-dep">Tailwind CSS</span>
                  <span className="settings-about-dep">Vite</span>
                  <span className="settings-about-dep">electron-vite</span>
                  <span className="settings-about-dep">electron-builder</span>
                  <span className="settings-about-dep">react-markdown</span>
                  <span className="settings-about-dep">react-datepicker</span>
                  <span className="settings-about-dep">remark-gfm</span>
                  <span className="settings-about-dep">@coooookies/windows-smtc-monitor</span>
                  <span className="settings-about-dep">openmeteo</span>
                  <span className="settings-about-dep">lunar-javascript</span>
                  <span className="settings-about-dep">lyric-resolver</span>
                  <span className="settings-about-dep">colorthief</span>
                  <span className="settings-about-dep">lucide-react</span>
                  <span className="settings-about-dep">@electron-toolkit/preload</span>
                  <span className="settings-about-dep">@electron-toolkit/utils</span>
                  <span className="settings-about-dep">@electron-toolkit/tsconfig</span>
                  <span className="settings-about-dep">@tailwindcss/vite</span>
                  <span className="settings-about-dep">@vitejs/plugin-react</span>
                  <span className="settings-about-dep">PostCSS</span>
                  <span className="settings-about-dep">Autoprefixer</span>
                </div>
              </div>

              {/* 版权信息 */}
              <div className="settings-about-footer">
                <div className="settings-about-copyright">© JNTMTMTM, pyisland.com 版权所有</div>
                <div className="settings-about-slogan">算法诠释一切 质疑即是认可</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
