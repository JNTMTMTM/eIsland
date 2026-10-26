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
 * @file useSongProgress.ts
 * @description 底部播放进度条的拖动预览、松手跳转与换歌清理。
 * @author 鸡哥
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react';
import type { SongProgressOptions, SongProgressResult } from '../types/songTypes';

/**
 * 复用歌曲数据层的跳转确认状态，拖动期间只更新进度条预览。
 * @param options - 当前歌曲标识、有效时间线和跳转句柄。
 * @returns 进度显示数据、滑块引用与预览回调。
 */
export default function useSongProgress(options: SongProgressOptions): SongProgressResult {
  const { trackKey, canSeek, currentDurationMs, positionMs, commitSeek } = options;
  const [dragPositionMs, setDragPositionMs] = useState<number | null>(null);
  const sliderRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    setDragPositionMs(null);
  }, [trackKey, canSeek]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return undefined;
    // 原生 change 在松手或键盘调整完成时触发，避免拖动中连续发送媒体命令。
    const handleCommit = (): void => {
      if (canSeek) commitSeek(Math.min(currentDurationMs, Math.max(0, Math.round(Number(slider.value)))));
      setDragPositionMs(null);
    };
    slider.addEventListener('change', handleCommit);
    return () => slider.removeEventListener('change', handleCommit);
  }, [trackKey, canSeek, commitSeek, currentDurationMs]);

  const handlePreview = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setDragPositionMs(Number(event.currentTarget.value));
  }, []);
  const durationMs = canSeek ? currentDurationMs : 0;
  const displayPositionMs = canSeek ? Math.min(durationMs, Math.max(0, dragPositionMs ?? positionMs)) : 0;
  return { sliderRef, handlePreview, durationMs, displayPositionMs, progressPercent: durationMs > 0 ? displayPositionMs / durationMs * 100 : 0 };
}
