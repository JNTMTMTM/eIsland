/**
 * @file weatherApi.ts
 * @description 天气数据接口模块
 * @author 鸡哥
 */

import { fetchWeatherApi } from 'openmeteo';
import { fetchLocation, type LocationInfo } from './locationApi';
import type { WeatherData } from '../store/isLandStore';

/** 天气接口配置 */
export interface WeatherApiConfig {
  longitude: number;
  latitude: number;
}

/** 天气数据 + 位置信息 */
export interface WeatherWithLocation {
  weather: WeatherData;
  location: LocationInfo;
}

function mapWeatherDescription(code: number): string {
  const map: Record<number, string> = {
    0: '晴',
    1: '晴',
    2: '多云',
    3: '阴',
    45: '雾',
    48: '雾',
    51: '毛毛雨',
    53: '毛毛雨',
    55: '毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    66: '冻雨',
    67: '冻雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '雪粒',
    80: '阵雨',
    81: '中阵雨',
    82: '强阵雨',
    85: '阵雪',
    86: '强阵雪',
    95: '雷雨',
    96: '雷暴',
    99: '雷暴'
  };
  return map[code] ?? '未知';
}

/**
 * 获取天气数据
 * @param config - 经纬度配置
 * @returns 天气数据及位置信息
 */
export async function fetchWeather(config: WeatherApiConfig): Promise<WeatherWithLocation>;
/**
 * 获取天气数据（自动获取精确位置）
 * @returns 天气数据及位置信息
 */
export async function fetchWeather(): Promise<WeatherWithLocation>;
export async function fetchWeather(
  config?: WeatherApiConfig
): Promise<WeatherWithLocation> {
  let location: LocationInfo;

  if (config) {
    location = {
      latitude: config.latitude,
      longitude: config.longitude,
      city: '',
      regionName: '',
      country: ''
    };
  } else {
    location = await fetchLocation();
  }

  const url = 'https://api.open-meteo.com/v1/forecast';
  const responses = await fetchWeatherApi(url, {
    latitude: location.latitude,
    longitude: location.longitude,
    current: ['temperature_2m', 'weather_code'],
    timezone: 'auto',
    forecast_days: 1
  });

  const current = responses[0].current()!;
  const temperature = Math.round(current.variables(0)!.value());
  const weatherCode = current.variables(1)!.value();

  return {
    weather: { temperature, description: mapWeatherDescription(weatherCode) },
    location
  };
}
