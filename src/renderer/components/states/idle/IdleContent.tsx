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
 * @file IdleContent.tsx
 * @description Idle 状态内容组件
 * @author 鸡哥
 */

import { useEffect, useState, useCallback } from 'react';
import useIslandStore from '../../../store/slices';
import { SvgIcon } from '../../../utils/SvgIcon';
import '../../../styles/shell/shell.css';

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
  /** 番茄钟是否运行中 */
  pomodoroRunning: boolean;
  /** 番茄钟剩余秒数 */
  pomodoroRemaining: number;
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
  pomodoroRunning,
  pomodoroRemaining,
}: IdleContentProps): React.ReactElement {
  const { isMusicPlaying, coverImage, isPlaying, handleNowPlayingUpdate, dominantColor } = useIslandStore();
  const isTimerActive = timerState === 'running' || timerState === 'paused';
  const isPomodoroActive = pomodoroRunning;

  /** 检查未完成的 P0 待办数量 */
  const checkP0Count = useCallback((): number => {
    try {
      const raw = localStorage.getItem('eIsland_todos');
      if (!raw) return 0;
      const todos = JSON.parse(raw) as { done?: boolean; priority?: string }[];
      return todos.filter(t => !t.done && t.priority === 'P0').length;
    } catch { return 0; }
  }, []);
  const [p0Count, setP0Count] = useState(checkP0Count);

  useEffect(() => {
    const id = setInterval(() => setP0Count(checkP0Count()), 2000);
    return () => clearInterval(id);
  }, [checkP0Count]);

  useEffect(() => {
    if (!isMusicPlaying || isPlaying) {
      return;
    }
    const timer = setTimeout(() => {
      handleNowPlayingUpdate(null);
    }, 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [isPlaying, isMusicPlaying, handleNowPlayingUpdate]);

  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = remainingSeconds % 60;

  const pomodoroM = Math.floor(pomodoroRemaining / 60);
  const pomodoroS = pomodoroRemaining % 60;

  const [r, g, b] = dominantColor;

  return (
    <div className="idle-content">
      <div
        className={`idle-glow${isMusicPlaying && coverImage ? ' active' : ''}${isMusicPlaying && coverImage && !isPlaying ? ' paused' : ''}`}
        style={isMusicPlaying && coverImage
          ? { background: `radial-gradient(ellipse at 10% 50%, rgba(${r}, ${g}, ${b}, 0.35) 0%, transparent 60%)` }
          : undefined}
      />
      {isMusicPlaying && coverImage ? (
        <>
          <div className="flex items-center gap-2">
            <div
              className={`idle-album-cover${!isPlaying ? ' paused' : ''}${isMusicPlaying && coverImage ? ' glowing' : ''}`}
              style={{
                backgroundImage: `url(${coverImage})`,
                ...(isMusicPlaying && coverImage ? { boxShadow: `0 0 12px 4px rgba(${r}, ${g}, ${b}, 0.5)` } : {})
              }}
            />
            <div className="flex items-center gap-1">
              <span className="text-sm text-[var(--color-island-text)] font-medium tabular-nums">
                {timeStr}
              </span>
              <span className="text-xs text-[var(--color-island-text)] opacity-50">
                {dayStr}
              </span>
            </div>
          </div>
          {isTimerActive ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--color-island-text)] opacity-60">倒计时</span>
              <span className="text-sm text-[var(--color-island-text)] font-medium tabular-nums">
                {padZero(h)}:{padZero(m)}:{padZero(s)}
              </span>
            </div>
          ) : isPomodoroActive ? (
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-xs text-[var(--color-island-text)] opacity-60">
                <img src={SvgIcon.POMODORO} alt="番茄钟" style={{ width: 12, height: 12 }} />
                番茄钟
              </span>
              <span className="text-sm text-[var(--color-island-text)] font-medium tabular-nums">
                {padZero(pomodoroM)}:{padZero(pomodoroS)}
              </span>
            </div>
          ) : p0Count > 0 ? (
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium" style={{ color: '#ff5252' }}>•</span>
              <span className="text-xs font-medium" style={{ color: '#ff5252', opacity: 0.9 }}>P0-TODO</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#fff', background: '#ff5252', borderRadius: 6, padding: '0 4px', lineHeight: '14px', minWidth: 14, textAlign: 'center' as const }}>{p0Count}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--color-island-text)] opacity-60">
                {weather.description || '—'}
              </span>
              <span className="text-sm text-[var(--color-island-text)] font-medium tabular-nums">
                {weather.temperature > 0 ? `${weather.temperature}°` : '--°'}
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-island-text)] font-medium tabular-nums">
              {timeStr}
            </span>
            <span className="text-xs text-[var(--color-island-text)] opacity-50">
              {dayStr}
            </span>
          </div>

          {isTimerActive ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--color-island-text)] opacity-60">倒计时</span>
              <span className="text-sm text-[var(--color-island-text)] font-medium tabular-nums">
                {padZero(h)}:{padZero(m)}:{padZero(s)}
              </span>
            </div>
          ) : isPomodoroActive ? (
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-xs text-[var(--color-island-text)] opacity-60">
                <img src={SvgIcon.POMODORO} alt="番茄钟" style={{ width: 15, height: 15 }} />
                番茄钟
              </span>
              <span className="text-sm text-[var(--color-island-text)] font-medium tabular-nums">
                {padZero(pomodoroM)}:{padZero(pomodoroS)}
              </span>
            </div>
          ) : p0Count > 0 ? (
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium" style={{ color: '#ff5252' }}>•</span>
              <span className="text-xs font-medium" style={{ color: '#ff5252', opacity: 0.9 }}>P0-TODO</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#fff', background: '#ff5252', borderRadius: 6, padding: '0 4px', lineHeight: '14px', minWidth: 14, textAlign: 'center' as const }}>{p0Count}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--color-island-text)] opacity-60">
                {weather.description || '—'}
              </span>
              <span className="text-sm text-[var(--color-island-text)] font-medium tabular-nums">
                {weather.temperature > 0 ? `${weather.temperature}°` : '--°'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
