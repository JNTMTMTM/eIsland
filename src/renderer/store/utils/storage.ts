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

/**
 * 从本地存储加载天气数据
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
  return { temperature: 0, description: '', forecast: [{ temperature: 0, description: '' }, { temperature: 0, description: '' }] };
}

/**
 * 保存天气数据到本地存储
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
 */
export function saveLocationToStorage(data: LocationInfo): void {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(data));
    console.log('[Weather] 位置信息已保存到本地存储');
  } catch (error) {
    console.error('[Weather] 保存位置信息到本地存储失败:', error);
  }
}