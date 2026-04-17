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

import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import useIslandStore from '../../../store/slices';
import type { SyncedLyricLine, SyncedLyricSyllable } from '../../../store/types';
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
 * 逐字扫光行渲染: 按音节真实 start/duration 计算每个音节的独立进度
 * @param syllables - 音节数组(相对偏移 + 持续时长)
 * @param lineStartMs - 行起始绝对毫秒
 * @param posMs - 当前播放位置(绝对毫秒)
 */
function KaraokeSyllableLine({
  syllables,
  lineStartMs,
  posMs,
}: {
  syllables: SyncedLyricSyllable[];
  lineStartMs: number;
  posMs: number;
}): ReactElement {
  return (
    <>
      {syllables.map((syl, i) => {
        const sylStart = lineStartMs + syl.start_offset_ms;
        const sylEnd = sylStart + syl.duration_ms;
        let prog = 0;
        if (posMs >= sylEnd) prog = 1;
        else if (posMs > sylStart && syl.duration_ms > 0) {
          prog = (posMs - sylStart) / syl.duration_ms;
        }
        return (
          <span
            key={i}
            className="lyrics-syllable"
            style={{ '--syl-prog': `${(prog * 100).toFixed(2)}%` } as React.CSSProperties}
          >
            {syl.text}
          </span>
        );
      })}
    </>
  );
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
  const mediaInfo = useIslandStore((s) => s.mediaInfo);
  const setIdle = useIslandStore((s) => s.setIdle);

  const [karaokeEnabled, setKaraokeEnabled] = useState(false);
  const [clockEnabled, setClockEnabled] = useState(true);
  const [clockText, setClockText] = useState('');

  /** 加载逐字扫光配置 */
  useEffect(() => {
    window.api?.musicLyricsKaraokeGet().then(setKaraokeEnabled).catch(() => {});
    window.api?.musicLyricsClockGet().then(setClockEnabled).catch(() => {});
  }, []);

  /** 按分钟边界更新北京时间，避免每秒重渲染 */
  useEffect(() => {
    if (!clockEnabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = (): void => {
      const now = new Date();
      const beijing = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000);
      const hh = String(beijing.getHours()).padStart(2, '0');
      const mm = String(beijing.getMinutes()).padStart(2, '0');
      const nextText = `${hh}:${mm}`;
      setClockText((prev) => (prev === nextText ? prev : nextText));

      const delayToNextMinute = 60000 - (beijing.getSeconds() * 1000 + beijing.getMilliseconds());
      timer = setTimeout(tick, Math.max(50, delayToNextMinute));
    };

    tick();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [clockEnabled]);

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

  /** 当前行对象, 便于读取 text 与 syllables */
  const currentLine = useMemo(() => {
    if (!hasLyrics || isIntro) return null;
    if (currentIdx >= 0 && syncedLyrics && currentIdx < syncedLyrics.length) {
      return syncedLyrics[currentIdx];
    }
    return null;
  }, [hasLyrics, isIntro, currentIdx, syncedLyrics]);

  /** 当前行文本(未启用逐字时直接渲染) */
  const currentText = currentLine?.text ?? '';

  /** 当前行是否具备真实逐字音节数据 */
  const hasSyllables = Boolean(
    currentLine && currentLine.syllables && currentLine.syllables.length > 0,
  );

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

      {/* 中间：当前北京时间 */}
      {clockEnabled && clockText && (
        <span className="lyrics-time">{clockText}</span>
      )}

      {/* 右侧：歌词 / 前奏居中 */}
      <div className="lyrics-right">
        {lyricsLoading ? (
          <div className="lyrics-loading">
            <span className="lyrics-loading-dot" />
            <span className="lyrics-loading-dot" />
            <span className="lyrics-loading-dot" />
            <span className="lyrics-loading-label">正在加载歌词</span>
          </div>
        ) : isIntro ? (
          <>
            <span className="lyrics-intro-title-center">{mediaInfo.title}</span>
            <img src={SvgIcon.MUSIC} alt="" className="lyrics-intro-icon" />
          </>
        ) : currentText ? (
          <span
            key={currentIdx}
            className={`lyrics-current-line${karaokeEnabled && hasSyllables ? ' lyrics-karaoke' : ''}`}
          >
            {karaokeEnabled && hasSyllables && currentLine ? (
              <KaraokeSyllableLine
                syllables={currentLine.syllables!}
                lineStartMs={currentLine.time_ms}
                posMs={currentPositionMs}
              />
            ) : (
              currentText
            )}
          </span>
        ) : (
          <span className="lyrics-empty">暂无歌词 享受音乐</span>
        )}
      </div>
    </div>
  );
}
