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
import type { LocationInfo } from '../../api/weather/locationApi';

/** 本地存储 key */
const WEATHER_STORAGE_KEY = 'island_weather';
const LOCATION_STORAGE_KEY = 'island_location';
const NETWORK_CONFIG_KEY = 'island_network_config';
const WEATHER_PROVIDER_CONFIG_KEY = 'island_weather_provider_config';
const WEATHER_LOCATION_CONFIG_KEY = 'island_weather_location_config';
const WEATHER_LOCATION_CONFIG_STORE_KEY = 'weather-location-config';

/** 默认网络请求超时（毫秒） */
export const DEFAULT_NETWORK_TIMEOUT_MS = 10000;
export const DEFAULT_STATIC_ASSET_NODE_FREE: StaticAssetNode = 'r2';
export const DEFAULT_STATIC_ASSET_NODE_PRO: StaticAssetNode = 'r2';
export const DEFAULT_WEATHER_PRIMARY_PROVIDER: WeatherProvider = 'open-meteo';
export const DEFAULT_WEATHER_LOCATION_PRIORITY: WeatherLocationPriority = 'ip';

/** 网络配置类型 */
export type StaticAssetNode = 'r2' | 'cos' | 'oss';

export interface NetworkConfig {
  timeoutMs: number;
  staticAssetNode?: StaticAssetNode;
}

export type WeatherProvider = 'open-meteo' | 'uapi' | 'qweather-pro';
export type WeatherLocationPriority = 'ip' | 'custom';

export interface WeatherProviderConfig {
  primaryProvider: WeatherProvider;
}

export interface WeatherCustomLocationConfig {
  latitude: number;
  longitude: number;
  city?: string;
}

export interface WeatherLocationConfig {
  priority: WeatherLocationPriority;
  customLocation: WeatherCustomLocationConfig | null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeWeatherCustomLocation(value: unknown): WeatherCustomLocationConfig | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const row = value as {
    latitude?: unknown;
    longitude?: unknown;
    city?: unknown;
  };
  const latitude = toFiniteNumber(row.latitude);
  const longitude = toFiniteNumber(row.longitude);
  if (latitude === null || longitude === null) {
    return null;
  }
  return {
    latitude,
    longitude,
    city: typeof row.city === 'string' ? row.city : '',
  };
}

function normalizeWeatherLocationConfig(value: unknown): WeatherLocationConfig {
  if (!value || typeof value !== 'object') {
    return {
      priority: DEFAULT_WEATHER_LOCATION_PRIORITY,
      customLocation: null,
    };
  }
  const row = value as {
    priority?: unknown;
    customLocation?: unknown;
  };
  return {
    priority: row.priority === 'custom' ? 'custom' : 'ip',
    customLocation: normalizeWeatherCustomLocation(row.customLocation),
  };
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
      if (typeof data.timeoutMs === 'number' && data.timeoutMs > 0) {
        return {
          timeoutMs: data.timeoutMs,
          staticAssetNode: normalizeStoredStaticAssetNode(data.staticAssetNode),
        };
      }
    }
  } catch { /* 忽略 */ }
  return {
    timeoutMs: DEFAULT_NETWORK_TIMEOUT_MS,
    staticAssetNode: DEFAULT_STATIC_ASSET_NODE_FREE,
  };
}

/**
 * 保存网络配置到本地存储
 * @param config - 要保存的网络配置
 */
export function saveNetworkConfig(config: NetworkConfig): void {
  try {
    const timeoutMs = typeof config.timeoutMs === 'number' && config.timeoutMs > 0
      ? config.timeoutMs
      : DEFAULT_NETWORK_TIMEOUT_MS;
    const staticAssetNode = normalizeStoredStaticAssetNode(config.staticAssetNode);
    localStorage.setItem(NETWORK_CONFIG_KEY, JSON.stringify({ timeoutMs, staticAssetNode }));
  } catch { /* 忽略 */ }
}

