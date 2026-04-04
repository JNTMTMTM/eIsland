/**
 * @file WeatherTab.tsx
 * @description 天气 Tab 内容组件
 * @author 鸡哥
 */

import React from 'react';
import useIslandStore from '../../../../store/slices';
import '../../../../styles/hover/weather-tab.css';

/**
 * 获取星期标签
 * @param index - 预报天数索引（0=明天，1=后天）
 * @returns 星期标签字符串
 */
function getWeekLabel(index: number): string {
  return index === 0 ? '明天' : '后天';
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

/**
 * 天气 Tab 内容
 * @description 显示当前天气及未来两天预报
 */
export function WeatherTab(): React.ReactElement {
  const weather = useIslandStore(s => s.weather);
  const location = useIslandStore(s => s.location);
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 18;

  return (
    <div className="weather-tab">
      {/* 左侧：当前天气大图标 */}
      <img
        src={getWeatherIconPath(weather.iconCode, isDay)}
        alt={weather.description}
        className="weather-tab-icon"
      />

      {/* 左侧：今日天气标题 + 当前天气（垂直排列） + 位置信息 */}
      <div className="weather-tab-left">
        <div className="weather-tab-current">
          <span className="text-[10px] opacity-60 leading-tight">今日天气</span>
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
            {location?.city ?? '未知'}
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
          <div key={index} className="weather-tab-forecast-row">
            <span className="text-xs opacity-60 w-6 leading-none">{getWeekLabel(index)}</span>
            <img
              src={getWeatherSmallIconPath(day.iconCode, isDay)}
              alt={day.description}
              className="weather-tab-forecast-icon"
            />
            <span className="text-xs leading-none">{day.description}</span>
            <span className="text-[10px] opacity-40 leading-none">雨{day.precipitationProbability}%</span>
            <span className="text-[10px] opacity-40 leading-none">风{day.windSpeed}m/s</span>
            <span className="text-xs tabular-nums leading-none">
              {(day.temperatureMin + day.temperatureMax) / 2}℃
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
