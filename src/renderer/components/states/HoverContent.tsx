/**
 * @file HoverContent.tsx
 * @description Hover 状态内容组件
 * @author 鸡哥
 */

import React from 'react';
import useIslandStore, { HoverTab } from '../../store/isLandStore';

interface HoverContentProps {
  /** 完整时间字符串 (YY-MM-DD HH:MM:SS) */
  fullTimeStr: string;
  /** 农历日期字符串 */
  lunarStr: string;
}

/** 导航点配置 */
const NAV_DOTS: { tab: HoverTab; label: string }[] = [
  { tab: 'time', label: '时间' },
  { tab: 'weather', label: '天气' },
];

/**
 * Hover 状态内容组件
 * @description 左侧有竖向导航点，点击可切换不同的 hover 界面（时间 / 天气）
 */
export function HoverContent({ fullTimeStr, lunarStr }: HoverContentProps): React.ReactElement {
  const { hoverTab, setHoverTab, weather } = useIslandStore();

  return (
    <div className="hover-content">
      {/* 左侧竖向导航点 */}
      <div className="hover-nav-dots">
        {NAV_DOTS.map(({ tab, label }) => (
          <button
            key={tab}
            className={`hover-nav-dot ${hoverTab === tab ? 'active' : ''}`}
            onClick={() => setHoverTab(tab)}
            title={label}
            aria-label={`切换到${label}页面`}
          />
        ))}
      </div>

      {/* 右侧内容区域 */}
      <div className="hover-tab-content">
        {hoverTab === 'time' && (
          <div className="flex flex-col gap-1 text-right">
            <span className="text-sm text-white font-medium tabular-nums">
              {fullTimeStr}
            </span>
            <span className="text-xs text-white opacity-60">
              农历 {lunarStr}
            </span>
          </div>
        )}
        {hoverTab === 'weather' && (
          <div className="flex flex-col gap-1 text-right">
            <span className="text-sm text-white font-medium">
              {weather.description || '—'}
            </span>
            <span className="text-xs text-white opacity-60">
              {weather.temperature > 0 ? `${weather.temperature}°C` : '--°C'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
