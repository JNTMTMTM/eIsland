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
 * @file imageTranslationService.test.ts
 * @description 图片翻译轮询监听器与响应体取消、超时释放回归测试。
 * @author 鸡哥
 */

import { getEventListeners } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ app: { getVersion: () => 'test' } }));
import { translateCaptureImage } from '../imageTranslationService';

const IMAGE = 'data:image/png;base64,aW1hZ2U=';
const fetchMock = vi.fn();

/**
 * 创建任务状态响应。
 * @param status - 模拟的翻译任务状态。
 * @param resultUrl - 任务完成后的可选图片地址。
 * @returns 包含任务状态 JSON 的 HTTP 响应。
 */
function taskResponse(status: string, resultUrl?: string): Response {
  return new Response(JSON.stringify({ data: { taskId: 'task', status, resultUrl } }), {
    headers: { 'content-type': 'application/json' },
  });
}

describe('image translation resources', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps at most the current poll listener and releases every listener on success', async () => {
    const controller = new AbortController();
    let maxListeners = 0;
    fetchMock.mockImplementation(async () => {
      maxListeners = Math.max(maxListeners, getEventListeners(controller.signal, 'abort').length);
      return fetchMock.mock.calls.length < 20
        ? taskResponse('PROCESSING')
        : taskResponse('SUCCEEDED', IMAGE);
    });
    const pending = translateCaptureImage('token', IMAGE, 'auto', 'zh', controller.signal);
    await vi.advanceTimersByTimeAsync(30_000);
    await expect(pending).resolves.toMatchObject({ success: true, translatedImage: IMAGE });
    expect(maxListeners).toBe(1);
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['abort', 'timeout'])('stops a translated image body download on %s after headers arrive', async (mode) => {
    const controller = new AbortController();
    let bodySignal: AbortSignal | undefined;
    fetchMock
      .mockResolvedValueOnce(taskResponse('PENDING'))
      .mockResolvedValueOnce(taskResponse('SUCCEEDED', 'https://example.com/result.png'))
      .mockImplementationOnce(async (_url, init: RequestInit) => {
        bodySignal = init.signal as AbortSignal;
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'image/png' }),
          arrayBuffer: () => new Promise((_resolve, reject) => {
            bodySignal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
          }),
        };
      });
    const pending = translateCaptureImage('token', IMAGE, 'auto', 'zh', controller.signal);
    await vi.advanceTimersByTimeAsync(1500);
    expect(bodySignal).toBeDefined();
    if (mode === 'abort') controller.abort();
    else await vi.advanceTimersByTimeAsync(30_000);
    await expect(pending).resolves.toMatchObject({ success: false, code: 'aborted' });
    expect(bodySignal!.aborted).toBe(true);
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels during polling without retaining timers or abort listeners', async () => {
    const controller = new AbortController();
    fetchMock.mockResolvedValue(taskResponse('PENDING'));
    const pending = translateCaptureImage('token', IMAGE, 'auto', 'zh', controller.signal);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await expect(pending).resolves.toMatchObject({ code: 'aborted' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
