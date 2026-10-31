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
 * @file songConfig.ts
 * @description Expanded 歌曲 Tab 的歌词窗口行数与频谱波形参数。
 * @author 鸡哥
 */

import type { WaveLayer } from '../types/songTypes';

/** 显示歌词行数 */
export const VISIBLE_LINES = 5;

/** 播放时每帧推进的波形相位 */
export const WAVE_TIME_STEP = 0.025;

/** 三层叠加正弦波，由近到远振幅递减、透明度递减 */
export const WAVE_LAYERS: readonly WaveLayer[] = [
  { ampRatio: 0.22, freq: 1.8, phase: 0, speed: 1.0, alpha: 0.15 },
  { ampRatio: 0.17, freq: 2.5, phase: 1.2, speed: 0.7, alpha: 0.10 },
  { ampRatio: 0.12, freq: 3.2, phase: 2.8, speed: 1.3, alpha: 0.07 },
];
