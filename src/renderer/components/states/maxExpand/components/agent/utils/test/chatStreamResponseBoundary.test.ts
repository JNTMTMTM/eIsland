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
 * @file chatStreamResponseBoundary.test.ts
 * @description 真实聊天流读取 HTTP 错误正文失败后的状态及消息回退测试。
 * @author 鸡哥
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { streamChatCompletion } from '../chatUtils';
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('chat stream native response boundary', () => {
  it('an HTTP error whose native body stream fails still reports status and statusText', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error('body connection lost'));
      }
    });
    const response = new Response(body, {
      status: 503,
      statusText: 'Service Unavailable'
    });
    const request = vi.fn<typeof fetch>().mockResolvedValue(response);
    vi.stubGlobal('fetch', request);
    await expect(streamChatCompletion('https://example.invalid/', 'secret', 'model', [{
      role: 'user',
      content: 'question'
    }], vi.fn(), new AbortController().signal, {
      apiRequestFailed: 'status={{status}} detail={{detail}}',
      cannotReadResponseStream: 'no stream'
    })).rejects.toThrow('status=503 detail=Service Unavailable');
    expect(request.mock.calls[0]?.[0]).toBe('https://example.invalid/chat/completions');
    expect(request.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(new Headers(request.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe('Bearer secret');
  });
});
