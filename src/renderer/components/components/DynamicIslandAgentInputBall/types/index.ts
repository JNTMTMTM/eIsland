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
 * @file types/index.ts
 * @description 液态玻璃球 WebGPU 组件类型定义。
 * @author 鸡哥
 */

/** LiquidOrbCanvas 组件属性 */
export interface LiquidOrbCanvasProps {
  /** 是否播放渲染循环，默认 true。 */
  playing?: boolean;
  /** 自定义 uniform 种子数据，覆盖默认值。 */
  uniformOverrides?: Float32Array;
  /** 渲染出错时的回调。 */
  onError?: (error: Error) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** WebGPU 渲染上下文，包含管线、缓冲区和绑定组。 */
export interface WebGPUContext {
  device: any;
  context: any;
  pipeline: any;
  uniformBuffer: any;
  bindGroup: any;
  values: Float32Array;
  startedAt: number;
  format: string;
}
