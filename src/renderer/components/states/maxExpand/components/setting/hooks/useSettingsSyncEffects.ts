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
 * @file useSettingsSyncEffects.ts
 * @description 跨窗口设置变更与打开意图同步
 * @author 鸡哥
 */

import { useEffect } from 'react';
import { ISLAND_POSITION_LOCKED_STORE_KEY } from '../../../../../../../shared/storeKeys';
import {
  AUTO_HIDE_FULLSCREEN_WINDOWS_STORE_KEY,
  ISLAND_AUTO_DIM_DELAY_STORE_KEY,
  ISLAND_AUTO_DIM_ENABLED_STORE_KEY,
  ISLAND_BG_SYNC_SYSTEM_WALLPAPER_STORE_KEY,
  ISLAND_BG_VIDEO_FIT_STORE_KEY,
  ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY,
  ISLAND_BG_VIDEO_LOOP_STORE_KEY,
  ISLAND_BG_VIDEO_MUTED_STORE_KEY,
  ISLAND_BG_VIDEO_RATE_STORE_KEY,
  ISLAND_BG_VIDEO_VOLUME_STORE_KEY,
  SETTINGS_OPEN_TAB_STORE_KEY,
  STANDALONE_WINDOW_MAC_CONTROLS_STORE_KEY,
  UPDATE_SOURCES,
  normalizeBgMediaConfig,
  resolveBgMediaPreviewUrl,
  type UpdateSourceKey,
} from '../config/settingsTabConfig';
import type { useSettingsAppearance } from './useSettingsAppearance';
import type { useSettingsBehavior } from './useSettingsBehavior';
import type { useSettingsMusic } from './useSettingsMusic';
import type { useSettingsNavigation } from './useSettingsNavigation';
import type useUpdateSettingsState from './useUpdateSettingsState';

interface SettingsSyncEffectsOptions {
  setActiveTab: ReturnType<typeof useSettingsNavigation>['setActiveTab'];
  setAboutInitialPage: ReturnType<typeof useSettingsNavigation>['setAboutInitialPage'];
  setUserInitialProfilePage: ReturnType<typeof useSettingsNavigation>['setUserInitialProfilePage'];
  setAppSettingsPage: ReturnType<typeof useSettingsNavigation>['setAppSettingsPage'];
  setAppLanguage: ReturnType<typeof useSettingsAppearance>['setAppLanguage'];
  setStandaloneMacControls: ReturnType<typeof useSettingsAppearance>['setStandaloneMacControls'];
  setBgImageOpacity: ReturnType<typeof useSettingsAppearance>['setBgImageOpacity'];
  setBgImageBlur: ReturnType<typeof useSettingsAppearance>['setBgImageBlur'];
  setBgMedia: ReturnType<typeof useSettingsAppearance>['setBgMedia'];
  setBgMediaPreviewUrl: ReturnType<typeof useSettingsAppearance>['setBgMediaPreviewUrl'];
  setBgVideoFit: ReturnType<typeof useSettingsAppearance>['setBgVideoFit'];
  setBgVideoMuted: ReturnType<typeof useSettingsAppearance>['setBgVideoMuted'];
  setBgVideoLoop: ReturnType<typeof useSettingsAppearance>['setBgVideoLoop'];
  setBgVideoVolume: ReturnType<typeof useSettingsAppearance>['setBgVideoVolume'];
  setBgVideoRate: ReturnType<typeof useSettingsAppearance>['setBgVideoRate'];
  setBgVideoHwDecode: ReturnType<typeof useSettingsAppearance>['setBgVideoHwDecode'];
  setSyncDesktopWallpaperOnBackgroundChange: ReturnType<typeof useSettingsAppearance>['setSyncDesktopWallpaperOnBackgroundChange'];
  setIslandPositionLocked: ReturnType<typeof useSettingsAppearance>['setIslandPositionLocked'];
  setAutoDimEnabled: ReturnType<typeof useSettingsAppearance>['setAutoDimEnabled'];
  setAutoDimDelaySec: ReturnType<typeof useSettingsAppearance>['setAutoDimDelaySec'];
  setAutoHideFullscreenWindowsState: ReturnType<typeof useSettingsBehavior>['setAutoHideFullscreenWindowsState'];
  setWhitelist: ReturnType<typeof useSettingsMusic>['setWhitelist'];
  setLyricsKaraoke: ReturnType<typeof useSettingsMusic>['setLyricsKaraoke'];
  setUpdateSource: ReturnType<typeof useUpdateSettingsState>['setUpdateSource'];
}

/**
 * 跨窗口设置变更与打开意图同步，保留原有依赖数组与卸载清理。
 * @param options - 初始化与同步所需的状态和操作
 * @returns 无返回值
 */
export function useSettingsSyncEffects(options: SettingsSyncEffectsOptions): void {
  const {
    setActiveTab,
    setAboutInitialPage,
    setUserInitialProfilePage,
    setAppSettingsPage,
    setAppLanguage,
    setStandaloneMacControls,
    setBgImageOpacity,
    setBgImageBlur,
    setBgMedia,
    setBgMediaPreviewUrl,
    setBgVideoFit,
    setBgVideoMuted,
    setBgVideoLoop,
    setBgVideoVolume,
    setBgVideoRate,
    setBgVideoHwDecode,
    setSyncDesktopWallpaperOnBackgroundChange,
    setIslandPositionLocked,
    setAutoDimEnabled,
    setAutoDimDelaySec,
    setAutoHideFullscreenWindowsState,
    setWhitelist,
    setLyricsKaraoke,
    setUpdateSource,
  } = options;

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
        window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, null).catch(() => { });
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
      if (channel === 'i18n:language' && (value === 'zh-CN' || value === 'en-US' || value === 'zh-TW' || value === 'ja-JP')) {
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
        }).catch(() => { });
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
      if (channel === `store:${ISLAND_POSITION_LOCKED_STORE_KEY}`) {
        if (typeof value === 'boolean') setIslandPositionLocked(value);
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
}
