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
 * @file captureLocalOcrService.test.ts
 * @description 本地 OCR 模型共享、取消与空闲资源释放回归测试。
 * @author 鸡哥
 */

import { getEventListeners } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createWorker } = vi.hoisted(() => ({ createWorker: vi.fn() }));
vi.mock('tesseract.js', () => ({ createWorker }));

import { disposeLocalOcrWorker, recognizeCaptureTextLocally } from '../captureLocalOcrService';

const IMAGE = 'data:image/png;base64,aW1hZ2U=';

/**
 * 创建可由测试手动完成的异步操作。
 * @returns 待完成的 Promise 和手动完成函数。
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('local OCR worker lifetime', () => {
  const recognize = vi.fn();
  const terminate = vi.fn();
  const worker = { recognize, terminate };

  beforeEach(() => {
    vi.useFakeTimers();
    createWorker.mockReset().mockResolvedValue(worker);
    recognize.mockReset().mockResolvedValue({ data: { text: ' result ' } });
    terminate.mockReset().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await disposeLocalOcrWorker();
    vi.useRealTimers();
  });

  it('shares initialization across concurrent requests and releases the idle model', async () => {
    const initialized = deferred<typeof worker>();
    createWorker.mockReturnValueOnce(initialized.promise);
    const first = recognizeCaptureTextLocally(IMAGE, new AbortController().signal);
    const second = recognizeCaptureTextLocally(IMAGE, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(0);
    expect(createWorker).toHaveBeenCalledTimes(1);
    initialized.resolve(worker);
    await expect(first).resolves.toEqual({ success: true, text: 'result' });
    await expect(second).resolves.toEqual({ success: true, text: 'result' });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('does not allocate a model for an already canceled request', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(recognizeCaptureTextLocally(IMAGE, controller.signal)).resolves.toMatchObject({ code: 'ocrTimeout' });
    expect(createWorker).not.toHaveBeenCalled();
  });

  it('releases a model that finishes initialization after its caller is canceled', async () => {
    const initialized = deferred<typeof worker>();
    createWorker.mockReturnValueOnce(initialized.promise);
    const controller = new AbortController();
    const pending = recognizeCaptureTextLocally(IMAGE, controller.signal);
    controller.abort();
    await expect(pending).resolves.toMatchObject({ code: 'ocrTimeout' });
    initialized.resolve(worker);
    await vi.advanceTimersByTimeAsync(0);
    expect(recognize).not.toHaveBeenCalled();
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
  });

  it('cancels recognition even if terminating the worker never settles its recognition promise', async () => {
    recognize.mockReturnValueOnce(new Promise(() => {}));
    const controller = new AbortController();
    const pending = recognizeCaptureTextLocally(IMAGE, controller.signal);
    await vi.advanceTimersByTimeAsync(0);
    expect(recognize).toHaveBeenCalledTimes(1);
    controller.abort();
    await expect(pending).resolves.toMatchObject({ code: 'ocrTimeout' });
    await vi.advanceTimersByTimeAsync(0);
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('cancels the previous idle timer while a new recognition is running', async () => {
    await recognizeCaptureTextLocally(IMAGE, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(59_000);
    const result = deferred<{ data: { text: string } }>();
    recognize.mockReturnValueOnce(result.promise);
    const pending = recognizeCaptureTextLocally(IMAGE, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(terminate).not.toHaveBeenCalled();
    result.resolve({ data: { text: 'next' } });
    await pending;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('lets another caller finish before retiring a shared worker after cancellation', async () => {
    const result = deferred<{ data: { text: string } }>();
    recognize.mockReturnValueOnce(new Promise(() => {})).mockReturnValueOnce(result.promise);
    const controller = new AbortController();
    const canceled = recognizeCaptureTextLocally(IMAGE, controller.signal);
    const remaining = recognizeCaptureTextLocally(IMAGE, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await canceled;
    expect(terminate).not.toHaveBeenCalled();
    result.resolve({ data: { text: 'kept' } });
    await expect(remaining).resolves.toMatchObject({ success: true, text: 'kept' });
    await vi.advanceTimersByTimeAsync(0);
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('disposal cancels active calls and terminates the model once', async () => {
    recognize.mockReturnValueOnce(new Promise(() => {}));
    const pending = recognizeCaptureTextLocally(IMAGE, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(0);
    await disposeLocalOcrWorker();
    await expect(pending).resolves.toMatchObject({ code: 'ocrTimeout' });
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});
