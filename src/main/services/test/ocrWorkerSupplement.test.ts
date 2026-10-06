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
 * @file ocrWorkerSupplement.test.ts
 * @description 本地 OCR 模型错误、初始化完成取消竞态及云 OCR 开发地址边界测试。
 * @author 鸡哥
 */

import { getEventListeners } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
interface WorkerFixture { recognize: ReturnType<typeof vi.fn<() => Promise<{ data: { text: unknown } }>>>; terminate: ReturnType<typeof vi.fn<() => Promise<void>>>; }
const io = vi.hoisted(() => ({ create: vi.fn<() => Promise<WorkerFixture>>(), fetch: vi.fn<typeof fetch>() }));
vi.mock('tesseract.js', () => ({ createWorker: io.create }));
vi.mock('electron', () => ({ app: { getVersion: () => 'fixture' }, nativeImage: { createFromBuffer: () => ({ getSize: () => ({ width: 100, height: 100 }) }) } }));
const image = 'data:image/png;base64,aW1hZ2U=';
const worker: WorkerFixture = { recognize: vi.fn(), terminate: vi.fn() };
let api: typeof import('../captureLocalOcrService');
/**
 * 构造可控的叶接口异步响应。
 * @returns 可完成 Promise 和完成函数
 */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let complete!: (value: T) => void; const promise = new Promise<T>((resolve) => { complete = resolve; });
  return { promise, resolve: complete };
}
beforeEach(async () => {
  vi.resetModules(); vi.resetAllMocks(); vi.useFakeTimers();
  worker.recognize.mockResolvedValue({ data: { text: '  recognized  ' } }); worker.terminate.mockResolvedValue(undefined);
  io.create.mockResolvedValue(worker); io.fetch.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ code: 200, data: { text: 'cloud' } }))));
  vi.stubGlobal('fetch', io.fetch); api = await import('../captureLocalOcrService');
});
afterEach(async () => {
  await api.disposeLocalOcrWorker(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
});
describe('本地 OCR 输入和叶 Worker 错误边界', () => {
  it.each(['', 'data:image/png;base64', 'data:image/png;base64,', 'data:image/png;base64,!', 'data:image/svg+xml;base64,YQ=='])('非法图片 %s 不创建模型', async (data) => {
    await expect(api.recognizeCaptureTextLocally(data, new AbortController().signal)).resolves.toMatchObject({ success: false, code: 'invalidData' });
    expect(io.create).not.toHaveBeenCalled();
  });
  it.each([new Error('recognizer unavailable'), null])('识别拒绝 %s 返回既有失败文案且释放 Worker', async (failure) => {
    worker.recognize.mockRejectedValue(failure);
    await expect(api.recognizeCaptureTextLocally(image, new AbortController().signal)).resolves.toMatchObject({ code: 'ocrFailed', message: failure instanceof Error ? failure.message : '本地文字识别失败' });
    await vi.advanceTimersByTimeAsync(0); expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('模型初始化拒绝不会调用 recognize 或阻塞清理', async () => {
    io.create.mockRejectedValue(new Error('model unavailable'));
    await expect(api.recognizeCaptureTextLocally(image, new AbortController().signal)).resolves.toMatchObject({ code: 'ocrFailed', message: 'model unavailable' });
    await api.disposeLocalOcrWorker(); expect(worker.recognize).not.toHaveBeenCalled();
  });
  it('Worker 未提供文本时仍返回空字符串并共享正常识别流程', async () => {
    worker.recognize.mockResolvedValue({ data: { text: null } });
    await expect(api.recognizeCaptureTextLocally(image, new AbortController().signal)).resolves.toEqual({ success: true, text: '' });
  });
  it('已完成识别先赢得 Promise 竞争时，紧随其后的 dispose 不保留旧空闲计时器', async () => {
    const result = deferred<{ data: { text: unknown } }>(); worker.recognize.mockReturnValue(result.promise);
    const pending = api.recognizeCaptureTextLocally(image, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(0); expect(worker.recognize).toHaveBeenCalledOnce();
    result.resolve({ data: { text: 'complete' } }); const disposed = api.disposeLocalOcrWorker();
    await expect(pending).resolves.toEqual({ success: true, text: 'complete' }); await disposed;
    expect(vi.getTimerCount()).toBe(0); expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it.each([0, 1, 2, 3])('模型完成后 %d 轮微任务取消仍结束等待并清理监听', async (ticks) => {
    const initialized = deferred<WorkerFixture>(); io.create.mockReturnValue(initialized.promise);
    worker.recognize.mockReturnValue(new Promise(() => {}));
    const controller = new AbortController(); const pending = api.recognizeCaptureTextLocally(image, controller.signal);
    await vi.advanceTimersByTimeAsync(0); initialized.resolve(worker);
    await Array.from({ length: ticks }).reduce<Promise<void>>(async (previous) => { await previous; await Promise.resolve(); }, Promise.resolve());
    controller.abort(); await expect(pending).resolves.toMatchObject({ success: false, code: 'ocrTimeout' });
    await vi.advanceTimersByTimeAsync(0); expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
describe('云 OCR 开发环境地址', () => {
  it('模块初始化读取 development 并发送到测试 API', async () => {
    vi.stubEnv('NODE_ENV', 'development'); vi.resetModules();
    const cloud = await import('../captureOcrService');
    await expect(cloud.recognizeCaptureText('fixture-token', image, new AbortController().signal)).resolves.toMatchObject({ success: true, text: 'cloud' });
    expect(io.fetch.mock.calls[0]?.[0]).toBe('https://test.server.pyisland.com/api/v1/toolbox/ocr');
  });
});
