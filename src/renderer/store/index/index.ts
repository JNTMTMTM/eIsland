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
 * @description 灵动岛 Store 模块统一导出
 * @author 鸡哥
 */

// Store
export { default as useIslandStore } from '../slices';

// Types
export type {
  IslandState,
  HoverTab,
  LrcMode,
  LyricLine,
  MediaInfo,
  NowPlayingInfo,
  LrcUpdateData,
  MediaChangedData,
  CountdownConfig,
  DayForecast,
  WeatherData,
  TimerState,
  TimerData,
  NotificationData,
  IIslandStore,
  // Slice types
  IslandSlice,
  WeatherSlice,
  TimerSlice,
  NotificationSlice,
  MediaSlice,
} from '../types';