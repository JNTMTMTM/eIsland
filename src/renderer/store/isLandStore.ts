/**
 * @file isLandStore.ts
 * @description 灵动岛状态管理模块，使用 Zustand 管理 hover 与待机状态
 * @author 鸡哥
 */

import { create } from 'zustand';
import { fetchWeather } from '../api/weatherApi';
import type { WeatherApiConfig } from '../api/weatherApi';

/**
 * 灵动岛 UI 状态枚举
 * - idle: 待机状态，灵动岛静默显示
 * - hover: 悬停状态，展示额外信息或图标
 * - notification: 通知状态，灵动岛展开显示通知
 */
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
  /** 目标日期（ISO 字符串） */
  targetDate: string;
  /** 倒计时标签名称 */
  label: string;
  /** 是否启用 */
  enabled: boolean;
}

/** 天气数据类型定义 */
export interface WeatherData {
  /** 温度（摄氏度） */
  temperature: number;
  /** 天气文字描述 */
  description: string;
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

/** 灵动岛 Store 接口定义 */
interface IIslandStore {
  /** 当前状态 */
  state: IslandState;
  /** hover 状态下的子标签页 */
  hoverTab: HoverTab;
  /** 天气数据 */
  weather: WeatherData;
  /** 倒计时配置 */
  countdown: CountdownConfig;
  /** 计时器数据 */
  timerData: TimerData;
  /** 当前通知数据 */
  notification: NotificationData;
  /** ===== 音乐相关状态 ===== */
  /** 是否正在播放音乐 */
  isMusicPlaying: boolean;
  /** 是否播放（内部状态） */
  isPlaying: boolean;
  /** 歌词模式 */
  lrcMode: LrcMode;
  /** 当前歌曲时长（毫秒） */
  currentDurationMs: number;
  /** 当前播放位置（毫秒） */
  currentPositionMs: number;
  /** 当前歌词文本 */
  currentLyricText: string | null;
  /** 歌曲元信息 */
  mediaInfo: MediaInfo;
  /** 多行歌词（用于展开面板） */
  nearbyLyrics: LyricLine[];
  /** 封面图片（base64 或 URL） */
  coverImage: string | null;
  /** ===== 音乐相关方法 ===== */
  /** 更新歌词数据 */
  updateLrcData: (data: LrcUpdateData) => void;
  /** 媒体变化 */
  onMediaChanged: (data: MediaChangedData) => void;
  /** 播放状态变化 */
  setPlaybackState: (isPlaying: boolean) => void;
  /** 歌词模式变化 */
  setLrcMode: (mode: LrcMode) => void;
  /** 更新进度（内部轮询） */
  updateProgress: (position_ms: number) => void;
  /** 更新封面 */
  setCoverImage: (cover: string | null) => void;
  /** 处理 NowPlaying 数据更新（主进程推送） */
  handleNowPlayingUpdate: (info: NowPlayingInfo | null) => void;
  /** ===== 原有方法 ===== */
  /** 更新天气数据 */
  setWeather: (data: WeatherData) => void;
  /** 从接口拉取并更新天气 */
  fetchWeatherData: (config: WeatherApiConfig) => Promise<void>;
  /** 切换到待机状态 */
  setIdle: () => void;
  /** 切换到悬停状态 */
  setHover: () => void;
  /** 切换到通知状态 */
  setNotification: (data: NotificationData) => void;
  /** 切换 hover 子标签页 */
  setHoverTab: (tab: HoverTab) => void;
  /** 设置倒计时配置 */
  setCountdown: (config: Partial<CountdownConfig>) => void;
  /** 设置计时器数据 */
  setTimerData: (data: Partial<TimerData>) => void;
}

/**
 * 获取默认倒计时配置（24小时内）
 */
function getDefaultCountdown(): CountdownConfig {
  const now = new Date();
  const target = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    targetDate: target.toISOString(),
    label: '明天',
    enabled: true,
  };
}

/**
 * 获取默认计时器数据
 */
function getDefaultTimerData(): TimerData {
  return {
    state: 'idle',
    remainingSeconds: 0,
    inputHours: '00',
    inputMinutes: '00',
    inputSeconds: '00',
  };
}

/**
 * 灵动岛状态管理 Store
 * @description 使用 zustand 管理状态变更，无需 Redux 的模板代码
 */
