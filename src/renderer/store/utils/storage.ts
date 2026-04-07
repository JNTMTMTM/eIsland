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
 * @file storage.ts
 * @description 本地存储工具函数
 * @author 鸡哥
 */

import type { WeatherData } from '../types';
import type { LocationInfo } from '../../api/locationApi';

/** 本地存储 key */
const WEATHER_STORAGE_KEY = 'island_weather';
const LOCATION_STORAGE_KEY = 'island_location';
const NETWORK_CONFIG_KEY = 'island_network_config';

/** 默认网络请求超时（毫秒） */
export const DEFAULT_NETWORK_TIMEOUT_MS = 10000;

/** 网络配置类型 */
export interface NetworkConfig {
  timeoutMs: number;
}

/**
 * 从本地存储加载网络配置
 * @returns NetworkConfig 网络配置对象
 */
export function loadNetworkConfig(): NetworkConfig {
  try {
    const raw = localStorage.getItem(NETWORK_CONFIG_KEY);
    if (raw) {
      const data = JSON.parse(raw) as NetworkConfig;
      if (typeof data.timeoutMs === 'number' && data.timeoutMs > 0) return data;
    }
  } catch { /* 忽略 */ }
  return { timeoutMs: DEFAULT_NETWORK_TIMEOUT_MS };
}

/**
 * 保存网络配置到本地存储
 * @param config - 要保存的网络配置
 */
export function saveNetworkConfig(config: NetworkConfig): void {
  try {
    localStorage.setItem(NETWORK_CONFIG_KEY, JSON.stringify(config));
  } catch { /* 忽略 */ }
}

/**
 * 从本地存储加载天气数据
 * @returns WeatherData 天气数据对象，加载失败时返回默认值
 */
export function loadWeatherFromStorage(): WeatherData {
  try {
    const raw = localStorage.getItem(WEATHER_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as WeatherData;
      console.log('[Weather] 从本地存储加载天气数据成功:', data);
      return data;
    }
  } catch (error) {
    console.error('[Weather] 从本地存储加载天气数据失败:', error);
  }
  return {
    temperature: 0,
    description: '',
    humidity: 0,
    windSpeed: 0,
    uvIndex: 0,
    iconCode: 0,
    forecast: [
      { temperature: 0, description: '', temperatureMax: 0, temperatureMin: 0, windSpeed: 0, uvIndex: 0, precipitationProbability: 0, iconCode: 0 },
      { temperature: 0, description: '', temperatureMax: 0, temperatureMin: 0, windSpeed: 0, uvIndex: 0, precipitationProbability: 0, iconCode: 0 }
    ]
  };
}

/**
 * 保存天气数据到本地存储
 * @param data - 要保存的天气数据
 */
export function saveWeatherToStorage(data: WeatherData): void {
  try {
    localStorage.setItem(WEATHER_STORAGE_KEY, JSON.stringify(data));
    console.log('[Weather] 天气数据已保存到本地存储');
  } catch (error) {
    console.error('[Weather] 保存天气数据到本地存储失败:', error);
  }
}

/**
 * 从本地存储加载位置信息
 * @returns LocationInfo 位置信息对象，加载失败时返回 null
 */
export function loadLocationFromStorage(): LocationInfo | null {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as LocationInfo;
      console.log('[Weather] 从本地存储加载位置信息成功:', data);
      return data;
    }
  } catch (error) {
    console.error('[Weather] 从本地存储加载位置信息失败:', error);
  }
  return null;
}

/**
 * 保存位置信息到本地存储
 * @param data - 要保存的位置信息
 */
export function saveLocationToStorage(data: LocationInfo): void {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(data));
    console.log('[Weather] 位置信息已保存到本地存储');
  } catch (error) {
    console.error('[Weather] 保存位置信息到本地存储失败:', error);
  }
}