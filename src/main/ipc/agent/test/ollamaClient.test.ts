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
 * @file ollamaClient.test.ts
 * @description ollamaClient 单元测试。
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
    resume: vi.fn(),
  };
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  res.on.mockImplementation((event: string, fn: (...args: unknown[]) => void) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return res;
  });
  return { res, listeners };
}

/* ---------- vi.hoisted + vi.mock for http ---------- */

const { httpReqMock } = vi.hoisted(() => ({
  httpReqMock: vi.fn(),
}));

vi.mock('http', () => ({
  default: { request: httpReqMock },
}));

/* ---------- import AFTER mocks ---------- */

import {
  pingOllama,
  detectOllamaBaseUrl,
  listOllamaModels,
  streamOllamaChat,
  chatOllama,
} from '../ollamaClient';

/* ---------- tests ---------- */

describe('pingOllama', () => {
  beforeEach(() => {
    httpReqMock.mockReset();
  });

  it('returns true for 200 status', async () => {
    const { req, listeners: reqListeners } = createMockReq();
    httpReqMock.mockReturnValue(req);

    // Simulate successful response
    httpReqMock.mockImplementation(
      (_opts: unknown, cb: (res: ReturnType<typeof createMockRes>['res']) => void) => {
        const { res } = createMockRes(200);
        cb(res);
        return req;
      },
    );

    const result = await pingOllama();
    expect(result).toBe(true);
  });

  it('returns false for non-200 status', async () => {
    const { req } = createMockReq();
    httpReqMock.mockReturnValue(req);

    httpReqMock.mockImplementation(
      (_opts: unknown, cb: (res: ReturnType<typeof createMockRes>['res']) => void) => {
        const { res } = createMockRes(404);
        cb(res);
        return req;
      },
    );

    const result = await pingOllama();
    expect(result).toBe(false);
  });

  it('returns false on network error', async () => {
    const { req, listeners: reqListeners } = createMockReq();
    httpReqMock.mockReturnValue(req);

    // Fire error listener asynchronously
    setTimeout(() => {
      reqListeners['error'](new Error('ECONNREFUSED'));
    }, 0);

    const result = await pingOllama();
    expect(result).toBe(false);
  });

  it('returns false on timeout', async () => {
    const { req, listeners: reqListeners } = createMockReq();
    httpReqMock.mockReturnValue(req);

    setTimeout(() => {
      reqListeners['timeout']();
    }, 0);

    const result = await pingOllama();
    expect(result).toBe(false);
    expect(req.destroy).toHaveBeenCalledOnce();
  });

  it('uses default base URL when none provided', async () => {
    const { req } = createMockReq();
    httpReqMock.mockImplementation(
      (opts: { hostname: string; port: string }, cb: (res: ReturnType<typeof createMockRes>['res']) => void) => {
        const { res } = createMockRes(200);
        cb(res);
        expect(opts.hostname).toBe('localhost');
        expect(opts.port).toBe('11434');
        return req;
      },
    );

    await pingOllama();
  });

  it('uses custom base URL when provided', async () => {
    const { req } = createMockReq();
    httpReqMock.mockImplementation(
      (opts: { hostname: string; port: string }, cb: (res: ReturnType<typeof createMockRes>['res']) => void) => {
        const { res } = createMockRes(200);
        cb(res);
        expect(opts.hostname).toBe('192.168.1.1');
        expect(opts.port).toBe('9999');
        return req;
      },
    );

    await pingOllama('http://192.168.1.1:9999');
  });
});

describe('detectOllamaBaseUrl', () => {
  beforeEach(() => {
    httpReqMock.mockReset();
  });

  it('returns first available base URL', async () => {
    // First candidate succeeds
    httpReqMock.mockImplementationOnce(
      (_opts: unknown, cb: (res: ReturnType<typeof createMockRes>['res']) => void) => {
        const { req } = createMockReq();
        const { res } = createMockRes(200);
        cb(res);
        return req;
      },
    );

    const result = await detectOllamaBaseUrl();
    expect(result).toBe('http://localhost:11434');
  });

  it('skips failed candidates and returns the first that works', async () => {
    let callCount = 0;
    httpReqMock.mockImplementation(
      (_opts: unknown, cb: (res: ReturnType<typeof createMockRes>['res']) => void) => {
        const { req, listeners: reqListeners } = createMockReq();
        callCount++;
        if (callCount <= 2) {
          // First two candidates fail
          setTimeout(() => reqListeners['error'](new Error('fail')), 0);
        } else {
          // Third candidate succeeds
          const { res } = createMockRes(200);
          cb(res);
        }
        return req;
      },
    );

    const result = await detectOllamaBaseUrl();
    expect(result).toBe('http://localhost:11435');
  });

  it('returns null when none are available', async () => {
    httpReqMock.mockImplementation(
      (_opts: unknown, _cb: unknown) => {
        const { req, listeners: reqListeners } = createMockReq();
        setTimeout(() => reqListeners['error'](new Error('fail')), 0);
        return req;
      },
    );

    const result = await detectOllamaBaseUrl();
    expect(result).toBeNull();
  });
});