export function normalizeStoredStaticAssetNode(value: unknown): StaticAssetNode {
  if (value === 'cos') return 'cos';
  if (value === 'oss') return 'oss';
  return 'r2';
}

export function normalizeStaticAssetNode(value: unknown, proUser: boolean): StaticAssetNode {
  if (proUser) {
    if (value === 'r2') return 'r2';
    if (value === 'cos') return 'cos';
    if (value === 'oss') return 'oss';
    return 'r2';
  }
  return 'r2';
}

/**
 * 从本地存储加载天气提供商配置
 * @returns WeatherProviderConfig 天气提供商配置对象，加载失败时返回默认值
 */
export function loadWeatherProviderConfig(): WeatherProviderConfig {
  try {
    const raw = localStorage.getItem(WEATHER_PROVIDER_CONFIG_KEY);
    if (raw) {
      const data = JSON.parse(raw) as WeatherProviderConfig;
      if (data.primaryProvider === 'open-meteo' || data.primaryProvider === 'uapi' || data.primaryProvider === 'qweather-pro') {
        return data;
      }
    }
  } catch { /* 忽略 */ }
  return { primaryProvider: DEFAULT_WEATHER_PRIMARY_PROVIDER };
}

/**
 * 保存天气提供商配置到本地存储
 * @param config - 要保存的天气提供商配置
 */
export function saveWeatherProviderConfig(config: WeatherProviderConfig): void {
  try {
    localStorage.setItem(WEATHER_PROVIDER_CONFIG_KEY, JSON.stringify(config));
  } catch { /* 忽略 */ }
}

/**
 * 从本地存储加载天气定位策略配置
 * @returns WeatherLocationConfig 天气定位策略配置对象
 */
export function loadWeatherLocationConfig(): WeatherLocationConfig {
  try {
    const raw = localStorage.getItem(WEATHER_LOCATION_CONFIG_KEY);
    if (raw) {
      const data = JSON.parse(raw) as unknown;
      return normalizeWeatherLocationConfig(data);
    }
  } catch { /* 忽略 */ }
  return normalizeWeatherLocationConfig(null);
}

/**
 * 保存天气定位策略配置到本地存储
 * @param config - 要保存的天气定位策略配置
 */
export function saveWeatherLocationConfig(config: WeatherLocationConfig): void {
  const normalized = normalizeWeatherLocationConfig(config);
  try {
    localStorage.setItem(WEATHER_LOCATION_CONFIG_KEY, JSON.stringify(normalized));
  } catch { /* 忽略 */ }
  void window.api?.storeWrite?.(WEATHER_LOCATION_CONFIG_STORE_KEY, normalized).catch(() => {});
}

/**
 * 启动时将天气定位配置从主进程 store 同步到本地缓存（并兼容首次迁移）
 */
export async function hydrateWeatherLocationConfigFromStore(): Promise<void> {
  const storeRead = window.api?.storeRead;
  const storeWrite = window.api?.storeWrite;
  if (!storeRead || !storeWrite) {
    return;
  }

  try {
    const storeValue = await storeRead(WEATHER_LOCATION_CONFIG_STORE_KEY);
    if (storeValue !== null && storeValue !== undefined) {
      const normalized = normalizeWeatherLocationConfig(storeValue);
      try {
        localStorage.setItem(WEATHER_LOCATION_CONFIG_KEY, JSON.stringify(normalized));
      } catch { /* 忽略 */ }
      return;
    }
  } catch { /* 忽略 */ }

  try {
    const raw = localStorage.getItem(WEATHER_LOCATION_CONFIG_KEY);
    if (!raw) {
      return;
    }
    const localData = JSON.parse(raw) as unknown;
    const normalized = normalizeWeatherLocationConfig(localData);
    await storeWrite(WEATHER_LOCATION_CONFIG_STORE_KEY, normalized);
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