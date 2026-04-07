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
import { loadLocationFromStorage, loadNetworkConfig } from '../store/utils/storage';
import { logger } from '../utils/logger';

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

interface UapiWeatherForecastItem {
  temp_max?: number;
  temp_min?: number;
  weather_day?: string;
  weather_night?: string;
  wind_speed_day?: number;
  uv_index?: number;
  precip?: number;
  weather_icon?: string;
}

interface UapiWeatherResponse {
  weather?: string;
  weather_icon?: string;
  temperature?: number;
  humidity?: number;
  uv?: number;
  wind_power?: string;
  temp_max?: number;
  temp_min?: number;
  forecast?: UapiWeatherForecastItem[];
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

function parseWindPowerToSpeed(power?: string): number {
  if (!power) return 0;
  const nums = (power.match(/\d+(?:\.\d+)?/g) ?? []).map(v => Number(v));
  if (nums.length === 0) return 0;
  return Math.round(Math.max(...nums));
}

function mapUapiWeatherToData(data: UapiWeatherResponse): WeatherData {
  const iconCode = Number.parseInt(data.weather_icon ?? '0', 10);
  const currentTemp = Math.round(data.temperature ?? 0);
  const currentDesc = data.weather ?? '未知';
  const currentWind = parseWindPowerToSpeed(data.wind_power);
  const baseForecast = (data.forecast ?? []).slice(1, 3);
  const fallbackMax = Math.round(data.temp_max ?? currentTemp);
  const fallbackMin = Math.round(data.temp_min ?? currentTemp);

  const makeFallbackForecast = (idx: number) => {
    const item = baseForecast[idx];
    const temperatureMax = Math.round(item?.temp_max ?? fallbackMax);
    const temperatureMin = Math.round(item?.temp_min ?? fallbackMin);
    return {
      temperature: Math.round((temperatureMax + temperatureMin) / 2),
      description: item?.weather_day ?? item?.weather_night ?? currentDesc,
      temperatureMax,
      temperatureMin,
      windSpeed: Math.round(item?.wind_speed_day ?? currentWind),
      uvIndex: Math.round(item?.uv_index ?? data.uv ?? 0),
      precipitationProbability: Math.round(item?.precip ?? 0),
      iconCode: Number.parseInt(item?.weather_icon ?? data.weather_icon ?? '0', 10) || 0,
    };
  };

  return {
    temperature: currentTemp,
    description: currentDesc,
    humidity: Math.round(data.humidity ?? 0),
    windSpeed: currentWind,
    uvIndex: Math.round(data.uv ?? 0),
    iconCode: Number.isNaN(iconCode) ? 0 : iconCode,
    forecast: [
      makeFallbackForecast(0),
      makeFallbackForecast(1),
    ],
  };
}

function mapOpenMeteoToData(data: OpenMeteoResponse): WeatherData {
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

  return {
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
}

/**
 * 根据经纬度获取天气数据（通过主进程 netFetch 代理绕过 CORS）
 * @param config - 经纬度配置
 * @returns WeatherData
 */
export async function fetchWeather(config: WeatherApiConfig): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(config.latitude),
    longitude: String(config.longitude),
    current: 'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max,uv_index_max,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '3',
  });

  const { timeoutMs } = loadNetworkConfig();
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const requestId = `weather_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();
  const query = {
    latitude: config.latitude,
    longitude: config.longitude,
    current: params.get('current') ?? '',
    daily: params.get('daily') ?? '',
    timezone: params.get('timezone') ?? '',
    forecast_days: params.get('forecast_days') ?? '',
  };
  const requestHeaders: Record<string, string> = {};
  const requestBody = '';
  logger.info('[WeatherApi] request:start', {
    requestId,
    method: 'GET',
    url,
    query,
    headers: requestHeaders,
    body: requestBody,
    timeoutMs,
  });

  try {
    const resp = await window.api.netFetch(
      url,
      { timeoutMs }
    );
    logger.info('[WeatherApi] request:end', {
      requestId,
      provider: 'open-meteo',
      method: 'GET',
      url,
      status: resp.status,
      ok: resp.ok,
      durationMs: Date.now() - startedAt,
      responseSize: resp.body.length,
      body: resp.body,
    });

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
    const weather = mapOpenMeteoToData(data);
    logger.info('[WeatherApi] 天气获取成功:', weather.description, weather.temperature + '°C', { provider: 'open-meteo' });
    return weather;
  } catch (primaryError) {
    logger.warn('[WeatherApi] open-meteo 失败，尝试 uapis 冗余源', { error: primaryError });
  }

  const fallbackParams = new URLSearchParams({
    forecast: 'true',
    extended: 'true',
    lang: 'zh',
  });
  const cachedLocation = loadLocationFromStorage();
  if (cachedLocation?.city) fallbackParams.set('city', cachedLocation.city);
  const fallbackUrl = `https://uapis.cn/api/v1/misc/weather?${fallbackParams.toString()}`;
  const fallbackRequestId = `weather_fallback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fallbackStartedAt = Date.now();
  logger.info('[WeatherApi] request:start', {
    requestId: fallbackRequestId,
    provider: 'uapis',
    method: 'GET',
    url: fallbackUrl,
    query: Object.fromEntries(fallbackParams.entries()),
    headers: {},
    body: '',
    timeoutMs,
  });

  const fallbackResp = await window.api.netFetch(fallbackUrl, { timeoutMs });
  logger.info('[WeatherApi] request:end', {
    requestId: fallbackRequestId,
    provider: 'uapis',
    method: 'GET',
    url: fallbackUrl,
    status: fallbackResp.status,
    ok: fallbackResp.ok,
    durationMs: Date.now() - fallbackStartedAt,
    responseSize: fallbackResp.body.length,
    body: fallbackResp.body,
  });

  if (!fallbackResp.ok) {
    throw new Error(`UAPI Weather HTTP ${fallbackResp.status}: ${fallbackResp.body.slice(0, 200)}`);
  }
  if (fallbackResp.body.trimStart().startsWith('<')) {
    throw new Error('UAPI Weather 返回了非 JSON 内容，请检查网络环境');
  }

  const parsed = JSON.parse(fallbackResp.body) as Record<string, unknown>;
  const payload = (
    typeof parsed.data === 'object' && parsed.data !== null
      ? parsed.data
      : parsed
  ) as UapiWeatherResponse;
  const weather = mapUapiWeatherToData(payload);
  logger.info('[WeatherApi] 天气获取成功:', weather.description, weather.temperature + '°C', { provider: 'uapis' });
  return weather;
}
