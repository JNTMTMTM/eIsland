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
 * @file chatClientProtocolSupplement.test.ts
 * @description Ollama/OpenAI 真实流解析的尾帧、失败、取消、可选回调与 HTTP 路径协议测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listOllamaModels, pingOllama, streamOllamaChat } from '../ollamaClient';
import { streamOpenAIChat } from '../openaiCompatClient';

interface ResponseFixture extends EventEmitter {
  statusCode: number;
  setEncoding: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
}
interface RequestFixture extends EventEmitter {
  write: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}
interface RequestOptionsFixture {
  port: string;
  path: string;
  headers?: Record<string, string>;
}
const network = vi.hoisted(() => ({
  request: vi.fn<(options: RequestOptionsFixture, callback: (response: ResponseFixture) => void) => RequestFixture>(),
}));
vi.mock('http', () => ({ default: { request: network.request } }));
vi.mock('https', () => ({ default: { request: network.request } }));

/**
 * 记录 HTTP 请求并提供由测试驱动的真实事件边界。
 * @param statusCode - HTTP 响应状态。
 * @returns 请求响应对象。
 */
function networkFixture(statusCode = 200): { request: RequestFixture; response: ResponseFixture } {
  const request = Object.assign(new EventEmitter(), { write: vi.fn(), end: vi.fn(), destroy: vi.fn() });
  const response = Object.assign(new EventEmitter(), { statusCode, setEncoding: vi.fn(), resume: vi.fn() });
  network.request.mockReturnValue(request);
  return { request, response };
}

beforeEach(() => vi.resetAllMocks());

describe.each(['ollama', 'openai'] as const)('%s 客户端真实流解析边界', (provider) => {
  /**
   * 启动真实客户端，HTTP response 事件在调用栈结束后手动送达。
   * @param status - HTTP 状态。
   * @param baseUrl - 请求地址。
   * @param stream - 是否流式请求。
   * @returns 回调、控制器与网络事件边界。
   */
  function start(status = 200, baseUrl = 'http://fixture.test', stream = true) {
    const fixture = networkFixture(status);
    const controller = new AbortController();
    const onChunk = vi.fn();
    const onThinkChunk = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn<(error: Error) => void>();
    const callbacks = { onChunk, onThinkChunk, onDone, onError };
    const options = { baseUrl, stream, signal: controller.signal, apiKey: '', model: 'fixture', messages: [] };
    const handle = provider === 'ollama' ? streamOllamaChat(options, callbacks) : streamOpenAIChat(options, callbacks);
    network.request.mock.calls[0]?.[1](fixture.response);
    return { controller, handle, ...fixture, ...callbacks };
  }

  it.each([
    ['data: {"choices":[{"delta":{"content":"tail","reasoning_content":"thinking"}}],"usage":{"prompt_tokens":1,"completion_tokens":2}}', 'tail', true],
    ['{"choices":[{"delta":{"content":"tail"}}]}', 'tail', false],
    ['{"choices":[]}', '', false],
    ['{"choices":[{}]}', '', false],
    ['{}', '', false],
    ['{"choices":[{"delta":{"content":"","reasoning_content":""}}]}', '', false],
    ['[DONE]', '', false],
    ['data: [DONE]', '', false],
    ['not-json', '', false],
    ['   ', '', false],
  ])('无换行末尾帧 %s 按数据和结束标记处理', (frame, text, usage) => {
    const fixture = start();
    fixture.response.emit('data', frame);
    fixture.response.emit('end');
    expect(fixture.onDone).toHaveBeenCalledExactlyOnceWith(text, usage ? { prompt_tokens: 1, completion_tokens: 2 } : undefined);
    expect(fixture.onChunk.mock.calls.flat()).toEqual(text ? [text] : []);
    if (provider === 'openai' && usage) expect(fixture.onThinkChunk).toHaveBeenCalledExactlyOnceWith('thinking');
    expect(fixture.onError).not.toHaveBeenCalled();
  });

  it('空行、原始 JSON、usage 和 finish_reason 可共存', () => {
    const fixture = start();
    fixture.response.emit('data', '\n  \n{"usage":{"prompt_tokens":3},"choices":[{"delta":{"reasoning_content":"why"},"finish_reason":"stop"}]}\n{}\n[ DONE ]\ndata: [DONE]\n');
    fixture.response.emit('end');
    expect(fixture.onDone).toHaveBeenCalledExactlyOnceWith('', { prompt_tokens: 3 });
    if (provider === 'openai') expect(fixture.onThinkChunk).toHaveBeenCalledExactlyOnceWith('why');
    expect(fixture.onChunk).not.toHaveBeenCalled();
  });

  it('数据帧跨 HTTP 块拼接且终止后重复数据忽略', () => {
    const fixture = start();
    fixture.response.emit('data', 'data: {"choices":[{"delta":{"con');
    fixture.response.emit('data', 'tent":"joined"}}]}\n');
    fixture.response.emit('end');
    fixture.response.emit('data', 'data: {"choices":[{"delta":{"content":"late"}}]}\n');
    fixture.response.emit('end');
    fixture.handle.abort();
    expect(fixture.onChunk).toHaveBeenCalledExactlyOnceWith('joined');
    expect(fixture.onDone).toHaveBeenCalledTimes(1);
    expect(fixture.request.destroy).not.toHaveBeenCalled();
  });

  it.each(['', 'failure details'])('错误 HTTP 响应正文 %s 选择具体文本或默认错误', (body) => {
    const fixture = start(503);
    if (body) fixture.response.emit('data', body);
    fixture.response.emit('end');
    fixture.request.emit('error', new Error('later'));
    expect(fixture.onError).toHaveBeenCalledTimes(1);
    expect(fixture.onError.mock.calls[0]?.[0].message).toContain(body || 'unknown error');
    expect(fixture.onDone).not.toHaveBeenCalled();
  });

  it('取消时移除 signal 订阅且后续终止事件只结算一次', () => {
    const fixture = start();
    fixture.controller.abort();
    fixture.response.emit('data', 'data: {"choices":[{"delta":{"content":"late"}}]}\n');
    fixture.response.emit('end');
    fixture.handle.abort();
    expect(fixture.onError.mock.calls[0]?.[0]).toMatchObject({ name: 'AbortError' });
    expect(fixture.onError).toHaveBeenCalledTimes(1);
    expect(fixture.request.destroy).toHaveBeenCalledTimes(1);
    expect(fixture.onDone).not.toHaveBeenCalled();
  });

  it('不传可选回调仍可处理内容、思考、用量与结束', () => {
    const fixture = networkFixture();
    const options = { baseUrl: 'http://fixture.test', apiKey: '', model: 'fixture', messages: [] };
    const handle = provider === 'ollama' ? streamOllamaChat(options, {}) : streamOpenAIChat(options, {});
    network.request.mock.calls[0]?.[1](fixture.response);
    expect(() => {
      fixture.response.emit('data', '{"usage":{},"choices":[{"delta":{"content":"text","reasoning_content":"why"}}]}\n');
      fixture.response.emit('end');
      handle.abort();
    }).not.toThrow();
  });
});

