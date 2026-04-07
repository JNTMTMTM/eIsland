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
import { fetchWeather } from '../../api/weatherApi';
import { fetchLocation } from '../../api/locationApi';
import { loadWeatherFromStorage, saveWeatherToStorage, loadLocationFromStorage, saveLocationToStorage } from '../utils/storage';
import { logger } from '../../utils/logger';

export const createWeatherSlice: StateCreator<
  WeatherSlice,
  [],
  [],
  WeatherSlice
> = (set) => ({
  weather: loadWeatherFromStorage(),
  location: loadLocationFromStorage(),

  setWeather: (data) => {
    saveWeatherToStorage(data);
    set({ weather: data });
  },

  fetchWeatherData: async (config?: WeatherApiConfig) => {
    try {
      // ① 读取缓存（已在 store 初始化时完成，此处打印供调试）
      const cachedWeather = loadWeatherFromStorage();
      const cachedLocation = loadLocationFromStorage();
      logger.info('[Weather] 当前缓存 -', cachedLocation
        ? `位置: ${cachedLocation.city} (${cachedLocation.latitude}, ${cachedLocation.longitude})`
        : '位置: 无缓存',
        cachedWeather.description ? `天气: ${cachedWeather.description} ${cachedWeather.temperature}°C` : '天气: 无缓存'
      );

      // ② 获取位置信息（失败则回退到缓存）
      let location;
      if (config) {
        logger.info('[Weather] 使用手动配置坐标:', config.latitude, config.longitude);
        location = { latitude: config.latitude, longitude: config.longitude, city: '', regionName: '', country: '' };
      } else {
        try {
          logger.info('[Weather] 正在获取 IP 定位...');
          location = await fetchLocation();
          logger.info('[Weather] 定位成功:', location.city, location.regionName, `(${location.latitude}, ${location.longitude})`);
          saveLocationToStorage(location);
          set({ location });
          logger.info('[Weather] 位置信息已写入缓存');
        } catch (locError) {
          logger.warn('[Weather] 定位失败，回退使用缓存位置:', locError);
          location = cachedLocation;
        }
      }

      if (!location) {
        logger.error('[Weather] 无可用位置信息，跳过天气获取');
        return;
      }

      // ③ 获取天气数据
      logger.info('[Weather] 正在获取天气数据...');
      const weather = await fetchWeather({ latitude: location.latitude, longitude: location.longitude });
      logger.info('[Weather] 天气获取成功:', weather.description, weather.temperature + '°C');

      // ④ 写入天气缓存 & 更新 store
      saveWeatherToStorage(weather);
      set({ weather });
      logger.info('[Weather] 天气数据已写入本地缓存');
    } catch (error) {
      logger.error('[Weather] 获取天气数据失败:', error);
    }
  },
});