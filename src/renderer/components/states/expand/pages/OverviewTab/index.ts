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
 * @file index.ts
 * @description Expanded 总览模块统一导出入口，同时导出设置页依赖的布局配置、选项与类型。
 * @author 鸡哥
 */

export { OverviewTab } from './components/OverviewTab';
export { DEFAULT_OVERVIEW_GRADIENT_COLORS, OVERVIEW_CLOCK_STYLE_OPTIONS, OVERVIEW_WIDGET_OPTIONS } from './config/overviewConfig';
export { normalizeOverviewLayoutConfig } from './utils/overviewTabUtils';
export type { OverviewClockStyle, OverviewGradientColors, OverviewLayoutConfig, OverviewWidgetType } from './types/overviewTypes';
