/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file musicWaveResources.test.ts
 * @description 音乐波浪的 GPU 资源释放与画布分配回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initWaveGl } from '../../components/DynamicIslandSharedWaveEffect/utils/initWaveGl';
import { useWaveInit } from '../../components/DynamicIslandSharedWaveEffect/hooks/useWaveInit';
import { useSilkyWave } from '../../states/hover/pages/lyric/hooks/useSilkyWave';

const { useEffectMock, useRefMock } = vi.hoisted(() => ({
  useEffectMock: vi.fn(),
  useRefMock: vi.fn((value: unknown) => ({ current: value })),
}));
vi.mock('react', () => ({
  useEffect: useEffectMock,
  useRef: useRefMock,
  useCallback: (callback: unknown) => callback,
}));

let cleanups: Array<() => void> = [];

function createGl() {
  return {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6, DEPTH_TEST: 7, CULL_FACE: 8,
    createShader: vi.fn(() => ({})), shaderSource: vi.fn(), compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true), deleteShader: vi.fn(),
    getShaderInfoLog: vi.fn(() => ''), createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(), linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true), getProgramInfoLog: vi.fn(() => ''),
    deleteProgram: vi.fn(), createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(), bufferData: vi.fn(), disable: vi.fn(),
    getAttribLocation: vi.fn(() => 0), getUniformLocation: vi.fn(() => null),
    useProgram: vi.fn(), deleteBuffer: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  cleanups = [];
  useEffectMock.mockImplementation((effect: () => (() => void) | undefined) => {
    const cleanup = effect();
    if (cleanup) cleanups.push(cleanup);
  });
});

afterEach(() => {
  cleanups.forEach((cleanup) => cleanup());
  vi.unstubAllGlobals();
});

describe('music wave resource lifecycle', () => {
  it('releases every buffer and shader program when repeatedly opening and closing the wave', () => {
    const gl = createGl();
    const canvas = { getContext: () => gl } as unknown as HTMLCanvasElement;
    for (let i = 0; i < 100; i += 1) {
      const ref = useWaveInit({ current: canvas }, true);
      expect(ref.current).not.toBeNull();
      cleanups.splice(0).forEach((cleanup) => cleanup());
      expect(ref.current).toBeNull();
    }

    expect(gl.deleteProgram).toHaveBeenCalledTimes(100);
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(100);
    expect(gl.createProgram).toHaveBeenCalledTimes(100);
    expect(gl.createBuffer).toHaveBeenCalledTimes(100);
  });

  it('releases the remaining shader when the other shader cannot compile', () => {
    const gl = createGl();
    gl.getShaderParameter.mockReturnValueOnce(false);
    expect(initWaveGl({ getContext: () => gl } as unknown as HTMLCanvasElement)).toBeNull();
    expect(gl.deleteShader).toHaveBeenCalledTimes(2);
  });

  it('releases a linked program when buffer allocation fails', () => {
    const gl = createGl();
    gl.createBuffer.mockReturnValue(null as never);
    expect(initWaveGl({ getContext: () => gl } as unknown as HTMLCanvasElement)).toBeNull();
    expect(gl.deleteProgram).toHaveBeenCalledOnce();
  });

  it('does not reallocate a fractional-size canvas on every animation frame', () => {
    const context = {
      setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
      lineTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(), fillStyle: '',
    };
    let width = 0;
    let height = 0;
    const setWidth = vi.fn((value: number) => { width = Math.floor(value); });
    const setHeight = vi.fn((value: number) => { height = Math.floor(value); });
    const canvas = {
      get width() { return width; }, set width(value: number) { setWidth(value); },
      get height() { return height; }, set height(value: number) { setHeight(value); },
      getContext: () => context,
      getBoundingClientRect: () => ({ width: 101.25, height: 41.5 }),
    };
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    vi.stubGlobal('window', { devicePixelRatio: 1.25 });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      nextFrame += 1;
      frames.set(nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    useRefMock.mockImplementationOnce(() => ({ current: canvas }));

    useSilkyWave([100, 120, 140], true);
    for (let i = 0; i < 100; i += 1) {
      const [id, callback] = frames.entries().next().value!;
      frames.delete(id);
      callback(i * 16);
    }

    expect(setWidth).toHaveBeenCalledOnce();
    expect(setHeight).toHaveBeenCalledOnce();
    expect(width).toBe(127);
    expect(height).toBe(52);
    cleanups.splice(0).forEach((cleanup) => cleanup());
    expect(frames.size).toBe(0);
  });
});
