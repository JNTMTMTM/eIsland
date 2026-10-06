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
 * @file useWaveRenderer.test.ts
 * @description 真实音浪 Renderer 连接初始化、RAF、单帧绘制及 GPU 卸载生命周期测试。
 * @author 鸡哥
 */

import {
  afterEach, beforeEach, describe, expect, it, vi
} from 'vitest';
import createWaveDrawFixture from '../../utils/test/waveDrawFixture';
import {
  useWaveRenderer
} from '../useWaveRenderer';
import {
  renderWithHooks, resetLifecycle, runEffects, unmountHooks
} from './waveLifecycleHarness';
import type {
  RgbTuple
} from '../../types';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../test/elementHarness')).hookMocks,
  ...(await import('./waveLifecycleHarness')).lifecycleHooks,
}));
const frames = new Map<number, FrameRequestCallback>();
let nextId = 0;
const request = vi.fn<typeof requestAnimationFrame>();
const cancel = vi.fn<typeof cancelAnimationFrame>();
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  frames.clear();
  nextId = 0;
  request.mockImplementation((callback) => {
    nextId += 1;
    frames.set(nextId, callback);
    return nextId;
  });
  cancel.mockImplementation((id) => {
    frames.delete(id);
  });
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  vi.stubGlobal('window', {
    devicePixelRatio: 1
  });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});
/** 执行原生调度队列的一帧。
 * @returns 无返回值。
 */
function frame(): void {
  const [[id, callback]] = [...frames.entries()];
  frames.delete(id);
  callback(1000);
}
describe('真实音浪 Renderer 全链路', () => {
  it('默认播放和强调色实际初始化 GPU，颜色更新复用程序且暂停卸载清理', () => {
    const {
      canvas, getContext, gl, draw
    } = createWaveDrawFixture();
    const canvasRef = {
      current: canvas
    };
    renderWithHooks(() => useWaveRenderer(canvasRef, [0, 0, 0]));
    runEffects();
    frame();
    expect(getContext).toHaveBeenCalledOnce();
    expect(draw.drawArrays).toHaveBeenCalledOnce();
    const color: RgbTuple = [0.2, 0.3, 0.4];
    renderWithHooks(() => useWaveRenderer(canvasRef, color, true, [0.7, 0.8, 0.9]));
    runEffects();
    frame();
    expect(getContext).toHaveBeenCalledOnce();
    expect(draw.uniform3f).toHaveBeenLastCalledWith(null, 0.7, 0.8, 0.9);
    renderWithHooks(() => useWaveRenderer(canvasRef, color, false));
    runEffects();
    expect(frames.size).toBe(0);
    unmountHooks();
    expect(gl.deleteBuffer).toHaveBeenCalledOnce();
    expect(gl.deleteProgram).toHaveBeenCalledOnce();
  });
});
