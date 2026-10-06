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
 * @file useWaveLoop.test.ts
 * @description 真实音浪 RAF 单帧、引用颜色更新、暂停恢复和卸载取消测试。
 * @author 鸡哥
 */

import {
  afterEach, beforeEach, describe, expect, it, vi
} from 'vitest';
import createWaveDrawFixture from '../../utils/test/waveDrawFixture';
import {
  useWaveLoop
} from '../useWaveLoop';
import {
  renderWithHooks, resetLifecycle, runEffects, unmountHooks
} from './waveLifecycleHarness';
import type {
  WaveGlContext, RgbTuple
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
describe('真实音浪 RAF 循环', () => {
  it.each(['paused', 'missing-context', 'missing-canvas'])('边界 %s 不创建 RAF 或绘制', (kind) => {
    const {
      canvas, ctx, draw
    } = createWaveDrawFixture();
    renderWithHooks(() => useWaveLoop({
      current: kind === 'missing-canvas' ? null : canvas
    }, kind !== 'paused', {
      current: kind === 'missing-context' ? null : ctx
    }, {
      current: [0, 0, 0]
    }, {
      current: [1, 1, 1]
    }));
    runEffects();
    expect(request).not.toHaveBeenCalled();
    expect(draw.drawArrays).not.toHaveBeenCalled();
  });
  it('每帧执行真实 drawWave 并读取最新颜色，暂停和卸载取消当前帧', () => {
    const {
      canvas, ctx, draw
    } = createWaveDrawFixture();
    const canvasRef = {
      current: canvas
    };
    const glRef: {
      current: WaveGlContext | null
    } = {
      current: ctx
    };
    const bg: {
      current: RgbTuple
    } = {
      current: [0, 0, 0]
    };
    const accent: {
      current: RgbTuple
    } = {
      current: [1, 1, 1]
    };
    const run = (playing: boolean) => renderWithHooks(() => useWaveLoop(canvasRef, playing, glRef, bg, accent));
    run(true);
    runEffects();
    frame();
    expect(draw.drawArrays).toHaveBeenCalledOnce();
    expect(frames.size).toBe(1);
    bg.current = [0.1, 0.2, 0.3];
    accent.current = [0.4, 0.5, 0.6];
    frame();
    expect(draw.uniform3f).toHaveBeenLastCalledWith(null, 0.4, 0.5, 0.6);
    run(false);
    runEffects();
    expect(frames.size).toBe(0);
    run(true);
    runEffects();
    expect(frames.size).toBe(1);
    unmountHooks();
    expect(frames.size).toBe(0);
    expect(cancel).toHaveBeenCalledTimes(2);
  });
});
