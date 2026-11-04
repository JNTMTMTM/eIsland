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
 * @file openaiCompatClient.test.ts
 * @description openaiCompatClient 单元测试。
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/* ---------- mock helpers ---------- */

function createMockReq() {
  const req = {
    write: vi.fn(),
    end: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
  };
  // Store 'error' and 'timeout' listeners so tests can invoke them
  const listeners: Record<string, (...args: unknown[]) => void> = {};
  req.on.mockImplementation((event: string, fn: (...args: unknown[]) => void) => {
    listeners[event] = fn;
    return req;
  });
  return { req, listeners };
}

function createMockRes(statusCode = 200) {
  const res = {
    statusCode,
    setEncoding: vi.fn(),
    on: vi.fn(),
  };
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  res.on.mockImplementation((event: string, fn: (...args: unknown[]) => void) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return res;
  });
  return { res, listeners };
}

/* ---------- vi.hoisted + vi.mock for http / https ---------- */

const { httpReqMock, httpsReqMock } = vi.hoisted(() => ({
  httpReqMock: vi.fn(),
  httpsReqMock: vi.fn(),
}));

vi.mock('http', () => ({
  default: { request: httpReqMock },
}));

vi.mock('https', () => ({
  default: { request: httpsReqMock },
}));

/* ---------- import AFTER mocks ---------- */

import { streamOpenAIChat } from '../openaiCompatClient';

/* ---------- tests ---------- */

describe('streamOpenAIChat', () => {
  const baseRequest = {
    model: 'gpt-4o',
    messages: [
      { role: 'system' as const, content: 'You are helpful.' },
      { role: 'user' as const, content: 'Hello' },
    ],
    baseUrl: 'https://api.example.com',
    apiKey: 'test-key',
  };

  beforeEach(() => {
    httpReqMock.mockReset();
    httpsReqMock.mockReset();
  });

  it('uses https module for https:// baseUrl', () => {
    const { req } = createMockReq();
    httpsReqMock.mockReturnValue(req);

    streamOpenAIChat(baseRequest, {});

    expect(httpsReqMock).toHaveBeenCalledOnce();
    expect(httpReqMock).not.toHaveBeenCalled();
  });

  it('uses http module for http:// baseUrl', () => {
    const { req } = createMockReq();
    httpReqMock.mockReturnValue(req);

    streamOpenAIChat({ ...baseRequest, baseUrl: 'http://localhost:8080' }, {});

    expect(httpReqMock).toHaveBeenCalledOnce();
    expect(httpsReqMock).not.toHaveBeenCalled();
  });

  it('includes Authorization header when apiKey is provided', () => {
    const { req } = createMockReq();
    httpsReqMock.mockReturnValue(req);

    streamOpenAIChat(baseRequest, {});

    const opts = httpsReqMock.mock.calls[0][0];
    expect(opts.headers['Authorization']).toBe('Bearer test-key');
  });

  it('omits Authorization header when no apiKey', () => {
    const { req } = createMockReq();
    httpsReqMock.mockReturnValue(req);

    streamOpenAIChat({ ...baseRequest, apiKey: '' }, {});

    const opts = httpsReqMock.mock.calls[0][0];
    expect(opts.headers['Authorization']).toBeUndefined();
  });

  it('sends correct model and messages in request body', () => {
    const { req } = createMockReq();
    httpsReqMock.mockReturnValue(req);

    streamOpenAIChat(baseRequest, {});

    const body: string = req.write.mock.calls[0][0];
    const parsed = JSON.parse(body);
    expect(parsed.model).toBe('gpt-4o');
    expect(parsed.messages).toEqual(baseRequest.messages);
    expect(parsed.stream).toBe(true);
  });

  it('passes optional temperature, top_p, max_tokens in body', () => {
    const { req } = createMockReq();
    httpsReqMock.mockReturnValue(req);

    streamOpenAIChat(
      { ...baseRequest, temperature: 0.7, top_p: 0.9, max_tokens: 1024 },
      {},
    );

    const body: string = req.write.mock.calls[0][0];
    const parsed = JSON.parse(body);
    expect(parsed.temperature).toBe(0.7);
    expect(parsed.top_p).toBe(0.9);
    expect(parsed.max_tokens).toBe(1024);
  });

  it('abort() destroys the underlying request', () => {
    const { req } = createMockReq();
    httpsReqMock.mockReturnValue(req);

    const { abort } = streamOpenAIChat(baseRequest, {});
    abort();

    expect(req.destroy).toHaveBeenCalledOnce();
  });

  it('invokes onChunk and onDone when streaming data arrives', () => {
    const { req } = createMockReq();
    httpsReqMock.mockReturnValue(req);

    const { res, listeners: resListeners } = createMockRes();

    const callbacks = {
      onChunk: vi.fn(),
      onDone: vi.fn(),
    };

    streamOpenAIChat(baseRequest, callbacks);

    // Invoke the response callback captured by the mock
    httpsReqMock.mock.calls[0][1](res);

    // Push a data chunk
    const chunk = JSON.stringify({
      choices: [{ index: 0, delta: { content: 'Hi' }, finish_reason: null }],
    });
    (resListeners['data'] ?? []).forEach((fn) => {
      fn(`data: ${chunk}\n`);
    });

    expect(callbacks.onChunk).toHaveBeenCalledWith('Hi');

    // End the stream
    (resListeners['end'] ?? []).forEach((fn) => {
      fn();
    });

    expect(callbacks.onDone).toHaveBeenCalledWith('Hi', undefined);
  });

  it('invokes onError when API returns 4xx', () => {
    const { req } = createMockReq();
    httpsReqMock.mockReturnValue(req);

    const { res, listeners: resListeners } = createMockRes(401);
    const callbacks = { onError: vi.fn() };

    streamOpenAIChat(baseRequest, callbacks);

    httpsReqMock.mock.calls[0][1](res);

    // Simulate error body
    (resListeners['data'] ?? []).forEach((fn) => {
      fn('Unauthorized');
    });
    (resListeners['end'] ?? []).forEach((fn) => {
      fn();
    });

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('401') }),
    );
  });

  it('invokes onError on request-level error', () => {
    const { req, listeners: reqListeners } = createMockReq();
    httpsReqMock.mockReturnValue(req);

    const callbacks = { onError: vi.fn() };
    streamOpenAIChat(baseRequest, callbacks);

    reqListeners['error'](new Error('ECONNREFUSED'));

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ECONNREFUSED' }),
    );
  });

  it('invokes onError on request timeout', () => {
    const { req, listeners: reqListeners } = createMockReq();
    httpsReqMock.mockReturnValue(req);

    const callbacks = { onError: vi.fn() };
    streamOpenAIChat(baseRequest, callbacks);

    reqListeners['timeout']();

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('超时') }),
    );
    expect(req.destroy).toHaveBeenCalledOnce();
  });
});
