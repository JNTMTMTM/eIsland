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
 * @file useSettingsConfigurationEffects.ts
 * @description 音乐、布局、快捷键配置加载与清理
 * @author 鸡哥
 */

import { useEffect } from 'react';
import useIslandStore from '../../../../../../store/slices';
import { normalizeOverviewLayoutConfig } from '../../../../expand/components/OverviewTab';
import {
  CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY,
  SETTINGS_OPEN_TAB_STORE_KEY,
  UPDATE_SOURCE_STORE_KEY,
  UPDATE_SOURCES,
  type SettingsOpenTabIntent,
  type UpdateSourceKey,
} from '../config/settingsTabConfig';
import {
  LAYOUT_STORE_KEY,
  MAXEXPAND_NAV_LAYOUT_STORE_KEY,
  NAV_CARDS_MAP,
  normalizeMaxExpandNavLayoutConfig,
} from '../utils/settingsConfig';
import type { useSettingsAppearance } from './useSettingsAppearance';
import type { useSettingsBehavior } from './useSettingsBehavior';
import type { useSettingsMusic } from './useSettingsMusic';
import type { useSettingsNavigation } from './useSettingsNavigation';
import type { useSettingsShortcuts } from './useSettingsShortcuts';
import type useUpdateSettingsState from './useUpdateSettingsState';

interface SettingsConfigurationEffectsOptions {
  setIslandPositionInput: ReturnType<typeof useSettingsAppearance>['setIslandPositionInput'];
  islandPositionOffset: ReturnType<typeof useSettingsAppearance>['islandPositionOffset'];
  setWhitelist: ReturnType<typeof useSettingsMusic>['setWhitelist'];
  setLyricsSource: ReturnType<typeof useSettingsMusic>['setLyricsSource'];
  setLyricsEnabled: ReturnType<typeof useSettingsMusic>['setLyricsEnabled'];
  setLyricsTranslationEnabled: ReturnType<typeof useSettingsMusic>['setLyricsTranslationEnabled'];
  setLyricsKaraoke: ReturnType<typeof useSettingsMusic>['setLyricsKaraoke'];
  setLyricsClock: ReturnType<typeof useSettingsMusic>['setLyricsClock'];
  setLyricsCalibrateEnabled: ReturnType<typeof useSettingsMusic>['setLyricsCalibrateEnabled'];
  setLyricsCalibrateDelay: ReturnType<typeof useSettingsMusic>['setLyricsCalibrateDelay'];
  setExpandLeaveIdle: ReturnType<typeof useSettingsBehavior>['setExpandLeaveIdle'];
  setMaxExpandLeaveIdle: ReturnType<typeof useSettingsBehavior>['setMaxExpandLeaveIdle'];
  setClipboardUrlMonitorEnabled: ReturnType<typeof useSettingsBehavior>['setClipboardUrlMonitorEnabled'];
  setClipboardUrlDetectMode: ReturnType<typeof useSettingsBehavior>['setClipboardUrlDetectMode'];
  setClipboardUrlBlacklist: ReturnType<typeof useSettingsBehavior>['setClipboardUrlBlacklist'];
  setClipboardUrlSuppressInFavorites: ReturnType<typeof useSettingsBehavior>['setClipboardUrlSuppressInFavorites'];
  setAutostartMode: ReturnType<typeof useSettingsBehavior>['setAutostartMode'];
  setNavOrder: ReturnType<typeof useSettingsAppearance>['setNavOrder'];
  setHiddenNavOrder: ReturnType<typeof useSettingsAppearance>['setHiddenNavOrder'];
  setMusicSmtcNeverUnsubscribe: ReturnType<typeof useSettingsMusic>['setMusicSmtcNeverUnsubscribe'];
  setMusicSmtcUnsubscribeInput: ReturnType<typeof useSettingsMusic>['setMusicSmtcUnsubscribeInput'];
  setLayoutConfig: ReturnType<typeof useSettingsAppearance>['setLayoutConfig'];
  setMaxExpandNavLayout: ReturnType<typeof useSettingsAppearance>['setMaxExpandNavLayout'];
  setHideHotkey: ReturnType<typeof useSettingsShortcuts>['setHideHotkey'];
  setQuitHotkey: ReturnType<typeof useSettingsShortcuts>['setQuitHotkey'];
  setScreenshotHotkey: ReturnType<typeof useSettingsShortcuts>['setScreenshotHotkey'];
  setNextSongHotkey: ReturnType<typeof useSettingsShortcuts>['setNextSongHotkey'];
  setPlayPauseSongHotkey: ReturnType<typeof useSettingsShortcuts>['setPlayPauseSongHotkey'];
  setResetPositionHotkey: ReturnType<typeof useSettingsShortcuts>['setResetPositionHotkey'];
  setToggleTrayHotkey: ReturnType<typeof useSettingsShortcuts>['setToggleTrayHotkey'];
  setShowSettingsWindowHotkey: ReturnType<typeof useSettingsShortcuts>['setShowSettingsWindowHotkey'];
  setOpenClipboardHistoryHotkey: ReturnType<typeof useSettingsShortcuts>['setOpenClipboardHistoryHotkey'];
  setTogglePassthroughHotkey: ReturnType<typeof useSettingsShortcuts>['setTogglePassthroughHotkey'];
  setToggleUiLockHotkey: ReturnType<typeof useSettingsShortcuts>['setToggleUiLockHotkey'];
  setAgentVoiceInputHotkey: ReturnType<typeof useSettingsShortcuts>['setAgentVoiceInputHotkey'];
  setToggleShapeModeHotkey: ReturnType<typeof useSettingsShortcuts>['setToggleShapeModeHotkey'];
  setAboutVersion: ReturnType<typeof useSettingsNavigation>['setAboutVersion'];
  setUpdateSource: ReturnType<typeof useUpdateSettingsState>['setUpdateSource'];
  setActiveTab: ReturnType<typeof useSettingsNavigation>['setActiveTab'];
  setAboutInitialPage: ReturnType<typeof useSettingsNavigation>['setAboutInitialPage'];
  setUserInitialProfilePage: ReturnType<typeof useSettingsNavigation>['setUserInitialProfilePage'];
  setAppSettingsPage: ReturnType<typeof useSettingsNavigation>['setAppSettingsPage'];
}

