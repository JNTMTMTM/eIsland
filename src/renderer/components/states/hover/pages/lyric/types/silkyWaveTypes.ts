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
 * @file silkyWaveTypes.ts
 * @description SilkyWave 组件类型定义
 * @author 鸡哥
 */

/** 波浪层配置 */
export interface WaveLayer {
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  opacity: number;
}

/** SilkyWave 组件入参 */
export interface SilkyWaveProps {
  /** 主题色 RGB */
  color: [number, number, number];
  /** 是否正在播放 */
  playing: boolean;
}
