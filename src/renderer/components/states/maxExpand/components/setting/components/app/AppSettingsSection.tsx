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
 * @file AppSettingsSection.tsx
 * @description 设置页面 - 应用设置区块
 * @author 鸡哥
 */

import { useEffect, useRef, useState } from 'react';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettingsPageKey } from '../../utils/settingsConfig';
import type { OverviewLayoutConfig, OverviewWidgetType } from '../../../../../expand/components/OverviewTab';
import useIslandStore from '../../../../../../../store/slices';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
import { BUILTIN_WALLPAPERS } from '../../../../../../../assets/wallpaper/builtinWallpapers';
import { ClipboardHistorySettingsSection } from './ClipboardHistorySettingsSection';

interface AppRunningWindow {
  id: string;
  title: string;
  processName: string;
  processPath: string | null;
  processId: number | null;
  iconDataUrl: string | null;
}

interface AppPositionOffset {
  x: number;
  y: number;
}

interface AppPositionInput {
  x: string;
  y: string;
}

interface AppSettingsSectionProps {
  currentAppSettingsPageLabel: string;
  appSettingsPage: AppSettingsPageKey;
  layoutConfig: OverviewLayoutConfig;
  OverviewPreviewComponent: ({ layoutConfig }: { layoutConfig: OverviewLayoutConfig }) => ReactElement;
  overviewWidgetOptions: { value: OverviewWidgetType; label: string }[];
  updateLayout: (side: 'left' | 'right', value: OverviewWidgetType) => void;
  hideProcessFilter: string;
  setHideProcessFilter: (value: string) => void;
  refreshRunningProcesses: () => Promise<void>;
  hideProcessLoading: boolean;
  hideProcessList: string[];
  toggleHideProcess: (name: string) => void;
  runningProcesses: AppRunningWindow[];
  hideProcessKeyword: string;
  islandPositionOffset: AppPositionOffset;
  applyIslandPositionOffset: (x: number, y: number) => void;
  islandPositionInput: AppPositionInput;
  setIslandPositionInput: Dispatch<SetStateAction<AppPositionInput>>;
  applyIslandPositionInput: () => void;
  islandPositionInputChanged: boolean;
  cancelIslandPositionInput: () => void;
  themeMode: 'dark' | 'light' | 'system';
  setThemeModeState: (mode: 'dark' | 'light' | 'system') => void;
  applyThemeMode: (mode: 'dark' | 'light' | 'system') => Promise<void>;
  appLanguage: 'zh-CN' | 'en-US';
  applyAppLanguage: (language: 'zh-CN' | 'en-US') => void;
  islandOpacity: number;
  applyIslandOpacity: (value: number) => void;
  opacitySaveTimerRef: { current: ReturnType<typeof setTimeout> | null };
  setIslandOpacity: (value: number) => void;
  persistIslandOpacity: (value: number) => void;
  expandLeaveIdle: boolean;
  setExpandLeaveIdle: (value: boolean) => void;
  maxExpandLeaveIdle: boolean;
  setMaxExpandLeaveIdle: (value: boolean) => void;
  clipboardUrlMonitorEnabled: boolean;
  setClipboardUrlMonitorEnabled: (value: boolean) => void;
  clipboardUrlDetectMode: 'https-only' | 'http-https' | 'domain-only';
  setClipboardUrlDetectMode: (value: 'https-only' | 'http-https' | 'domain-only') => void;
  clipboardUrlBlacklist: string[];
  setClipboardUrlBlacklist: (value: string[]) => void;
  clipboardUrlSuppressInFavorites: boolean;
  setClipboardUrlSuppressInFavorites: (value: boolean) => void;
  autostartMode: 'disabled' | 'enabled' | 'high-priority';
  setAutostartMode: (mode: 'disabled' | 'enabled' | 'high-priority') => void;
  bgMediaType: 'image' | 'video' | null;
  bgMediaPreviewUrl: string | null;
  bgVideoFit: 'cover' | 'contain';
  setBgVideoFit: (value: 'cover' | 'contain') => void;
  bgVideoMuted: boolean;
  setBgVideoMuted: (value: boolean) => void;
  bgVideoLoop: boolean;
  setBgVideoLoop: (value: boolean) => void;
  bgVideoVolume: number;
  setBgVideoVolume: (value: number) => void;
  bgVideoRate: number;
  setBgVideoRate: (value: number) => void;
  bgVideoHwDecode: boolean;
  setBgVideoHwDecode: (value: boolean) => void;
  bgImageOpacity: number;
  bgImageBlur: number;
  setBgImageOpacity: (value: number) => void;
  setBgImageBlur: (value: number) => void;
  applyBgOpacity: (value: number) => void;
  applyBgBlur: (value: number) => void;
  applyBgVideoFit: (value: 'cover' | 'contain') => void;
  applyBgVideoMuted: (value: boolean) => void;
  applyBgVideoLoop: (value: boolean) => void;
  applyBgVideoVolume: (value: number) => void;
  applyBgVideoRate: (value: number) => void;
  applyBgVideoHwDecode: (value: boolean) => void;
  persistBgOpacity: (value: number) => void;
  persistBgBlur: (value: number) => void;
  persistBgVideoFit: (value: 'cover' | 'contain') => void;
  persistBgVideoMuted: (value: boolean) => void;
  persistBgVideoLoop: (value: boolean) => void;
  persistBgVideoVolume: (value: number) => void;
  persistBgVideoRate: (value: number) => void;
  persistBgVideoHwDecode: (value: boolean) => void;
  bgOpacitySaveTimerRef: { current: ReturnType<typeof setTimeout> | null };
  bgBlurSaveTimerRef: { current: ReturnType<typeof setTimeout> | null };
  handleSelectBgImage: () => Promise<void>;
  handleSelectBgVideo: () => Promise<void>;
  handleClearBgImage: () => void;
  handleSelectBuiltinBgImage: (src: string, defaultOpacity: number) => void;
  appSettingsPages: AppSettingsPageKey[];
  settingsTabLabels: Record<string, string>;
  setAppSettingsPage: (page: AppSettingsPageKey) => void;
}

/**
 * 渲染应用设置区块
 * @param props - 应用设置区域所需参数
 * @returns 应用设置区域
 */
