/**
 * @file IdleContent.tsx
 * @description Idle 状态内容组件
 * @author 鸡哥
 */

import React from 'react';
import '../../../styles/shell.css';

type TimerState = 'idle' | 'running' | 'paused';

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
  /** 计时器状态 */
  timerState: TimerState;
  /** 剩余秒数 */
  remainingSeconds: number;
}

function padZero(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

/**
 * Idle 状态内容组件
 * @description 显示简洁的时间和天气信息；计时器运行时/暂停时显示倒计时，隐藏天气
 */
export function IdleContent({
  timeStr,
  dayStr,
  weather,
  timerState,
  remainingSeconds,
}: IdleContentProps): React.ReactElement {
  const isTimerActive = timerState === 'running' || timerState === 'paused';

  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = remainingSeconds % 60;

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

      {isTimerActive ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-white opacity-60">倒计时</span>
          <span className="text-sm text-white font-medium tabular-nums">
            {padZero(h)}:{padZero(m)}:{padZero(s)}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-white opacity-60">
            {weather.description || '—'}
          </span>
          <span className="text-sm text-white font-medium tabular-nums">
            {weather.temperature > 0 ? `${weather.temperature}°` : '--°'}
          </span>
        </div>
      )}
    </div>
  );
}
