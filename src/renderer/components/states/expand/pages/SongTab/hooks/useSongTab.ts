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
 * @file useSongTab.ts
 * @description Expanded 歌曲 Tab 的播放状态订阅、时钟刷新、逐字扫光配置与歌词窗口推导。
 * @author 鸡哥
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../store/slices';
import { getDayName } from '../../../../../../utils/timeUtils';
import { findCurrentIndex, sliceNearby } from '../utils/songUtils';
import type { UseSongTabReturn } from '../types/songTypes';

/**
 * 汇总歌曲 Tab 三栏展示所需的状态与媒体控制。
 * @returns 播放、歌词、时间与计时器状态
 */
export function useSongTab(): UseSongTabReturn {
  const { t } = useTranslation();
  const isMusicPlaying = useIslandStore((state) => state.isMusicPlaying);
  const isPlaying = useIslandStore((state) => state.isPlaying);
  const mediaInfo = useIslandStore((state) => state.mediaInfo);
  const syncedLyrics = useIslandStore((state) => state.syncedLyrics);
  const lyricsLoading = useIslandStore((state) => state.lyricsLoading);
  const coverImage = useIslandStore((state) => state.coverImage);
  const dominantColor = useIslandStore((state) => state.dominantColor);
  const weather = useIslandStore((state) => state.weather);
  const countdown = useIslandStore((state) => state.countdown);
  const timerData = useIslandStore((state) => state.timerData);
  const currentPositionMs = useIslandStore((state) => state.currentPositionMs);

  const [now, setNow] = useState(new Date());
  const [karaokeEnabled, setKaraokeEnabled] = useState(false);

  /** 加载逐字扫光配置 */
  useEffect(() => {
    window.api?.musicLyricsKaraokeGet().then(setKaraokeEnabled).catch(() => {});
  }, []);

  /** 时钟 + 倒计时刷新 */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  /** 当前歌词行索引（由进度与歌词直接推导） */
  const currentIdx = useMemo(() => {
    if (!syncedLyrics || syncedLyrics.length === 0) return -1;
    return findCurrentIndex(syncedLyrics, currentPositionMs);
  }, [syncedLyrics, currentPositionMs]);

  // 媒体控制
  const handlePlayPause = () => window.api?.mediaPlayPause();
  const handlePrev = () => window.api?.mediaPrev();
  const handleNext = () => window.api?.mediaNext();

  /** 计时器格式化 */
  const timerRunning = timerData.state === 'running' || timerData.state === 'paused';
  const timerMM = Math.floor(timerData.remainingSeconds / 60).toString().padStart(2, '0');
  const timerSS = (timerData.remainingSeconds % 60).toString().padStart(2, '0');
  const dayName = t(`songTab.time.weekdays.${now.getDay()}`, { defaultValue: getDayName(now) });

  /** 歌词切片 */
  const hasLyrics = syncedLyrics && syncedLyrics.length > 0 && !lyricsLoading;
  const isIntro = hasLyrics && currentIdx < 0;
  const lines = useMemo(
    () => (hasLyrics && !isIntro ? sliceNearby(syncedLyrics!, currentIdx) : []),
    [hasLyrics, isIntro, syncedLyrics, currentIdx],
  );
  /** 当前行对象,用于读取 text 与 syllables */
  const currentLine = useMemo(
    () => (hasLyrics && !isIntro && currentIdx >= 0 && syncedLyrics ? syncedLyrics[currentIdx] : null),
    [hasLyrics, isIntro, currentIdx, syncedLyrics],
  );
  const hasSyllables = Boolean(
    currentLine && currentLine.syllables && currentLine.syllables.length > 0,
  );

  return {
    isMusicPlaying,
    isPlaying,
    mediaInfo,
    syncedLyrics,
    lyricsLoading,
    coverImage,
    dominantColor,
    weather,
    countdown,
    currentPositionMs,
    now,
    karaokeEnabled,
    timerRunning,
    timerMM,
    timerSS,
    dayName,
    hasLyrics,
    isIntro,
    lines,
    currentLine,
    hasSyllables,
    handlePlayPause,
    handlePrev,
    handleNext,
  };
}
