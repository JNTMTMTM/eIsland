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
 * @file components/LiquidOrbCanvas.tsx
 * @description 液态玻璃球 WebGPU 渲染画布组件。
 * @author 鸡哥
 */

import { useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import { useWebGPURenderer } from '../hooks/useWebGPURenderer';
import { LIQUID_ORB_UNIFORM_SEED } from '../config/uniformDefaults';
import type { LiquidOrbCanvasProps } from '../types';

/**
 * 渲染液态玻璃球 WebGPU 画布。
 * @param playing - 是否播放渲染循环，默认 true。
 * @param uniformOverrides - 自定义 uniform 种子数据，覆盖默认值。
 * @param onError - 渲染出错时的回调。
 * @returns 液态玻璃球画布节点。
 */
export function LiquidOrbCanvas({
  playing = true,
  uniformOverrides,
  onError,
}: LiquidOrbCanvasProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const uniformData = useMemo(
    () => uniformOverrides ?? new Float32Array(LIQUID_ORB_UNIFORM_SEED),
    [uniformOverrides],
  );

  useWebGPURenderer(canvasRef, playing, uniformData, onError);

  return (
    <canvas
      ref={canvasRef}
      aria-label="动态液态玻璃球"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
