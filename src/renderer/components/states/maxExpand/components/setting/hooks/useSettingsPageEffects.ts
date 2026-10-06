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
 * @file useSettingsPageEffects.ts
 * @description 子页切换重置与初始窗口、导航配置读取
 * @author 鸡哥
 */

import { useEffect } from 'react';
import { STANDALONE_WINDOW_MAC_CONTROLS_STORE_KEY } from '../config/settingsTabConfig';
import { EXPAND_NAV_LAYOUT_STORE_KEY, normalizeExpandNavLayoutConfig } from '../utils/settingsConfig';
import type { useSettingsAppearance } from './useSettingsAppearance';
import type { useSettingsNavigation } from './useSettingsNavigation';

interface SettingsPageEffectsOptions {
  activeTab: ReturnType<typeof useSettingsNavigation>['activeTab'];
  setUserInitialProfilePage: ReturnType<typeof useSettingsNavigation>['setUserInitialProfilePage'];
  setAboutInitialPage: ReturnType<typeof useSettingsNavigation>['setAboutInitialPage'];
  wallpaperDetailOpen: ReturnType<typeof useSettingsNavigation>['wallpaperDetailOpen'];
  pluginMarketNavigationExpanded: ReturnType<typeof useSettingsNavigation>['pluginMarketNavigationExpanded'];
  setWallpaperSearchExpanded: ReturnType<typeof useSettingsNavigation>['setWallpaperSearchExpanded'];
  setStandaloneMacControls: ReturnType<typeof useSettingsAppearance>['setStandaloneMacControls'];
  setExpandNavLayout: ReturnType<typeof useSettingsAppearance>['setExpandNavLayout'];
}

/**
 * 在更新订阅建立前保留子页重置和初始配置读取顺序。
 * @param options - 子页状态、窗口与导航配置操作
 * @returns 无返回值
 */
export function useSettingsPageEffects(options: SettingsPageEffectsOptions): void {
  const { activeTab, setUserInitialProfilePage, setAboutInitialPage, wallpaperDetailOpen, pluginMarketNavigationExpanded, setWallpaperSearchExpanded, setStandaloneMacControls, setExpandNavLayout } = options;

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
    if (wallpaperDetailOpen && pluginMarketNavigationExpanded) {
      setWallpaperSearchExpanded(false);
    }
  }, [wallpaperDetailOpen, pluginMarketNavigationExpanded]);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(STANDALONE_WINDOW_MAC_CONTROLS_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'boolean') {
        setStandaloneMacControls(value);
      }
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(EXPAND_NAV_LAYOUT_STORE_KEY).then((data) => {
      if (cancelled) return;
      setExpandNavLayout(normalizeExpandNavLayoutConfig(data));
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);
}
