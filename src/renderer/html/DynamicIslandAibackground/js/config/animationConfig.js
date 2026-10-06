/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 silenthim JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: silenthim[](https://github.com/silenthim18303)
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
 * @file animationConfig.js
 * @description 全屏边缘光效的动画时长、呼吸参数、渐变色停与辉光层配置。
 * @author 鸡哥
 */

export const FADE_IN_DURATION = 600;
export const FADE_OUT_DURATION = 400;

export const CYCLE = 8; // 色环旋转周期（秒）
export const BREATH = 2.5; // 主呼吸周期（秒）
export const BREATH2 = 1.4; // 次呼吸周期（秒）
export const BREATH3 = 6.0; // 慢波呼吸周期（秒）
export const BLUR_BREATH = 1.8; // 模糊呼吸周期（秒）
export const COLOR_BREATH = 3.6; // 色彩呼吸周期（秒）
export const CORNER = 20;
export const INSET = 10;
export const BURST_DURATION = 1000;
export const BURST_INTENSITY = 2.5;
export const PULSE_SPEED = 3.2;

// 首尾色停相同，保证色环旋转时边缘连续。
export const GRADIENT_STOPS = [
  [0.00, 30, 100, 60],
  [0.10, 10, 100, 55],
  [0.20, 350, 100, 55],
  [0.30, 330, 100, 55],
  [0.45, 300, 100, 50],
  [0.55, 275, 100, 50],
  [0.65, 255, 100, 55],
  [0.75, 235, 100, 60],
  [0.85, 260, 100, 55],
  [0.92, 290, 100, 50],
  [1.00, 30, 100, 60],
];

// 每层依次配置模糊半径、基础线宽、基础透明度和是否参与呼吸脉动。
export const GLOW_LAYERS = [
  [160, 100, 0.10, true],
  [110, 75, 0.16, true],
  [70, 50, 0.25, true],
  [40, 32, 0.40, true],
  [18, 14, 0.65, true],
  [2, 2.5, 1.0, false],
];
