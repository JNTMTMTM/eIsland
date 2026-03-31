/**
 * @file IdleContent.tsx
 * @description Idle 状态内容组件
 * @author 鸡哥
 */

import React from 'react';
import '../../../styles/shell.css';

interface IdleContentProps {
  /** 时间字符串 */
  timeStr: string;
  /** 星期几 */
  dayStr: string;
  /** 天气信息 */
  weather: {
    temperature: number;
    description?: string;
  };
}

/**
 * Idle 状态内容组件
 * @description 显示简洁的时间和天气信息
 */
export function IdleContent({ timeStr, dayStr, weather }: IdleContentProps): React.ReactElement {
  return (
    <div className="idle-content">
      <div className="flex items-center gap-2">
        <span className="text-sm text-white font-medium tabular-nums">
          {timeStr}
        </span>
        <span className="text-xs text-white opacity-50">
          {dayStr}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-white opacity-60">
          {weather.description || '—'}
        </span>
        <span className="text-sm text-white font-medium tabular-nums">
          {weather.temperature > 0 ? `${weather.temperature}°` : '--°'}
        </span>
      </div>
    </div>
  );
}
