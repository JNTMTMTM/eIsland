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
 * @file musicBgWavePreviewInteractions.test.ts
 * @description 音乐波浪预览真实帧绘制、像素比例、上下文边界与生命周期清理回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicBgWavePreview } from '../MusicBgWavePreview';
import { elementProps } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../components/test/themeHookHarness';
vi.mock('react', async (original) => ({ ...(await original<typeof import('react')>()), ...(await import('../../../../../../../../test/elementHarness')).hookMocks, ...(await import('../../components/test/themeHookHarness')).lifecycleHooks }));
const frame = vi.fn<(callback: FrameRequestCallback) => number>();
const cancel = vi.fn<(id: number) => void>();
let color: [number, number, number];
let playing: boolean;
const context = { setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), strokeStyle: '', lineWidth: 0 };
let canvas: { width: number; height: number; getContext: ReturnType<typeof vi.fn>; getBoundingClientRect: () => { width: number; height: number } };
/**
 * 执行真实动画组件并取得公开 Canvas ref。
 * @returns Canvas ref 契约。
 */
function render() { return elementProps(renderWithHooks(() => MusicBgWavePreview({ color, playing }))).ref as { current: unknown }; }
/**
 * 执行浏览器保存的最新实际动画帧。
 * @returns 无返回值。
 */
function drawFrame(): void { const [callback] = frame.mock.lastCall ?? []; expect(callback).toBeTypeOf('function'); callback?.(0); }
beforeEach(() => {
  resetLifecycle(); vi.resetAllMocks(); playing = true; color = [10, 20, 30]; frame.mockReturnValue(7);
  context.strokeStyle = ''; context.lineWidth = 0;
  canvas = { width: 0, height: 0, getContext: vi.fn(() => context), getBoundingClientRect: () => ({ width: 8, height: 20 }) };
  vi.stubGlobal('window', { devicePixelRatio: 2 }); vi.stubGlobal('requestAnimationFrame', frame); vi.stubGlobal('cancelAnimationFrame', cancel);
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('实际 Canvas 绘制与生命周期', () => {
  it('首次尺寸同步后逐层绘制且下一帧复用尺寸，卸载取消最新帧', () => {
    render().current = canvas; runEffects(); expect(frame).toHaveBeenCalledOnce(); drawFrame();
    expect(canvas.width).toBe(16); expect(canvas.height).toBe(40);
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 8, 20);
    expect(context.moveTo).toHaveBeenCalledTimes(4); expect(context.lineTo).toHaveBeenCalledTimes(16); expect(context.stroke).toHaveBeenCalledTimes(4);
    expect(context.strokeStyle).toBe('rgba(10, 20, 30, 0.3)'); expect(context.lineWidth).toBe(1);
    drawFrame(); expect(context.setTransform).toHaveBeenCalledOnce(); expect(frame).toHaveBeenCalledTimes(3);
    unmountHooks(); expect(cancel).toHaveBeenCalledWith(7);
  });
  it.each([0, undefined])('缺省或零像素比例%o使用一倍像素，宽相等而高变化仍重设尺寸', (dpr) => {
    vi.stubGlobal('window', { devicePixelRatio: dpr }); canvas.width = 8; canvas.height = 0;
    render().current = canvas; runEffects(); drawFrame();
    expect(canvas.width).toBe(8); expect(canvas.height).toBe(20); expect(context.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
  });
  it('帧到达前 Canvas 尚未绑定时安全结束，不安排下一帧', () => {
    render(); runEffects(); drawFrame(); expect(frame).toHaveBeenCalledOnce(); expect(context.stroke).not.toHaveBeenCalled();
  });
  it('Canvas 不支持 2D 上下文时安全结束', () => {
    canvas.getContext.mockReturnValue(null); render().current = canvas; runEffects(); drawFrame();
    expect(canvas.getContext).toHaveBeenCalledWith('2d'); expect(frame).toHaveBeenCalledOnce(); expect(context.stroke).not.toHaveBeenCalled();
  });
  it('暂停状态不创建帧，播放、主色更新和暂停切换执行旧动画清理', () => {
    playing = false; render().current = canvas; runEffects(); expect(frame).not.toHaveBeenCalled();
    playing = true; render(); runEffects(); expect(cancel).toHaveBeenCalledWith(0); expect(frame).toHaveBeenCalledOnce();
    color = [80, 90, 100]; render(); runEffects(); expect(cancel).toHaveBeenCalledWith(7); drawFrame(); expect(context.strokeStyle).toBe('rgba(80, 90, 100, 0.3)');
    playing = false; render(); runEffects(); const calls = frame.mock.calls.length; unmountHooks(); expect(frame).toHaveBeenCalledTimes(calls);
  });
});
