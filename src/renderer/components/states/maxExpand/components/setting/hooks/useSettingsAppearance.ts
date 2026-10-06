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
 * @file useSettingsAppearance.ts
 * @description 外观、背景媒体、布局与窗口位置的配置操作
 * @author 鸡哥
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { useTranslation } from 'react-i18next';
import { ISLAND_POSITION_LOCKED_STORE_KEY } from '../../../../../../../shared/storeKeys';
import { getLanguage, setLanguage, type AppLanguage } from '../../../../../../i18n';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { getThemeMode, type ThemeMode } from '../../../../../../utils/theme';
import type {
  OverviewClockStyle,
  OverviewLayoutConfig,
  OverviewWidgetType,
} from '../../../../expand/components/OverviewTab';
import {
  DEFAULT_AUTO_DIM_DELAY_SEC,
  ISLAND_AUTO_DIM_DELAY_STORE_KEY,
  ISLAND_AUTO_DIM_ENABLED_STORE_KEY,
  ISLAND_DISPLAY_STORE_KEY,
} from '../config/settingsTabConfig';
import { createGradientColors } from '../utils/createGradientColors';
import {
  DEFAULT_EXPAND_NAV_LAYOUT,
  DEFAULT_LAYOUT,
  DEFAULT_MAXEXPAND_NAV_LAYOUT,
  DEFAULT_NAV_ORDER,
  EXPAND_NAV_LAYOUT_STORE_KEY,
  LAYOUT_STORE_KEY,
  MAXEXPAND_NAV_LAYOUT_STORE_KEY,
  NAV_CARDS,
  NAV_CARDS_MAP,
  normalizeExpandNavLayoutConfig,
  normalizeMaxExpandNavLayoutConfig,
  type ExpandNavLayoutConfig,
  type MaxExpandNavLayoutConfig,
  type NavCardDef,
} from '../utils/settingsConfig';
import useBackgroundMediaSettingsState from './useBackgroundMediaSettingsState';
import type { useSettingsStore } from './useSettingsStore';

interface SettingsAppearanceOptions {
  t: ReturnType<typeof useTranslation>['t'];
  setNotification: ReturnType<typeof useSettingsStore>['setNotification'];
}

/**
 * 外观、背景媒体、布局与窗口位置的配置操作。
 * @param options - 当前设置上下文
 * @returns 供设置视图组合使用的状态与操作
 */
