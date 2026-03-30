/**
 * @file weatherApi.ts
 * @description 天气数据接口模块，提供获取天气信息的统一入口
 * @author 鸡哥
 */

import type { WeatherData } from '../store/isLandStore';

/** 天气接口配置 */
interface WeatherApiConfig {
  apiKey: string;
  longitude: number;
  latitude: number;
}

/**
 * 获取天气数据
 *
 * TODO: 替换API
 *
 */
export async function fetchWeather(_config: WeatherApiConfig): Promise<WeatherData> {
  void _config;
  return {
    temperature: 23,
    description: '晴'
  };
}

/**
 * 将天气 code 映射为中文描述
 * @param code - 天气代码
 * @returns 中文描述
 */
export function mapWeatherDescription(code: string): string {
  const map: Record<string, string> = {
    CLEAR: '晴', SUNNY: '晴',
    PARTLY_CLOUDY: '多云', CLOUDY: '阴', OVERCAST: '阴', FOG: '雾',
    LIGHT_RAIN: '小雨', MODERATE_RAIN: '中雨', HEAVY_RAIN: '大雨', RAIN: '雨',
    LIGHT_SNOW: '小雪', MODERATE_SNOW: '中雪', HEAVY_SNOW: '大雪', SNOW: '雪',
    THUNDERSTORM: '雷雨', THUNDER: '雷雨'
  };
  return map[code] ?? '未知';
}
