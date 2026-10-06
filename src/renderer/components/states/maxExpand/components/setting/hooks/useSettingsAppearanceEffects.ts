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
 * @file useSettingsAppearanceEffects.ts
 * @description 天气初始配置、外观加载与位置监听
 * @author 鸡哥
 */

import { useEffect } from 'react';
import type { useTranslation } from 'react-i18next';
import { ISLAND_POSITION_LOCKED_STORE_KEY } from '../../../../../../../shared/storeKeys';
import {
  loadWeatherLocationConfig,
  loadWeatherProviderConfig,
  saveWeatherProviderConfig,
} from '../../../../../../store/utils/storage';
import {
  applyIslandOpacity,
  ISLAND_AUTO_DIM_DELAY_STORE_KEY,
  ISLAND_AUTO_DIM_ENABLED_STORE_KEY,
  ISLAND_BG_IMAGE_STORE_KEY,
  ISLAND_BG_MEDIA_STORE_KEY,
  ISLAND_BG_SYNC_SYSTEM_WALLPAPER_STORE_KEY,
  ISLAND_BG_VIDEO_FIT_STORE_KEY,
  ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY,
  ISLAND_BG_VIDEO_LOOP_STORE_KEY,
  ISLAND_BG_VIDEO_MUTED_STORE_KEY,
  ISLAND_BG_VIDEO_RATE_STORE_KEY,
  ISLAND_BG_VIDEO_VOLUME_STORE_KEY,
  normalizeBgMediaConfig,
  resolveBgMediaPreviewUrl,
  WEATHER_ALERT_ENABLED_STORE_KEY,
} from '../config/settingsTabConfig';
import type { useSettingsAppearance } from './useSettingsAppearance';
import type { useSettingsNavigation } from './useSettingsNavigation';
import type { useSettingsWeather } from './useSettingsWeather';

interface SettingsAppearanceEffectsOptions {
  setWeatherPrimaryProvider: ReturnType<typeof useSettingsWeather>['setWeatherPrimaryProvider'];
  isProUser: ReturnType<typeof useSettingsNavigation>['isProUser'];
  weatherPrimaryProvider: ReturnType<typeof useSettingsWeather>['weatherPrimaryProvider'];
  setWeatherLocationPriority: ReturnType<typeof useSettingsWeather>['setWeatherLocationPriority'];
  setWeatherCustomCityInput: ReturnType<typeof useSettingsWeather>['setWeatherCustomCityInput'];
  setWeatherAlertEnabled: ReturnType<typeof useSettingsWeather>['setWeatherAlertEnabled'];
  setIslandPositionOffset: ReturnType<typeof useSettingsAppearance>['setIslandPositionOffset'];
  setIslandPositionLocked: ReturnType<typeof useSettingsAppearance>['setIslandPositionLocked'];
  t: ReturnType<typeof useTranslation>['t'];
  setIslandDisplayOptions: ReturnType<typeof useSettingsAppearance>['setIslandDisplayOptions'];
  setIslandDisplaySelection: ReturnType<typeof useSettingsAppearance>['setIslandDisplaySelection'];
  setIslandOpacity: ReturnType<typeof useSettingsAppearance>['setIslandOpacity'];
  setAutoDimEnabled: ReturnType<typeof useSettingsAppearance>['setAutoDimEnabled'];
  setAutoDimDelaySec: ReturnType<typeof useSettingsAppearance>['setAutoDimDelaySec'];
  setBgVideoFit: ReturnType<typeof useSettingsAppearance>['setBgVideoFit'];
  setBgVideoMuted: ReturnType<typeof useSettingsAppearance>['setBgVideoMuted'];
  setBgVideoLoop: ReturnType<typeof useSettingsAppearance>['setBgVideoLoop'];
  setBgVideoVolume: ReturnType<typeof useSettingsAppearance>['setBgVideoVolume'];
  setBgVideoRate: ReturnType<typeof useSettingsAppearance>['setBgVideoRate'];
  setBgVideoHwDecode: ReturnType<typeof useSettingsAppearance>['setBgVideoHwDecode'];
  setSyncDesktopWallpaperOnBackgroundChange: ReturnType<typeof useSettingsAppearance>['setSyncDesktopWallpaperOnBackgroundChange'];
  setBgImageOpacity: ReturnType<typeof useSettingsAppearance>['setBgImageOpacity'];
  setBgImageBlur: ReturnType<typeof useSettingsAppearance>['setBgImageBlur'];
  setBgMedia: ReturnType<typeof useSettingsAppearance>['setBgMedia'];
  setBgMediaPreviewUrl: ReturnType<typeof useSettingsAppearance>['setBgMediaPreviewUrl'];
  opacitySaveTimerRef: ReturnType<typeof useSettingsAppearance>['opacitySaveTimerRef'];
  bgOpacitySaveTimerRef: ReturnType<typeof useSettingsAppearance>['bgOpacitySaveTimerRef'];
  bgBlurSaveTimerRef: ReturnType<typeof useSettingsAppearance>['bgBlurSaveTimerRef'];
}

