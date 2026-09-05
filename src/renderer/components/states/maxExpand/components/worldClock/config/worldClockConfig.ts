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
 * @file worldClockConfig.ts
 * @description 世界时钟模块常量与默认配置
 * @author 鸡哥
 */

import type { WorldClockCity } from '../types/worldClockTypes';

/** 预置城市列表 */
export const DEFAULT_CITIES: WorldClockCity[] = [
  { timezone: 'Asia/Shanghai', label: '上海', order: 0 },
  { timezone: 'America/New_York', label: '纽约', order: 1 },
  { timezone: 'Europe/London', label: '伦敦', order: 2 },
  { timezone: 'Asia/Tokyo', label: '东京', order: 3 },
  { timezone: 'Australia/Sydney', label: '悉尼', order: 4 },
];

/** 时钟刷新间隔（毫秒） */
export const CLOCK_UPDATE_INTERVAL_MS = 1000;

/** 搜索防抖间隔（毫秒） */
export const PICKER_SEARCH_DEBOUNCE_MS = 200;
