/**
 * @file index.ts
 * @description 灵动岛 Store 类型定义
 * @author 鸡哥
 */

import type { LocationInfo } from '../../api/locationApi';
import type { WeatherApiConfig } from '../../api/weatherApi';
export type { WeatherApiConfig };

/** 灵动岛 UI 状态枚举 */
export type IslandState = 'idle' | 'hover' | 'notification';

/** Hover 状态下的子标签页类型 */
export type HoverTab = 'time' | 'o3ics';

/** 歌词显示模式 */
export type LrcMode = 'off' | 'info' | 'lrc';

/** 单行歌词数据类型 */
export interface LyricLine {
  text: string;
  is_current: boolean;
}

/** 媒体信息数据类型 */
export interface MediaInfo {
  title: string;
  artist: string;
  duration_ms: number;
}

/** NowPlaying 原始数据结构（来自 node-nowplaying） */
export type NowPlayingInfo = {
  title: string;
  artist: string;
  album: string;
  duration_ms: number;
  position_ms: number;
  isPlaying: boolean;
  thumbnail: string | null;
  canFastForward: boolean;
  canSkip: boolean;
  canLike: boolean;
  canChangeVolume: boolean;
  canSetOutput: boolean;
};

/** 歌词更新数据（后端推送的格式） */
export interface LrcUpdateData {
  text: string | null;
  title: string;
  artist: string;
  position_ms?: number;
  duration_ms?: number;
  nearby_o3ics?: LyricLine[];
}

/** 媒体变化数据 */
export interface MediaChangedData {
  title: string;
  artist: string;
  thumbnail?: string | null;
  duration_ms?: number;
}

/** 倒计时数据类型 */
export interface CountdownConfig {
  targetDate: string;
  label: string;
  enabled: boolean;
}

/** 单日天气预报数据类型 */
export interface DayForecast {
  temperature: number;
  description: string;
}

/** 天气数据类型定义 */
export interface WeatherData {
  temperature: number;
  description: string;
  forecast: [DayForecast, DayForecast];
}

/** 计时器状态类型 */
export type TimerState = 'idle' | 'running' | 'paused';

/** 计时器数据接口 */
export interface TimerData {
  state: TimerState;
  remainingSeconds: number;
  inputHours: string;
  inputMinutes: string;
  inputSeconds: string;
}

/** 通知数据类型 */
export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
}

// ============= Slice Interfaces =============

/** 岛屿状态 Slice */
export interface IslandSlice {
  state: IslandState;
  hoverTab: HoverTab;
  notification: NotificationData;
  setIdle: () => void;
  setHover: () => void;
  setNotification: (data: NotificationData) => void;
  setHoverTab: (tab: HoverTab) => void;
}

/** 天气 Slice */
export interface WeatherSlice {
  weather: WeatherData;
  location: LocationInfo | null;
  setWeather: (data: WeatherData) => void;
  fetchWeatherData: (config?: WeatherApiConfig) => Promise<void>;
}

/** 计时器 Slice */
export interface TimerSlice {
  countdown: CountdownConfig;
  timerData: TimerData;
  setCountdown: (config: Partial<CountdownConfig>) => void;
  setTimerData: (data: Partial<TimerData>) => void;
}

/** 通知 Slice */
export interface NotificationSlice {
  notification: NotificationData;
}

/** 媒体/音乐 Slice */
export interface MediaSlice {
  isMusicPlaying: boolean;
  isPlaying: boolean;
  lrcMode: LrcMode;
  currentDurationMs: number;
  currentPositionMs: number;
  currentLyricText: string | null;
  mediaInfo: MediaInfo;
  nearbyLyrics: LyricLine[];
  coverImage: string | null;
  updateLrcData: (data: LrcUpdateData | null) => void;
  onMediaChanged: (data: MediaChangedData) => void;
  setPlaybackState: (isPlaying: boolean) => void;
  setLrcMode: (mode: LrcMode) => void;
  updateProgress: (position_ms: number) => void;
  setCoverImage: (cover: string | null) => void;
  handleNowPlayingUpdate: (info: NowPlayingInfo | null) => void;
}

/** 完整 Store 类型 */
export type IIslandStore = IslandSlice & WeatherSlice & TimerSlice & MediaSlice;