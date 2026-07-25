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
 * @file SilkyWave.tsx
 * @description Canvas 丝滑波浪组件，使用 requestAnimationFrame 绘制多层正弦波
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { SilkyWaveProps } from '../types/silkyWaveTypes';
import { useSilkyWave } from '../hooks/useSilkyWave';

/**
 * Canvas 丝滑波浪组件
 * @description 使用 requestAnimationFrame 绘制多层正弦波，实现 60fps 流畅动画
 * @param props - 组件入参
 * @returns Canvas 元素
 */
export function SilkyWave({
  color,
  playing,
}: SilkyWaveProps): ReactElement {
  const canvasRef = useSilkyWave(color, playing);

  return (
    <canvas
      ref={canvasRef}
      className="lrc-wave-canvas"
    />
  );
}