export function AppSettingsSection(props: AppSettingsSectionProps): ReactElement {
  const { t } = useTranslation();
  const {
    currentAppSettingsPageLabel,
    appSettingsPage,
    layoutConfig,
    OverviewPreviewComponent,
    overviewWidgetOptions,
    updateLayout,

    hideProcessFilter,
    setHideProcessFilter,
    refreshRunningProcesses,
    hideProcessLoading,
    hideProcessList,
    toggleHideProcess,
    runningProcesses,
    hideProcessKeyword,

    islandPositionOffset,
    applyIslandPositionOffset,
    islandPositionInput,
    setIslandPositionInput,
    applyIslandPositionInput,
    islandPositionInputChanged,
    cancelIslandPositionInput,

    themeMode,
    setThemeModeState,
    applyThemeMode,
    appLanguage,
    applyAppLanguage,
    islandOpacity,
    applyIslandOpacity,
    opacitySaveTimerRef,
    setIslandOpacity,
    persistIslandOpacity,

    expandLeaveIdle,
    setExpandLeaveIdle,
    maxExpandLeaveIdle,
    setMaxExpandLeaveIdle,
    clipboardUrlMonitorEnabled,
    setClipboardUrlMonitorEnabled,
    clipboardUrlDetectMode,
    setClipboardUrlDetectMode,
    clipboardUrlBlacklist,
    setClipboardUrlBlacklist,
    clipboardUrlSuppressInFavorites,
    setClipboardUrlSuppressInFavorites,

    autostartMode,
    setAutostartMode,

    bgMediaType,
    bgMediaPreviewUrl,
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
    bgImageOpacity,
    bgImageBlur,
    setBgImageOpacity,
    setBgImageBlur,
    applyBgOpacity,
    applyBgBlur,
    applyBgVideoFit,
    applyBgVideoMuted,
    applyBgVideoLoop,
    applyBgVideoVolume,
    applyBgVideoRate,
    applyBgVideoHwDecode,
    persistBgOpacity,
    persistBgBlur,
    persistBgVideoFit,
    persistBgVideoMuted,
    persistBgVideoLoop,
    persistBgVideoVolume,
    persistBgVideoRate,
    persistBgVideoHwDecode,
    bgOpacitySaveTimerRef,
    bgBlurSaveTimerRef,
    handleSelectBgImage,
    handleSelectBgVideo,
    handleClearBgImage,
    handleSelectBuiltinBgImage,
    appSettingsPages,
    settingsTabLabels,
    setAppSettingsPage,
  } = props;

  const OverviewPreview = OverviewPreviewComponent;
  const [clearLogsStatus, setClearLogsStatus] = useState<'idle' | 'clearing' | string>('idle');
  const [clipboardBlacklistDraft, setClipboardBlacklistDraft] = useState<string>('');
  const [clipboardBlacklistError, setClipboardBlacklistError] = useState<string>('');
  const clearLogsResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgPreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const setNotification = useIslandStore((s) => s.setNotification);

  // 背景视频预览的音量/速度需要与设置实时同步，避免滑块调到 0 后仍能听到声音
  useEffect(() => {
    const el = bgPreviewVideoRef.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, bgVideoVolume));
    el.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
  }, [bgVideoVolume, bgVideoRate]);

  const bgPreviewVideoLoopRef = useRef<boolean>(bgVideoLoop);
  useEffect(() => { bgPreviewVideoLoopRef.current = bgVideoLoop; }, [bgVideoLoop]);

  // 预览视频自定义循环：直接用 DOM 事件监听，绕开 Chromium 原生 loop 的偶发失效
  useEffect(() => {
    if (bgMediaType !== 'video' || !bgMediaPreviewUrl) return;
    const el = bgPreviewVideoRef.current;
    if (!el) return;
    el.loop = false;
    const restart = (): void => {
      if (!bgPreviewVideoLoopRef.current) return;
      try { el.currentTime = 0; } catch { /* ignore */ }
      el.play().catch(() => {});
    };
    const onEnded = (): void => { restart(); };
    const onTimeUpdate = (): void => {
      if (!bgPreviewVideoLoopRef.current) return;
      const duration = el.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (duration - el.currentTime <= 0.12) {
        restart();
      }
    };
    el.addEventListener('ended', onEnded);
    el.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [bgMediaType, bgMediaPreviewUrl]);

  useEffect(() => {
    if (!bgVideoLoop) return;
    const el = bgPreviewVideoRef.current;
    if (!el) return;
    if (el.ended) {
      try { el.currentTime = 0; } catch { /* ignore */ }
      el.play().catch(() => {});
    }
  }, [bgVideoLoop]);

  /** 倒数日/TODOs 独立窗口模式 */
  const [standaloneWindowMode, setStandaloneWindowMode] = useState<'integrated' | 'standalone'>('integrated');
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead('standalone-window-mode').then((data) => {
      if (cancelled) return;
      if (data === 'standalone') {
        setStandaloneWindowMode('standalone');
        return;
      }
      window.api.storeRead('countdown-window-mode').then((legacyData) => {
        if (cancelled) return;
        if (legacyData === 'standalone') setStandaloneWindowMode('standalone');
      }).catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleStandaloneWindowModeChange = (mode: 'integrated' | 'standalone'): void => {
    setStandaloneWindowMode(mode);
    window.api.storeWrite('standalone-window-mode', mode).catch(() => {});

    const restartRequiredNotification = {
      title: t('settings.app.notifications.configChanged.title', { defaultValue: '配置变更' }),
      body: t('settings.app.notifications.configChanged.body', { defaultValue: '待办事项/倒数日/设置打开方式已变更，是否立即重启生效？' }),
      icon: SvgIcon.SETTING,
      type: 'restart-required',
    } as const;

    setNotification(restartRequiredNotification);
    window.api.settingsPreview('notification:show', restartRequiredNotification).catch(() => {});
  };

  const normalizeBlacklistDomain = (raw: string): string => {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return '';
    try {
      const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      return new URL(withScheme).hostname.toLowerCase().replace(/\.$/, '');
    } catch {
      return '';
    }
  };

  useEffect(() => {
    return () => {
      if (clearLogsResetTimerRef.current) {
        clearTimeout(clearLogsResetTimerRef.current);
        clearLogsResetTimerRef.current = null;
      }
    };
  }, []);

  const scheduleClearLogsStatusReset = (): void => {
    if (clearLogsResetTimerRef.current) {
      clearTimeout(clearLogsResetTimerRef.current);
    }
    clearLogsResetTimerRef.current = setTimeout(() => {
      setClearLogsStatus('idle');
      clearLogsResetTimerRef.current = null;
    }, 3000);
  };

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>{t('settings.labels.app', { defaultValue: '软件设置' })}</span>
        <span className="settings-app-title-sub">- {currentAppSettingsPageLabel}</span>
      </div>

      <div className="settings-app-pages-layout">
        <div className="settings-app-page-main">
          {appSettingsPage === 'layout-preview' && (
            <div className="max-expand-settings-section">
              <div className="settings-cards">

                {/* 卡片 1：预览 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.layout.previewTitle', { defaultValue: '总览布局预览' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.layout.previewHint', { defaultValue: '实时显示左右控件组合后的 Expand 态灵动岛样式，切换下方控件可即时预览。' })}</div>
                  </div>
                  <div className="settings-island-preview-wrap">
                    <div className="settings-island-shell" key={`${layoutConfig.left}-${layoutConfig.right}`}>
                      <OverviewPreview layoutConfig={layoutConfig} />
                    </div>
                  </div>
                </div>

                {/* 卡片 2：控件组合 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.layout.widgetPickerTitle', { defaultValue: '控件组合' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.layout.widgetPickerHint', { defaultValue: '分别选择左右两侧展示的控件，切换后立即生效并自动保存。' })}</div>
                  </div>
                  <div className="settings-layout-controls">
                    <div className="settings-layout-control">
                      <span className="settings-layout-control-label">{t('settings.app.layout.leftWidget', { defaultValue: '左侧控件' })}</span>
                      <div className="settings-layout-options">
                        {overviewWidgetOptions.map((opt) => (
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
                      <span className="settings-layout-control-label">{t('settings.app.layout.rightWidget', { defaultValue: '右侧控件' })}</span>
                      <div className="settings-layout-options">
                        {overviewWidgetOptions.map((opt) => (
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
            </div>
          )}

          {appSettingsPage === 'hide-process-list' && (
            <div className="max-expand-settings-section">
              <div className="settings-cards">

                {/* 卡片 1：已加入黑名单的窗口 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.hideProcess.title', { defaultValue: '隐藏窗口管理' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.hideProcess.hint', { defaultValue: '当下方黑名单进程对应窗口处于焦点状态时，将立即隐藏灵动岛；失去焦点后自动显示。' })}</div>
                  </div>
                  <div className="settings-hide-selected">
                    {hideProcessList.length === 0 ? (
                      <span className="settings-hide-selected-empty">{t('settings.app.hideProcess.empty', { defaultValue: '暂无隐藏窗口' })}</span>
                    ) : hideProcessList.map((name: string) => (
                      <button
                        key={name}
                        className="settings-hide-selected-item"
                        type="button"
                        onClick={() => toggleHideProcess(name)}
                        title={t('settings.app.hideProcess.removeWindow', { defaultValue: '移除该窗口' })}
                      >
                        {name} ×
                      </button>
                    ))}
                  </div>
                </div>

                {/* 卡片 2：当前运行的进程选择 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.hideProcess.runningTitle', { defaultValue: '当前运行的窗口' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.hideProcess.runningHint', { defaultValue: '在列表中点击可将窗口加入 / 移出黑名单，支持按进程名搜索。' })}</div>
                  </div>
                  <div className="settings-hide-process-toolbar">
                    <input
                      className="settings-whitelist-input"
                      type="text"
                      placeholder={t('settings.app.hideProcess.searchPlaceholder', { defaultValue: '搜索进程名' })}
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
                      {hideProcessLoading
                        ? t('settings.app.hideProcess.refreshing', { defaultValue: '刷新中…' })
                        : t('settings.app.hideProcess.refresh', { defaultValue: '刷新窗口' })}
                    </button>
                  </div>
                  <div className="settings-hide-process-list">
                    {runningProcesses
                      .filter((win) => win.processName.toLowerCase().includes(hideProcessKeyword))
                      .map((process) => {
                        const name = process.processName;
                        if (!name) return null;
                        const selected = hideProcessList.some((item: string) => item.trim().toLowerCase() === name.trim().toLowerCase());
                        const fallbackText = (process.processName || process.title).charAt(0).toUpperCase();
                        return (
                          <button
                            key={`${process.id}-${name}-${process.title}`}
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
                            {process.title && (
                              <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {process.title}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {appSettingsPage === 'position' && (
            <div className="max-expand-settings-section">
              <div className="settings-cards">

                {/* 卡片 1：快速微调 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.position.quickAdjustTitle', { defaultValue: '快速微调' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.position.quickAdjustHint', { defaultValue: '每次按钮点击以 10px 步进移动灵动岛位置，立即生效并自动保存。' })}</div>
                  </div>
                  <div className="settings-hotkey-row">
                    <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x - 10, islandPositionOffset.y)}>{t('settings.app.position.moveLeft', { defaultValue: '左移 10' })}</button>
                    <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x + 10, islandPositionOffset.y)}>{t('settings.app.position.moveRight', { defaultValue: '右移 10' })}</button>
                    <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x, islandPositionOffset.y - 10)}>{t('settings.app.position.moveUp', { defaultValue: '上移 10' })}</button>
                    <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x, islandPositionOffset.y + 10)}>{t('settings.app.position.moveDown', { defaultValue: '下移 10' })}</button>
                  </div>
                </div>

                {/* 卡片 2：精确偏移 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.position.preciseTitle', { defaultValue: '精确偏移' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.position.preciseHint', { defaultValue: '手动输入水平 / 垂直偏移量（单位 px），回车或点击“应用”后生效。' })}</div>
                  </div>
                  <div className="settings-hotkey-row">
                    <label className="settings-field" style={{ flex: 1 }}>
                      <span className="settings-field-label">{t('settings.app.position.xLabel', { defaultValue: '水平偏移 X（px）' })}</span>
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
                      <span className="settings-field-label">{t('settings.app.position.yLabel', { defaultValue: '垂直偏移 Y（px）' })}</span>
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
                    <button className="settings-hotkey-btn" type="button" onClick={applyIslandPositionInput} disabled={!islandPositionInputChanged}>{t('settings.app.position.apply', { defaultValue: '应用' })}</button>
                    <button className="settings-hotkey-btn" type="button" onClick={cancelIslandPositionInput} disabled={!islandPositionInputChanged}>{t('settings.app.position.cancel', { defaultValue: '取消' })}</button>
                    <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(0, 0)}>{t('settings.app.position.resetDefault', { defaultValue: '重置为默认位置' })}</button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {appSettingsPage === 'theme' && (
            <div className="max-expand-settings-section">
              <div className="settings-cards">

                {/* 卡片 1：主题模式 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.theme.title', { defaultValue: '主题模式' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.theme.hint', { defaultValue: '选择深色、浅色或跟随系统主题，切换后立即生效' })}</div>
                  </div>
                  <div className="settings-lyrics-source-options">
                    {([
                      { value: 'dark', label: t('settings.app.theme.dark', { defaultValue: '深色模式' }) },
                      { value: 'light', label: t('settings.app.theme.light', { defaultValue: '浅色模式' }) },
                      { value: 'system', label: t('settings.app.theme.system', { defaultValue: '跟随系统' }) },
                    ] as Array<{ value: 'dark' | 'light' | 'system'; label: string }>).map((opt) => (
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
                </div>

                {/* 卡片 2：壁纸背景 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.theme.bgCardTitle', { defaultValue: '壁纸背景' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.theme.bgCardSubtitle', { defaultValue: '选择内置壁纸，或从本地导入图片 / 视频作为灵动岛背景' })}</div>
                  </div>

                  <div className="settings-card-subgroup">
                    <div className="settings-card-subgroup-title">{t('settings.app.theme.builtinWallpaper', { defaultValue: '内置壁纸' })}</div>
                    <div className="settings-music-hint">{t('settings.app.theme.builtinWallpaperHint', { defaultValue: '选择一张内置壁纸作为灵动岛背景' })}</div>
                    <div className="settings-bg-gallery">
                      {BUILTIN_WALLPAPERS.map((wp) => (
                        <button
                          key={wp.id}
                          className={`settings-bg-gallery-item ${bgMediaType === 'image' && bgMediaPreviewUrl === wp.src ? 'active' : ''}`}
                          type="button"
                          onClick={() => handleSelectBuiltinBgImage(wp.src, wp.defaultOpacity)}
                          title={`${wp.name}（默认透明度 ${wp.defaultOpacity}%）`}
                        >
                          <img src={wp.src} alt={wp.name} className="settings-bg-gallery-img" />
                          <span className="settings-bg-gallery-name">{wp.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="settings-card-subgroup">
                    <div className="settings-card-subgroup-title">{t('settings.app.theme.customImage', { defaultValue: '自定义图片' })}</div>
                    <div className="settings-music-hint">{t('settings.app.theme.customImageHint', { defaultValue: '从本地选择图片，支持 jpg / png / gif / webp' })}</div>
                    <div className="settings-hotkey-row" style={{ gap: 8, alignItems: 'center' }}>
                      <button className="settings-hotkey-btn" type="button" onClick={() => { handleSelectBgImage().catch(() => {}); }}>
                        {bgMediaType === 'image' && bgMediaPreviewUrl
                          ? t('settings.app.theme.changeImage', { defaultValue: '更换图片' })
                          : t('settings.app.theme.selectImage', { defaultValue: '选择图片' })}
                      </button>
                      {(bgMediaType === 'image' || bgMediaType === 'video') && (
                        <button className="settings-hotkey-btn" type="button" onClick={handleClearBgImage}>
                          {t('settings.app.theme.clearBackground', { defaultValue: '清除背景' })}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="settings-card-subgroup">
                    <div className="settings-card-subgroup-title">{t('settings.app.theme.customVideo', { defaultValue: '自定义视频' })}</div>
                    <div className="settings-music-hint">{t('settings.app.theme.customVideoHint', { defaultValue: '从本地选择视频，支持 mp4 / webm / mov / m4v / avi / mkv' })}</div>
                    <div className="settings-hotkey-row" style={{ gap: 8, alignItems: 'center' }}>
                      <button className="settings-hotkey-btn" type="button" onClick={() => { handleSelectBgVideo().catch(() => {}); }}>
                        {bgMediaType === 'video' && bgMediaPreviewUrl
                          ? t('settings.app.theme.changeVideo', { defaultValue: '更换视频' })
                          : t('settings.app.theme.selectVideo', { defaultValue: '选择视频' })}
                      </button>
                      {(bgMediaType === 'image' || bgMediaType === 'video') && (
                        <button className="settings-hotkey-btn" type="button" onClick={handleClearBgImage}>
                          {t('settings.app.theme.clearBackground', { defaultValue: '清除背景' })}
                        </button>
                      )}
                    </div>
                  </div>

                  {bgMediaType && bgMediaPreviewUrl && (
                    <div className="settings-card-subgroup">
                      <div className="settings-card-subgroup-title">{t('settings.app.theme.previewLabel', { defaultValue: '实时预览' })}</div>
                      <div className="settings-bg-preview">
                        {bgMediaType === 'video' ? (
                          <video
                            key={bgMediaPreviewUrl}
                            ref={bgPreviewVideoRef}
                            src={bgMediaPreviewUrl}
                            className="settings-bg-preview-img"
                            autoPlay
                            muted={bgVideoMuted || bgVideoVolume <= 0}
                            playsInline
                            preload="auto"
                            style={{ objectFit: bgVideoFit }}
                            onLoadedMetadata={(event) => {
                              event.currentTarget.loop = false;
                              event.currentTarget.volume = Math.max(0, Math.min(1, bgVideoVolume));
                              event.currentTarget.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
                            }}
                            onCanPlay={(event) => {
                              event.currentTarget.loop = false;
                              event.currentTarget.volume = Math.max(0, Math.min(1, bgVideoVolume));
                              event.currentTarget.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
                              event.currentTarget.play().catch(() => {});
                            }}
                          />
                        ) : (
                          <img src={bgMediaPreviewUrl} alt={t('settings.app.theme.previewAlt', { defaultValue: '背景预览' })} className="settings-bg-preview-img" />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 卡片 3：背景显示效果（仅在有背景时显示） */}
                {bgMediaType && bgMediaPreviewUrl && (
                  <div className="settings-card">
                    <div className="settings-card-header">
                      <div className="settings-card-title">{t('settings.app.theme.effectCardTitle', { defaultValue: '背景显示效果' })}</div>
                      <div className="settings-card-subtitle">{t('settings.app.theme.effectCardSubtitle', { defaultValue: '调整背景的透明度与模糊度' })}</div>
                    </div>

                    <div className="settings-card-subgroup">
                      <div className="settings-card-subgroup-title">{t('settings.app.theme.opacityTitle', { defaultValue: '背景透明度' })}</div>
                      <div className="settings-music-hint">{t('settings.app.theme.imageOpacityHint', { defaultValue: '背景图片透明度（0% - 100%），数值越高图片越明显' })}</div>
                      <div className="settings-opacity-slider-row">
                        <input
                          className="settings-opacity-slider"
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={bgImageOpacity}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            const safe = Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 30;
                            setBgImageOpacity(safe);
                            applyBgOpacity(safe);
                            window.api.settingsPreview('store:island-bg-opacity', safe).catch(() => {});
                            if (bgOpacitySaveTimerRef.current) {
                              clearTimeout(bgOpacitySaveTimerRef.current);
                            }
                            bgOpacitySaveTimerRef.current = setTimeout(() => {
                              persistBgOpacity(safe);
                              bgOpacitySaveTimerRef.current = null;
                            }, 220);
                          }}
                          onBlur={() => {
                            if (bgOpacitySaveTimerRef.current) {
                              clearTimeout(bgOpacitySaveTimerRef.current);
                              bgOpacitySaveTimerRef.current = null;
                            }
                            persistBgOpacity(bgImageOpacity);
                          }}
                        />
                        <span className="settings-opacity-slider-value">{bgImageOpacity}%</span>
                      </div>
                    </div>

                    <div className="settings-card-subgroup">
                      <div className="settings-card-subgroup-title">{t('settings.app.theme.blurTitle', { defaultValue: '背景模糊度' })}</div>
                      <div className="settings-music-hint">{t('settings.app.theme.imageBlurHint', { defaultValue: '背景图片模糊度（0px - 20px），数值越高越模糊' })}</div>
                      <div className="settings-opacity-slider-row">
                        <input
                          className="settings-opacity-slider"
                          type="range"
                          min={0}
                          max={20}
                          step={1}
                          value={bgImageBlur}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            const safe = Number.isFinite(v) ? Math.max(0, Math.min(20, Math.round(v))) : 0;
                            setBgImageBlur(safe);
                            applyBgBlur(safe);
                            window.api.settingsPreview('store:island-bg-blur', safe).catch(() => {});
                            if (bgBlurSaveTimerRef.current) {
                              clearTimeout(bgBlurSaveTimerRef.current);
                            }
                            bgBlurSaveTimerRef.current = setTimeout(() => {
                              persistBgBlur(safe);
                              bgBlurSaveTimerRef.current = null;
                            }, 220);
                          }}
                          onBlur={() => {
                            if (bgBlurSaveTimerRef.current) {
                              clearTimeout(bgBlurSaveTimerRef.current);
                              bgBlurSaveTimerRef.current = null;
                            }
                            persistBgBlur(bgImageBlur);
                          }}
                        />
                        <span className="settings-opacity-slider-value">{bgImageBlur}px</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 卡片 4：视频播放（仅在视频背景时显示） */}
                {bgMediaType === 'video' && bgMediaPreviewUrl && (
                  <div className="settings-card">
                    <div className="settings-card-header">
                      <div className="settings-card-title">{t('settings.app.theme.videoCardTitle', { defaultValue: '视频播放' })}</div>
                      <div className="settings-card-subtitle">{t('settings.app.theme.videoCardSubtitle', { defaultValue: '背景视频的填充、声音与播放控制' })}</div>
                    </div>

                    <div className="settings-card-subgroup">
                      <div className="settings-card-subgroup-title">{t('settings.app.theme.videoFitHint', { defaultValue: '视频填充模式' })}</div>
                      <div className="settings-lyrics-source-options">
                        {([
                          { value: 'cover', label: t('settings.app.theme.videoFitCover', { defaultValue: '覆盖（裁切）' }) },
                          { value: 'contain', label: t('settings.app.theme.videoFitContain', { defaultValue: '完整（留边）' }) },
                        ] as Array<{ value: 'cover' | 'contain'; label: string }>).map((opt) => (
                          <button
                            key={opt.value}
                            className={`settings-lyrics-source-btn ${bgVideoFit === opt.value ? 'active' : ''}`}
                            type="button"
                            onClick={() => {
                              setBgVideoFit(opt.value);
                              applyBgVideoFit(opt.value);
                              persistBgVideoFit(opt.value);
                              window.api.settingsPreview('store:island-bg-video-fit', opt.value).catch(() => {});
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="settings-card-subgroup">
                      <div className="settings-card-subgroup-title">{t('settings.app.theme.videoAudioTitle', { defaultValue: '声音与循环' })}</div>
                      <div className="settings-card-inline-row">
                        <label className="settings-card-check">
                          <input
                            type="checkbox"
                            checked={bgVideoMuted}
                            onChange={(event) => {
                              const next = event.target.checked;
                              setBgVideoMuted(next);
                              applyBgVideoMuted(next);
                              persistBgVideoMuted(next);
                              window.api.settingsPreview('store:island-bg-video-muted', next).catch(() => {});
                            }}
                          />
                          {t('settings.app.theme.videoMutedToggle', { defaultValue: '静音播放视频' })}
                        </label>
                        <label className="settings-card-check">
                          <input
                            type="checkbox"
                            checked={bgVideoLoop}
                            onChange={(event) => {
                              const next = event.target.checked;
                              setBgVideoLoop(next);
                              applyBgVideoLoop(next);
                              persistBgVideoLoop(next);
                              window.api.settingsPreview('store:island-bg-video-loop', next).catch(() => {});
                            }}
                          />
                          {t('settings.app.theme.videoLoopToggle', { defaultValue: '循环播放视频' })}
                        </label>
                      </div>
                      <div className="settings-music-hint" style={{ marginTop: 4 }}>
                        {t('settings.app.theme.videoVolumeHint', { defaultValue: '背景视频音量（0 - 100%），取消静音后生效' })}
                      </div>
                      <div className="settings-opacity-slider-row">
                        <input
                          className="settings-opacity-slider"
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.round(bgVideoVolume * 100)}
                          onChange={(event) => {
                            const raw = Number(event.target.value);
                            const safe = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw / 100)) : 0.6;
                            setBgVideoVolume(safe);
                            applyBgVideoVolume(safe);
                            persistBgVideoVolume(safe);
                            window.api.settingsPreview('store:island-bg-video-volume', safe).catch(() => {});
                          }}
                        />
                        <span className="settings-opacity-slider-value">{Math.round(bgVideoVolume * 100)}%</span>
                      </div>
                    </div>

                    <div className="settings-card-subgroup">
                      <div className="settings-card-subgroup-title">{t('settings.app.theme.videoRateHint', { defaultValue: '播放速度' })}</div>
                      <div className="settings-lyrics-source-options">
                        {([
                          { value: 0.5, label: '0.5x' },
                          { value: 0.75, label: '0.75x' },
                          { value: 1, label: '1.0x' },
                          { value: 1.25, label: '1.25x' },
                          { value: 1.5, label: '1.5x' },
                          { value: 2, label: '2.0x' },
                        ] as Array<{ value: number; label: string }>).map((opt) => (
                          <button
                            key={opt.value}
                            className={`settings-lyrics-source-btn ${Math.abs(bgVideoRate - opt.value) < 1e-3 ? 'active' : ''}`}
                            type="button"
                            onClick={() => {
                              const safe = Math.max(0.25, Math.min(3, opt.value));
                              setBgVideoRate(safe);
                              applyBgVideoRate(safe);
                              persistBgVideoRate(safe);
                              window.api.settingsPreview('store:island-bg-video-rate', safe).catch(() => {});
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="settings-card-subgroup">
                      <div className="settings-card-subgroup-title">{t('settings.app.theme.videoPerfTitle', { defaultValue: '性能' })}</div>
                      <div className="settings-card-inline-row">
                        <label className="settings-card-check">
                          <input
                            type="checkbox"
                            checked={bgVideoHwDecode}
                            onChange={(event) => {
                              const next = event.target.checked;
                              setBgVideoHwDecode(next);
                              applyBgVideoHwDecode(next);
                              persistBgVideoHwDecode(next);
                              window.api.settingsPreview('store:island-bg-video-hw-decode', next).catch(() => {});
                            }}
                          />
                          {t('settings.app.theme.videoHwDecodeToggle', { defaultValue: '启用硬件解码（重启后生效）' })}
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 卡片 5：灵动岛透明度 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.theme.islandOpacityTitle', { defaultValue: '灵动岛透明度' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.theme.islandOpacityHint', { defaultValue: '数值越低越透明（10% - 100%），调整后立即生效' })}</div>
                  </div>
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
                        window.api.settingsPreview('island:opacity', safe).catch(() => {});
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
            </div>
          )}

          {appSettingsPage === 'behavior' && (
            <div className="max-expand-settings-section">
              <div className="settings-cards">

                {/* 卡片 1：弹性动画 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.behavior.springTitle', { defaultValue: '灵动岛弹性动画 (立即生效)' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.behavior.springHint', { defaultValue: '关闭后，展开和收起动画将变得更加平滑内敛，消除弹跳感' })}</div>
                  </div>
                  <div className="settings-card-inline-row">
                    <label className="settings-card-check">
                      <input
                        type="checkbox"
                        checked={useIslandStore.getState().springAnimation}
                        onChange={(e) => {
                          const next = e.target.checked;
                          useIslandStore.getState().setSpringAnimation(next);
                          window.api.springAnimationSet(next).catch(() => {});
                        }}
                      />
                      {t('settings.app.behavior.springToggle', { defaultValue: '启用弹性动画' })}
                    </label>
                  </div>
                </div>

                {/* 卡片 2：鼠标移开自动收回 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.behavior.mouseLeaveTitle', { defaultValue: '鼠标移开自动收回 (重启后生效)' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.behavior.mouseLeaveHint', { defaultValue: '启用后，鼠标离开灵动岛时将自动回到空闲状态（若正在播放音乐则切到歌词态）' })}</div>
                  </div>
                  <div className="settings-card-inline-row">
                    <label className="settings-card-check">
                      <input
                        type="checkbox"
                        checked={expandLeaveIdle}
                        onChange={(e) => {
                          setExpandLeaveIdle(e.target.checked);
                          window.api.expandMouseleaveIdleSet(e.target.checked).catch(() => {});
                        }}
                      />
                      {t('settings.app.behavior.expandLeaveToggle', { defaultValue: '展开态（Expand）鼠标移开后自动收回' })}
                    </label>
                    <label className="settings-card-check">
                      <input
                        type="checkbox"
                        checked={maxExpandLeaveIdle}
                        onChange={(e) => {
                          setMaxExpandLeaveIdle(e.target.checked);
                          window.api.maxexpandMouseleaveIdleSet(e.target.checked).catch(() => {});
                        }}
                      />
                      {t('settings.app.behavior.maxExpandLeaveToggle', { defaultValue: '最大展开态（MaxExpand）鼠标移开后自动收回' })}
                    </label>
                  </div>
                </div>

                {/* 卡片 3：打开方式 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.behavior.windowModeTitle', { defaultValue: '待办事项 / 倒数日 / 设置 打开方式' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.behavior.windowModeHint', { defaultValue: '选择点击导航时，在灵动岛内显示还是打开独立窗口（重启后生效）' })}</div>
                  </div>
                  <div className="settings-card-inline-row">
                    <label className="settings-card-check">
                      <input
                        type="radio"
                        name="standalone-window-mode"
                        checked={standaloneWindowMode === 'integrated'}
                        onChange={() => {
                          handleStandaloneWindowModeChange('integrated');
                        }}
                      />
                      {t('settings.app.behavior.integratedMode', { defaultValue: '集成在灵动岛中' })}
                    </label>
                    <label className="settings-card-check">
                      <input
                        type="radio"
                        name="standalone-window-mode"
                        checked={standaloneWindowMode === 'standalone'}
                        onChange={() => {
                          handleStandaloneWindowModeChange('standalone');
                        }}
                      />
                      {t('settings.app.behavior.standaloneMode', { defaultValue: '独立窗口' })}
                    </label>
                  </div>
                </div>

              </div>
            </div>
          )}

          {appSettingsPage === 'language' && (
            <div className="max-expand-settings-section">
              <div className="settings-cards">

                {/* 卡片：显示语言 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.language.title', { defaultValue: '显示语言' })}</div>
                    <div className="settings-card-subtitle">{t('settings.language.hint', { defaultValue: '切换后将立即应用到支持多语言的界面文案' })}</div>
                  </div>
                  <div className="settings-lyrics-source-options">
                    {([
                      { value: 'zh-CN', label: t('settings.language.options.zh-CN', { defaultValue: '简体中文' }) },
                      { value: 'en-US', label: t('settings.language.options.en-US', { defaultValue: 'English' }) },
                    ] as Array<{ value: 'zh-CN' | 'en-US'; label: string }>).map((opt) => (
                      <button
                        key={opt.value}
                        className={`settings-lyrics-source-btn ${appLanguage === opt.value ? 'active' : ''}`}
                        type="button"
                        onClick={() => applyAppLanguage(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="settings-music-hint">
                    {appLanguage === 'zh-CN'
                      ? t('settings.language.current.zh-CN', { defaultValue: '当前语言：简体中文' })
                      : t('settings.language.current.en-US', { defaultValue: 'Current language: English' })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {appSettingsPage === 'url-parser' && (
            <div className="max-expand-settings-section">
              <div className="settings-cards">

                {/* 卡片 1：监听开关 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.urlParser.title', { defaultValue: '剪贴板 URL 监听' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.urlParser.hint', { defaultValue: '启用后，检测到剪贴板含链接时会弹出询问通知' })}</div>
                  </div>
                  <div className="settings-card-inline-row">
                    <label className="settings-card-check">
                      <input
                        type="checkbox"
                        checked={clipboardUrlMonitorEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setClipboardUrlMonitorEnabled(next);
                          window.api.clipboardUrlMonitorSet(next).catch(() => {
                            setClipboardUrlMonitorEnabled(!next);
                          });
                        }}
                      />
                      {t('settings.app.urlParser.enableToggle', { defaultValue: '启用剪贴板 URL 监听' })}
                    </label>
                  </div>
                </div>

                {/* 卡片 2：识别规则 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.urlParser.detectModes', { defaultValue: '识别项目' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.urlParser.detectModesHint', { defaultValue: '选择剪贴板中被识别为 URL 的匹配范围，并可在收藏界面临时静音通知。' })}</div>
                  </div>
                  <div className="settings-lyrics-source-options">
                    {([
                      { value: 'https-only', label: t('settings.app.urlParser.modeHttpsOnly', { defaultValue: '强制包含 https 头' }) },
                      { value: 'http-https', label: t('settings.app.urlParser.modeHttpHttps', { defaultValue: '包含 http 头' }) },
                      { value: 'domain-only', label: t('settings.app.urlParser.modeDomainOnly', { defaultValue: '仅含有域名' }) },
                    ] as Array<{ value: 'https-only' | 'http-https' | 'domain-only'; label: string }>).map((opt) => (
                      <button
                        key={opt.value}
                        className={`settings-lyrics-source-btn ${clipboardUrlDetectMode === opt.value ? 'active' : ''}`}
                        type="button"
                        onClick={() => {
                          setClipboardUrlDetectMode(opt.value);
                          window.api.clipboardUrlDetectModeSet(opt.value).catch(() => {});
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="settings-card-inline-row">
                    <label className="settings-card-check">
                      <input
                        type="checkbox"
                        checked={clipboardUrlSuppressInFavorites}
                        onChange={(e) => {
                          const next = e.target.checked;
                          const prev = clipboardUrlSuppressInFavorites;
                          setClipboardUrlSuppressInFavorites(next);
                          try {
                            localStorage.setItem('clipboard-url-suppress-in-url-favorites', next ? '1' : '0');
                          } catch { /* noop */ }
                          window.api.storeWrite('clipboard-url-suppress-in-url-favorites', next).catch(() => {
                            setClipboardUrlSuppressInFavorites(prev);
                            try {
                              localStorage.setItem('clipboard-url-suppress-in-url-favorites', prev ? '1' : '0');
                            } catch { /* noop */ }
                          });
                        }}
                      />
                      {t('settings.app.urlParser.suppressInFavorites', { defaultValue: '在 URL 收藏界面时不弹通知' })}
                    </label>
                  </div>
                </div>

                {/* 卡片 3：域名黑名单 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.urlParser.blacklistTitle', { defaultValue: 'URL 黑名单（按域名）' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.urlParser.blacklistHint', { defaultValue: '命中黑名单域名时：单个链接不弹窗，多链接自动剔除' })}</div>
                  </div>
                  <div className="settings-hotkey-row" style={{ gap: 8 }}>
                    <input
                      className="settings-whitelist-input"
                      type="text"
                      placeholder={t('settings.app.urlParser.blacklistPlaceholder', { defaultValue: '输入域名，如 example.com' })}
                      value={clipboardBlacklistDraft}
                      onChange={(e) => {
                        setClipboardBlacklistDraft(e.target.value);
                        setClipboardBlacklistError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        const domain = normalizeBlacklistDomain(clipboardBlacklistDraft);
                        if (!domain) {
                          setClipboardBlacklistError(t('settings.app.urlParser.errors.invalidDomain', { defaultValue: '请输入有效域名' }));
                          return;
                        }
                        const exists = clipboardUrlBlacklist.some((item) => item === domain);
                        if (exists) {
                          setClipboardBlacklistError(t('settings.app.urlParser.errors.domainExists', { defaultValue: '该域名已在黑名单中' }));
                          return;
                        }
                        const prev = clipboardUrlBlacklist;
                        const next = [...prev, domain];
                        setClipboardUrlBlacklist(next);
                        setClipboardBlacklistDraft('');
                        window.api.clipboardUrlBlacklistSet(next).catch(() => {
                          setClipboardUrlBlacklist(prev);
                          setClipboardBlacklistError(t('settings.app.urlParser.errors.saveFailed', { defaultValue: '保存失败，请稍后重试' }));
                        });
                      }}
                    />
                    <button
                      className="settings-whitelist-add-btn"
                      type="button"
                      onClick={() => {
                        const domain = normalizeBlacklistDomain(clipboardBlacklistDraft);
                        if (!domain) {
                          setClipboardBlacklistError(t('settings.app.urlParser.errors.invalidDomain', { defaultValue: '请输入有效域名' }));
                          return;
                        }
                        const exists = clipboardUrlBlacklist.some((item) => item === domain);
                        if (exists) {
                          setClipboardBlacklistError(t('settings.app.urlParser.errors.domainExists', { defaultValue: '该域名已在黑名单中' }));
                          return;
                        }
                        const prev = clipboardUrlBlacklist;
                        const next = [...prev, domain];
                        setClipboardUrlBlacklist(next);
                        setClipboardBlacklistDraft('');
                        window.api.clipboardUrlBlacklistSet(next).catch(() => {
                          setClipboardUrlBlacklist(prev);
                          setClipboardBlacklistError(t('settings.app.urlParser.errors.saveFailed', { defaultValue: '保存失败，请稍后重试' }));
                        });
                      }}
                    >
                      {t('settings.app.urlParser.addDomain', { defaultValue: '添加域名' })}
                    </button>
                  </div>
                  {clipboardBlacklistError && <div className="settings-hotkey-error">{clipboardBlacklistError}</div>}

                  <div className="settings-hide-selected">
                    {clipboardUrlBlacklist.length === 0 ? (
                      <span className="settings-hide-selected-empty">{t('settings.app.urlParser.emptyBlacklist', { defaultValue: '暂无黑名单域名' })}</span>
                    ) : clipboardUrlBlacklist.map((domain) => (
                      <button
                        key={domain}
                        className="settings-hide-selected-item"
                        type="button"
                        onClick={() => {
                          const next = clipboardUrlBlacklist.filter((item) => item !== domain);
                          const prev = clipboardUrlBlacklist;
                          setClipboardUrlBlacklist(next);
                          window.api.clipboardUrlBlacklistSet(next).catch(() => {
                            setClipboardUrlBlacklist(prev);
                            setClipboardBlacklistError(t('settings.app.urlParser.errors.saveFailed', { defaultValue: '保存失败，请稍后重试' }));
                          });
                        }}
                        title={t('settings.app.urlParser.removeDomain', { defaultValue: '移除该域名' })}
                      >
                        {domain} ×
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {appSettingsPage === 'clipboard-history' && <ClipboardHistorySettingsSection />}

          {appSettingsPage === 'autostart' && (
            <div className="max-expand-settings-section">
              <div className="settings-cards">

                {/* 卡片 1：实用工具 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.labels.autostart', { defaultValue: '实用工具' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.autostart.toolsHint', { defaultValue: '常用应用操作与日志工具' })}</div>
                  </div>
                  <div className="settings-hotkey-row" style={{ gap: 8 }}>
                    <button className="settings-hotkey-btn" type="button" onClick={() => { window.api.quitApp(); }}>{t('settings.app.autostart.quit', { defaultValue: '关闭灵动岛' })}</button>
                    <button className="settings-hotkey-btn" type="button" onClick={() => { window.api.restartApp().catch(() => {}); }}>{t('settings.app.autostart.restart', { defaultValue: '重启灵动岛' })}</button>
                    <button className="settings-hotkey-btn" type="button" onClick={() => { window.api.openLogsFolder().catch(() => {}); }}>{t('settings.app.autostart.openLogs', { defaultValue: '打开日志文件夹' })}</button>
                    <button
                      className="settings-hotkey-btn"
                      type="button"
                      disabled={clearLogsStatus === 'clearing'}
                      onClick={() => {
                        setClearLogsStatus('clearing');
                        window.api.clearLogsCache().then((res) => {
                          if (res.success) {
                            const kb = (res.freedBytes / 1024).toFixed(1);
                            setClearLogsStatus(t('settings.app.autostart.logsCleared', { defaultValue: '已清理 {{kb}} KB', kb }));
                          } else {
                            setClearLogsStatus(t('settings.app.autostart.logsClearFailed', { defaultValue: '清理失败' }));
                          }
                          scheduleClearLogsStatusReset();
                        }).catch(() => {
                          setClearLogsStatus(t('settings.app.autostart.logsClearFailed', { defaultValue: '清理失败' }));
                          scheduleClearLogsStatusReset();
                        });
                      }}
                    >
                      {clearLogsStatus === 'clearing'
                        ? t('settings.app.autostart.logsClearing', { defaultValue: '清理中…' })
                        : clearLogsStatus === 'idle'
                          ? t('settings.app.autostart.clearLogs', { defaultValue: '清理日志缓存' })
                          : clearLogsStatus}
                    </button>
                  </div>
                </div>

                {/* 卡片 2：开机自启 */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div className="settings-card-title">{t('settings.app.autostart.title', { defaultValue: '开机自启' })}</div>
                    <div className="settings-card-subtitle">{t('settings.app.autostart.hint', { defaultValue: '设置系统启动时是否自动运行灵动岛' })}</div>
                  </div>
                  <div className="settings-lyrics-source-options">
                    {([
                      { value: 'disabled', label: t('settings.app.autostart.options.disabled', { defaultValue: '禁用' }) },
                      { value: 'enabled', label: t('settings.app.autostart.options.enabled', { defaultValue: '启用' }) },
                      { value: 'high-priority', label: t('settings.app.autostart.options.highPriority', { defaultValue: '高优先级' }) },
                    ] as Array<{ value: 'disabled' | 'enabled' | 'high-priority'; label: string }>).map((opt) => (
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
                  <div className="settings-music-hint">
                    {autostartMode === 'disabled' && t('settings.app.autostart.status.disabled', { defaultValue: '当前已禁用开机自启。' })}
                    {autostartMode === 'enabled' && t('settings.app.autostart.status.enabled', { defaultValue: '系统登录后将自动启动灵动岛。' })}
                    {autostartMode === 'high-priority' && t('settings.app.autostart.status.highPriority', { defaultValue: '以高优先级启动，更早完成加载。' })}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        <div className="settings-app-page-dots" aria-label={t('settings.app.pagination', { defaultValue: '软件设置分页' })}>
          {appSettingsPages.map((page) => (
            <button
              key={page}
              className={`settings-app-page-dot ${appSettingsPage === page ? 'active' : ''}`}
              data-label={settingsTabLabels[page]}
              type="button"
              onClick={() => setAppSettingsPage(page)}
              title={settingsTabLabels[page]}
              aria-label={settingsTabLabels[page]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
