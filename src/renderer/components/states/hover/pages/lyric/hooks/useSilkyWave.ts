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
 * @file useSilkyWave.ts
 * @description SilkyWave 动画逻辑 Hook
 * @author 鸡哥
 */

import { useRef, useEffect, useCallback, type RefObject } from 'react';
import { WAVE_LAYERS } from '../config/silkyWaveConfig';

/**
 * SilkyWave 动画 Hook
 * @description 管理 Canvas 多层正弦波动画的 requestAnimationFrame 循环
 * @param color - 主题色 RGB
 * @param playing - 是否正在播放
 * @returns canvasRef - 绑定到 canvas 元素的 ref
 */
export function useSilkyWave(
  color: [number, number, number],
  playing: boolean,
): RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const ampRef = useRef<number>(0);
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

    // 振幅已衰减到接近 0 且非播放状态时停止循环，节省 CPU
    if (!playing && ampRef.current < 0.001) {
      ampRef.current = 0;
      ctx.clearRect(0, 0, w, h);
      runningRef.current = false;
      return;
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [color, playing]);

  useEffect(() => {
    if (!runningRef.current) {
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(draw);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, [draw]);

  return canvasRef;
}
