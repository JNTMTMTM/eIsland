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
 * @file initWaveGl.test.ts
 * @description 真实 WebGL 初始化各资源失败、着色器与程序释放及 uniform 接线测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initWaveGl } from '../initWaveGl';
import { WAVE_FRAGMENT_SHADER, WAVE_VERTEX_SHADER } from '../../config/waveShaders';
import createWaveGlFixture from './waveGlFixture';

beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

describe('real wave WebGL initialization', () => {
  it('returns null when WebGL is unavailable', () => {
    const { canvas, getContext } = createWaveGlFixture();
    getContext.mockReturnValue(null);
    expect(initWaveGl(canvas)).toBeNull();
    expect(getContext).toHaveBeenCalledWith('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  });
  it.each(['vertex', 'fragment', 'both'] as const)('releases every successfully allocated shader when %s allocation fails', (failure) => {
    const { canvas, gl, vertex, fragment } = createWaveGlFixture();
    gl.createShader.mockReturnValueOnce(failure === 'vertex' || failure === 'both' ? null : vertex).mockReturnValueOnce(failure === 'fragment' || failure === 'both' ? null : fragment);
    expect(initWaveGl(canvas)).toBeNull();
    expect(gl.createProgram).not.toHaveBeenCalled();
    expect(gl.deleteShader).toHaveBeenCalledTimes(failure === 'both' ? 0 : 1);
    if (failure === 'vertex') expect(gl.deleteShader).toHaveBeenCalledWith(fragment);
    if (failure === 'fragment') expect(gl.deleteShader).toHaveBeenCalledWith(vertex);
  });
  it('deletes both compiled shaders when program allocation fails', () => {
    const { canvas, gl, vertex, fragment } = createWaveGlFixture();
    gl.createProgram.mockReturnValue(null);
    expect(initWaveGl(canvas)).toBeNull();
    expect(gl.deleteShader.mock.calls).toEqual([[vertex], [fragment]]);
    expect(gl.attachShader).not.toHaveBeenCalled();
  });
  it('warns and deletes the program when shader linking fails', () => {
    const { canvas, gl, program } = createWaveGlFixture();
    gl.getProgramParameter.mockReturnValue(false);
    expect(initWaveGl(canvas)).toBeNull();
    expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    expect(gl.deleteProgram).toHaveBeenCalledExactlyOnceWith(program);
    expect(console.warn).toHaveBeenCalledWith('[WaveEffect] shader link failed:', 'link error');
    expect(gl.createBuffer).not.toHaveBeenCalled();
  });
  it('deletes the linked program when the triangle buffer cannot be allocated', () => {
    const { canvas, gl, program } = createWaveGlFixture();
    gl.createBuffer.mockReturnValue(null);
    expect(initWaveGl(canvas)).toBeNull();
    expect(gl.deleteProgram).toHaveBeenCalledExactlyOnceWith(program);
    expect(gl.bufferData).not.toHaveBeenCalled();
  });
  it('compiles actual shader sources, uploads the full-screen triangle and obtains every uniform', () => {
    const { canvas, gl, context, program, buffer, vertex, fragment } = createWaveGlFixture();
    vi.spyOn(performance, 'now').mockReturnValue(1234);
    const result = initWaveGl(canvas);
    expect(result).toEqual({ program, buffer, gl: context, posLoc: 2, resLoc: null, timeLoc: null, bgColorLoc: null, accentColorLoc: null, startTime: 1234 });
    expect(gl.shaderSource.mock.calls).toEqual([[vertex, WAVE_VERTEX_SHADER], [fragment, WAVE_FRAGMENT_SHADER]]);
    expect(gl.attachShader.mock.calls).toEqual([[program, vertex], [program, fragment]]);
    expect(gl.deleteShader.mock.calls).toEqual([[vertex], [fragment]]);
    expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, buffer);
    expect(gl.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    expect(gl.disable.mock.calls).toEqual([[gl.DEPTH_TEST], [gl.CULL_FACE]]);
    expect(gl.getUniformLocation.mock.calls).toEqual([[program, 'uResolution'], [program, 'uTime'], [program, 'uBgColor'], [program, 'uAccentColor']]);
    expect(gl.deleteProgram).not.toHaveBeenCalled();
  });
});
