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
 * @file TrayMusicSeekBar.tsx
 * @description 托盘音乐卡片进度条：显示当前进度与总时长，拖动时只预览，松手或键盘调整完成后才跳转
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { estimatePlaybackPosition, formatPlaybackTime } from '../utils/trayPlayback';
import type { ChangeEvent, CSSProperties, ReactElement } from 'react';
import type { TrayNowPlaying } from '../types';

/** 播放中刷新进度的间隔，进度条连续移动，四分之一秒已足够平滑 */
const TICK_INTERVAL_MS = 250;

interface TrayMusicSeekBarProps {
  /** 当前播放信息，无媒体时为 null */
  nowPlaying: TrayNowPlaying | null;
  /** 跳转到目标进度（毫秒） */
  onSeek: (positionMs: number) => void;
}

/**
 * 托盘音乐进度条
 * @description 无媒体或时长未知时禁用；组件随每次打开菜单重建，挂载即开始推进进度，菜单失焦收起后停止计时
 * @param props - 组件属性
 * @param props.nowPlaying - 当前播放信息
 * @param props.onSeek - 跳转到目标进度（毫秒）
 * @returns 进度条元素
 */
export function TrayMusicSeekBar({ nowPlaying, onSeek }: TrayMusicSeekBarProps): ReactElement {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  const [active, setActive] = useState(true);
  const [dragPositionMs, setDragPositionMs] = useState<number | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);

  // 菜单窗口关闭了后台节流，收起后计时器仍会运行，失焦（菜单收起）时停止计时。
  // 挂载即视为可见而不等待 focus 事件：托盘点击后窗口未必能立刻获得焦点，等待会让进度条停住。
  useEffect(() => {
    const handleFocus = (): void => setActive(true);
    const handleBlur = (): void => setActive(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const durationMs = nowPlaying?.durationMs ?? 0;
  const disabled = !nowPlaying || durationMs <= 0;
  const ticking = active && !disabled && nowPlaying.isPlaying && nowPlaying.playbackRate > 0;
  useEffect(() => {
    if (!ticking) return undefined;
    const tick = (): void => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, TICK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [ticking]);

  // React 的 onChange 对应拖动过程中的 input 事件；原生 change 只在松手或键盘调整完成时触发，此时才真正跳转。
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return undefined;
    const handleCommit = (): void => {
      onSeek(Math.round(Number(slider.value)));
      setDragPositionMs(null);
    };
    slider.addEventListener('change', handleCommit);
    return () => slider.removeEventListener('change', handleCommit);
  }, [onSeek]);

  const handleDrag = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setDragPositionMs(Number(event.currentTarget.value));
  }, []);

  const positionMs = disabled ? 0 : dragPositionMs ?? estimatePlaybackPosition(nowPlaying, now);
  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const positionText = formatPlaybackTime(positionMs);
  const durationText = formatPlaybackTime(durationMs);

  // step="any" 让滑块随时间连续移动；键盘方向键按浏览器默认每次调整总时长的 1%。
  return (
    <div className={`tray-music-seek${disabled ? ' tray-music-seek-disabled' : ''}`}>
      <span className="tray-music-seek-time">{positionText}</span>
      <input ref={sliderRef} className="tray-music-seek-slider" type="range" min={0} max={durationMs} step="any" value={positionMs}
        disabled={disabled} aria-label={t('tray.music.seek')} aria-valuetext={t('tray.music.seekValue', { position: positionText, duration: durationText })}
        style={{ '--tray-seek-progress': `${progress * 100}%` } as CSSProperties} onChange={handleDrag} />
      <span className="tray-music-seek-time tray-music-seek-time-total">{durationText}</span>
    </div>
  );
}
