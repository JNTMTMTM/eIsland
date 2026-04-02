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