/**
 * @file MusicTab.tsx
 * @description Expanded 总览 Tab — 居中歌词显示
 * @author 鸡哥
 */

import React, { useEffect, useState } from 'react';
import useIslandStore from '../../../../store/slices';
import type { SyncedLyricLine } from '../../../../store/types';

/** 显示歌词行数 */
const VISIBLE_LINES = 5;
/** 歌词刷新间隔 (ms) */
const TICK_MS = 100;

// ===================== 模块级计时器（跨挂载持久） =====================

let _songKey = '';
let _timerBase = 0;
let _elapsed = 0;
let _playing = false;

function timerReset(): void {
  _timerBase = Date.now();
  _elapsed = 0;
  _playing = true;
}

function timerPause(): void {
  if (_playing) {
    _elapsed += Date.now() - _timerBase;
    _playing = false;
  }
}

function timerResume(): void {
  if (!_playing) {
    _timerBase = Date.now();
    _playing = true;
  }
}

function timerGetMs(): number {
  return _elapsed + (_playing ? Date.now() - _timerBase : 0);
}

// ===================== 工具函数 =====================

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

function sliceNearby(
  lyrics: SyncedLyricLine[],
  idx: number,
): { text: string; isCurrent: boolean }[] {
  const half = Math.floor(VISIBLE_LINES / 2);
  const start = Math.max(0, idx - half);
  const end = Math.min(lyrics.length, idx + half + 1);
  const result: { text: string; isCurrent: boolean }[] = [];
  for (let i = start; i < end; i++) {
    result.push({ text: lyrics[i].text, isCurrent: i === idx });
  }
  return result;
}

// ===================== 组件 =====================

/**
 * 总览 Tab
 * @description 展开状态下的总览面板，居中显示当前播放歌词
 */
export function OverviewTab(): React.ReactElement {
  const { isMusicPlaying, isPlaying, mediaInfo, syncedLyrics, lyricsLoading } = useIslandStore();
  const [currentIdx, setCurrentIdx] = useState(-1);

  /** 歌曲变化 → 重置计时器 */
  useEffect(() => {
    const key = `${mediaInfo.title}||${mediaInfo.artist}`;
    if (key !== _songKey) {
      _songKey = key;
      timerReset();
      console.log('[Lyrics] Timer reset for:', mediaInfo.title);
    }
  }, [mediaInfo.title, mediaInfo.artist]);

  /** 播放/暂停 → 暂停/恢复计时器 */
  useEffect(() => {
    if (isPlaying) timerResume();
    else timerPause();
  }, [isPlaying]);

  /** 定时刷新当前歌词行 */
  useEffect(() => {
    if (!syncedLyrics || syncedLyrics.length === 0) {
      setCurrentIdx(-1);
      return;
    }

    const tick = (): void => {
      const elapsed = timerGetMs();
      const idx = findCurrentIndex(syncedLyrics, elapsed);
      setCurrentIdx(idx);
    };

    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [syncedLyrics, isPlaying]);

  /** 无音乐播放 */
  if (!isMusicPlaying) {
    return (
      <div className="expand-tab-panel">
        <span className="overview-no-music">暂无播放</span>
      </div>
    );
  }

  /** 加载中 */
  if (lyricsLoading) {
    return (
      <div className="expand-tab-panel">
        <span className="overview-loading">...</span>
      </div>
    );
  }

  /** 无歌词 */
  if (!syncedLyrics || syncedLyrics.length === 0) {
    return (
      <div className="expand-tab-panel">
        <div className="overview-no-lrc">
          <span className="overview-song-title">{mediaInfo.title}</span>
          <span className="overview-song-artist">{mediaInfo.artist}</span>
        </div>
      </div>
    );
  }

  /** 歌词切片 */
  const visibleIdx = currentIdx < 0 ? 0 : currentIdx;
  const lines = sliceNearby(syncedLyrics, visibleIdx);

  return (
    <div className="expand-tab-panel">
      <div className="overview-lrc-container">
        {lines.map((line, i) => (
          <div
            key={`${visibleIdx}-${i}`}
            className={`overview-lrc-line ${line.isCurrent ? 'current' : ''}`}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