/**
 * 音乐、布局、快捷键配置加载与清理，保留原有依赖数组与卸载清理。
 * @param options - 初始化与同步所需的状态和操作
 * @returns 无返回值
 */
export function useSettingsConfigurationEffects(options: SettingsConfigurationEffectsOptions): void {
  const {
    setIslandPositionInput,
    islandPositionOffset,
    setWhitelist,
    setLyricsSource,
    setLyricsEnabled,
    setLyricsTranslationEnabled,
    setLyricsKaraoke,
    setLyricsClock,
    setLyricsCalibrateEnabled,
    setLyricsCalibrateDelay,
    setExpandLeaveIdle,
    setMaxExpandLeaveIdle,
    setClipboardUrlMonitorEnabled,
    setClipboardUrlDetectMode,
    setClipboardUrlBlacklist,
    setClipboardUrlSuppressInFavorites,
    setAutostartMode,
    setNavOrder,
    setHiddenNavOrder,
    setMusicSmtcNeverUnsubscribe,
    setMusicSmtcUnsubscribeInput,
    setLayoutConfig,
    setMaxExpandNavLayout,
    setHideHotkey,
    setQuitHotkey,
    setScreenshotHotkey,
    setNextSongHotkey,
    setPlayPauseSongHotkey,
    setResetPositionHotkey,
    setToggleTrayHotkey,
    setShowSettingsWindowHotkey,
    setOpenClipboardHistoryHotkey,
    setTogglePassthroughHotkey,
    setToggleUiLockHotkey,
    setAgentVoiceInputHotkey,
    setToggleShapeModeHotkey,
    setAboutVersion,
    setUpdateSource,
    setActiveTab,
    setAboutInitialPage,
    setUserInitialProfilePage,
    setAppSettingsPage,
  } = options;

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
    }).catch(() => { });
    window.api.musicLyricsSourceGet().then((src) => {
      if (cancelled) return;
      setLyricsSource(src);
    }).catch(() => { });
    window.api.musicLyricsEnabledGet().then((enabled) => {
      if (cancelled) return;
      setLyricsEnabled(enabled);
    }).catch(() => { });
    window.api.musicLyricsTranslationEnabledGet().then((enabled) => {
      if (cancelled) return;
      setLyricsTranslationEnabled(enabled);
    }).catch(() => { });
    window.api.musicLyricsKaraokeGet().then((enabled) => {
      if (cancelled) return;
      setLyricsKaraoke(enabled);
    }).catch(() => { });
    window.api.musicLyricsClockGet().then((enabled) => {
      if (cancelled) return;
      setLyricsClock(enabled);
    }).catch(() => { });
    window.api.musicLyricsCalibrateEnabledGet().then((enabled) => {
      if (cancelled) return;
      setLyricsCalibrateEnabled(enabled);
    }).catch(() => { });
    window.api.musicLyricsCalibrateDelayGet().then((delay) => {
      if (cancelled) return;
      setLyricsCalibrateDelay(delay);
    }).catch(() => { });
    window.api.expandMouseleaveIdleGet().then((v) => {
      if (cancelled) return;
      setExpandLeaveIdle(v);
    }).catch(() => { });
    window.api.maxexpandMouseleaveIdleGet().then((v) => {
      if (cancelled) return;
      setMaxExpandLeaveIdle(v);
    }).catch(() => { });
    window.api.springAnimationGet().then((v) => {
      if (cancelled) return;
      useIslandStore.getState().setSpringAnimation(v);
    }).catch(() => { });
    window.api.animationSpeedGet().then((v) => {
      if (cancelled) return;
      const valid = v === 'slow' || v === 'medium' || v === 'fast' ? v : 'medium';
      useIslandStore.getState().setAnimationSpeed(valid);
    }).catch(() => { });
    window.api.clipboardUrlMonitorGet().then((v) => {
      if (cancelled) return;
      setClipboardUrlMonitorEnabled(v);
    }).catch(() => { });
    window.api.clipboardUrlDetectModeGet().then((mode) => {
      if (cancelled) return;
      setClipboardUrlDetectMode(mode);
    }).catch(() => { });
    window.api.clipboardUrlBlacklistGet().then((list) => {
      if (cancelled) return;
      setClipboardUrlBlacklist(Array.isArray(list) ? list : []);
    }).catch(() => { });
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
    }).catch(() => { });
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
    }).catch(() => { });
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
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);

  /** 加载总览布局配置 */
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(LAYOUT_STORE_KEY).then((data) => {
      if (cancelled) return;
      setLayoutConfig(normalizeOverviewLayoutConfig(data));
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);

  /** 加载全展开导航布局配置 */
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(MAXEXPAND_NAV_LAYOUT_STORE_KEY).then((data) => {
      if (cancelled) return;
      setMaxExpandNavLayout(normalizeMaxExpandNavLayoutConfig(data));
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);

  /** 加载快捷键配置 */
  useEffect(() => {
    let cancelled = false;
    window.api.hotkeyGet().then((key) => {
      if (cancelled) return;
      setHideHotkey(key || '');
    }).catch(() => { });
    window.api.quitHotkeyGet().then((key) => {
      if (cancelled) return;
      setQuitHotkey(key || '');
    }).catch(() => { });
    window.api.screenshotHotkeyGet().then((key) => {
      if (cancelled) return;
      setScreenshotHotkey(key || '');
    }).catch(() => { });
    window.api.nextSongHotkeyGet().then((key) => {
      if (cancelled) return;
      setNextSongHotkey(key || '');
    }).catch(() => { });
    window.api.playPauseSongHotkeyGet().then((key) => {
      if (cancelled) return;
      setPlayPauseSongHotkey(key || '');
    }).catch(() => { });
    window.api.resetPositionHotkeyGet().then((key) => {
      if (cancelled) return;
      setResetPositionHotkey(key || '');
    }).catch(() => { });
    window.api.toggleTrayHotkeyGet().then((key) => {
      if (cancelled) return;
      setToggleTrayHotkey(key || '');
    }).catch(() => { });
    window.api.showSettingsWindowHotkeyGet().then((key) => {
      if (cancelled) return;
      setShowSettingsWindowHotkey(key || '');
    }).catch(() => { });
    window.api.openClipboardHistoryHotkeyGet().then((key) => {
      if (cancelled) return;
      setOpenClipboardHistoryHotkey(key || '');
    }).catch(() => { });
    window.api.togglePassthroughHotkeyGet().then((key) => {
      if (cancelled) return;
      setTogglePassthroughHotkey(key || '');
    }).catch(() => { });
    window.api.toggleUiLockHotkeyGet().then((key) => {
      if (cancelled) return;
      setToggleUiLockHotkey(key || '');
    }).catch(() => { });
    window.api.agentVoiceInputHotkeyGet().then((key) => {
      if (cancelled) return;
      setAgentVoiceInputHotkey(key || '');
    }).catch(() => { });
    window.api.toggleShapeModeHotkeyGet().then((key) => {
      if (cancelled) return;
      setToggleShapeModeHotkey(key || '');
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);

  /** 组件卸载时兜底恢复快捷键响应 */
  useEffect(() => {
    return () => {
      window.api.hotkeyResume().catch(() => { });
    };
  }, []);

  /** 获取当前版本号 */
  useEffect(() => {
    window.api.updaterVersion?.().then((v) => {
      if (v) setAboutVersion(v);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(UPDATE_SOURCE_STORE_KEY).then((value) => {
      if (cancelled) return;
      setUpdateSource(UPDATE_SOURCES.some(s => s.key === value) ? value as UpdateSourceKey : 'cloudflare-r2');
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(SETTINGS_OPEN_TAB_STORE_KEY).then((value) => {
      if (cancelled) return;
      const intent = value as SettingsOpenTabIntent | null;
      if (intent === 'update') {
        setActiveTab('update');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => { });
      }
      if (intent === 'mail') {
        setActiveTab('mail');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => { });
      }
      if (intent === 'about-feedback') {
        setActiveTab('about');
        setAboutInitialPage('feedback');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => { });
      }
      if (intent === 'user-orders') {
        setActiveTab('user');
        setUserInitialProfilePage('orders');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => { });
      }
      if (intent === 'user-info') {
        setActiveTab('user');
        setUserInitialProfilePage('info');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => { });
      }
      if (intent === 'ai') {
        setActiveTab('ai');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => { });
      }
      if (intent === 'performance-monitor') {
        setActiveTab('app');
        setAppSettingsPage('performance-monitor');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => { });
      }
      if (intent === 'expand-layout') {
        setActiveTab('app');
        setAppSettingsPage('expand-layout');
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => { });
      }
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);
}
