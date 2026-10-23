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
 * @file customDirectAgent.test.ts
 * @description 自定义 API 直连 Agent 单元测试
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  hoisted mocks                                                     */
/* ------------------------------------------------------------------ */

const { mockFetchAgentPrompt, mockOnCustomDirectChatEvent, mockCustomDirectChatAbort, mockCustomDirectChatStart } = vi.hoisted(() => ({
  mockFetchAgentPrompt: vi.fn(),
  mockOnCustomDirectChatEvent: vi.fn(),
  mockCustomDirectChatAbort: vi.fn(async () => {}),
  mockCustomDirectChatStart: vi.fn(async () => {}),
}));

vi.mock('../mihtnelisAgentStream', () => ({
  fetchAgentPrompt: mockFetchAgentPrompt,
}));

/* ------------------------------------------------------------------ */
/*  helpers                                                           */
/* ------------------------------------------------------------------ */

const setTestWindow = (): void => {
  Object.defineProperty(globalThis, 'window', {
    value: {
      api: {
        onCustomDirectChatEvent: mockOnCustomDirectChatEvent,
        customDirectChatAbort: mockCustomDirectChatAbort,
        customDirectChatStart: mockCustomDirectChatStart,
      },
    },
    configurable: true,
    writable: true,
  });
};

const baseRequest = () => ({
  token: 'test-token',
  message: 'hello',
  model: 'gpt-4',
  baseUrl: 'https://api.example.com',
  apiKey: 'sk-test',
});

/* ------------------------------------------------------------------ */
/*  tests                                                             */
/* ------------------------------------------------------------------ */

