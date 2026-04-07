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

/** 计算当前行在本行时间区间内的播放进度（0~1） */
function calcLineProgress(
  lyrics: SyncedLyricLine[],
  idx: number,
  posMs: number,
): number {
  if (idx < 0 || idx >= lyrics.length) return 0;
  const lineStart = lyrics[idx].time_ms;
  const lineEnd = idx + 1 < lyrics.length ? lyrics[idx + 1].time_ms : lineStart + 5000;
  const duration = lineEnd - lineStart;
  if (duration <= 0) return 0;
  return Math.min(1, Math.max(0, (posMs - lineStart) / duration));
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

  /** 音乐停止 或 无歌词时自动回到 idle */
  useEffect(() => {
    if (!isMusicPlaying) {
      setIdle();
      return;
    }
    if (!lyricsLoading && (!syncedLyrics || syncedLyrics.length === 0)) {
      setIdle();
    }
  }, [isMusicPlaying, lyricsLoading, syncedLyrics, setIdle]);

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

  /** 当前行扫光进度 */
  const lineProgress = (hasLyrics && !isIntro && currentIdx >= 0 && syncedLyrics)
    ? calcLineProgress(syncedLyrics, currentIdx, currentPositionMs)
    : 0;

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
        {lyricsLoading ? (
          <div className="lyrics-loading">
            <span className="lyrics-loading-dot" />
            <span className="lyrics-loading-dot" />
            <span className="lyrics-loading-dot" />
            <span className="lyrics-loading-label">正在加载歌词</span>
          </div>
        ) : isIntro ? (
          <img src={SvgIcon.MUSIC} alt="" className="lyrics-intro-icon" />
        ) : currentText ? (
          <span
            key={currentIdx}
            className="lyrics-current-line lyrics-sweep"
            style={{ '--lrc-prog': `${(lineProgress * 100).toFixed(2)}%` } as React.CSSProperties}
          >
            {currentText}
          </span>
        ) : (
          <span className="lyrics-empty">暂无歌词 享受音乐</span>
        )}
      </div>
    </div>
  );
}
