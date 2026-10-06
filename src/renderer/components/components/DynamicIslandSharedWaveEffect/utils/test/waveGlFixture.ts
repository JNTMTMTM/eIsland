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
 * @file waveGlFixture.ts
 * @description WebGL 音浪测试的原生资源句柄及上下文叶接口模拟。
 * @author 鸡哥
 */

import { vi } from 'vitest';

/**
 * 模拟 WebGL 原生分配、编译和上传接口，真实音浪工具仍自行执行。
 * @returns 可配置叶接口、句柄与实际 canvas 参数。
 */
export default function createWaveGlFixture() {
  const vertex = {} as WebGLShader;
  const fragment = {} as WebGLShader;
  const program = {} as WebGLProgram;
  const buffer = {} as WebGLBuffer;
  const gl = {
    VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632, COMPILE_STATUS: 35713, LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962, STATIC_DRAW: 35044, DEPTH_TEST: 2929, CULL_FACE: 2884,
    createShader: vi.fn<(type: number) => WebGLShader | null>((type) => type === 35633 ? vertex : fragment),
    shaderSource: vi.fn<WebGLRenderingContext['shaderSource']>(),
    compileShader: vi.fn<WebGLRenderingContext['compileShader']>(),
    getShaderParameter: vi.fn<(shader: WebGLShader, parameter: number) => boolean>().mockReturnValue(true),
    getShaderInfoLog: vi.fn<WebGLRenderingContext['getShaderInfoLog']>().mockReturnValue('compile error'),
    deleteShader: vi.fn<WebGLRenderingContext['deleteShader']>(),
    createProgram: vi.fn<() => WebGLProgram | null>().mockReturnValue(program),
    attachShader: vi.fn<WebGLRenderingContext['attachShader']>(),
    linkProgram: vi.fn<WebGLRenderingContext['linkProgram']>(),
    getProgramParameter: vi.fn<(handle: WebGLProgram, parameter: number) => boolean>().mockReturnValue(true),
    getProgramInfoLog: vi.fn<WebGLRenderingContext['getProgramInfoLog']>().mockReturnValue('link error'),
    deleteProgram: vi.fn<WebGLRenderingContext['deleteProgram']>(),
    createBuffer: vi.fn<() => WebGLBuffer | null>().mockReturnValue(buffer),
    bindBuffer: vi.fn<WebGLRenderingContext['bindBuffer']>(),
    bufferData: vi.fn<WebGLRenderingContext['bufferData']>(),
    disable: vi.fn<WebGLRenderingContext['disable']>(),
    getAttribLocation: vi.fn<WebGLRenderingContext['getAttribLocation']>().mockReturnValue(2),
    getUniformLocation: vi.fn<WebGLRenderingContext['getUniformLocation']>().mockReturnValue(null),
    useProgram: vi.fn<WebGLRenderingContext['useProgram']>(),
    deleteBuffer: vi.fn<WebGLRenderingContext['deleteBuffer']>(),
  };
  const context = gl as unknown as WebGLRenderingContext;
  const getContext = vi.fn<(name: string, attributes: unknown) => WebGLRenderingContext | null>().mockReturnValue(context);
  const canvas = { getContext } as unknown as HTMLCanvasElement;
  return { vertex, fragment, program, buffer, gl, context, getContext, canvas };
}
