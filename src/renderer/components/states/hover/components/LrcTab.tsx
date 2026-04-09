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
 * @file LrcTab.tsx
 * @description 歌词 Tab 内容组件 - 复刻 Python-island 音乐系统
 * @author 鸡哥
 */

import { useRef, useEffect, useCallback } from 'react';
import useIslandStore from '../../../../store/slices';
import { SvgIcon } from '../../../../utils/SvgIcon';

/**
 * 按视觉宽度截断文本（支持中日韩多字节字符）
 * 中文/繁体汉字: 2em | 日文平假名/片假名: 2em | 韩文 Hangul: 2em | 其他: 1em
 */
function truncateByVisualWidth(text: string, maxWidth: number): string {
  let finalWidth = 0;
  let finalEnd = 0;
  Array.from(text).every((ch) => {
    const isEastAsianWide =
      /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u1100-\u115f\u3130-\u318f]/.test(ch);
    const charWidth = isEastAsianWide ? 2 : 1;
    if (finalWidth + charWidth > maxWidth - 1) return false;
    finalWidth += charWidth;
    finalEnd++;
    return true;
  });
  if (finalEnd === text.length) return text;
  return text.slice(0, finalEnd) + '…';
}

/** 波浪层配置 */
interface WaveLayer {
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  opacity: number;
}

const WAVE_LAYERS: WaveLayer[] = [
  { amplitude: 6, frequency: 0.018, speed: 0.025, phase: 0, opacity: 0.35 },
  { amplitude: 4.5, frequency: 0.024, speed: -0.018, phase: 2, opacity: 0.25 },
  { amplitude: 3, frequency: 0.032, speed: 0.032, phase: 4, opacity: 0.15 },
];

/**
 * Canvas 丝滑波浪组件
 * @description 使用 requestAnimationFrame 绘制多层正弦波，实现 60fps 流畅动画
 */
function SilkyWave({
  color,
  playing,
}: {
  color: [number, number, number];
  playing: boolean;
}): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const ampRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const targetAmp = playing ? 1 : 0;
    ampRef.current += (targetAmp - ampRef.current) * 0.04;

    timeRef.current += 1;
    const t = timeRef.current;

    ctx.clearRect(0, 0, w, h);

    const [r, g, b] = color;

    for (let i = WAVE_LAYERS.length - 1; i >= 0; i--) {
      const layer = WAVE_LAYERS[i];
      const amp = layer.amplitude * ampRef.current;

      ctx.beginPath();
      ctx.moveTo(0, h);

      for (let x = 0; x <= w; x += 2) {
        const y =
          h -
          amp *
            (Math.sin(x * layer.frequency + t * layer.speed + layer.phase) *
              0.6 +
              Math.sin(
                x * layer.frequency * 1.8 + t * layer.speed * 0.7 + layer.phase * 0.5,
              ) *
                0.4) -
          amp * 0.5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${layer.opacity * (0.5 + ampRef.current * 0.5)})`;
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [color, playing]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="lrc-wave-canvas"
    />
  );
}

/**
 * 歌词 Tab 内容
 * @description 显示当前播放歌词、唱片封面和播放控制
 */
export function LyricsTab(): React.ReactElement {
  const {
    isMusicPlaying,
    isPlaying,
    mediaInfo,
    coverImage,
    dominantColor,
  } = useIslandStore();

  const handlePlayPause = () => window.api?.mediaPlayPause();
  const handlePrev = () => window.api?.mediaPrev();
  const handleNext = () => window.api?.mediaNext();

  const artistText = truncateByVisualWidth(mediaInfo.artist || '未知艺术家', 50);
  const albumText = truncateByVisualWidth(mediaInfo.title || '未知歌曲', 45);

  return (
    <div className={`lrc-tab-wrapper ${isPlaying ? 'playing' : ''}`}>
      <div className="lrc-vinyl-disc">
        <div
          className="lrc-vinyl-cover"
          style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
        />
      </div>

      <div className="lrc-info-section">
        <div className={`lrc-title ${!isMusicPlaying ? 'inactive' : ''}`}>
          {albumText}
        </div>

        <div className="lrc-artist">{artistText}</div>
      </div>

      <div className="lrc-media-controls">
        <button
          className="lrc-media-btn"
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          title="上一曲"
          disabled={!isMusicPlaying}
        >
          <img src={SvgIcon.PREVIOUS_SONG} alt="上一曲" className="lrc-media-btn-icon lrc-media-btn-icon--sm" />
        </button>
        <button
          className="lrc-media-btn lrc-play-btn"
          onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
          title={isPlaying ? '暂停' : '播放'}
          disabled={!isMusicPlaying}
        >
          {isPlaying ? (
            <img src={SvgIcon.PAUSE} alt="暂停" className="lrc-media-btn-icon" />
          ) : (
            <img src={SvgIcon.CONTINUE} alt="播放" className="lrc-media-btn-icon" />
          )}
        </button>
        <button
          className="lrc-media-btn"
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          title="下一曲"
          disabled={!isMusicPlaying}
        >
          <img src={SvgIcon.NEXT_SONG} alt="下一曲" className="lrc-media-btn-icon lrc-media-btn-icon--sm" />
        </button>
      </div>

      <div className="lrc-wave-container">
        <SilkyWave color={dominantColor} playing={isPlaying} />
      </div>
    </div>
  );
}
