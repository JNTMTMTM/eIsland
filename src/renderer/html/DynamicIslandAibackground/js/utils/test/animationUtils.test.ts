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
 * @file animationUtils.test.ts
 * @description 背景动画公开控制器执行真实Canvas renderer，覆盖淡入、淡出、启动脉冲、色环与窗口缩放RAF链。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// eslint-disable-next-line import-x/extensions -- 浏览器JS真实入口需显式扩展，供类型工具读取源JSDoc。
import createController from '../animationUtils.js';
import { canvasBoundary, frame, frames, resetGlow } from './glowCanvasHarness';
interface AnimationController { start: () => void; startFadeOut: () => void }
const createAnimationController = createController as unknown as (canvas: HTMLCanvasElement) => AnimationController;
beforeEach(() => resetGlow());
afterEach(() => vi.unstubAllGlobals());
describe('真实动画公开生命周期与Canvas组合', () => {
  it('创建设置透明度但不排帧，start真实resize并注册原生缩放监听', () => {
    const browser = resetGlow(); const fixture = canvasBoundary(); const controller = createAnimationController(fixture.element);
    expect(fixture.canvas.style.opacity).toBe('0'); expect(frames.size).toBe(0);
    controller.start(); expect(frames.size).toBe(1); expect(fixture.canvas.width).toBe(640);
    Object.assign(browser, { innerWidth: 500, innerHeight: 300 }); browser.dispatchEvent(new Event('resize'));
    expect(fixture.canvas.width).toBe(1000); expect(fixture.canvas.height).toBe(600);
  });
  it('600ms真实二次淡入曲线从0到0.75再到1，随后稳定并继续绘制下一帧', () => {
    const fixture = canvasBoundary(); const controller = createAnimationController(fixture.element); controller.start();
    frame(0); expect(Number(fixture.canvas.style.opacity)).toBe(0); expect(fixture.context.stroke).toHaveBeenCalledTimes(6);
    expect(fixture.strokes[0].alpha).toBeCloseTo(0.175);
    frame(300); expect(Number(fixture.canvas.style.opacity)).toBeCloseTo(0.75);
    frame(600); expect(fixture.canvas.style.opacity).toBe('1');
    frame(900); expect(fixture.canvas.style.opacity).toBe('1'); expect(frames.size).toBe(1);
    frame(2000); expect(fixture.context.createConicGradient.mock.calls.at(-1)?.[0]).toBeCloseTo(Math.PI / 2);
    expect(fixture.context.stroke).toHaveBeenCalledTimes(30); expect(fixture.strokes.at(-1)?.alpha).toBe(1);
  });
  it('完全淡入后调用公开fadeOut，400ms内按二次曲线归零并钳制晚帧', () => {
    const fixture = canvasBoundary(); const controller = createAnimationController(fixture.element); controller.start(); frame(0); frame(600);
    controller.startFadeOut(); frame(1000); expect(fixture.canvas.style.opacity).toBe('1');
    frame(1200); expect(Number(fixture.canvas.style.opacity)).toBeCloseTo(0.75);
    frame(1400); expect(fixture.canvas.style.opacity).toBe('0');
    frame(1900); expect(fixture.canvas.style.opacity).toBe('0'); expect(frames.size).toBe(1);
  });
  it('淡入中途fadeOut保持开始时alpha而不继续淡入，重复请求不重置淡出时间', () => {
    const fixture = canvasBoundary(); const controller = createAnimationController(fixture.element); controller.start(); frame(0); frame(300);
    controller.startFadeOut(); frame(310); expect(Number(fixture.canvas.style.opacity)).toBeCloseTo(0.75);
    controller.startFadeOut(); frame(510); expect(Number(fixture.canvas.style.opacity)).toBeCloseTo(0.5625);
    frame(710); expect(fixture.canvas.style.opacity).toBe('0');
  });
  it('第一帧之前要求fadeOut保持零alpha，但真实绘制与RAF仍按窗口生命周期执行', () => {
    const fixture = canvasBoundary(); const controller = createAnimationController(fixture.element); controller.startFadeOut(); controller.start();
    frame(100); expect(fixture.canvas.style.opacity).toBe('0'); frame(500); expect(fixture.canvas.style.opacity).toBe('0');
    expect(fixture.context.stroke).toHaveBeenCalledTimes(12); expect(frames.size).toBe(1);
  });
});
