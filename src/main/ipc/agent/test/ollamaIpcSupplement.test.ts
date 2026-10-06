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
 * @file ollamaIpcSupplement.test.ts
 * @description 真实本地与直连编排 IPC 的事件转发、无效消息、窗口异常与取消释放测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerOllamaIpcHandlers } from '../ollamaIpc';
import type { OllamaChatRequest, OllamaStreamCallbacks } from '../ollamaClient';
import type { OpenAIChatRequest, OpenAIStreamCallbacks } from '../openaiCompatClient';
import type { AgentLocalToolRequest, AgentLocalToolResult } from '../localToolIpc';

interface SenderFixture extends EventEmitter {
  isDestroyed: () => boolean;
  send: ReturnType<typeof vi.fn>;
}
type HandlerFixture = (event: { sender: SenderFixture }, ...arguments_: unknown[]) => unknown;
const boundaries = vi.hoisted(() => ({
  handle: vi.fn<(channel: string, handler: HandlerFixture) => void>(),
  ollama: vi.fn<(request: OllamaChatRequest, callbacks: OllamaStreamCallbacks) => { abort: () => void }>(),
  openai: vi.fn<(request: OpenAIChatRequest, callbacks: OpenAIStreamCallbacks) => { abort: () => void }>(),
  ping: vi.fn<(baseUrl?: string) => Promise<boolean>>(),
  models: vi.fn<(baseUrl?: string) => Promise<string[]>>(),
  detect: vi.fn<() => Promise<string | null>>(),
}));
vi.mock('electron', () => ({ ipcMain: { handle: boundaries.handle } }));
vi.mock('../ollamaClient', () => ({
  streamOllamaChat: boundaries.ollama,
  pingOllama: boundaries.ping,
  listOllamaModels: boundaries.models,
  detectOllamaBaseUrl: boundaries.detect,
}));
vi.mock('../openaiCompatClient', () => ({ streamOpenAIChat: boundaries.openai }));

/**
 * 等待编排器完成和 IPC finally 释放生命周期。
 * @returns 异步完成信号。
 */
async function settle(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

/**
 * 使用真实 IPC 与真实编排器，隔离 HTTP 叶接口。
 * @param provider - 运行提供方。
 * @returns 已注册处理器及窗口对象。
 */
function fixture(provider: 'ollama' | 'customDirect') {
  const handlers = new Map<string, HandlerFixture>();
  boundaries.handle.mockImplementation((channel, handler) => handlers.set(channel, handler));
  const executeAgentLocalTool = vi.fn<(request: AgentLocalToolRequest) => Promise<AgentLocalToolResult>>();
  registerOllamaIpcHandlers({ executeAgentLocalTool });
  const sender: SenderFixture = Object.assign(new EventEmitter(), { isDestroyed: () => false, send: vi.fn() });
  const event = { sender };
  const request = { model: 'fixture', systemPrompt: 'fixture-system', userMessage: 'question', baseUrl: 'http://fixture.test', apiKey: '' };
  const start = handlers.get(`${provider}:chat:start`);
  const abort = handlers.get(`${provider}:chat:abort`);
  return { sender, event, request, start, abort, handlers };
}

beforeEach(() => {
  vi.resetAllMocks();
  boundaries.ollama.mockImplementation((request, callbacks) => {
    void request;
    callbacks.onChunk?.('answer');
    callbacks.onDone?.('answer');
    return { abort() {} };
  });
  boundaries.openai.mockImplementation((request, callbacks) => {
    void request;
    callbacks.onChunk?.('answer');
    callbacks.onDone?.('answer');
    return { abort() {} };
  });
});

describe.each(['ollama', 'customDirect'] as const)('%s IPC 编排真实调用链', (provider) => {
  it('成功事件转发到对应会话频道并 finally 释放窗口订阅', async () => {
    const state = fixture(provider);
    expect(state.start?.(state.event, 'fixture-success', state.request)).toEqual({ started: true, sessionId: 'fixture-success' });
    await settle();
    expect(state.sender.send).toHaveBeenCalledWith(`${provider}:chat:event:fixture-success`, expect.objectContaining({ type: 'chunk' }));
    expect(state.sender.send).toHaveBeenCalledWith(`${provider}:chat:event:fixture-success`, expect.objectContaining({ type: 'final' }));
    expect(state.sender.listenerCount('destroyed')).toBe(0);
    expect(state.abort?.(state.event, 'fixture-success')).toEqual({ aborted: false });
  });

  it('已销毁窗口不接收任何事件', async () => {
    const state = fixture(provider);
    state.sender.isDestroyed = () => true;
    state.start?.(state.event, 'fixture-destroyed', state.request);
    await settle();
    expect(state.sender.send).not.toHaveBeenCalled();
    expect(state.sender.listenerCount('destroyed')).toBe(0);
  });

  it('窗口发送异常不影响真实编排收尾', async () => {
    const state = fixture(provider);
    state.sender.send.mockImplementation(() => { throw new Error('window gone'); });
    state.start?.(state.event, 'fixture-send-error', state.request);
    await settle();
    expect(state.sender.send).toHaveBeenCalled();
    expect(state.sender.listenerCount('destroyed')).toBe(0);
  });

  it.each(['open', 'destroyed', 'throwing'] as const)('非法 IPC 用户消息在窗口 %s 时正确处理编排拒绝', async (mode) => {
    const state = fixture(provider);
    state.sender.isDestroyed = () => mode === 'destroyed';
    if (mode === 'throwing') state.sender.send.mockImplementation(() => { throw new Error('sender failure'); });
    state.start?.(state.event, `fixture-invalid-${mode}`, { ...state.request, userMessage: 42 });
    await settle();
    if (mode === 'open') {
      expect(state.sender.send).toHaveBeenCalledWith(`${provider}:chat:event:fixture-invalid-${mode}`, {
        type: 'error', payload: { code: 'ORCHESTRATOR_ERROR', message: 'userMessage.trim is not a function' },
      });
    } else if (mode === 'destroyed') expect(state.sender.send).not.toHaveBeenCalled();
    expect(state.sender.listenerCount('destroyed')).toBe(0);
  });

  it('显式取消释放挂起请求且再次取消返回 false', async () => {
    const state = fixture(provider);
    boundaries.ollama.mockImplementation((request, callbacks) => {
      request.signal?.addEventListener('abort', () => callbacks.onError?.(new DOMException('cancel', 'AbortError')), { once: true });
      return { abort() {} };
    });
    boundaries.openai.mockImplementation((request, callbacks) => {
      request.signal?.addEventListener('abort', () => callbacks.onError?.(new DOMException('cancel', 'AbortError')), { once: true });
      return { abort() {} };
    });
    state.start?.(state.event, 'fixture-cancel', state.request);
    expect(state.abort?.(state.event, 'fixture-cancel')).toEqual({ aborted: true });
    expect(state.abort?.(state.event, 'fixture-cancel')).toEqual({ aborted: false });
    await settle();
    expect(state.sender.listenerCount('destroyed')).toBe(0);
  });
});
