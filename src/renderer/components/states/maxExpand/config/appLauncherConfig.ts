/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file appLauncherConfig.ts
 * @description 应用导航页的完整应用目录，独立于传统导航布局配置。
 * @author 鸡哥
 */

import { SvgIcon } from '../../../../utils/SvgIcon';
import type { MaxExpandTab } from '../../../../store/types';

/** 完整应用映射保证新增 MaxExpand 页面时同步补齐导航入口。 */
export const MAX_EXPAND_APPS = {
  aiChat: { icon: SvgIcon.AI, color: '#7868e6' },
  todo: { icon: SvgIcon.CHECKED, color: '#36a86e' },
  urlFavorites: { icon: SvgIcon.BOOKMARK_ON, color: '#e4a22c' },
  localFileSearch: { icon: SvgIcon.SEARCH, color: '#3e9db8' },
  clipboardHistory: { icon: SvgIcon.COPY, color: '#4f83cb' },
  album: { icon: SvgIcon.PHOTO_ALBUM, color: '#d875ae' },
  mail: { icon: SvgIcon.MAIL, color: '#458fe1' },
  memo: { icon: SvgIcon.MEMO, color: '#d9a23e' },
  countdown: { icon: SvgIcon.TIMER, color: '#ed913f' },
  alarm: { icon: SvgIcon.NOTIFICATION, color: '#e5675c' },
  toolbox: { icon: SvgIcon.PLUGIN, color: '#71908a' },
  miniGame: { icon: SvgIcon.INTERACTION, color: '#af72d4' },
  stock: { icon: SvgIcon.STOCK_CHOOSE, color: '#4aa68b' },
  cli: { icon: SvgIcon.CODING, color: '#738298' },
  calculator: { icon: SvgIcon.SHORTCUT_KEY, color: '#c58046' },
  worldClock: { icon: SvgIcon.LANGUAGE, color: '#489caf' },
  calendar: { icon: SvgIcon.CALENDER, color: '#d86b72' },
  settings: { icon: SvgIcon.SETTING, color: '#818694' },
} as const satisfies Record<MaxExpandTab, { icon: string; color: string }>;

export const MAX_EXPAND_APP_TABS = Object.keys(MAX_EXPAND_APPS) as MaxExpandTab[];
