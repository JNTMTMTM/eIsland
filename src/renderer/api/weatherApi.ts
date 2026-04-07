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

import { fetchWeatherApi } from 'openmeteo';
import type { WeatherData } from '../store/types';

/** 天气接口配置（经纬度） */
export interface WeatherApiConfig {
  longitude: number;
  latitude: number;
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
 * 根据经纬度获取天气数据
 * @param config - 经纬度配置
 * @returns WeatherData
 */
export async function fetchWeather(config: WeatherApiConfig): Promise<WeatherData> {
  console.log('[WeatherApi] 请求天气数据, 坐标:', config.latitude, config.longitude);

  const url = 'https://api.open-meteo.com/v1/forecast';
  const responses = await fetchWeatherApi(url, {
    latitude: config.latitude,
    longitude: config.longitude,
    current: [
      'temperature_2m',
      'weather_code',
      'relative_humidity_2m',
      'wind_speed_10m'
    ],
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'weather_code',
      'wind_speed_10m_max',
      'uv_index_max',
      'precipitation_probability_max'
    ],
    timezone: 'auto',
    forecast_days: 3
  });

  const current = responses[0].current()!;
  const temperature = Math.round(current.variables(0)!.value());
  const weatherCode = current.variables(1)!.value();
  const humidity = Math.round(current.variables(2)!.value());
  const windSpeed = Math.round(current.variables(3)!.value());

  const daily = responses[0].daily()!;

  // daily indices: 0=温度最高, 1=温度最低, 2=天气码, 3=最大风速, 4=最大UV, 5=降水概率
  // values(0)=今天, values(1)=明天, values(2)=后天

  const makeForecast = (dayIndex: number) => ({
    temperature: Math.round(daily.variables(0)!.values(dayIndex)!),
    description: mapWeatherDescription(daily.variables(2)!.values(dayIndex)!),
    temperatureMax: Math.round(daily.variables(0)!.values(dayIndex)!),
    temperatureMin: Math.round(daily.variables(1)!.values(dayIndex)!),
    windSpeed: Math.round(daily.variables(3)!.values(dayIndex)!),
    uvIndex: Math.round(daily.variables(4)!.values(dayIndex)!),
    precipitationProbability: Math.round(daily.variables(5)!.values(dayIndex)!),
    iconCode: daily.variables(2)!.values(dayIndex)!,
  });

  const weather: WeatherData = {
    temperature,
    description: mapWeatherDescription(weatherCode),
    humidity,
    windSpeed,
    uvIndex: Math.round(daily.variables(4)!.values(0)!),
    iconCode: weatherCode,
    forecast: [
      makeForecast(1),
      makeForecast(2),
    ]
  };

  console.log('[WeatherApi] 天气获取成功:', weather.description, weather.temperature + '°C');
  return weather;
}