export function useSettingsAppearance(options: SettingsAppearanceOptions) {
  const { t, setNotification } = options;
  const opacitySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<OverviewLayoutConfig>(DEFAULT_LAYOUT);
  const [expandNavLayout, setExpandNavLayout] = useState<ExpandNavLayoutConfig>(DEFAULT_EXPAND_NAV_LAYOUT);
  const [maxExpandNavLayout, setMaxExpandNavLayout] = useState<MaxExpandNavLayoutConfig>(DEFAULT_MAXEXPAND_NAV_LAYOUT);
  const [navOrder, setNavOrder] = useState<string[]>(DEFAULT_NAV_ORDER);
  const [hiddenNavOrder, setHiddenNavOrder] = useState<string[]>([]);
  const [navEditMode, setNavEditMode] = useState(false);
  const dragIdxRef = useRef<number | null>(null);
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
  const [islandPositionOffset, setIslandPositionOffset] = useState<{ x: number; y: number; }>({ x: 0, y: 0 });
  const [islandPositionLocked, setIslandPositionLocked] = useState<boolean>(false);
  const [islandPositionInput, setIslandPositionInput] = useState<{ x: string; y: string; }>({ x: '0', y: '0' });
  const [islandDisplaySelection, setIslandDisplaySelection] = useState<string>('primary');
  const [islandDisplayOptions, setIslandDisplayOptions] = useState<Array<{ id: string; label: string; }>>([
    { id: 'primary', label: t('settings.app.position.displayPrimaryOption', { defaultValue: '主显示器（推荐）' }) },
  ]);

  const persistIslandOpacity = (opacity: number): void => {
    window.api.islandOpacitySet(opacity).catch(() => { });
  };

  const handleAutoDimEnabledChange = (enabled: boolean): void => {
    setAutoDimEnabled(enabled);
    window.api.storeWrite(ISLAND_AUTO_DIM_ENABLED_STORE_KEY, enabled).catch(() => { });
    window.api.settingsPreview(`store:${ISLAND_AUTO_DIM_ENABLED_STORE_KEY}`, enabled).catch(() => { });
    window.dispatchEvent(new CustomEvent('island-auto-dim-local-sync', { detail: { autoDimEnabled: enabled } }));
  };

  const handleAutoDimDelayChange = (sec: number): void => {
    const safe = Math.max(1, Math.min(120, Math.round(sec)));
    setAutoDimDelaySec(safe);
    window.api.storeWrite(ISLAND_AUTO_DIM_DELAY_STORE_KEY, safe).catch(() => { });
    window.api.settingsPreview(`store:${ISLAND_AUTO_DIM_DELAY_STORE_KEY}`, safe).catch(() => { });
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
    setLanguage(language).catch(() => { });
    window.api.settingsPreview('i18n:language', language).catch(() => { });
  };

  const persistNavConfig = useCallback((visibleOrder: string[], hiddenOrder: string[]): void => {
    window.api.navOrderSet({ visibleOrder, hiddenOrder }).catch(() => { });
  }, []);
  const resetNavConfig = useCallback((): void => {
    const nextVisible = [...DEFAULT_NAV_ORDER];
    const nextHidden: string[] = [];
    setNavOrder(nextVisible);
    setHiddenNavOrder(nextHidden);
    persistNavConfig(nextVisible, nextHidden);
  }, [persistNavConfig]);

  const updateLayout = (side: 'left' | 'right', value: OverviewWidgetType): void => {
    const updated = { ...layoutConfig, [side]: value };
    setLayoutConfig(updated);
    window.api.storeWrite(LAYOUT_STORE_KEY, updated).catch(() => { });
  };

  const updateClockStyle = (value: OverviewClockStyle): void => {
    const updated = { ...layoutConfig, clockStyle: value };
    setLayoutConfig(updated);
    window.api.storeWrite(LAYOUT_STORE_KEY, updated).catch(() => { });
  };

  const updateGradientColor = (value: string): void => {
    const gradientColors = createGradientColors(value);
    if (!gradientColors) return;
    const updated = { ...layoutConfig, gradientColors };
    setLayoutConfig(updated);
    window.api.storeWrite(LAYOUT_STORE_KEY, updated).catch(() => { });
  };

  const updateExpandNavLayout = (layout: ExpandNavLayoutConfig): void => {
    const normalized = normalizeExpandNavLayoutConfig(layout);
    setExpandNavLayout(normalized);
    window.api.storeWrite(EXPAND_NAV_LAYOUT_STORE_KEY, normalized).catch(() => { });
    window.dispatchEvent(new CustomEvent('expand-nav-layout-changed', { detail: normalized }));
  };

  const updateMaxExpandNavLayout = (layout: MaxExpandNavLayoutConfig): void => {
    const normalized = normalizeMaxExpandNavLayoutConfig(layout);
    setMaxExpandNavLayout(normalized);
    window.api.storeWrite(MAXEXPAND_NAV_LAYOUT_STORE_KEY, normalized).catch(() => { });
    window.dispatchEvent(new CustomEvent('maxexpand-nav-layout-changed', { detail: normalized }));
  };

  const handleIslandPositionLockedChange = (locked: boolean): void => {
    setIslandPositionLocked(locked);
    window.api.storeWrite(ISLAND_POSITION_LOCKED_STORE_KEY, locked).catch(() => { });
    window.api.settingsPreview(`store:${ISLAND_POSITION_LOCKED_STORE_KEY}`, locked).catch(() => { });
    window.dispatchEvent(new CustomEvent('island-position-lock-local-sync', { detail: { locked } }));
  };

  const applyIslandPositionOffset = (x: number, y: number): void => {
    const next = {
      x: Math.max(-2000, Math.min(2000, Math.round(x))),
      y: Math.max(-1200, Math.min(1200, Math.round(y))),
    };
    setIslandPositionOffset(next);
    window.api.setIslandPositionOffset(next).catch(() => { });
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
      window.api.storeWrite(ISLAND_DISPLAY_STORE_KEY, normalized).catch(() => { });
    });

    const restartRequiredNotification = {
      title: t('settings.app.notifications.configChanged.title', { defaultValue: '配置变更' }),
      body: t('settings.app.notifications.displayChanged.body', { defaultValue: '目标显示器已变更，是否立即重启生效？' }),
      icon: SvgIcon.SETTING,
      type: 'restart-required',
    } as const;

    setNotification(restartRequiredNotification);
    window.api.settingsPreview('notification:show', restartRequiredNotification).catch(() => { });
  };

  const islandPositionInputChanged =
    islandPositionInput.x.trim() !== String(islandPositionOffset.x)
    || islandPositionInput.y.trim() !== String(islandPositionOffset.y);

  return {
    opacitySaveTimerRef,
    layoutConfig,
    setLayoutConfig,
    expandNavLayout,
    setExpandNavLayout,
    maxExpandNavLayout,
    setMaxExpandNavLayout,
    navOrder,
    setNavOrder,
    hiddenNavOrder,
    setHiddenNavOrder,
    navEditMode,
    setNavEditMode,
    dragIdxRef,
    themeMode,
    setThemeModeState,
    standaloneMacControls,
    setStandaloneMacControls,
    appLanguage,
    setAppLanguage,
    islandOpacity,
    setIslandOpacity,
    autoDimEnabled,
    setAutoDimEnabled,
    autoDimDelaySec,
    setAutoDimDelaySec,
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
    islandPositionOffset,
    setIslandPositionOffset,
    islandPositionLocked,
    setIslandPositionLocked,
    islandPositionInput,
    setIslandPositionInput,
    islandDisplaySelection,
    setIslandDisplaySelection,
    islandDisplayOptions,
    setIslandDisplayOptions,
    persistIslandOpacity,
    handleAutoDimEnabledChange,
    handleAutoDimDelayChange,
    visibleCards,
    hiddenCards,
    applyAppLanguage,
    persistNavConfig,
    resetNavConfig,
    updateLayout,
    updateClockStyle,
    updateGradientColor,
    updateExpandNavLayout,
    updateMaxExpandNavLayout,
    handleIslandPositionLockedChange,
    applyIslandPositionOffset,
    applyIslandPositionInput,
    cancelIslandPositionInput,
    handleIslandDisplaySelectionChange,
    islandPositionInputChanged,
  };
}
