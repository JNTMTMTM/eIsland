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
 */
export type IslandState = 'idle' | 'hover';

/** Hover 状态下的子标签页类型 */
export type HoverTab = 'time' | 'o3ics';

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
  /** 更新天气数据 */
  setWeather: (data: WeatherData) => void;
  /** 从接口拉取并更新天气 */
  fetchWeatherData: (config: WeatherApiConfig) => Promise<void>;
  /** 切换到待机状态 */
  setIdle: () => void;
  /** 切换到悬停状态 */
  setHover: () => void;
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
    set({ state: 'hover' });
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
