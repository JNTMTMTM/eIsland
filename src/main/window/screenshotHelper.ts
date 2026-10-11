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
 * @file screenshotHelper.ts
 * @description 按需子进程截图门面；主线程不加载 FFI 或执行 PNG 编码。
 * @author 鸡哥
 */
import { join } from 'node:path';
import { createScreenshotRunner } from './screenshotRunner';
import type { VisibleWindowBounds } from './screenshotNative';
export type { VisibleWindowBounds } from './screenshotNative';

const runner = createScreenshotRunner(join(__dirname, 'screenshotWorker.js'));
process.once('exit', () => runner.dispose());

/**
 * 异步截取主显示器，失败时返回 null 供 desktopCapturer 回退。
 * @param signal - 关闭截图流程时终止 native 子进程
 * @returns 原始 PNG 字节
 */
export function capturePrimaryDisplayPng(signal?: AbortSignal): Promise<Buffer | null> {
  return process.platform === 'win32' ? runner.run('primary', signal) : Promise.resolve(null);
}

/**
 * 异步截取虚拟桌面，原始图像和编码仅驻留在短生命周期进程。
 * @param signal - 取消信号
 * @returns 原始 PNG 字节或 null
 */
export function captureAllDisplaysPng(signal?: AbortSignal): Promise<Buffer | null> {
  return process.platform === 'win32' ? runner.run('all', signal) : Promise.resolve(null);
}

/**
 * 异步读取可见窗口边界。
 * @param signal - 取消信号
 * @returns 窗口边界；不可用时为空数组
 */
export async function getVisibleWindows(signal?: AbortSignal): Promise<VisibleWindowBounds[]> {
  if (process.platform !== 'win32') return [];
  const data = await runner.run('windows', signal);
  try { const result: unknown = JSON.parse(data?.toString('utf8') || '[]'); return Array.isArray(result) ? result : []; }
  catch { return []; }
}

/**
 * 将 desktopCapturer 的像素复制交给子进程编码，主线程不执行 PNG 压缩。
 * @param image - Electron 原生缩略图
 * @param signal - 取消信号
 * @returns 编码后的 PNG 字节
 */
export function encodeScreenshotPng(image: Pick<Electron.NativeImage, 'getSize' | 'toBitmap'>, signal?: AbortSignal): Promise<Buffer | null> {
  const { width, height } = image.getSize();
  if (width <= 0 || height <= 0 || width * height > 32 * 1024 * 1024) return Promise.resolve(null);
  return runner.run('encode', signal, () => ({ data: image.toBitmap(), width, height }));
}
