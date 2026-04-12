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
 * @description 灵动岛 Store 类型定义
 * @author 鸡哥
 */

import type { LocationInfo } from '../../api/locationApi';
import type { WeatherApiConfig } from '../../api/weatherApi';
export type { WeatherApiConfig };

/** 灵动岛 UI 状态枚举 */
export type IslandState = 'idle' | 'hover' | 'expanded' | 'notification' | 'maxExpand' | 'lyrics';

/** Hover 状态下的子标签页类型 */
export type HoverTab = 'time' | 'o3ics' | 'weather' | 'expand';

/** Expanded 状态下的子标签页类型 */
export type ExpandTab = 'hover' | 'overview' | 'song' | 'tools';

/** MaxExpand 状态下的子标签页类型 */
export type MaxExpandTab = 'aiChat' | 'todo' | 'countdown' | 'settings';

/** 歌词显示模式 */
export type LrcMode = 'off' | 'info' | 'lrc';

/** 单行歌词数据类型 */
export interface LyricLine {
  text: string;
  is_current: boolean;
}

/** 同步歌词行（来自 lrcApi） */
export interface SyncedLyricLine {
  time_ms: number;
  text: string;
}

/** 媒体信息数据类型 */
export interface MediaInfo {
  title: string;
  artist: string;
  album: string;
  duration_ms: number;
}

/** NowPlaying 原始数据结构（来自 @coooookies/windows-smtc-monitor） */
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
  deviceId?: string;
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

/** 番茄钟阶段 */
export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

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
  temperatureMax: number;
  temperatureMin: number;
  windSpeed: number;
  uvIndex: number;
  precipitationProbability: number;
  iconCode: number;
}

/** 天气数据类型定义 */
export interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  forecast: [DayForecast, DayForecast];
  iconCode: number;
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
  /** 通知类型：默认通知 / 播放源切换请求 / 有新版本 / 更新就绪 */
  type?: 'default' | 'source-switch' | 'update-available' | 'update-ready';
  /** 请求切换到的播放源 ID（仅 source-switch 类型） */
  sourceAppId?: string;
  /** 更新版本号（仅 update-ready 类型） */
  updateVersion?: string;
}

/** AI 配置数据 */
export interface AiConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  mcpEndpoint: string;
  systemPrompt: string;
}

/** AI 对话单条消息 */
export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ============= Slice Interfaces =============

/** 岛屿状态 Slice */
export interface IslandSlice {
  state: IslandState;
  hoverTab: HoverTab;
  expandTab: ExpandTab;
  maxExpandTab: MaxExpandTab;
  notification: NotificationData;
  setIdle: (force?: boolean) => void;
  setHover: () => void;
  setExpanded: () => void;
  setMaxExpand: () => void;
  setLyrics: () => void;
  setNotification: (data: NotificationData) => void;
  setHoverTab: (tab: HoverTab) => void;
  setExpandTab: (tab: ExpandTab) => void;
  setMaxExpandTab: (tab: MaxExpandTab) => void;
}

/** 天气 Slice */
export interface WeatherSlice {
  weather: WeatherData;
  location: LocationInfo | null;
  setWeather: (data: WeatherData) => void;
  fetchWeatherData: (config?: WeatherApiConfig, forceRefresh?: boolean) => Promise<void>;
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
  dominantColor: [number, number, number];
  /** 同步歌词（SMTC 回调后立即获取） */
  syncedLyrics: SyncedLyricLine[] | null;
  lyricsLoading: boolean;
  updateLrcData: (data: LrcUpdateData | null) => void;
  onMediaChanged: (data: MediaChangedData) => void;
  setPlaybackState: (isPlaying: boolean) => void;
  setLrcMode: (mode: LrcMode) => void;
  updateProgress: (position_ms: number) => void;
  setCoverImage: (cover: string | null) => void;
  setDominantColor: (color: [number, number, number]) => void;
  handleNowPlayingUpdate: (info: NowPlayingInfo | null) => void;
  setSyncedLyrics: (lyrics: SyncedLyricLine[] | null) => void;
  setLyricsLoading: (loading: boolean) => void;
}

/** AI Slice */
export interface AiSlice {
  aiConfig: AiConfig;
  setAiConfig: (config: Partial<AiConfig>) => void;

  aiChatMessages: AiChatMessage[];
  setAiChatMessages: (messages: AiChatMessage[]) => void;
  clearAiChatMessages: () => void;
}

/** 番茄钟 Slice */
export interface PomodoroSlice {
  pomodoroPhase: PomodoroPhase;
  pomodoroRemaining: number;
  pomodoroRunning: boolean;
  pomodoroCompletedCount: number;
  setPomodoroPhase: (phase: PomodoroPhase) => void;
  setPomodoroRemaining: (remaining: number) => void;
  setPomodoroRunning: (running: boolean) => void;
  setPomodoroCompletedCount: (count: number) => void;
}

/** 完整 Store 类型 */
export type IIslandStore = IslandSlice & WeatherSlice & TimerSlice & MediaSlice & AiSlice & PomodoroSlice;