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
 * @file MusicBgWavePreview.tsx
 * @description 音乐背景波浪效果预览组件（Canvas 2D 实现）
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useEffect, useRef, useCallback } from 'react';

/** 组件属性 */
interface MusicBgWavePreviewProps {
  /** 强调色 RGB，范围 0-255 */
  color: [number, number, number];
  /** 是否播放动画 */
  playing: boolean;
}

/**
 * 音乐背景波浪效果预览
 * @description 使用 Canvas 2D 绘制音频波浪效果，用于设置页面预览
 * @param props - 组件属性
 * @returns Canvas 元素
 */
export function MusicBgWavePreview({ color, playing }: MusicBgWavePreviewProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);

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

    timeRef.current += 0.02;
    const t = timeRef.current;

    ctx.clearRect(0, 0, w, h);

    const [r, g, b] = color;

    // 绘制多层线条波浪
    const lines = [
      { amp: 5, freq: 0.012, speed: 0.6, width: 2.0, opacity: 0.7 },
      { amp: 4, freq: 0.018, speed: -0.8, width: 1.5, opacity: 0.5 },
      { amp: 3, freq: 0.025, speed: 1.0, width: 1.2, opacity: 0.4 },
      { amp: 2, freq: 0.032, speed: -1.2, width: 1.0, opacity: 0.3 },
    ];

    const centerY = h * 0.5;

    lines.forEach((line) => {
      ctx.beginPath();

      for (let x = 0; x <= w; x += 2) {
        const y = centerY + (
          line.amp * Math.sin(x * line.freq + t * line.speed) +
          line.amp * 0.5 * Math.sin(x * line.freq * 2 + t * line.speed * 0.7 + 1.5) +
          line.amp * 0.3 * Math.sin(x * line.freq * 3.5 + t * line.speed * 1.3 + 3.0)
        );

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${line.opacity})`;
      ctx.lineWidth = line.width;
      ctx.stroke();
    });

    if (playing) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      runningRef.current = false;
    }
  }, [color, playing]);

  useEffect(() => {
    if (playing && !runningRef.current) {
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, [draw, playing]);

  return (
    <canvas
      ref={canvasRef}
      className="settings-music-bg-wave-canvas"
    />
  );
}
