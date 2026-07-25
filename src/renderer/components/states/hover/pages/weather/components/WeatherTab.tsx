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
import useIslandStore from '../../../../../../store/slices';
import { abbreviateWeatherDescription } from '../../../../../../utils/weatherText';
import '../../../../../../styles/hover/weather-tab.css';
import { FALLBACK_WEATHER_ICON } from '../config/weatherConfig';
import {
  getWeekLabel,
  getWeatherIconPath,
  getWeatherSmallIconPath,
  formatPrecipitationText,
  formatWindText,
} from '../utils/weatherUtils';

/**
 * 天气 Tab 内容
 * @description 显示当前天气及未来两天预报
 * @returns 天气 Tab 元素
 */
export function WeatherTab(): React.ReactElement {
  const { t } = useTranslation();
  const weather = useIslandStore(s => s.weather);
  const location = useIslandStore(s => s.location);
  const fetchWeatherData = useIslandStore(s => s.fetchWeatherData);
  const [refreshing, setRefreshing] = useState(false);
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 18;
  const currentWeatherDesc = abbreviateWeatherDescription(weather.description, t);

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
        alt={currentWeatherDesc}
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
              {currentWeatherDesc}
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
              alt={abbreviateWeatherDescription(day.description, t)}
              className="weather-tab-forecast-icon"
              onError={handleIconError}
            />
            <span className="text-xs leading-none">{abbreviateWeatherDescription(day.description, t)}</span>
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
