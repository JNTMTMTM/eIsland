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
 * @file weatherSlice.ts
 * @description 天气相关逻辑
 * @author 鸡哥
 */

import type { StateCreator } from 'zustand';
import type { WeatherSlice, WeatherApiConfig } from '../types';
import { fetchWeather } from '../../api/weather/weatherApi';
import { fetchLocation, type LocationInfo } from '../../api/weather/locationApi';
import {
  loadWeatherFromStorage,
  saveWeatherToStorage,
  loadLocationFromStorage,
  saveLocationToStorage,
  loadWeatherLocationConfig,
} from '../utils/storage';
import { logger } from '../../utils/logger';

/**
 * 构建共享位置与天气状态，多个页面同时定位时复用同一次请求。
 * @param set - 状态更新方法
 * @param get - 当前状态读取方法
 * @returns 天气及定位操作
 */
export const createWeatherSlice: StateCreator<WeatherSlice, [], [], WeatherSlice> = (set, get) => {
  let locationRequest: Promise<LocationInfo | null> | undefined;

  return {
    weather: loadWeatherFromStorage(),
    location: loadLocationFromStorage(),

    setWeather: (data) => {
      saveWeatherToStorage(data);
      set({ weather: data });
    },

    refreshLocation: async (forceRefresh = false) => {
      if (!locationRequest) {
        locationRequest = (async () => {
          const config = loadWeatherLocationConfig();
          const custom = config.customLocation;
          const customLocation: LocationInfo | null = custom
            && Number.isFinite(custom.latitude) && Number.isFinite(custom.longitude)
            ? { latitude: custom.latitude, longitude: custom.longitude, city: custom.city || '', regionName: '', country: '' }
            : null;
          if (config.priority === 'custom' && customLocation) return customLocation;
          try {
            return await fetchLocation();
          } catch (error) {
            logger.warn('[Location] IP 定位失败:', error);
          }
          return customLocation;
        })();
      }

      const pending = locationRequest;
      try {
        const fresh = await pending;
        const location = fresh ?? (forceRefresh ? null : loadLocationFromStorage());
        if (location) {
          if (fresh) saveLocationToStorage(location);
          set({ location });
        }
        return location;
      } finally {
        if (locationRequest === pending) locationRequest = undefined;
      }
    },

    fetchWeatherData: async (config?: WeatherApiConfig, forceRefresh?: boolean) => {
      try {
        const location = config
          ? { latitude: config.latitude, longitude: config.longitude }
          : await get().refreshLocation(forceRefresh);
        if (!location) {
          logger.error('[Weather] 无可用位置信息，跳过天气获取');
          return;
        }
        const weather = await fetchWeather({ latitude: location.latitude, longitude: location.longitude });
        saveWeatherToStorage(weather);
        set({ weather });
      } catch (error) {
        logger.error('[Weather] 获取天气数据失败:', error);
      }
    },
  };
};
