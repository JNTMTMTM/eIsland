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
 * @file LyricsContent.tsx
 * @description 歌词状态内容组件 — 左侧专辑封面 + 光晕，右侧实时歌词
 * @author 鸡哥
 */

import { useEffect, useMemo } from 'react';
import type { ReactElement } from 'react';
import useIslandStore from '../../../store/slices';
import type { SyncedLyricLine } from '../../../store/types';
import { SvgIcon } from '../../../utils/SvgIcon';
import '../../../styles/lyrics/lyrics.css';

/** 二分查找当前歌词行索引 */
function findCurrentIndex(lyrics: SyncedLyricLine[], posMs: number): number {
  if (lyrics.length === 0 || posMs < lyrics[0].time_ms) return -1;
  let lo = 0;
  let hi = lyrics.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lyrics[mid].time_ms <= posMs) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * 歌词状态内容组件
 * @description 鼠标离开 hover 且正在播放音乐时显示，左侧专辑封面+光晕，右侧歌词
 */
export function LyricsContent(): ReactElement {
  const isMusicPlaying = useIslandStore((s) => s.isMusicPlaying);
  const isPlaying = useIslandStore((s) => s.isPlaying);
  const coverImage = useIslandStore((s) => s.coverImage);
  const dominantColor = useIslandStore((s) => s.dominantColor);
  const syncedLyrics = useIslandStore((s) => s.syncedLyrics);
  const lyricsLoading = useIslandStore((s) => s.lyricsLoading);
  const currentPositionMs = useIslandStore((s) => s.currentPositionMs);
  const setIdle = useIslandStore((s) => s.setIdle);

  const [r, g, b] = dominantColor;

  /** 音乐停止时自动回到 idle */
  useEffect(() => {
    if (!isMusicPlaying) {
      setIdle();
    }
  }, [isMusicPlaying, setIdle]);

  /** 当前歌词行索引 */
  const currentIdx = useMemo(() => {
    if (!syncedLyrics || syncedLyrics.length === 0) return -1;
    return findCurrentIndex(syncedLyrics, currentPositionMs);
  }, [syncedLyrics, currentPositionMs]);

  const hasLyrics = syncedLyrics && syncedLyrics.length > 0 && !lyricsLoading;
  const isIntro = hasLyrics && currentIdx < 0;

  /** 当前歌词文本 */
  const currentText = useMemo(() => {
    if (!hasLyrics || isIntro) return '';
    if (currentIdx >= 0 && syncedLyrics && currentIdx < syncedLyrics.length) {
      return syncedLyrics[currentIdx].text;
    }
    return '';
  }, [hasLyrics, isIntro, currentIdx, syncedLyrics]);

  return (
    <div className="lyrics-content">
      {/* 背景光晕 — 与 IdleContent 一致 */}
      <div
        className={`idle-glow${isMusicPlaying && coverImage ? ' active' : ''}${isMusicPlaying && coverImage && !isPlaying ? ' paused' : ''}`}
        style={isMusicPlaying && coverImage
          ? { background: `radial-gradient(ellipse at 10% 50%, rgba(${r}, ${g}, ${b}, 0.35) 0%, transparent 60%)` }
          : undefined}
      />

      {/* 左侧：专辑封面 */}
      <div className="lyrics-left">
        <div
          className={`idle-album-cover${!isPlaying ? ' paused' : ''}${isMusicPlaying && coverImage ? ' glowing' : ''}`}
          style={{
            backgroundImage: coverImage ? `url(${coverImage})` : undefined,
            ...(isMusicPlaying && coverImage ? { boxShadow: `0 0 12px 4px rgba(${r}, ${g}, ${b}, 0.5)` } : {}),
          }}
        />
      </div>

      {/* 右侧：歌词 */}
      <div className="lyrics-right">
        {isIntro ? (
          <img src={SvgIcon.MUSIC} alt="" className="lyrics-intro-icon" />
        ) : currentText ? (
          <span className="lyrics-current-line">{currentText}</span>
        ) : (
          <span className="lyrics-empty">♪</span>
        )}
      </div>
    </div>
  );
}
