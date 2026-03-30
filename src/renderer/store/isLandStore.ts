/**
 * @file isLandStore.ts
 * @description 灵动岛状态管理模块，使用 Zustand 管理 hover 与待机状态
 * @author 鸡哥
 */

import { create } from 'zustand';
import { fetchWeather } from '../api/weatherApi';

/**
 * 灵动岛 UI 状态枚举
 * - idle: 待机状态，灵动岛静默显示
 * - hover: 悬停状态，展示额外信息或图标
 */
export type IslandState = 'idle' | 'hover';

/** 天气数据类型定义 */
export interface WeatherData {
  /** 温度（摄氏度） */
  temperature: number;
  /** 天气文字描述 */
  description: string;
}

/** 天气 API 配置 */
interface WeatherApiConfig {
  apiKey: string;
  longitude: number;
  latitude: number;
}

/** 灵动岛 Store 接口定义 */
interface IIslandStore {
  /** 当前状态 */
  state: IslandState;
  /** 天气数据 */
  weather: WeatherData;
  /** 更新天气数据 */
  setWeather: (data: WeatherData) => void;
  /** 从接口拉取并更新天气 */
  fetchWeatherData: (config: WeatherApiConfig) => Promise<void>;
  /** 切换到待机状态 */
  setIdle: () => void;
  /** 切换到悬停状态 */
  setHover: () => void;
}

/**
 * 灵动岛状态管理 Store
 * 使用 zustand 管理状态变更，无需 Redux 的模板代码
 */
const useIslandStore = create<IIslandStore>((set) => ({
  state: 'idle',
  weather: {
    temperature: 0,
    description: ''
  },
  setWeather: (data): void => set({ weather: data }),
  fetchWeatherData: async (config): Promise<void> => {
    const data = await fetchWeather(config);
    set({ weather: data });
  },
  setIdle: (): void => set({ state: 'idle' }),
  setHover: (): void => set({ state: 'hover' })
}));

export default useIslandStore;