describe('请求端口、路径与模型字段', () => {
  it('Ollama ping 无端口使用默认值', async () => {
    const fixture = networkFixture();
    const pending = pingOllama('http://fixture.test');
    network.request.mock.calls[0]?.[1](fixture.response);
    await expect(pending).resolves.toBe(true);
    expect(network.request.mock.calls[0]?.[0].port).toBe('11434');
  });
  it('Ollama 模型列表无端口使用默认值并过滤无 name 项', async () => {
    const fixture = networkFixture();
    const pending = listOllamaModels('http://fixture.test');
    network.request.mock.calls[0]?.[1](fixture.response);
    fixture.response.emit('data', '{"models":[{},{"name":""},{"name":"fixture"}]}');
    fixture.response.emit('end');
    await expect(pending).resolves.toEqual(['fixture']);
    expect(network.request.mock.calls[0]?.[0].port).toBe('11434');
  });
  it('Ollama 清单缺少 models 时返回空列表', async () => {
    const fixture = networkFixture();
    const pending = listOllamaModels();
    network.request.mock.calls[0]?.[1](fixture.response);
    fixture.response.emit('data', '{}');
    fixture.response.emit('end');
    await expect(pending).resolves.toEqual([]);
  });
  it.each([
    ['https://fixture.test/v1/', '/v1/chat/completions', '443'],
    ['http://fixture.test/v1/chat/completions/', '/v1/chat/completions', '80'],
    ['https://fixture.test:8443/custom', '/custom/v1/chat/completions', '8443'],
  ])('OpenAI 地址 %s 规范路径与端口', (baseUrl, path, port) => {
    const fixture = networkFixture();
    streamOpenAIChat({ baseUrl, apiKey: '', model: 'fixture', messages: [], stream: false }, {});
    expect(network.request.mock.calls[0]?.[0]).toMatchObject({ path, port });
    expect(JSON.parse(String(fixture.request.write.mock.calls[0]?.[0]))).toMatchObject({ stream: false });
    expect(JSON.parse(String(fixture.request.write.mock.calls[0]?.[0]))).not.toHaveProperty('stream_options');
    network.request.mock.calls[0]?.[1](fixture.response);
    fixture.response.emit('end');
  });
});
