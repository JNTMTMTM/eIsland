/**
 * @file WeatherTab.tsx
 * @description 天气 Tab 内容组件
 * @author 鸡哥
 */

import React from 'react';
import useIslandStore from '../../../../store/slices';
import '../../../../styles/hover/weather-tab.css';

/** 获取星期标签 */
function getWeekLabel(index: number): string {
  return index === 0 ? '明天' : '后天';
}

/**
 * 天气 Tab 内容
 * @description 显示当前天气及未来两天预报
 */
export function WeatherTab(): React.ReactElement {
  const weather = useIslandStore(s => s.weather);
  const location = useIslandStore(s => s.location);

  return (
    <div className="weather-tab">
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
            <span className="text-xs leading-none w-6">{day.description}</span>
            <span className="text-[10px] opacity-40 leading-none">雨{day.precipitationProbability}%</span>
            <span className="text-[10px] opacity-40 leading-none">风{day.windSpeed}m/s</span>
            <span className="text-[10px] opacity-40 leading-none">UV{day.uvIndex}</span>
            <span className="text-xs tabular-nums leading-none">
              {day.temperatureMin}°~{day.temperatureMax}°
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
