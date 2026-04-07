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
 * @file weatherApi.ts
 * @description 天气数据接口模块
 * @author 鸡哥
 */

import type { WeatherData } from '../store/types';
import { loadNetworkConfig } from '../store/utils/storage';

/** 天气接口配置（经纬度） */
export interface WeatherApiConfig {
  longitude: number;
  latitude: number;
}

/** Open-Meteo JSON 响应结构 */
interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weather_code?: number[];
    wind_speed_10m_max?: number[];
    uv_index_max?: number[];
    precipitation_probability_max?: number[];
  };
}

/**
 * 将 WMO 天气代码映射为中文描述
 * @param code - WMO 天气代码
 * @returns 中文天气描述
 */
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
 * 根据经纬度获取天气数据（通过主进程 netFetch 代理绕过 CORS）
 * @param config - 经纬度配置
 * @returns WeatherData
 */
export async function fetchWeather(config: WeatherApiConfig): Promise<WeatherData> {
  console.log('[WeatherApi] 请求天气数据, 坐标:', config.latitude, config.longitude);

  const params = new URLSearchParams({
    latitude: String(config.latitude),
    longitude: String(config.longitude),
    current: 'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max,uv_index_max,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '3',
  });

  const { timeoutMs } = loadNetworkConfig();
  const resp = await window.api.netFetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    { timeoutMs }
  );

  if (!resp.ok) {
    const isHtml = resp.body.trimStart().startsWith('<');
    throw new Error(
      isHtml
        ? `Weather API HTTP ${resp.status}: 服务器返回了错误页面（可能是网关超时或服务不可用）`
        : `Weather API HTTP ${resp.status}: ${resp.body.slice(0, 200)}`
    );
  }

  if (resp.body.trimStart().startsWith('<')) {
    throw new Error('Weather API 返回了非 JSON 内容，请检查网络环境');
  }

  const data = JSON.parse(resp.body) as OpenMeteoResponse;
  const current = data.current;
  const daily = data.daily;
  if (!current || !daily) {
    throw new Error('Weather API response missing current/daily fields');
  }

  const temperature = Math.round(current.temperature_2m ?? 0);
  const weatherCode = current.weather_code ?? 0;
  const humidity = Math.round(current.relative_humidity_2m ?? 0);
  const windSpeed = Math.round(current.wind_speed_10m ?? 0);

  const temperatureMax = daily.temperature_2m_max ?? [];
  const temperatureMin = daily.temperature_2m_min ?? [];
  const weatherCodes = daily.weather_code ?? [];
  const windSpeedMax = daily.wind_speed_10m_max ?? [];
  const uvIndexMax = daily.uv_index_max ?? [];
  const precipitationProbabilityMax = daily.precipitation_probability_max ?? [];

  const makeForecast = (dayIndex: number) => ({
    temperature: Math.round(temperatureMax[dayIndex] ?? temperature),
    description: mapWeatherDescription(weatherCodes[dayIndex] ?? weatherCode),
    temperatureMax: Math.round(temperatureMax[dayIndex] ?? temperature),
    temperatureMin: Math.round(temperatureMin[dayIndex] ?? temperature),
    windSpeed: Math.round(windSpeedMax[dayIndex] ?? windSpeed),
    uvIndex: Math.round(uvIndexMax[dayIndex] ?? 0),
    precipitationProbability: Math.round(precipitationProbabilityMax[dayIndex] ?? 0),
    iconCode: weatherCodes[dayIndex] ?? weatherCode,
  });

  const weather: WeatherData = {
    temperature,
    description: mapWeatherDescription(weatherCode),
    humidity,
    windSpeed,
    uvIndex: Math.round(uvIndexMax[0] ?? 0),
    iconCode: weatherCode,
    forecast: [
      makeForecast(1),
      makeForecast(2),
    ]
  };

  console.log('[WeatherApi] 天气获取成功:', weather.description, weather.temperature + '°C');
  return weather;
}
