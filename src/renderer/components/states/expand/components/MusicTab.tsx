/**
 * @file MusicTab.tsx
 * @description Expanded 总览 Tab — 三栏布局：左(封面+信息+控制) | 中(歌词) | 右(待办/时间/天气/倒计时)
 * @author 鸡哥
 */

import React, { useEffect, useState } from 'react';
import useIslandStore from '../../../../store/slices';
import type { SyncedLyricLine } from '../../../../store/types';
import { SvgIcon } from '../../../../utils/SvgIcon';
import { formatTime, getDayName } from '../../../../utils/timeUtils';

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

/** 格式化倒计时剩余 */
function formatCountdownRemaining(targetDate: string): string {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return '已到期';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}天${h}时`;
  if (h > 0) return `${h}时${m}分`;
  return `${m}分`;
}

// ===================== 组件 =====================

/**
 * 总览 Tab
 * @description 展开状态下三栏布局总览面板
 */
export function OverviewTab(): React.ReactElement {
  const {
    isMusicPlaying, isPlaying, mediaInfo, syncedLyrics, lyricsLoading,
    coverImage, weather, countdown, timerData,
  } = useIslandStore();

  const [currentIdx, setCurrentIdx] = useState(-1);
  const [now, setNow] = useState(new Date());

  /** 时钟 + 倒计时刷新 */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  /** 歌曲变化 → 重置计时器 */
  useEffect(() => {
    const key = `${mediaInfo.title}||${mediaInfo.artist}`;
    if (key !== _songKey) {
      _songKey = key;
      timerReset();
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

  /** 媒体控制 */
  const handlePlayPause = () => window.api?.mediaPlayPause();
  const handlePrev = () => window.api?.mediaPrev();
  const handleNext = () => window.api?.mediaNext();

  /** 计时器格式化 */
  const timerRunning = timerData.state === 'running' || timerData.state === 'paused';
  const timerMM = Math.floor(timerData.remainingSeconds / 60).toString().padStart(2, '0');
  const timerSS = (timerData.remainingSeconds % 60).toString().padStart(2, '0');

  /** 歌词切片 */
  const hasLyrics = syncedLyrics && syncedLyrics.length > 0 && !lyricsLoading;
  const visibleIdx = currentIdx < 0 ? 0 : currentIdx;
  const lines = hasLyrics ? sliceNearby(syncedLyrics!, visibleIdx) : [];

  return (
    <div className="expand-tab-panel ov-panel">
      {/* ========== 左栏：封面 + 信息 + 控制 ========== */}
      <div className="ov-left">
        <div className={`ov-disc ${isPlaying ? 'spinning' : ''}`}>
          <div
            className="ov-disc-cover"
            style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
          />
          <div className="ov-disc-hole" />
        </div>
        <div className="ov-meta">
          <span className="ov-meta-title">{mediaInfo.title || '未在播放'}</span>
          <span className="ov-meta-artist">{mediaInfo.artist || ''}</span>
          {mediaInfo.album && <span className="ov-meta-album">{mediaInfo.album}</span>}
          <div className="ov-controls">
            <button className="ov-ctrl-btn" onClick={(e) => { e.stopPropagation(); handlePrev(); }} disabled={!isMusicPlaying} title="上一曲">
              <img src={SvgIcon.PREVIOUS_SONG} alt="" className="ov-ctrl-icon ov-ctrl-icon--sm" />
            </button>
            <button className="ov-ctrl-btn ov-ctrl-play" onClick={(e) => { e.stopPropagation(); handlePlayPause(); }} disabled={!isMusicPlaying} title={isPlaying ? '暂停' : '播放'}>
              <img src={isPlaying ? SvgIcon.PAUSE : SvgIcon.CONTINUE} alt="" className="ov-ctrl-icon" />
            </button>
            <button className="ov-ctrl-btn" onClick={(e) => { e.stopPropagation(); handleNext(); }} disabled={!isMusicPlaying} title="下一曲">
              <img src={SvgIcon.NEXT_SONG} alt="" className="ov-ctrl-icon ov-ctrl-icon--sm" />
            </button>
          </div>
        </div>
      </div>

      {/* ========== 中栏：歌词 ========== */}
      <div className="ov-center">
        {lyricsLoading && <span className="ov-lrc-hint">...</span>}
        {!lyricsLoading && !hasLyrics && isMusicPlaying && <span className="ov-lrc-hint">暂无歌词</span>}
        {!isMusicPlaying && <span className="ov-lrc-hint">暂无播放</span>}
        {hasLyrics && (
          <div className="ov-lrc-container">
            {lines.map((line) => (
              <div
                key={line.text}
                className={`ov-lrc-line ${line.isCurrent ? 'current' : ''}`}
              >
                {line.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== 右栏：时间/天气/倒计时/待办 ========== */}
      <div className="ov-right">
        <div className="ov-time">
          <span className="ov-time-clock">{formatTime(now)}</span>
          <span className="ov-time-day">{getDayName(now)}</span>
        </div>
        {weather && (
          <div className="ov-weather">
            <span className="ov-weather-temp">{Math.round(weather.temperature)}°</span>
            <span className="ov-weather-desc">{weather.description}</span>
          </div>
        )}
        {countdown.enabled && (
          <div className="ov-countdown">
            <span className="ov-countdown-label">{countdown.label}</span>
            <span className="ov-countdown-value">{formatCountdownRemaining(countdown.targetDate)}</span>
          </div>
        )}
        {timerRunning && (
          <div className="ov-timer">
            <span className="ov-timer-value">{timerMM}:{timerSS}</span>
          </div>
        )}
      </div>
    </div>
  );
}
