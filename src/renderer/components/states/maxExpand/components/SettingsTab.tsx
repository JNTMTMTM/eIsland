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

import { useState, useRef, useEffect } from 'react';
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
  loadWeatherProviderConfig,
  saveWeatherProviderConfig,
  DEFAULT_WEATHER_PRIMARY_PROVIDER,
  type WeatherProvider,
} from '../../../../store/utils/storage';

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
                <div className="ov-dash-song-cover" style={{ background: 'rgba(255,255,255,0.08)' }} />
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
  { value: 'lrclib-first', label: 'LRCLIB 优先' },
  { value: 'netease-first', label: '网易云优先' },
  { value: 'lrclib-only', label: '仅 LRCLIB' },
  { value: 'netease-only', label: '仅网易云' },
];

const WEATHER_PROVIDER_OPTIONS: Array<{ value: WeatherProvider; label: string }> = [
  { value: 'open-meteo', label: 'Open-Meteo 优先' },
  { value: 'uapi', label: 'UAPI 优先' },
];

/** 设置页侧边栏 Tab 顺序 */
const SETTINGS_TABS: ('app' | 'network' | 'weather' | 'music' | 'ai' | 'shortcut' | 'about')[] = ['app', 'network', 'weather', 'music', 'ai', 'shortcut', 'about'];

const NETWORK_TIMEOUT_OPTIONS = [
  { label: '5 秒', value: 5000 },
  { label: '10 秒（默认）', value: 10000 },
  { label: '15 秒', value: 15000 },
  { label: '20 秒', value: 20000 },
  { label: '30 秒', value: 30000 },
];

const LAYOUT_STORE_KEY = 'overview-layout';
const DEFAULT_LAYOUT: OverviewLayoutConfig = { left: 'shortcuts', right: 'todo' };

/**
 * 渲染设置面板主视图
 * @description 提供应用设置、AI 配置与关于软件三类设置入口
 * @returns 设置 Tab 组件
 */
export function SettingsTab(): ReactElement {
  const [activeTab, setActiveTab] = useState<'app' | 'network' | 'weather' | 'music' | 'ai' | 'shortcut' | 'about'>('app');
  const { aiConfig, setAiConfig } = useIslandStore();
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const [layoutConfig, setLayoutConfig] = useState<OverviewLayoutConfig>(DEFAULT_LAYOUT);

  /** 歌曲设置相关状态 */
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [whitelistDraft, setWhitelistDraft] = useState<string>('');
  const [lyricsSource, setLyricsSource] = useState<string>('lrclib-first');
  const [detectingSourceAppId, setDetectingSourceAppId] = useState(false);
  const [sourceAppDetectMessage, setSourceAppDetectMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /** 网络配置相关状态 */
  const [networkTimeoutMs, setNetworkTimeoutMs] = useState<number>(DEFAULT_NETWORK_TIMEOUT_MS);
  const [customTimeoutInput, setCustomTimeoutInput] = useState<string>('');
  const [weatherPrimaryProvider, setWeatherPrimaryProvider] = useState<WeatherProvider>(DEFAULT_WEATHER_PRIMARY_PROVIDER);

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
    return () => { cancelled = true; };
  }, []);

  /** 组件卸载时兜底恢复快捷键响应 */
  useEffect(() => {
    return () => {
      window.api.hotkeyResume().catch(() => {});
    };
  }, []);

  const updateLayout = (side: 'left' | 'right', value: OverviewWidgetType): void => {
    const updated = { ...layoutConfig, [side]: value };
    setLayoutConfig(updated);
    window.api.storeWrite(LAYOUT_STORE_KEY, updated).catch(() => {});
  };

  /** 滚轮切换设置侧边栏 Tab */
  useEffect(() => {
    const el = settingsRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      if (target.closest('.settings-field-input')) return;
      if (target.closest('.settings-field-textarea')) return;
      if (target.closest('.settings-about')) return;
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
    if (quitHotkey && acc === quitHotkey) {
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
    if (hideHotkey && acc === hideHotkey) {
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

  return (
    <div className="max-expand-settings" ref={settingsRef}>
      <div className="max-expand-settings-layout">
        <div className="max-expand-settings-sidebar">
          <div className="max-expand-settings-sidebar-title">设置</div>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'app' ? 'active' : ''}`}
            onClick={() => setActiveTab('app')}
            type="button"
          >
            <span className="sidebar-dot" />
            软件设置
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'network' ? 'active' : ''}`}
            onClick={() => setActiveTab('network')}
            type="button"
          >
            <span className="sidebar-dot" />
            网络配置
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'weather' ? 'active' : ''}`}
            onClick={() => setActiveTab('weather')}
            type="button"
          >
            <span className="sidebar-dot" />
            天气配置
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'music' ? 'active' : ''}`}
            onClick={() => setActiveTab('music')}
            type="button"
          >
            <span className="sidebar-dot" />
            歌曲设置
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
            type="button"
          >
            <span className="sidebar-dot" />
            AI Agent
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'shortcut' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortcut')}
            type="button"
          >
            <span className="sidebar-dot" />
            快捷键
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
            type="button"
          >
            <span className="sidebar-dot" />
            关于软件
          </button>
        </div>

        <div className="max-expand-settings-panel">
          {activeTab === 'app' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title">软件设置</div>

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
              <div className="max-expand-settings-title">天气配置</div>
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
            </div>
          )}
          {activeTab === 'music' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title">歌曲设置</div>

              {/* 播放器白名单 */}
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
                    className="settings-whitelist-input"
                    type="text"
                    placeholder="输入播放器进程名（如 Spotify.exe）"
                    value={whitelistDraft}
                    onChange={(e) => setWhitelistDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && whitelistDraft.trim()) {
                        const next = [...whitelist, whitelistDraft.trim()];
                        setWhitelist(next);
                        setWhitelistDraft('');
                        window.api.musicWhitelistSet(next).catch(() => {});
                      }
                    }}
                  />
                  <button
                    className="settings-whitelist-add-btn"
                    type="button"
                    onClick={() => {
                      if (!whitelistDraft.trim()) return;
                      const next = [...whitelist, whitelistDraft.trim()];
                      setWhitelist(next);
                      setWhitelistDraft('');
                      window.api.musicWhitelistSet(next).catch(() => {});
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
                      handleDetectSourceAppId().catch(() => {});
                    }}
                    disabled={detectingSourceAppId}
                  >
                    {detectingSourceAppId ? '获取中…' : '获取播放进程（测试）'}
                  </button>
                  {sourceAppDetectMessage?.type === 'success' && (
                    <div
                      className="settings-music-hint"
                      style={{ color: '#7df2a0', marginLeft: 10, marginBottom: 0, display: 'flex', alignItems: 'center' }}
                    >
                      {sourceAppDetectMessage.text}
                    </div>
                  )}
                </div>
                {sourceAppDetectMessage?.type === 'error' && (
                  <div
                    className="settings-music-hint"
                    style={{ color: '#ff8b8b' }}
                  >
                    {sourceAppDetectMessage.text}
                  </div>
                )}
              </div>

              {/* 歌词源 */}
              <div className="settings-music-section">
                <div className="settings-music-label">歌词源</div>
                <div className="settings-music-hint">选择歌词获取的优先顺序或唯一来源</div>
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
                  <div className="settings-about-version">eIsland v26.1.1-beta.1</div>
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
