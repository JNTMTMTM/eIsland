/**
 * @file index.ts
 * @description 灵动岛 Store 模块统一导出
 */

// Store
export { default as useIslandStore } from './hooks';

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
} from './types';