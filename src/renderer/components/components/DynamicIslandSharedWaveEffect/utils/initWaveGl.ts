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
 * @file initWaveGl.ts
 * @description 波浪背景 WebGL 上下文初始化工具
 * @author 鸡哥
 */

import {
  WAVE_FRAGMENT_SHADER,
  WAVE_VERTEX_SHADER,
} from '../config/waveShaders';
import type { WaveGlContext } from '../types';
import { compileWaveShader } from './compileWaveShader';

/**
 * 初始化波浪背景 WebGL 上下文。
 * 创建 WebGL 着色器程序、绑定全屏三角形缓冲区、获取所有 uniform 位置。
 * @param canvas - 承载渲染的画布元素
 * @returns 初始化后的上下文，失败时返回 null
 */
export function initWaveGl(canvas: HTMLCanvasElement): WaveGlContext | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const vert = compileWaveShader(gl, gl.VERTEX_SHADER, WAVE_VERTEX_SHADER);
  const frag = compileWaveShader(gl, gl.FRAGMENT_SHADER, WAVE_FRAGMENT_SHADER);
  if (!vert || !frag) {
    if (vert) gl.deleteShader(vert);
    if (frag) gl.deleteShader(frag);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return null;
  }

  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[WaveEffect] shader link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);

  return {
    gl,
    program,
    buffer,
    posLoc: gl.getAttribLocation(program, 'aPosition'),
    resLoc: gl.getUniformLocation(program, 'uResolution'),
    timeLoc: gl.getUniformLocation(program, 'uTime'),
    bgColorLoc: gl.getUniformLocation(program, 'uBgColor'),
    accentColorLoc: gl.getUniformLocation(program, 'uAccentColor'),
    startTime: performance.now(),
  };
}
