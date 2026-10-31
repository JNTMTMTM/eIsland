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
 * @file expandConfig.ts
 * @description 展开状态导航点默认标签，以及导航与加载反馈的默认目标页。
 * @author 鸡哥
 */

import type { MaxExpandTab } from '../../../../store/types';
import type { ExpandLoadingTab, NavDotId } from '../types/expandTypes';

/** 最大展开没有可见页面时回退到设置页 */
export const FALLBACK_MAX_EXPAND_TAB: MaxExpandTab = 'settings';

/** hover 导航点没有独立页面，加载反馈按总览展示 */
export const HOVER_LOADING_TAB: ExpandLoadingTab = 'overview';

/** 导航点标签的默认文案，翻译缺失时使用；新增导航点必须在此补齐 */
export const NAV_DOT_DEFAULT_LABELS: Record<NavDotId, string> = {
  hover: '返回',
  overview: '总览',
  song: '歌曲',
  tools: '工具',
  translation: '翻译',
  performanceMonitor: '性能监控',
  agentUsage: 'Agent用量',
  maxExpand: '最大展开',
};
