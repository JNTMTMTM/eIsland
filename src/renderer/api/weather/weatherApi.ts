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

import type { WeatherData } from '../../store/types';
import {
  loadLocationFromStorage,
  loadNetworkConfig,
  loadWeatherProviderConfig,
} from '../../store/utils/storage';
import { logger } from '../../utils/logger';

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

function mapWeatherTextToWmoCode(text?: string): number {
  const normalized = (text ?? '').toLowerCase();
  if (!normalized) return 0;
  if (normalized.includes('雷')) return 95;
  if (normalized.includes('雪')) {
    if (normalized.includes('暴雪') || normalized.includes('大雪')) return 75;
    if (normalized.includes('中雪')) return 73;
    if (normalized.includes('阵雪')) return 85;
    return 71;
  }
  if (normalized.includes('雨')) {
    if (normalized.includes('冻雨')) return 67;
    if (normalized.includes('暴雨') || normalized.includes('强')) return 82;
    if (normalized.includes('阵雨')) return 80;
    if (normalized.includes('小雨')) return 61;
    if (normalized.includes('中雨')) return 63;
    if (normalized.includes('大雨')) return 65;
    return 63;
  }
  if (normalized.includes('雾') || normalized.includes('霾') || normalized.includes('沙')) return 45;
  if (normalized.includes('阴')) return 3;
  if (normalized.includes('多云')) return 2;
  if (normalized.includes('晴')) return 0;
  return 0;
}

function mapUapiIconToWmoCode(icon?: string, weatherText?: string): number {
  const code = Number.parseInt(icon ?? '', 10);
  if (Number.isNaN(code)) return mapWeatherTextToWmoCode(weatherText);
  if ((code >= 0 && code <= 3) || (code >= 45 && code <= 99)) return code;

  const map: Record<number, number> = {
    100: 0,
    101: 2,
    102: 1,
    103: 2,
    104: 3,
    150: 0,
    151: 2,
    152: 1,
    153: 2,
    300: 80,
    301: 82,
    302: 95,
    303: 96,
    304: 99,
    305: 61,
    306: 63,
    307: 65,
    308: 65,
    309: 53,
    310: 82,
    311: 82,
    312: 82,
    313: 67,
    314: 63,
    315: 65,
    316: 65,
    317: 82,
    318: 82,
    350: 80,
    351: 82,
    399: 63,
    400: 71,
    401: 73,
    402: 75,
    403: 75,
    404: 77,
    405: 77,
    406: 85,
    407: 85,
    408: 73,
    409: 75,
    410: 75,
    456: 85,
    457: 85,
    499: 73,
    500: 45,
    501: 45,
    502: 48,
    503: 45,
    504: 45,
    507: 45,
    508: 45,
    509: 48,
    510: 48,
    511: 48,
    512: 48,
    513: 48,
    514: 45,
    515: 48,
    800: 0,
    801: 1,
    802: 2,
    803: 2,
    804: 0,
    805: 2,
    806: 2,
    807: 1,
    900: 0,
    901: 0,
    999: 0,
    9999: 0,
  };

  if (typeof map[code] === 'number') return map[code];
  return mapWeatherTextToWmoCode(weatherText);
}

function mapUapiWeatherToData(data: UapiWeatherResponse): WeatherData {
  const iconCode = mapUapiIconToWmoCode(data.weather_icon, data.weather);
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
    const windSpeed = typeof item?.wind_speed_day === 'number'
      ? Math.round(item.wind_speed_day)
      : -1;
    const precipitationProbability = typeof item?.precip === 'number'
      ? Math.round(item.precip)
      : -1;
    return {
      temperature: Math.round((temperatureMax + temperatureMin) / 2),
      description: item?.weather_day ?? item?.weather_night ?? currentDesc,
      temperatureMax,
      temperatureMin,
      windSpeed,
      uvIndex: Math.round(item?.uv_index ?? data.uv ?? 0),
      precipitationProbability,
      iconCode: mapUapiIconToWmoCode(
        item?.weather_icon ?? data.weather_icon,
        item?.weather_day ?? item?.weather_night ?? currentDesc
      ),
    };
  };

  return {
    temperature: currentTemp,
    description: currentDesc,
    humidity: Math.round(data.humidity ?? 0),
    windSpeed: currentWind,
    uvIndex: Math.round(data.uv ?? 0),
    iconCode,
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
  const { primaryProvider } = loadWeatherProviderConfig();
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const requestOpenMeteo = async (): Promise<WeatherData> => {
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

    logger.info('[WeatherApi] request:start', {
      requestId,
      provider: 'open-meteo',
      method: 'GET',
      url,
      query,
      headers: {},
      body: '',
      timeoutMs,
    });

    const resp = await window.api.netFetch(url, { timeoutMs });
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
  };

  const requestUapi = async (): Promise<WeatherData> => {
    const fallbackParams = new URLSearchParams({
      forecast: 'true',
      extended: 'true',
      lang: 'zh',
    });
    const cachedLocation = loadLocationFromStorage();
    if (cachedLocation?.city) fallbackParams.set('city', cachedLocation.city);
    const fallbackUrl = `https://uapis.cn/api/v1/misc/weather?${fallbackParams.toString()}`;
    const requestId = `weather_fallback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();

    logger.info('[WeatherApi] request:start', {
      requestId,
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
      requestId,
      provider: 'uapis',
      method: 'GET',
      url: fallbackUrl,
      status: fallbackResp.status,
      ok: fallbackResp.ok,
      durationMs: Date.now() - startedAt,
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
  };

  const firstProvider = primaryProvider === 'uapi' ? 'uapis' : 'open-meteo';
  const secondProvider = firstProvider === 'open-meteo' ? 'uapis' : 'open-meteo';
  logger.info('[WeatherApi] provider:priority', { primaryProvider: firstProvider, fallbackProvider: secondProvider });

  try {
    return firstProvider === 'open-meteo'
      ? await requestOpenMeteo()
      : await requestUapi();
  } catch (primaryError) {
    logger.warn(`[WeatherApi] ${firstProvider} 失败，尝试 ${secondProvider} 冗余源`, { error: primaryError });
  }

  return firstProvider === 'open-meteo'
    ? requestUapi()
    : requestOpenMeteo();
}