const useIslandStore = create<IIslandStore>((set) => ({
  state: 'idle',
  hoverTab: 'time',
  weather: {
    temperature: 0,
    description: ''
  },
  countdown: getDefaultCountdown(),
  timerData: getDefaultTimerData(),
  notification: {
    title: '',
    body: '',
  },
  /** ===== 音乐相关初始状态 ===== */
  isMusicPlaying: false,
  isPlaying: false,
  lrcMode: 'lrc',
  currentDurationMs: 0,
  currentPositionMs: 0,
  currentLyricText: null,
  mediaInfo: { title: '', artist: '', duration_ms: 0 },
  nearbyLyrics: [],
  coverImage: null,
  /** ===== 音乐相关方法 ===== */
  updateLrcData: (data): void => set((state) => {
    // 无歌词数据 = 停止播放
    if (data === null) {
      return {
        isMusicPlaying: false,
        isPlaying: false,
        currentLyricText: null,
        nearbyLyrics: [],
      };
    }

    return {
      isMusicPlaying: true,
      currentLyricText: data.text,
      currentPositionMs: data.position_ms ?? state.currentPositionMs,
      currentDurationMs: data.duration_ms ?? state.currentDurationMs,
      mediaInfo: {
        title: data.title || state.mediaInfo.title,
        artist: data.artist || state.mediaInfo.artist,
        duration_ms: data.duration_ms ?? state.mediaInfo.duration_ms,
      },
      nearbyLyrics: data.nearby_o3ics ?? [],
    };
  }),
  onMediaChanged: (data): void => set({
    isMusicPlaying: true,
    mediaInfo: {
      title: data.title,
      artist: data.artist,
      duration_ms: data.duration_ms ?? 0,
    },
    currentLyricText: null,
    nearbyLyrics: [],
    currentDurationMs: data.duration_ms ?? 0,
    currentPositionMs: 0,
    coverImage: data.thumbnail ?? null,
  }),
  setPlaybackState: (isPlaying): void => set({ isPlaying }),
  setLrcMode: (mode): void => set({ lrcMode: mode }),
  updateProgress: (position_ms): void => set({ currentPositionMs: position_ms }),
  setCoverImage: (cover): void => set({ coverImage: cover }),
  /** 处理 NowPlaying 数据更新（主进程推送） */
  handleNowPlayingUpdate: (info): void => {
    if (!info || !info.title) {
      set({
        isMusicPlaying: false,
        isPlaying: false,
        currentLyricText: null,
        nearbyLyrics: [],
        mediaInfo: { title: '', artist: '', duration_ms: 0 },
        currentDurationMs: 0,
        currentPositionMs: 0,
        coverImage: null,
      });
      return;
    }

    set({
      isMusicPlaying: true,
      isPlaying: info.isPlaying,
      mediaInfo: {
        title: info.title,
        artist: info.artist,
        duration_ms: info.duration_ms,
      },
      currentDurationMs: info.duration_ms,
      currentPositionMs: info.position_ms,
      coverImage: info.thumbnail,
      currentLyricText: null,
      nearbyLyrics: [],
    });
  },
  /** ===== 原有方法 ===== */
  /** @param data - 天气数据对象 */
  setWeather: (data): void => set({ weather: data }),
  /** @param config - 经纬度配置 */
  fetchWeatherData: async (config): Promise<void> => {
    const data = await fetchWeather(config);
    set({ weather: data });
  },
  setIdle: (): void => {
    window.api?.collapseWindow();
    set({ state: 'idle' });
  },
  setHover: (): void => {
    window.api?.expandWindow();
    window.api?.disableMousePassthrough();
    set({ state: 'hover' });
  },
  /** @param data - 通知数据 */
  setNotification: (data): void => {
    window.api?.expandWindow();
    set({ state: 'notification', notification: data });
  },
  /** @param tab - 目标 tab 标签页 */
  setHoverTab: (tab): void => set({ hoverTab: tab }),
  /** @param config - 倒计时配置 */
  setCountdown: (config): void =>
    set((state) => ({
      countdown: { ...state.countdown, ...config }
    })),
  /** @param data - 计时器数据 */
  setTimerData: (data): void =>
    set((state) => ({
      timerData: {
        state: data.state ?? state.timerData.state,
        remainingSeconds: data.remainingSeconds ?? state.timerData.remainingSeconds,
        inputHours: data.inputHours ?? state.timerData.inputHours,
        inputMinutes: data.inputMinutes ?? state.timerData.inputMinutes,
        inputSeconds: data.inputSeconds ?? state.timerData.inputSeconds,
      }
    }))
}));

export default useIslandStore;
