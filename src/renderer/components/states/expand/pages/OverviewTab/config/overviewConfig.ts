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
 * @file overviewConfig.ts
 * @description Expanded 总览 Tab 的控件选项、时钟样式选项、默认布局与存储键。
 * @author 鸡哥
 */

import type {
  OverviewClockStyle,
  OverviewGradientColors,
  OverviewLayoutConfig,
  OverviewWidgetType,
} from '../types/overviewTypes';

/** 控件选项列表 */
export const OVERVIEW_WIDGET_OPTIONS: { value: OverviewWidgetType }[] = [
  { value: 'shortcuts' },
  { value: 'todo' },
  { value: 'song' },
  { value: 'album' },
  { value: 'countdown' },
  { value: 'pomodoro' },
  { value: 'mokugyo' },
  { value: 'urlFavorites' },
  { value: 'breakReminder' },
  { value: 'worldClock' },
  { value: 'alarm' },
  { value: 'performanceMonitor' },
  { value: 'agentQuota' },
];

/** 时钟样式选项 */
export const OVERVIEW_CLOCK_STYLE_OPTIONS: { value: OverviewClockStyle }[] = [
  { value: 'classic' },
  { value: 'gradient' },
  { value: 'minimal' },
];

export const DEFAULT_OVERVIEW_GRADIENT_COLORS: OverviewGradientColors = {
  start: '#7be4ff',
  middle: '#8da8ff',
  end: '#ffd28a',
};

export const LAYOUT_STORE_KEY = 'overview-layout';
export const DEFAULT_LAYOUT: OverviewLayoutConfig = {
  left: 'shortcuts',
  right: 'todo',
  clockStyle: 'classic',
  gradientColors: DEFAULT_OVERVIEW_GRADIENT_COLORS,
};

/** 旧版待办在 localStorage 中的键，主存储为空或读取失败时回退读取 */
export const LEGACY_TODOS_LOCAL_STORAGE_KEY = 'eIsland_todos';
