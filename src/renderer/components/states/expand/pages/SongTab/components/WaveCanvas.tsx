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
 * @file WaveCanvas.tsx
 * @description 频谱波形画布，音乐播放时作为歌曲 Tab 背景装饰。
 * @author 鸡哥
 */

import { useWaveCanvas } from '../hooks/useWaveCanvas';
import type { ReactElement } from 'react';
import type { WaveCanvasProps } from '../types/songTypes';

/**
 * 频谱波形画布组件
 * @param props - 组件入参
 * @param props.color - RGB 主题色
 * @param props.playing - 是否处于播放状态（true 时动画运行）
 * @returns Canvas 元素，绘制动态波形
 */
export function WaveCanvas({ color, playing }: WaveCanvasProps): ReactElement {
  const canvasRef = useWaveCanvas(color, playing);
  return <canvas ref={canvasRef} className="ov-wave-canvas" />;
}
