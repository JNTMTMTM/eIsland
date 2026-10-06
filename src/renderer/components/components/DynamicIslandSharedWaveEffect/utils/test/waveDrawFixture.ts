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
 * @file waveDrawFixture.ts
 * @description WebGL 绘制和初始化测试共用的原生 GPU、画布及 uniform 叶边界。
 * @author 鸡哥
 */

import {
  vi
} from 'vitest';
import createWaveGlFixture from './waveGlFixture';
import type {
  WaveGlContext
} from '../../types';
/** 构造兼容实际初始化和单帧绘制的 GPU 叶边界。
 * @returns 真实函数所需的宿主边界和可观察调用。
 */
export default function createWaveDrawFixture() {
  const fixture = createWaveGlFixture();
  const draw = {
    viewport: vi.fn<WebGLRenderingContext['viewport']>(),
    enableVertexAttribArray: vi.fn<WebGLRenderingContext['enableVertexAttribArray']>(),
    vertexAttribPointer: vi.fn<WebGLRenderingContext['vertexAttribPointer']>(),
    uniform2f: vi.fn<WebGLRenderingContext['uniform2f']>(),
    uniform1f: vi.fn<WebGLRenderingContext['uniform1f']>(),
    uniform3f: vi.fn<WebGLRenderingContext['uniform3f']>(),
    drawArrays: vi.fn<WebGLRenderingContext['drawArrays']>(),
  };
  Object.assign(fixture.context, draw, {
    FLOAT: 5126, TRIANGLES: 4
  });
  Object.assign(fixture.canvas, {
    clientWidth: 10, clientHeight: 20, width: 0, height: 0
  });
  const ctx: WaveGlContext = {
    gl: fixture.context, program: fixture.program, buffer: fixture.buffer, posLoc: 2, resLoc: null, timeLoc: null, bgColorLoc: null, accentColorLoc: null, startTime: 500
  };
  return {
    draw, ctx, ...fixture
  };
}
