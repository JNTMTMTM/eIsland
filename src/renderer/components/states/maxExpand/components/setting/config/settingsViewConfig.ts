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
 * @file settingsViewConfig.ts
 * @description 总览控件与时钟样式的翻译键映射
 * @author 鸡哥
 */

import type { OverviewClockStyle, OverviewWidgetType } from '../../../../expand/components/OverviewTab';

export const OVERVIEW_WIDGET_LABEL_KEYS: Record<OverviewWidgetType, string> = {
  shortcuts: 'settings.app.layout.widgetNames.shortcuts',
  todo: 'settings.app.layout.widgetNames.todo',
  song: 'settings.app.layout.widgetNames.song',
  countdown: 'settings.app.layout.widgetNames.countdown',
  pomodoro: 'settings.app.layout.widgetNames.pomodoro',
  urlFavorites: 'settings.app.layout.widgetNames.urlFavorites',
  album: 'settings.app.layout.widgetNames.album',
  mokugyo: 'settings.app.layout.widgetNames.mokugyo',
  breakReminder: 'settings.app.layout.widgetNames.breakReminder',
  worldClock: 'settings.app.layout.widgetNames.worldClock',
  alarm: 'settings.app.layout.widgetNames.alarm',
};

export const OVERVIEW_CLOCK_STYLE_LABEL_KEYS: Record<OverviewClockStyle, string> = {
  classic: 'settings.app.layout.clockStyleNames.classic',
  gradient: 'settings.app.layout.clockStyleNames.gradient',
  minimal: 'settings.app.layout.clockStyleNames.minimal',
};
