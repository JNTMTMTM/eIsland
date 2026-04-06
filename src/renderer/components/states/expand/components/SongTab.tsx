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
 * @file SongTab.tsx
 * @description Expanded 歌曲 Tab — 三栏布局：左(封面+信息+控制) | 中(歌词) | 右(待办/时间/天气/倒计时)
 * @author 鸡哥
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
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
): { text: string; isCurrent: boolean; key: string }[] {
  const half = Math.floor(VISIBLE_LINES / 2);
  const result: { text: string; isCurrent: boolean; key: string }[] = [];
  for (let offset = -half; offset <= half; offset++) {
    const i = idx + offset;
    if (i >= 0 && i < lyrics.length) {
      result.push({ text: lyrics[i].text, isCurrent: offset === 0, key: `${i}` });
    } else {
      result.push({ text: '', isCurrent: false, key: `pad_${offset}` });
    }
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

// ===================== 频谱波形组件 =====================

/**
 * 频谱波形画布组件
 * @description 绘制三层叠加正弦波动画，用于音乐播放时的视觉装饰效果
 * @param color - RGB 主题色
 * @param playing - 是否处于播放状态（true 时动画运行）
 * @returns Canvas 元素，绘制动态波形
 */
function WaveCanvas({ color, playing }: { color: [number, number, number]; playing: boolean }): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    const dpr = window.devicePixelRatio;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, []);

  const draw = useCallback(() => {
    sizeCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    ctx.clearRect(0, 0, W, H);

    if (playingRef.current) tRef.current += 0.025;

    const [r, g, b] = color;
    const waves = [
      { amp: H * 0.22, freq: 1.8, phase: 0,    speed: 1.0, alpha: 0.15 },
      { amp: H * 0.17, freq: 2.5, phase: 1.2,  speed: 0.7, alpha: 0.10 },
      { amp: H * 0.12, freq: 3.2, phase: 2.8,  speed: 1.3, alpha: 0.07 },
    ];

    waves.forEach((w) => {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${w.alpha})`;
      ctx.lineWidth = 2;
      for (let x = 0; x <= W; x += 2) {
        const nx = x / W;
        const y = H / 2
          + Math.sin(nx * Math.PI * w.freq + tRef.current * w.speed + w.phase) * w.amp
          + Math.cos(nx * Math.PI * w.freq * 0.6 + tRef.current * w.speed * 0.8) * w.amp * 0.3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    rafRef.current = requestAnimationFrame(draw);
  }, [color, sizeCanvas]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return <canvas ref={canvasRef} className="ov-wave-canvas" />;
}

// ===================== 组件 =====================

/**
 * 歌曲 Tab
 * @description 展开状态下三栏布局歌曲面板
 */
export function SongTab(): React.ReactElement {
  const {
    isMusicPlaying, isPlaying, mediaInfo, syncedLyrics, lyricsLoading,
    coverImage, dominantColor, weather, countdown, timerData,
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
  const isIntro = hasLyrics && currentIdx < 0;
  const lines = hasLyrics && !isIntro ? sliceNearby(syncedLyrics!, currentIdx) : [];

  return (
    <div className="expand-tab-panel ov-panel">
      <WaveCanvas color={dominantColor} playing={isPlaying} />
      {/* ========== 左栏：封面 + 信息 + 控制 ========== */}
      <div className="ov-left">
        <div
          className={`ov-disc ${isPlaying ? 'spinning' : ''}`}
          style={{ '--disc-glow': `rgba(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]}, 0.45)` } as React.CSSProperties}
        >
          <div
            className="ov-disc-cover"
            style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
          />
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
        {lyricsLoading && (
          <div className="ov-lrc-loading">
            <span className="ov-lrc-loading-dot" />
            <span className="ov-lrc-loading-dot" />
            <span className="ov-lrc-loading-dot" />
            <span className="ov-lrc-loading-label">正在加载歌词</span>
          </div>
        )}
        {!lyricsLoading && !hasLyrics && isMusicPlaying && <span className="ov-lrc-hint">暂无歌词</span>}
        {!isMusicPlaying && (
          <div className="ov-onboarding">
            <div className="ov-onboarding-title">音乐总览</div>
            <div className="ov-onboarding-desc">播放音乐后，这里将展示实时信息</div>
            <div className="ov-onboarding-features">
              <div className="ov-onboarding-feat"><span className="ov-onboarding-dot" /><span>封面碟片、实时歌词与频谱动画</span></div>
              <div className="ov-onboarding-feat"><span className="ov-onboarding-dot" /><span>时间、天气与倒计时一览</span></div>
            </div>
            <div className="ov-onboarding-hint">播放任意歌曲即可开始</div>
          </div>
        )}
        {isIntro && (
          <div className="ov-lrc-container">
            <img src={SvgIcon.MUSIC} alt="" className="ov-lrc-intro-icon" />
            {syncedLyrics!.slice(0, 2).map((line, i) => (
              <div key={`intro-${i}`} className="ov-lrc-line">
                {line.text}
              </div>
            ))}
          </div>
        )}
        {hasLyrics && !isIntro && (
          <div className="ov-lrc-container">
            {lines.map((line) => (
              <div
                key={line.key}
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
