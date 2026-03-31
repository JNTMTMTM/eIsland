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
    }))
}));

export default useIslandStore;
