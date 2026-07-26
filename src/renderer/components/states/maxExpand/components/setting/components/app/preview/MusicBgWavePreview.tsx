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

    // 绘制多层波浪
    const layers = [
      { amp: 8, freq: 0.015, speed: 0.8, opacity: 0.4 },
      { amp: 6, freq: 0.02, speed: -0.6, opacity: 0.3 },
      { amp: 4, freq: 0.025, speed: 1.0, opacity: 0.2 },
    ];

    for (const layer of layers) {
      ctx.beginPath();
      ctx.moveTo(0, h);

      for (let x = 0; x <= w; x += 2) {
        const y = h - layer.amp - (
          layer.amp * 0.5 * Math.sin(x * layer.freq + t * layer.speed) +
          layer.amp * 0.3 * Math.sin(x * layer.freq * 2.5 + t * layer.speed * 0.7 + 1.5) +
          layer.amp * 0.2 * Math.sin(x * layer.freq * 4 + t * layer.speed * 1.3 + 3.0)
        );

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${layer.opacity})`;
      ctx.fill();
    }

    // 绘制顶部高光线
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const y = h - 8 - (
        4 * Math.sin(x * 0.015 + t * 0.8) +
        2 * Math.sin(x * 0.03 + t * 1.2 + 1.0)
      );

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

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