describe('listOllamaModels', () => {
  beforeEach(() => {
    httpReqMock.mockReset();
  });

  it('returns model names from response', async () => {
    const { req } = createMockReq();

    httpReqMock.mockImplementation(
      (_opts: unknown, cb: (res: ReturnType<typeof createMockRes>['res']) => void) => {
        const { res, listeners: resListeners } = createMockRes(200);
        cb(res);

        const body = JSON.stringify({
          models: [
            { name: 'llama3:latest' },
            { name: 'mistral:7b' },
            { name: '' },
          ],
        });
        setTimeout(() => {
          (resListeners['data'] ?? []).forEach((fn) => fn(body));
          (resListeners['end'] ?? []).forEach((fn) => fn());
        }, 0);

        return req;
      },
    );

    const result = await listOllamaModels();
    expect(result).toEqual(['llama3:latest', 'mistral:7b']);
  });

  it('returns empty array when models list is empty', async () => {
    const { req } = createMockReq();

    httpReqMock.mockImplementation(
      (_opts: unknown, cb: (res: ReturnType<typeof createMockRes>['res']) => void) => {
        const { res, listeners: resListeners } = createMockRes(200);
        cb(res);

        setTimeout(() => {
          (resListeners['data'] ?? []).forEach((fn) => fn(JSON.stringify({ models: [] })));
          (resListeners['end'] ?? []).forEach((fn) => fn());
        }, 0);

        return req;
      },
    );

    const result = await listOllamaModels();
    expect(result).toEqual([]);
  });

  it('rejects on JSON parse error', async () => {
    const { req } = createMockReq();

    httpReqMock.mockImplementation(
      (_opts: unknown, cb: (res: ReturnType<typeof createMockRes>['res']) => void) => {
        const { res, listeners: resListeners } = createMockRes(200);
        cb(res);

        setTimeout(() => {
          (resListeners['data'] ?? []).forEach((fn) => fn('not valid json{{{'));
          (resListeners['end'] ?? []).forEach((fn) => fn());
        }, 0);

        return req;
      },
    );

    await expect(listOllamaModels()).rejects.toThrow('解析 Ollama 模型列表失败');
  });

  it('rejects on network error', async () => {
    const { req, listeners: reqListeners } = createMockReq();
    httpReqMock.mockReturnValue(req);

    setTimeout(() => {
      reqListeners['error'](new Error('ECONNREFUSED'));
    }, 0);

    await expect(listOllamaModels()).rejects.toThrow('ECONNREFUSED');
  });

  it('rejects on timeout', async () => {
    const { req, listeners: reqListeners } = createMockReq();
    httpReqMock.mockReturnValue(req);

    setTimeout(() => {
      reqListeners['timeout']();
    }, 0);

    await expect(listOllamaModels()).rejects.toThrow('获取 Ollama 模型列表超时');
    expect(req.destroy).toHaveBeenCalledOnce();
  });
});

