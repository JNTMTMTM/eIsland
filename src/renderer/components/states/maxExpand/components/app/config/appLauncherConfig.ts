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
 * @file appLauncherConfig.ts
 * @description 应用导航页的完整应用目录，独立于传统导航布局配置。
 * @author 鸡哥
 */

import { SvgIcon } from '../../../../../../utils/SvgIcon';
import type { MaxExpandTab } from '../../../../../../store/types';

/** 完整应用映射保证新增 MaxExpand 页面时同步补齐导航入口。 */
export const MAX_EXPAND_APPS = {
  aiChat: { icon: SvgIcon.AI },
  todo: { icon: SvgIcon.CHECKED },
  urlFavorites: { icon: SvgIcon.BOOKMARK_ON },
  localFileSearch: { icon: SvgIcon.SEARCH },
  clipboardHistory: { icon: SvgIcon.COPY },
  album: { icon: SvgIcon.PHOTO_ALBUM },
  mail: { icon: SvgIcon.MAIL },
  memo: { icon: SvgIcon.MEMO },
  countdown: { icon: SvgIcon.COUNTDOWN },
  alarm: { icon: SvgIcon.TIMER },
  toolbox: { icon: SvgIcon.PLUGIN },
  miniGame: { icon: SvgIcon.INTERACTION },
  stock: { icon: SvgIcon.STOCK_CHOOSE },
  cli: { icon: SvgIcon.CODING },
  calculator: { icon: SvgIcon.SHORTCUT_KEY },
  worldClock: { icon: SvgIcon.WORLDCLOCK },
  calendar: { icon: SvgIcon.CALENDER },
  settings: { icon: SvgIcon.SETTING },
} as const satisfies Record<MaxExpandTab, { icon: string }>;

export const MAX_EXPAND_APP_TABS = Object.keys(MAX_EXPAND_APPS) as MaxExpandTab[];

/** 长按进入拖动的等待时长（毫秒）。 */
export const APP_LAUNCHER_LONG_PRESS_MS = 450;

/** 长按前允许的指针抖动距离（像素）。 */
export const APP_LAUNCHER_MOVE_TOLERANCE = 8;

/** 拖动时图标圆圈的放大倍率，用于同步视觉样式与边界计算。 */
export const APP_LAUNCHER_DRAG_SCALE = 1.15;

/** 长按进度圈超出图标圆圈的距离（像素）。 */
export const APP_LAUNCHER_HOLD_RING_OUTSET = 5;
