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
import { resolveDistrictLocationByCoordinates } from '../../api/weather/adcodeApi';
import {
  loadWeatherFromStorage,
  saveWeatherToStorage,
  loadLocationFromStorage,
  saveLocationToStorage,
  loadWeatherLocationConfig,
  saveWeatherLocationConfig,
  type WeatherLocationConfig,
} from '../utils/storage';
import { logger } from '../../utils/logger';

/** 标识用户选择的位置，解析出的元数据不会改变此标识。 */
function locationSelectionKey(config: WeatherLocationConfig): string {
  return JSON.stringify([config.priority, config.customLocation?.latitude, config.customLocation?.longitude, config.customLocation?.city || '']);
}

/**
 * 构建共享位置与天气状态，多个页面同时定位时复用同一次请求。
 * @param set - 状态更新方法
 * @param get - 当前状态读取方法
 * @returns 天气及定位操作
 */
export const createWeatherSlice: StateCreator<WeatherSlice, [], [], WeatherSlice> = (set, get) => {
  let locationRequest: Promise<LocationInfo | null> | undefined;
  let locationRequestKey = '';

  return {
    weather: loadWeatherFromStorage(),
    location: loadLocationFromStorage(),

    setWeather: (data) => {
      saveWeatherToStorage(data);
      set({ weather: data });
    },

    refreshLocation: async (forceRefresh = false) => {
      const config = loadWeatherLocationConfig();
      const selectionKey = locationSelectionKey(config);
      if (!locationRequest || locationRequestKey !== selectionKey) {
        locationRequestKey = selectionKey;
        locationRequest = (async () => {
          const custom = config.customLocation;
          const customLocation: LocationInfo | null = custom
            && Number.isFinite(custom.latitude) && Number.isFinite(custom.longitude)
            ? { ...custom, city: custom.city || '', regionName: custom.regionName || '', country: custom.country || '' }
            : null;
          const resolveCustom = async (): Promise<LocationInfo | null> => {
            if (!customLocation || /^[A-Z]{2}$/.test(customLocation.countryCode ?? '')) return customLocation;
            const cached = get().location ?? loadLocationFromStorage();
            try {
              const metadata = cached?.latitude === customLocation.latitude && cached.longitude === customLocation.longitude
                && /^[A-Z]{2}$/.test(cached.countryCode ?? '')
                ? cached
                : await resolveDistrictLocationByCoordinates(customLocation.latitude, customLocation.longitude);
              const enriched = { ...metadata, latitude: customLocation.latitude, longitude: customLocation.longitude, city: customLocation.city || metadata.city };
              const current = loadWeatherLocationConfig();
              if (locationSelectionKey(current) === selectionKey) {
                saveWeatherLocationConfig({ ...current, customLocation: { ...enriched, city: current.customLocation?.city || '' } });
              }
              return enriched;
            } catch (error) {
              logger.warn('[Location] 自定义位置国家信息解析失败:', error);
              return customLocation;
            }
          };
          if (config.priority === 'custom' && customLocation) return resolveCustom();
          try {
            return await fetchLocation();
          } catch (error) {
            logger.warn('[Location] IP 定位失败:', error);
          }
          return resolveCustom();
        })();
      }

      const pending = locationRequest;
      try {
        const fresh = await pending;
        // 配置在请求中变化时使用新选择，旧结果不写入当前定位缓存。
        if (locationSelectionKey(loadWeatherLocationConfig()) !== selectionKey) return get().refreshLocation(forceRefresh);
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
