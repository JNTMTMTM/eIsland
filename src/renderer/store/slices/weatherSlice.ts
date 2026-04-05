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

export const createWeatherSlice: StateCreator<
  WeatherSlice,
  [],
  [],
  WeatherSlice
> = (set, get) => ({
  weather: loadWeatherFromStorage(),
  location: loadLocationFromStorage(),

  setWeather: (data) => {
    saveWeatherToStorage(data);
    set({ weather: data });
  },

  fetchWeatherData: async (config?: WeatherApiConfig) => {
    let location;
    if (config) {
      location = { latitude: config.latitude, longitude: config.longitude, city: '', regionName: '', country: '' };
    } else {
      const cached = get().location;
      location = cached ?? await fetchLocation();
    }
    const { weather } = await fetchWeather({ latitude: location.latitude, longitude: location.longitude });
    saveWeatherToStorage(weather);
    saveLocationToStorage(location);
    set({ weather, location });
  },
});