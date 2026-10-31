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
 * @file performanceMonitorConfig.ts
 * @description Expanded 性能监控 Tab 的存储键、刷新节奏与隐藏页面时的默认导航布局。
 * @author 鸡哥
 */

export const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';
export const STANDALONE_WINDOW_MODE_STORE_KEY = 'standalone-window-mode';
export const LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY = 'countdown-window-mode';
export const STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY = 'standalone-window-active-tab';
export const EXPAND_NAV_LAYOUT_STORE_KEY = 'expand-nav-layout';

export const REFRESH_INTERVAL_MS = 2000;
export const START_FETCH_DELAY_MS = 200;

/** 隐藏本页面时重建导航布局所认识的 Tab */
export const HIDE_PAGE_LAYOUT_TABS = ['overview', 'song', 'tools', 'performanceMonitor'];