/**
 * 天气初始配置、外观加载与位置监听，保留原有依赖数组与卸载清理。
 * @param options - 初始化与同步所需的状态和操作
 * @returns 无返回值
 */
export function useSettingsAppearanceEffects(options: SettingsAppearanceEffectsOptions): void {
  const {
    setWeatherPrimaryProvider,
    isProUser,
    weatherPrimaryProvider,
    setWeatherLocationPriority,
    setWeatherCustomCityInput,
    setWeatherAlertEnabled,
    setIslandPositionOffset,
    setIslandPositionLocked,
    t,
    setIslandDisplayOptions,
    setIslandDisplaySelection,
    setIslandOpacity,
    setAutoDimEnabled,
    setAutoDimDelaySec,
    setBgVideoFit,
    setBgVideoMuted,
    setBgVideoLoop,
    setBgVideoVolume,
    setBgVideoRate,
    setBgVideoHwDecode,
    setSyncDesktopWallpaperOnBackgroundChange,
    setBgImageOpacity,
    setBgImageBlur,
    setBgMedia,
    setBgMediaPreviewUrl,
    opacitySaveTimerRef,
    bgOpacitySaveTimerRef,
    bgBlurSaveTimerRef,
  } = options;

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
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.getIslandPositionOffset().then((offset) => {
      if (cancelled || !offset) return;
      const x = typeof offset.x === 'number' && Number.isFinite(offset.x) ? Math.round(offset.x) : 0;
      const y = typeof offset.y === 'number' && Number.isFinite(offset.y) ? Math.round(offset.y) : 0;
      setIslandPositionOffset({ x, y });
    }).catch(() => { });
    window.api.storeRead(ISLAND_POSITION_LOCKED_STORE_KEY).then((value) => {
      if (cancelled) return;
      setIslandPositionLocked(value === true);
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      window.api.getIslandDisplays().catch(() => [] as Array<{ id: string; width: number; height: number; isPrimary: boolean; }>),
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
    }).catch(() => { });
    return () => { cancelled = true; };
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    window.api.islandOpacityGet().then((val) => {
      if (cancelled) return;
      const safe = typeof val === 'number' ? Math.max(10, Math.min(100, Math.round(val))) : 100;
      setIslandOpacity(safe);
      applyIslandOpacity(safe);
    }).catch(() => { });
    window.api.storeRead(ISLAND_AUTO_DIM_ENABLED_STORE_KEY).then((val) => {
      if (cancelled) return;
      if (typeof val === 'boolean') setAutoDimEnabled(val);
    }).catch(() => { });
    window.api.storeRead(ISLAND_AUTO_DIM_DELAY_STORE_KEY).then((val) => {
      if (cancelled) return;
      if (typeof val === 'number' && Number.isFinite(val)) setAutoDimDelaySec(Math.max(1, Math.min(120, Math.round(val))));
    }).catch(() => { });
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
    }).catch(() => { });
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
}