describe('streamOllamaChat', () => {
  beforeEach(() => {
    httpReqMock.mockReset();
  });

  const baseRequest = {
    model: 'llama3',
    messages: [
      { role: 'system' as const, content: 'You are helpful.' },
      { role: 'user' as const, content: 'Hello' },
    ],
    baseUrl: 'http://localhost:11434',
  };

  it('sends correct model and messages in request body', () => {
    const { req } = createMockReq();
    httpReqMock.mockReturnValue(req);

    streamOllamaChat(baseRequest, {});

    const body: string = req.write.mock.calls[0][0];
    const parsed = JSON.parse(body);
    expect(parsed.model).toBe('llama3');
    expect(parsed.messages).toEqual(baseRequest.messages);
    expect(parsed.stream).toBe(true);
  });

  it('passes optional temperature, top_p, max_tokens in body', () => {
    const { req } = createMockReq();
    httpReqMock.mockReturnValue(req);

    streamOllamaChat(
      { ...baseRequest, temperature: 0.8, top_p: 0.95, max_tokens: 512 },
      {},
    );

    const body: string = req.write.mock.calls[0][0];
    const parsed = JSON.parse(body);
    expect(parsed.temperature).toBe(0.8);
    expect(parsed.top_p).toBe(0.95);
    expect(parsed.max_tokens).toBe(512);
  });

  it('uses POST method and correct path', () => {
    const { req } = createMockReq();
    httpReqMock.mockImplementation(
      (opts: { method: string; path: string; hostname: string; port: string }) => {
        expect(opts.method).toBe('POST');
        expect(opts.path).toBe('/v1/chat/completions');
        expect(opts.hostname).toBe('localhost');
        expect(opts.port).toBe('11434');
        return req;
      },
    );

    streamOllamaChat(baseRequest, {});
  });

  it('abort() destroys the underlying request', () => {
    const { req } = createMockReq();
    httpReqMock.mockReturnValue(req);

    const { abort } = streamOllamaChat(baseRequest, {});
    abort();

    expect(req.destroy).toHaveBeenCalledOnce();
  });

  it('invokes onChunk and onDone when streaming data arrives', () => {
    const { req } = createMockReq();
    httpReqMock.mockReturnValue(req);

    const { res, listeners: resListeners } = createMockRes(200);

    const callbacks = {
      onChunk: vi.fn(),
      onDone: vi.fn(),
    };

    streamOllamaChat(baseRequest, callbacks);

    // Invoke the response callback captured by the mock
    httpReqMock.mock.calls[0][1](res);

    // Push a data chunk
    const chunk = JSON.stringify({
      choices: [{ index: 0, delta: { content: 'Hello' }, finish_reason: null }],
    });
    (resListeners['data'] ?? []).forEach((fn) => {
      fn(`data: ${chunk}\n`);
    });

    expect(callbacks.onChunk).toHaveBeenCalledWith('Hello');

    // End the stream
    (resListeners['end'] ?? []).forEach((fn) => {
      fn();
    });

    expect(callbacks.onDone).toHaveBeenCalledWith('Hello', undefined);
  });

  it('accumulates multiple chunks and reports full text on done', () => {
    const { req } = createMockReq();
    httpReqMock.mockReturnValue(req);

    const { res, listeners: resListeners } = createMockRes(200);

    const callbacks = {
      onChunk: vi.fn(),
      onDone: vi.fn(),
    };

    streamOllamaChat(baseRequest, callbacks);

    httpReqMock.mock.calls[0][1](res);

    const chunk1 = JSON.stringify({
      choices: [{ index: 0, delta: { content: 'Hi ' }, finish_reason: null }],
    });
    const chunk2 = JSON.stringify({
      choices: [{ index: 0, delta: { content: 'there' }, finish_reason: null }],
    });

    (resListeners['data'] ?? []).forEach((fn) => fn(`data: ${chunk1}\ndata: ${chunk2}\n`));

    expect(callbacks.onChunk).toHaveBeenCalledTimes(2);
    expect(callbacks.onChunk).toHaveBeenNthCalledWith(1, 'Hi ');
    expect(callbacks.onChunk).toHaveBeenNthCalledWith(2, 'there');

    (resListeners['end'] ?? []).forEach((fn) => fn());

    expect(callbacks.onDone).toHaveBeenCalledWith('Hi there', undefined);
  });

  it('captures usage from stream chunks', () => {
    const { req } = createMockReq();
    httpReqMock.mockReturnValue(req);

    const { res, listeners: resListeners } = createMockRes(200);

    const callbacks = {
      onChunk: vi.fn(),
      onDone: vi.fn(),
    };

    streamOllamaChat(baseRequest, callbacks);

    httpReqMock.mock.calls[0][1](res);

    const usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 };
    const chunk = JSON.stringify({
      choices: [{ index: 0, delta: { content: 'ok' }, finish_reason: null }],
      usage,
    });

    (resListeners['data'] ?? []).forEach((fn) => fn(`data: ${chunk}\n`));
    (resListeners['end'] ?? []).forEach((fn) => fn());

    expect(callbacks.onDone).toHaveBeenCalledWith('ok', usage);
  });

  it('skips [DONE] sentinel lines', () => {
    const { req } = createMockReq();
    httpReqMock.mockReturnValue(req);

    const { res, listeners: resListeners } = createMockRes(200);

    const callbacks = {
      onChunk: vi.fn(),
      onDone: vi.fn(),
    };

    streamOllamaChat(baseRequest, callbacks);

    httpReqMock.mock.calls[0][1](res);

    const chunk = JSON.stringify({
      choices: [{ index: 0, delta: { content: 'hi' }, finish_reason: null }],
    });

    (resListeners['data'] ?? []).forEach((fn) => {
      fn(`data: ${chunk}\ndata: [DONE]\n`);
    });
    (resListeners['end'] ?? []).forEach((fn) => fn());

    expect(callbacks.onChunk).toHaveBeenCalledOnce();
    expect(callbacks.onDone).toHaveBeenCalledWith('hi', undefined);
  });

  it('invokes onError when API returns 4xx', () => {
    const { req } = createMockReq();
    httpReqMock.mockReturnValue(req);

    const { res, listeners: resListeners } = createMockRes(500);
    const callbacks = { onError: vi.fn() };

    streamOllamaChat(baseRequest, callbacks);

    httpReqMock.mock.calls[0][1](res);

    (resListeners['data'] ?? []).forEach((fn) => fn('Internal Server Error'));
    (resListeners['end'] ?? []).forEach((fn) => fn());

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('500') }),
    );
  });

  it('invokes onError on request-level error', () => {
    const { req, listeners: reqListeners } = createMockReq();
    httpReqMock.mockReturnValue(req);

    const callbacks = { onError: vi.fn() };
    streamOllamaChat(baseRequest, callbacks);

    reqListeners['error'](new Error('ECONNREFUSED'));

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ECONNREFUSED' }),
    );
  });

  it('invokes onError on request timeout', () => {
    const { req, listeners: reqListeners } = createMockReq();
    httpReqMock.mockReturnValue(req);

    const callbacks = { onError: vi.fn() };
    streamOllamaChat(baseRequest, callbacks);

    reqListeners['timeout']();

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('超时') }),
    );
    expect(req.destroy).toHaveBeenCalledOnce();
  });

  it('does not invoke callbacks after abort', () => {
    const { req } = createMockReq();
    httpReqMock.mockReturnValue(req);

    const { res, listeners: resListeners } = createMockRes(200);

    const callbacks = {
      onChunk: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    };

    const { abort } = streamOllamaChat(baseRequest, callbacks);

    httpReqMock.mock.calls[0][1](res);

    // Abort before sending data
    abort();

    const chunk = JSON.stringify({
      choices: [{ index: 0, delta: { content: 'ignored' }, finish_reason: null }],
    });
    (resListeners['data'] ?? []).forEach((fn) => fn(`data: ${chunk}\n`));
    (resListeners['end'] ?? []).forEach((fn) => fn());

    expect(callbacks.onChunk).not.toHaveBeenCalled();
    expect(callbacks.onDone).not.toHaveBeenCalled();
  });
});

