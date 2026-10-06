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
 * @file canvasUtils.test.ts
 * @description 背景Canvas公开renderer的真实DPR尺寸、圆角路径、静态/脉动辉光和渐变色彩边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// eslint-disable-next-line import-x/extensions -- 浏览器JS真实入口需显式扩展，供类型工具读取源JSDoc。
import createRenderer from '../canvasUtils.js';
import { canvasBoundary, resetGlow } from './glowCanvasHarness';
interface CanvasRenderer { resize: () => void; drawNeonBorder: (rotation: number, breath: number, pulse: number, blurBreath: number, colorBreath: number) => void }
const createCanvasRenderer = createRenderer as unknown as (canvas: HTMLCanvasElement) => CanvasRenderer;
beforeEach(() => resetGlow());
afterEach(() => vi.unstubAllGlobals());
describe('真实Canvas背景渲染公开接口', () => {
  it.each([{ dpr: undefined, scale: 1 }, { dpr: 0, scale: 1 }, { dpr: 1.5, scale: 1.5 }, { dpr: 2, scale: 2 }])('DPR$dpr同步CSS与像素尺寸，并随原生窗口尺寸更新', ({ dpr, scale }) => {
    const browser = resetGlow(dpr); Object.assign(browser, { devicePixelRatio: dpr });
    const fixture = canvasBoundary(); const renderer = createCanvasRenderer(fixture.element);
    expect(fixture.canvas.getContext).toHaveBeenCalledExactlyOnceWith('2d');
    renderer.resize(); expect(fixture.canvas.width).toBe(320 * scale); expect(fixture.canvas.height).toBe(180 * scale);
    expect(fixture.canvas.style).toMatchObject({ width: '320px', height: '180px' });
    expect(fixture.context.setTransform).toHaveBeenCalledWith(scale, 0, 0, scale, 0, 0);
    Object.assign(browser, { innerWidth: 480, innerHeight: 240 }); renderer.resize();
    expect(fixture.canvas.width).toBe(480 * scale); expect(fixture.canvas.height).toBe(240 * scale);
    expect(fixture.canvas.style.width).toBe('480px');
  });
  it('真实六层描边采用边界外扩圆角路径、中心色环，并平衡save/restore', () => {
    const { element, context, gradients, strokes } = canvasBoundary(); const renderer = createCanvasRenderer(element);
    renderer.resize(); renderer.drawNeonBorder(0.5, 0.8, 0.5, 1, 1);
    expect(context.clearRect).toHaveBeenCalledExactlyOnceWith(0, 0, 320, 180);
    expect(context.beginPath).toHaveBeenCalledTimes(6); expect(context.closePath).toHaveBeenCalledTimes(6);
    expect(context.moveTo).toHaveBeenCalledWith(20, -10); expect(context.lineTo).toHaveBeenCalledWith(300, -10);
    expect(context.quadraticCurveTo).toHaveBeenCalledWith(330, -10, 330, 20); expect(context.quadraticCurveTo).toHaveBeenCalledTimes(24);
    expect(context.save).toHaveBeenCalledTimes(6); expect(context.restore).toHaveBeenCalledTimes(6);
    expect(context.createConicGradient).toHaveBeenCalledWith(0.5, 160, 90);
    expect(gradients).toHaveLength(6); expect(gradients.every((gradient) => gradient.stops.length === 11)).toBe(true);
    expect(gradients[0].stops[0]).toEqual({ stop: 0, color: 'hsl(30, 100%, 65%)' });
    expect(gradients[0].stops.at(-1)).toEqual({ stop: 1, color: 'hsl(30, 100%, 65%)' });
    expect(strokes[0]).toMatchObject({ lineWidth: 50, filter: 'blur(160px)' }); expect(strokes[0].alpha).toBeCloseTo(0.08);
    expect(strokes.at(-1)).toEqual({ alpha: 1, lineWidth: 2.5, filter: 'blur(2px)' });
  });
  it('公开绘制倍率允许关闭模糊且低色彩呼吸降低饱和亮度，不改变静态核心描边', () => {
    const { element, gradients, strokes } = canvasBoundary(); const renderer = createCanvasRenderer(element);
    renderer.resize(); renderer.drawNeonBorder(0, 0, 0, 0, -1);
    expect(strokes.every((stroke) => stroke.filter === 'none')).toBe(true);
    expect(strokes[0]).toEqual({ alpha: 0, lineWidth: 0, filter: 'none' });
    expect(strokes.at(-1)).toEqual({ alpha: 1, lineWidth: 2.5, filter: 'none' });
    expect(gradients[0].stops[0].color).toBe('hsl(30, 90%, 55%)');
  });
});
