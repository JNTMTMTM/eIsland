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
 * @file chatClientResources.test.ts
 * @description AI 流式请求多轮复用信号、取消结算及监听器清理回归测试。
 * @author 鸡哥
 */

import { EventEmitter, getEventListeners } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock('http', () => ({ default: { request: requestMock } }));
vi.mock('https', () => ({ default: { request: requestMock } }));

import { streamOllamaChat, chatOllama } from '../ollamaClient';
import { streamOpenAIChat } from '../openaiCompatClient';

describe.each([
  ['Ollama', streamOllamaChat],
  ['OpenAI compatible', streamOpenAIChat],
] as const)('%s stream lifecycle', (_name, streamChat) => {
  let req: EventEmitter & { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
  let res: EventEmitter & { statusCode: number; setEncoding: ReturnType<typeof vi.fn> };
  const request = { model: 'model', messages: [{ role: 'user' as const, content: 'hello' }], baseUrl: 'http://localhost:11434', apiKey: '' };

  beforeEach(() => {
    req = Object.assign(new EventEmitter(), { write: vi.fn(), end: vi.fn(), destroy: vi.fn() });
    res = Object.assign(new EventEmitter(), { statusCode: 200, setEncoding: vi.fn() });
    requestMock.mockReset().mockReturnValue(req);
  });

  it('does not retain completed requests across many turns using the same abort signal', () => {
    const controller = new AbortController();
    for (let turn = 0; turn < 40; turn++) {
      req = Object.assign(new EventEmitter(), { write: vi.fn(), end: vi.fn(), destroy: vi.fn() });
      res = Object.assign(new EventEmitter(), { statusCode: 200, setEncoding: vi.fn() });
      requestMock.mockReturnValue(req);
      const done = vi.fn();
      streamChat({ ...request, signal: controller.signal }, { onDone: done });
      requestMock.mock.lastCall![1](res);
      expect(getEventListeners(controller.signal, 'abort')).toHaveLength(1);
      res.emit('data', 'data: {"choices":[{"delta":{"content":"hello"}}]}\n');
      res.emit('end');
      expect(done).toHaveBeenCalledWith('hello', undefined);
      expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
    }
  });

  it.each(['error', 'timeout', 'aborted', 'abort'])('releases signal references and reports %s only once', (event) => {
    const controller = new AbortController();
    const onError = vi.fn();
    const onDone = vi.fn();
    streamChat({ ...request, signal: controller.signal }, { onError, onDone });
    requestMock.mock.lastCall![1](res);
    if (event === 'abort') controller.abort();
    else if (event === 'aborted') res.emit('aborted');
    else req.emit(event, new Error('broken'));
    req.emit('error', new Error('later'));
    res.emit('end');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
  });

  it('does not send an already canceled request', () => {
    const controller = new AbortController();
    controller.abort();
    const onError = vi.fn();
    streamChat({ ...request, signal: controller.signal }, { onError });
    expect(req.write).not.toHaveBeenCalled();
    expect(req.destroy).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ name: 'AbortError' }));
  });
});

it('settles the Ollama promise on abort so the caller can release conversation data', async () => {
  const req = Object.assign(new EventEmitter(), { write: vi.fn(), end: vi.fn(), destroy: vi.fn() });
  requestMock.mockReturnValue(req);
  const controller = new AbortController();
  const pending = chatOllama({ model: 'model', messages: [], signal: controller.signal });
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});
