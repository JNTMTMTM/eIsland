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
 * @file useSilkyWave.test.ts
 * @description 丝滑波浪 Hook 的真实Canvas绘制、像素尺寸、播放振幅衰减停止与动画帧清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../../../test/elementHarness';
import { useSilkyWave } from '../useSilkyWave';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
const cancelFrame = vi.fn((id: number) => { frames.delete(id); });
const color: [number, number, number] = [20, 30, 40];
beforeEach(() => {
  resetLifecycle(); vi.clearAllMocks(); frames.clear(); frameId = 0;
  vi.stubGlobal('window', { devicePixelRatio: 1 });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++frameId; frames.set(id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', cancelFrame);
});
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
/**
 * 为真实绘制算法提供浏览器 Canvas 接口叶边界。
 * @param width - CSS像素宽度。
 * @param height - CSS像素高度。
 * @returns 画布与可观察的绘制上下文。
 */
function canvasBoundary(width = 10, height = 20) {
  const context = { setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(), fillStyle: '' };
  const rect = { width, height };
  const target = { width: 0, height: 0, getContext: vi.fn((): typeof context | null => context), getBoundingClientRect: () => rect };
  return { context, rect, target, element: target as unknown as HTMLCanvasElement };
}
/**
 * 提交真实 Hook，并在effect前执行React实际DOM的ref绑定边界。
 * @param canvas - 当前Canvas元素。
 * @param playing - 当前播放状态。
 * @returns 原始Canvas引用。
 */
function commit(canvas: HTMLCanvasElement | null, playing: boolean) {
  const ref = renderWithHooks(() => useSilkyWave(color, playing));
  Object.assign(ref, { current: canvas }); runEffects(); return ref;
}
/**
 * 浏览器执行一帧前从请求队列移除该回调，真实绘制函数负责下一帧排队。
 */
function frame(): void {
  const entry = frames.entries().next().value; if (!entry) return;
  const [id, callback] = entry; frames.delete(id); callback(16);
}
describe('真实Canvas波浪生命周期', () => {
  it('元素尚未可用或2D上下文不可用时不绘制，也不空转下一帧', () => {
    commit(null, true); frame(); expect(frames.size).toBe(0);
    unmountHooks(); resetLifecycle(); const canvas = canvasBoundary(); canvas.target.getContext.mockReturnValue(null);
    commit(canvas.element, true); frame(); expect(canvas.context.fill).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
  });
  it.each([{ devicePixelRatio: undefined, effective: 1 }, { devicePixelRatio: 0, effective: 1 }, { devicePixelRatio: 1.25, effective: 1.25 }, { devicePixelRatio: 3, effective: 2 }])('真实画布使用DPR$devicePixelRatio限制和整数像素，稳定尺寸不重建缓冲', ({ devicePixelRatio, effective }) => {
    vi.stubGlobal('window', { devicePixelRatio }); const canvas = canvasBoundary(10.5, 20.25);
    commit(canvas.element, true); frame();
    expect(canvas.target.width).toBe(Math.round(10.5 * effective)); expect(canvas.target.height).toBe(Math.round(20.25 * effective));
    expect(canvas.context.setTransform).toHaveBeenCalledWith(effective, 0, 0, effective, 0, 0);
    frame(); expect(canvas.context.setTransform).toHaveBeenCalledOnce();
    expect(canvas.context.fill).toHaveBeenCalledTimes(6); expect(canvas.context.fillStyle).toContain('rgba(20, 30, 40,');
  });
  it('宽度不变高度变化仍更新缓冲，零CSS尺寸保持至少1像素', () => {
    const canvas = canvasBoundary(); commit(canvas.element, true); frame();
    canvas.rect.height = 30; frame(); expect(canvas.target.height).toBe(30); expect(canvas.context.setTransform).toHaveBeenCalledTimes(2);
    canvas.rect.width = 0; canvas.rect.height = 0; frame(); expect(canvas.target.width).toBe(1); expect(canvas.target.height).toBe(1);
  });
  it('初始暂停清空画布并停止，恢复播放重新排帧，暂停后振幅衰减到零停止', () => {
    const canvas = canvasBoundary(); const initial = commit(canvas.element, false); frame();
    expect(canvas.context.clearRect).toHaveBeenCalledTimes(2); expect(frames.size).toBe(0);
    expect(commit(canvas.element, true)).toBe(initial); frame(); expect(frames.size).toBe(1);
    expect(canvas.context.lineTo.mock.calls.some(([x, y]) => x > 0 && y !== 20)).toBe(true);
    commit(canvas.element, false);
    for (let index = 0; index < 200 && frames.size > 0; index++) frame();
    expect(frames.size).toBe(0); expect(canvas.context.clearRect).toHaveBeenLastCalledWith(0, 0, 10, 20);
  });
  it('主题变化取消旧帧并绘制新颜色，卸载取消最后一帧', () => {
    const canvas = canvasBoundary(); commit(canvas.element, true); const [old] = frames.keys();
    renderWithHooks(() => useSilkyWave([200, 100, 50], true)); runEffects();
    expect(cancelFrame).toHaveBeenCalledWith(old); expect(frames.has(old)).toBe(false); frame();
    expect(canvas.context.fillStyle).toContain('rgba(200, 100, 50,');
    const [current] = frames.keys(); unmountHooks();
    expect(cancelFrame).toHaveBeenLastCalledWith(current); expect(frames.size).toBe(0);
  });
});
