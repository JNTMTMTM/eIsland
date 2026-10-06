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
 * @file drawWave.test.ts
 * @description 真实音浪单帧 DPR 限制、尺寸复用、最小画布及 uniform 绘制测试。
 * @author 鸡哥
 */

import {
  afterEach, describe, expect, it, vi
} from 'vitest';
import {
  drawWave
} from '../drawWave';
import createWaveDrawFixture from './waveDrawFixture';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('真实音浪单帧绘制', () => {
  it.each([undefined, 0, 1, 1.5, 3])('像素比 %s 限制 DPR 并同步尺寸和全部 GPU uniform', (devicePixelRatio) => {
    vi.stubGlobal('window', {
      devicePixelRatio
    });
    vi.spyOn(performance, 'now').mockReturnValue(1500);
    const {
      canvas, draw, ctx, gl
    } = createWaveDrawFixture();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    drawWave(ctx, canvas, [0.1, 0.2, 0.3], [0.4, 0.5, 0.6]);
    expect([canvas.width, canvas.height]).toEqual([10 * dpr, 20 * dpr]);
    expect(draw.viewport).toHaveBeenCalledWith(0, 0, 10 * dpr, 20 * dpr);
    expect(draw.uniform1f).toHaveBeenCalledWith(null, 1);
    expect(draw.uniform3f).toHaveBeenNthCalledWith(1, null, 0.1, 0.2, 0.3);
    expect(draw.uniform3f).toHaveBeenNthCalledWith(2, null, 0.4, 0.5, 0.6);
    expect(draw.drawArrays).toHaveBeenCalledWith(4, 0, 3);
    expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, ctx.buffer);
    drawWave(ctx, canvas, [0, 0, 0], [1, 1, 1]);
    expect(draw.viewport).toHaveBeenCalledTimes(2);
  });
  it('宽度相等而高度变化仍同步，零尺寸夹紧到一个像素', () => {
    vi.stubGlobal('window', {
      devicePixelRatio: 1
    });
    const {
      canvas, ctx
    } = createWaveDrawFixture();
    Object.assign(canvas, {
      width: 10, height: 1
    });
    drawWave(ctx, canvas, [0, 0, 0], [1, 1, 1]);
    expect(canvas.height).toBe(20);
    Object.assign(canvas, {
      clientWidth: 0, clientHeight: 0
    });
    drawWave(ctx, canvas, [0, 0, 0], [1, 1, 1]);
    expect([canvas.width, canvas.height]).toEqual([1, 1]);
  });
});
