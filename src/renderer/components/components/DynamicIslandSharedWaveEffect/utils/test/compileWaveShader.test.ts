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
 * @file compileWaveShader.test.ts
 * @description 真实着色器编译成功、分配失败、编译失败及资源释放测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compileWaveShader } from '../compileWaveShader';
import createWaveGlFixture from './waveGlFixture';

beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

describe('wave shader compilation', () => {
  it('uploads the provided source and returns the successfully compiled native handle', () => {
    const { gl, vertex, context } = createWaveGlFixture();
    expect(compileWaveShader(context, gl.VERTEX_SHADER, 'void main() {}')).toBe(vertex);
    expect(gl.shaderSource).toHaveBeenCalledWith(vertex, 'void main() {}');
    expect(gl.compileShader).toHaveBeenCalledWith(vertex);
    expect(gl.getShaderParameter).toHaveBeenCalledWith(vertex, gl.COMPILE_STATUS);
    expect(gl.deleteShader).not.toHaveBeenCalled();
  });
  it('returns null without uploads when native shader allocation fails', () => {
    const { gl, context } = createWaveGlFixture();
    gl.createShader.mockReturnValue(null);
    expect(compileWaveShader(context, gl.VERTEX_SHADER, 'source')).toBeNull();
    expect(gl.shaderSource).not.toHaveBeenCalled();
    expect(gl.deleteShader).not.toHaveBeenCalled();
  });
  it('warns with the compile log and deletes a failed shader exactly once', () => {
    const { gl, vertex, context } = createWaveGlFixture();
    gl.getShaderParameter.mockReturnValue(false);
    expect(compileWaveShader(context, gl.VERTEX_SHADER, 'source')).toBeNull();
    expect(console.warn).toHaveBeenCalledWith('[WaveEffect] shader compile failed:', 'compile error');
    expect(gl.deleteShader).toHaveBeenCalledExactlyOnceWith(vertex);
  });
});
