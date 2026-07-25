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
 * @file silkyWaveConfig.ts
 * @description SilkyWave 波浪层常量配置
 * @author 鸡哥
 */

import type { WaveLayer } from '../types/silkyWaveTypes';

/** 多层正弦波配置参数 */
export const WAVE_LAYERS: WaveLayer[] = [
  { amplitude: 6, frequency: 0.018, speed: 0.025, phase: 0, opacity: 0.35 },
  { amplitude: 4.5, frequency: 0.024, speed: -0.018, phase: 2, opacity: 0.25 },
  { amplitude: 3, frequency: 0.032, speed: 0.032, phase: 4, opacity: 0.15 },
];
