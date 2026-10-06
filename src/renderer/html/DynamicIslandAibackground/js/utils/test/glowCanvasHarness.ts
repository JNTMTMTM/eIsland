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
 * @file glowCanvasHarness.ts
 * @description 背景光效测试私有Canvas、渐变和RAF叶接口，保存真实渲染输出与EventTarget缩放事件。
 * @author 鸡哥
 */

import { vi } from 'vitest';
interface GradientStop { stop: number; color: string }
interface GradientBoundary { addColorStop: ReturnType<typeof vi.fn<(stop: number, color: string) => void>>; stops: GradientStop[] }
export interface StrokeSnapshot { alpha: number; lineWidth: number; filter: string }
/**
 * 提供浏览器Canvas原生叶接口，保存真实路径、描边状态及渐变色停。
 * @returns 画布、上下文和真实算法输出快照。
 */
export function canvasBoundary() {
  const gradients: GradientBoundary[] = []; const strokes: StrokeSnapshot[] = [];
  const context = {
    setTransform: vi.fn<(a: number, b: number, c: number, d: number, e: number, f: number) => void>(),
    clearRect: vi.fn<(x: number, y: number, width: number, height: number) => void>(),
    beginPath: vi.fn(), moveTo: vi.fn<(x: number, y: number) => void>(),
    lineTo: vi.fn<(x: number, y: number) => void>(),
    quadraticCurveTo: vi.fn<(cx: number, cy: number, x: number, y: number) => void>(),
    closePath: vi.fn(), save: vi.fn(), restore: vi.fn(),
    filter: '', globalAlpha: 1, lineWidth: 1,
    strokeStyle: null as GradientBoundary | null,
    createConicGradient: vi.fn<(rotation: number, x: number, y: number) => GradientBoundary>(() => {
      const stops: GradientStop[] = [];
      const gradient = { stops, addColorStop: vi.fn((stop: number, color: string) => { stops.push({ stop, color }); }) };
      gradients.push(gradient); return gradient;
    }),
    stroke: vi.fn(() => { strokes.push({ alpha: context.globalAlpha, lineWidth: context.lineWidth, filter: context.filter }); }),
  };
  const canvas = { width: 0, height: 0, style: { width: '', height: '', opacity: '' }, getContext: vi.fn(() => context) };
  return { canvas, context, gradients, strokes, element: canvas as unknown as HTMLCanvasElement };
}
export const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
/**
 * 创建真实EventTarget窗口及原生动画请求队列，不复制动画计算。
 * @param dpr - 原生设备像素比。
 * @returns 浏览器窗口尺寸和事件边界。
 */
export function resetGlow(dpr: number | undefined = 2) {
  vi.clearAllMocks(); frames.clear(); frameId = 0;
  const browser = Object.assign(new EventTarget(), { devicePixelRatio: dpr, innerWidth: 320, innerHeight: 180 });
  vi.stubGlobal('window', browser);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++frameId; frames.set(id, callback); return id;
  });
  return browser;
}
/**
 * 原生RAF调度一次真实控制器回调，移除已执行请求并保留目标注册的下一帧。
 * @param time - 浏览器给出的单调帧时间。
 */
export function frame(time: number): void {
  const entry = frames.entries().next().value;
  if (!entry) throw new Error('真实控制器没有注册待执行帧');
  const [id, callback] = entry; frames.delete(id); callback(time);
}