describe('chatOllama', () => {
  beforeEach(() => {
    httpReqMock.mockReset();
  });

  const baseRequest = {
    model: 'llama3',
    messages: [
      { role: 'user' as const, content: 'Hello' },
    ],
    baseUrl: 'http://localhost:11434',
  };

  it('resolves with text and usage on success', async () => {
    const { req } = createMockReq();
    httpReqMock.mockReturnValue(req);

    const { res, listeners: resListeners } = createMockRes(200);

    // Capture the callback passed to streamOllamaChat
    httpReqMock.mockImplementation(
      (_opts: unknown, cb: (res: ReturnType<typeof createMockRes>['res']) => void) => {
        cb(res);
        return req;
      },
    );

    const promise = chatOllama(baseRequest);

    const usage = { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 };
    const chunk = JSON.stringify({
      choices: [{ index: 0, delta: { content: 'Hi!' }, finish_reason: null }],
      usage,
    });

    (resListeners['data'] ?? []).forEach((fn) => fn(`data: ${chunk}\n`));
    (resListeners['end'] ?? []).forEach((fn) => fn());

    const result = await promise;
    expect(result.text).toBe('Hi!');
    expect(result.usage).toEqual(usage);
  });

  it('rejects on error', async () => {
    const { req, listeners: reqListeners } = createMockReq();
    httpReqMock.mockReturnValue(req);

    const promise = chatOllama(baseRequest);

    reqListeners['error'](new Error('ECONNREFUSED'));

    await expect(promise).rejects.toThrow('ECONNREFUSED');
  });

  it('sets stream to false in the underlying request', () => {
    const { req } = createMockReq();
    httpReqMock.mockReturnValue(req);

    chatOllama(baseRequest);

    const body: string = req.write.mock.calls[0][0];
    const parsed = JSON.parse(body);
    expect(parsed.stream).toBe(false);
  });
});
