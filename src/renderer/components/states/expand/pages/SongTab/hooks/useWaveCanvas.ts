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
 * @file useWaveCanvas.ts
 * @description 频谱波形画布的尺寸同步与 requestAnimationFrame 绘制循环。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { WAVE_LAYERS, WAVE_TIME_STEP } from '../config/songConfig';
import type { RgbColor } from '../types/songTypes';

/**
 * 驱动三层正弦波动画，暂停时保持当前相位静止。
 * @param color - RGB 主题色
 * @param playing - 是否处于播放状态
 * @returns 画布引用
 */
export function useWaveCanvas(color: RgbColor, playing: boolean): RefObject<HTMLCanvasElement | null> {
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

    if (playingRef.current) tRef.current += WAVE_TIME_STEP;

    const [r, g, b] = color;
    WAVE_LAYERS.forEach((w) => {
      const amp = H * w.ampRatio;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${w.alpha})`;
      ctx.lineWidth = 2;
      for (let x = 0; x <= W; x += 2) {
        const nx = x / W;
        const y = H / 2
          + Math.sin(nx * Math.PI * w.freq + tRef.current * w.speed + w.phase) * amp
          + Math.cos(nx * Math.PI * w.freq * 0.6 + tRef.current * w.speed * 0.8) * amp * 0.3;
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

  return canvasRef;
}