describe('customDirectAgent', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetchAgentPrompt.mockReset();
    mockOnCustomDirectChatEvent.mockReset();
    mockCustomDirectChatAbort.mockReset();
    mockCustomDirectChatStart.mockReset();

    mockFetchAgentPrompt.mockResolvedValue({ success: true, systemPrompt: 'You are a helpful assistant.' });
    mockOnCustomDirectChatEvent.mockReturnValue(vi.fn());
    mockCustomDirectChatAbort.mockResolvedValue(undefined);
    mockCustomDirectChatStart.mockResolvedValue(undefined);

    setTestWindow();
  });

  /* ============================================================= */
  /*  clearCustomDirectPromptCache                                  */
  /* ============================================================= */

  describe('clearCustomDirectPromptCache', () => {
    it('clears cached prompt so next call re-fetches', async () => {
      const { streamCustomDirectAgent, clearCustomDirectPromptCache } = await import('../customDirectAgent');

      // First call: fetches prompt and starts chat
      mockOnCustomDirectChatEvent.mockImplementation((_sessionId: string, cb: (event: { type: string; payload: unknown }) => void) => {
        setTimeout(() => cb({ type: 'final', payload: {} }), 0);
        return vi.fn();
      });

      await streamCustomDirectAgent(baseRequest());
      expect(mockFetchAgentPrompt).toHaveBeenCalledTimes(1);

      // Clear cache
      clearCustomDirectPromptCache();

      // Second call: should re-fetch prompt
      mockOnCustomDirectChatEvent.mockImplementation((_sessionId: string, cb: (event: { type: string; payload: unknown }) => void) => {
        setTimeout(() => cb({ type: 'final', payload: {} }), 0);
        return vi.fn();
      });

      await streamCustomDirectAgent(baseRequest());
      expect(mockFetchAgentPrompt).toHaveBeenCalledTimes(2);
    });
  });

  /* ============================================================= */
  /*  validation — throws                                           */
  /* ============================================================= */

  describe('validation', () => {
    it('throws on empty token', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      await expect(streamCustomDirectAgent({ ...baseRequest(), token: '' }))
        .rejects.toThrow('未登录，无法启动直连 Agent');
    });

    it('throws on whitespace-only token', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      await expect(streamCustomDirectAgent({ ...baseRequest(), token: '   ' }))
        .rejects.toThrow('未登录，无法启动直连 Agent');
    });

    it('throws on empty message', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      await expect(streamCustomDirectAgent({ ...baseRequest(), message: '' }))
        .rejects.toThrow('message 不能为空');
    });

    it('throws on whitespace-only message', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      await expect(streamCustomDirectAgent({ ...baseRequest(), message: '   ' }))
        .rejects.toThrow('message 不能为空');
    });

    it('throws when baseUrl is empty', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      await expect(streamCustomDirectAgent({ ...baseRequest(), baseUrl: '' }))
        .rejects.toThrow('自定义 API 端点和密钥不能为空');
    });

    it('throws when apiKey is empty', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      await expect(streamCustomDirectAgent({ ...baseRequest(), apiKey: '' }))
        .rejects.toThrow('自定义 API 端点和密钥不能为空');
    });

    it('throws when both baseUrl and apiKey are empty', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      await expect(streamCustomDirectAgent({ ...baseRequest(), baseUrl: '', apiKey: '' }))
        .rejects.toThrow('自定义 API 端点和密钥不能为空');
    });
  });

  /* ============================================================= */
  /*  streamCustomDirectAgent — happy path                          */
  /* ============================================================= */

  describe('streamCustomDirectAgent happy path', () => {
    it('fetches prompt and starts chat with correct params', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');

      mockOnCustomDirectChatEvent.mockImplementation((_sessionId: string, cb: (event: { type: string; payload: unknown }) => void) => {
        setTimeout(() => cb({ type: 'final', payload: {} }), 0);
        return vi.fn();
      });

      await streamCustomDirectAgent(baseRequest());

      expect(mockFetchAgentPrompt).toHaveBeenCalledWith({
        token: 'test-token',
        agentMode: 'mihtnelis',
        snapshotMode: false,
        localMode: true,
        workspaces: undefined,
        skills: undefined,
      });

      expect(mockCustomDirectChatStart).toHaveBeenCalledWith(
        expect.stringContaining('custom-direct-'),
        {
          token: 'test-token',
          model: 'gpt-4',
          systemPrompt: 'You are a helpful assistant.',
          userMessage: 'hello',
          context: undefined,
          baseUrl: 'https://api.example.com',
          apiKey: 'sk-test',
          temperature: undefined,
        },
      );
    });

    it('passes optional fields to fetchAgentPrompt', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');

      mockOnCustomDirectChatEvent.mockImplementation((_sessionId: string, cb: (event: { type: string; payload: unknown }) => void) => {
        setTimeout(() => cb({ type: 'final', payload: {} }), 0);
        return vi.fn();
      });

      await streamCustomDirectAgent({
        ...baseRequest(),
        agentMode: 'custom',
        snapshotMode: true,
        workspaces: ['ws1', 'ws2'],
        skills: [{ name: 'skill1', content: 'content1' }],
        context: 'some context',
        temperature: 0.7,
      });

      expect(mockFetchAgentPrompt).toHaveBeenCalledWith({
        token: 'test-token',
        agentMode: 'custom',
        snapshotMode: true,
        localMode: true,
        workspaces: ['ws1', 'ws2'],
        skills: [{ name: 'skill1', content: 'content1' }],
      });

      expect(mockCustomDirectChatStart).toHaveBeenCalledWith(
        expect.stringContaining('custom-direct-'),
        expect.objectContaining({
          context: 'some context',
          temperature: 0.7,
        }),
      );
    });

    it('forwards chunk events to onEvent', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      const onEvent = vi.fn();
      let capturedCb: ((event: { type: string; payload: unknown }) => void) | undefined;

      mockOnCustomDirectChatEvent.mockImplementation((_sessionId: string, cb: (event: { type: string; payload: unknown }) => void) => {
        capturedCb = cb;
        return vi.fn();
      });

      const promise = streamCustomDirectAgent({ ...baseRequest(), onEvent });

      // flush microtasks so resolveSystemPrompt completes and event listener is registered
      await new Promise((r) => setTimeout(r, 0));

      capturedCb!({ type: 'chunk', payload: { text: 'hello' } });
      capturedCb!({ type: 'chunk', payload: { text: ' world' } });
      capturedCb!({ type: 'final', payload: {} });

      await promise;

      expect(onEvent).toHaveBeenCalledWith({ type: 'chunk', payload: { text: 'hello' } });
      expect(onEvent).toHaveBeenCalledWith({ type: 'chunk', payload: { text: ' world' } });
      expect(onEvent).toHaveBeenCalledWith({ type: 'final', payload: {} });
    });

    it('forwards meta events with thinkingEnabled coercion', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      const onEvent = vi.fn();
      let capturedCb: ((event: { type: string; payload: unknown }) => void) | undefined;

      mockOnCustomDirectChatEvent.mockImplementation((_sessionId: string, cb: (event: { type: string; payload: unknown }) => void) => {
        capturedCb = cb;
        return vi.fn();
      });

      const promise = streamCustomDirectAgent({ ...baseRequest(), onEvent });

      await new Promise((r) => setTimeout(r, 0));

      capturedCb!({ type: 'meta', payload: { model: 'gpt-4', thinkingEnabled: 'truthy' } });
      capturedCb!({ type: 'final', payload: {} });

      await promise;

      expect(onEvent).toHaveBeenCalledWith({
        type: 'meta',
        payload: { model: 'gpt-4', thinkingEnabled: true },
      });
    });

    it('forwards tool_call_request, tool_call_result, and think events', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      const onEvent = vi.fn();
      let capturedCb: ((event: { type: string; payload: unknown }) => void) | undefined;

      mockOnCustomDirectChatEvent.mockImplementation((_sessionId: string, cb: (event: { type: string; payload: unknown }) => void) => {
        capturedCb = cb;
        return vi.fn();
      });

      const promise = streamCustomDirectAgent({ ...baseRequest(), onEvent });

      await new Promise((r) => setTimeout(r, 0));

      capturedCb!({ type: 'tool_call_request', payload: { id: 'tc1' } });
      capturedCb!({ type: 'tool_call_result', payload: { id: 'tc1', result: 'ok' } });
      capturedCb!({ type: 'think', payload: { text: 'thinking...' } });
      capturedCb!({ type: 'final', payload: {} });

      await promise;

      expect(onEvent).toHaveBeenCalledWith({ type: 'tool_call_request', payload: { id: 'tc1' } });
      expect(onEvent).toHaveBeenCalledWith({ type: 'tool_call_result', payload: { id: 'tc1', result: 'ok' } });
      expect(onEvent).toHaveBeenCalledWith({ type: 'think', payload: { text: 'thinking...' } });
    });

    it('forwards stream_rollback events', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      const onEvent = vi.fn();
      let capturedCb: ((event: { type: string; payload: unknown }) => void) | undefined;

      mockOnCustomDirectChatEvent.mockImplementation((_sessionId: string, cb: (event: { type: string; payload: unknown }) => void) => {
        capturedCb = cb;
        return vi.fn();
      });

      const promise = streamCustomDirectAgent({ ...baseRequest(), onEvent });

      await new Promise((r) => setTimeout(r, 0));

      capturedCb!({ type: 'stream_rollback', payload: { reason: 'test' } });
      capturedCb!({ type: 'final', payload: {} });

      await promise;

      expect(onEvent).toHaveBeenCalledWith({ type: 'stream_rollback', payload: { reason: 'test' } });
    });

    it('forwards unknown events transparently', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      const onEvent = vi.fn();
      let capturedCb: ((event: { type: string; payload: unknown }) => void) | undefined;

      mockOnCustomDirectChatEvent.mockImplementation((_sessionId: string, cb: (event: { type: string; payload: unknown }) => void) => {
        capturedCb = cb;
        return vi.fn();
      });

      const promise = streamCustomDirectAgent({ ...baseRequest(), onEvent });

      await new Promise((r) => setTimeout(r, 0));

      capturedCb!({ type: 'custom_event', payload: { data: 42 } });
      capturedCb!({ type: 'final', payload: {} });

      await promise;

      expect(onEvent).toHaveBeenCalledWith({ type: 'custom_event', payload: { data: 42 } });
    });
  });

  /* ============================================================= */
  /*  prompt fetch failure                                          */
  /* ============================================================= */

  describe('prompt fetch failure', () => {
    it('emits error event when prompt fetch fails', async () => {
      mockFetchAgentPrompt.mockRejectedValueOnce(new Error('network down'));

      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      const onEvent = vi.fn();

      await streamCustomDirectAgent({ ...baseRequest(), onEvent });

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        payload: { code: 'PROMPT_FETCH_FAILED', message: '获取系统提示词失败: network down' },
      });
      expect(mockCustomDirectChatStart).not.toHaveBeenCalled();
    });

    it('emits error event with string coercion when prompt fetch throws non-Error', async () => {
      mockFetchAgentPrompt.mockRejectedValueOnce('string error');

      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      const onEvent = vi.fn();

      await streamCustomDirectAgent({ ...baseRequest(), onEvent });

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        payload: { code: 'PROMPT_FETCH_FAILED', message: '获取系统提示词失败: string error' },
      });
    });
  });

  /* ============================================================= */
  /*  chat start failure                                            */
  /* ============================================================= */

  describe('chat start failure', () => {
    it('emits error event when chat start fails', async () => {
      mockCustomDirectChatStart.mockRejectedValueOnce(new Error('IPC timeout'));

      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      const onEvent = vi.fn();

      await streamCustomDirectAgent({ ...baseRequest(), onEvent });

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        payload: { code: 'IPC_START_FAILED', message: '启动直连 Agent 失败: IPC timeout' },
      });
    });

    it('emits error event with string coercion when chat start throws non-Error', async () => {
      mockCustomDirectChatStart.mockRejectedValueOnce('unknown failure');

      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      const onEvent = vi.fn();

      await streamCustomDirectAgent({ ...baseRequest(), onEvent });

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        payload: { code: 'IPC_START_FAILED', message: '启动直连 Agent 失败: unknown failure' },
      });
    });
  });

  /* ============================================================= */
  /*  abort signal                                                  */
  /* ============================================================= */

  describe('abort signal', () => {
    it('calls customDirectChatAbort and resolves when signal is aborted', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      const controller = new AbortController();
      let capturedCb: ((event: { type: string; payload: unknown }) => void) | undefined;

      mockOnCustomDirectChatEvent.mockImplementation((_sessionId: string, cb: (event: { type: string; payload: unknown }) => void) => {
        capturedCb = cb;
        return vi.fn();
      });

      const promise = streamCustomDirectAgent({ ...baseRequest(), signal: controller.signal });

      // Allow event listener registration
      await new Promise((r) => setTimeout(r, 0));

      controller.abort();

      await promise;

      expect(mockCustomDirectChatAbort).toHaveBeenCalledWith(expect.stringContaining('custom-direct-'));
    });

    it('does not hang if abort fires after listener is registered', async () => {
      const { streamCustomDirectAgent } = await import('../customDirectAgent');
      const controller = new AbortController();

      mockOnCustomDirectChatEvent.mockReturnValue(vi.fn());

      const promise = streamCustomDirectAgent({ ...baseRequest(), signal: controller.signal });

      // flush microtasks so event listener is registered
      await new Promise((r) => setTimeout(r, 0));

      controller.abort();

      await promise;

      expect(mockCustomDirectChatAbort).toHaveBeenCalled();
    });
  });
});
