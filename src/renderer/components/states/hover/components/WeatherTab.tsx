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
 * @file WeatherTab.tsx
 * @description 天气 Tab 内容组件
 * @author 鸡哥
 */

import { type SyntheticEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import '../../../../styles/hover/weather-tab.css';

const FALLBACK_WEATHER_ICON = './svg/NA.svg';

/**
 * 获取星期标签
 * @param index - 预报天数索引（0=明天，1=后天）
 * @returns 星期标签字符串
 */
function getWeekLabel(index: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  return index === 0
    ? t('hover.weather.week.tomorrow', { defaultValue: '明天' })
    : t('hover.weather.week.dayAfterTomorrow', { defaultValue: '后天' });
}

/**
 * 获取当前天气图标路径（白天/晚上）
 * @param iconCode - 天气图标编号
 * @param isDay - 是否为白天（true=白天，false=夜晚）
 * @returns 天气图标资源路径
 */
function getWeatherIconPath(iconCode: number, isDay: boolean): string {
  const suffix = isDay ? 'd' : 'n';
  return `./icon/${iconCode}${suffix}_big.png`;
}

/**
 * 获取小图标路径
 * @param iconCode - 天气图标编号
 * @param isDay - 是否为白天（true=白天，false=夜晚）
 * @returns 天气小图标资源路径
 */
function getWeatherSmallIconPath(iconCode: number, isDay: boolean): string {
  const suffix = isDay ? 'd' : 'n';
  return `./icon/${iconCode}${suffix}.png`;
}

function formatPrecipitationText(value: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  return value < 0 ? ` ${t('hover.weather.na', { defaultValue: 'N/A' })}` : `${value}%`;
}

function formatWindText(value: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  return value < 0 ? ` ${t('hover.weather.na', { defaultValue: 'N/A' })}` : `${value}m/s`;
}

/**
 * 天气 Tab 内容
 * @description 显示当前天气及未来两天预报
 */
export function WeatherTab(): React.ReactElement {
  const { t } = useTranslation();
  const weather = useIslandStore(s => s.weather);
  const location = useIslandStore(s => s.location);
  const fetchWeatherData = useIslandStore(s => s.fetchWeatherData);
  const [refreshing, setRefreshing] = useState(false);
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 18;

  const handleIconError = (event: SyntheticEvent<HTMLImageElement>): void => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = FALLBACK_WEATHER_ICON;
  };

  const handleRefresh = async (): Promise<void> => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchWeatherData(undefined, true);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="weather-tab">
      {/* 左侧：当前天气大图标（点击刷新） */}
      <img
        src={getWeatherIconPath(weather.iconCode, isDay)}
        alt={weather.description}
        className={`weather-tab-icon weather-tab-icon-clickable${refreshing ? ' weather-tab-icon-spinning' : ''}`}
        onClick={handleRefresh}
        onError={handleIconError}
        title={t('hover.weather.refreshTitle', { defaultValue: '点击刷新天气' })}
      />

      {/* 左侧：今日天气标题 + 当前天气（垂直排列） + 位置信息 */}
      <div className="weather-tab-left">
        <div className="weather-tab-current">
          <span className="text-[10px] opacity-60 leading-tight">{t('hover.weather.today', { defaultValue: '今日天气' })}</span>
          <div className="weather-tab-temp">
            <span className="text-xl font-medium leading-none tabular-nums">
              {weather.temperature}°
            </span>
            <span className="text-[10px] opacity-60 leading-tight">
              {weather.description}
            </span>
          </div>
        </div>
        <div className="weather-tab-location">
          <span className="text-[10px] opacity-60 leading-tight">
            {location?.city ?? t('hover.weather.unknownCity', { defaultValue: '未知' })}
          </span>
          <span className="text-[10px] opacity-40 leading-tight tabular-nums">
            {location ? `${location.latitude.toFixed(2)}°N ${location.longitude.toFixed(2)}°E` : ''}
          </span>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="weather-tab-divider" />

      {/* 右侧：未来两天预报 - 上下排列，完整参数 */}
      <div className="weather-tab-forecast">
        {weather.forecast.map((day, index) => (
          <div key={`${getWeekLabel(index, t)}-${day.description}-${day.iconCode}-${day.temperatureMin}-${day.temperatureMax}`} className="weather-tab-forecast-row">
            <span className="text-xs opacity-60 w-6 leading-none">{getWeekLabel(index, t)}</span>
            <img
              src={getWeatherSmallIconPath(day.iconCode, isDay)}
              alt={day.description}
              className="weather-tab-forecast-icon"
              onError={handleIconError}
            />
            <span className="text-xs leading-none">{day.description}</span>
            <span className="text-[10px] opacity-40 leading-none">{t('hover.weather.rainPrefix', { defaultValue: '雨' })}{formatPrecipitationText(day.precipitationProbability, t)}</span>
            <span className="text-[10px] opacity-40 leading-none">{t('hover.weather.windPrefix', { defaultValue: '风' })}{formatWindText(day.windSpeed, t)}</span>
            <span className="text-xs tabular-nums leading-none">
              {(day.temperatureMin + day.temperatureMax) / 2}℃
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
