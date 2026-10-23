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
 * @file ollamaLocalAgent.test.ts
 * @description Ollama 本地直连 Agent 单元测试
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFetchAgentPrompt } = vi.hoisted(() => ({
  mockFetchAgentPrompt: vi.fn(),
}));

vi.mock('../mihtnelisAgentStream', () => ({
  fetchAgentPrompt: mockFetchAgentPrompt,
}));

const PRO_TOKEN = 'header.eyJyb2xlIjoicHJvIn0=.sig';
const NON_PRO_TOKEN = 'header.eyJyb2xlIjoidXNlciJ9.sig';

let capturedEventCallback: ((event: { type: string; payload: Record<string, unknown> }) => void) | null = null;

const mockOllamaPing = vi.fn();
const mockOllamaModels = vi.fn();
const mockOllamaDetectBaseUrl = vi.fn();
const mockOnOllamaChatEvent = vi.fn(
  (
    _sessionId: string,
    callback: (event: { type: string; payload: Record<string, unknown> }) => void,
  ) => {
    capturedEventCallback = callback;
    return vi.fn();
  },
);
const mockOllamaChatAbort = vi.fn();
const mockOllamaChatStart = vi.fn(async () => {
  capturedEventCallback?.({ type: 'final', payload: {} });
});

describe('ollamaLocalAgent', () => {
  beforeEach(() => {
    vi.resetModules();
    capturedEventCallback = null;

    globalThis.atob = vi.fn((str: string) => Buffer.from(str, 'base64').toString('binary'));

    Object.defineProperty(globalThis, 'window', {
      value: {
        api: {
          ollamaPing: mockOllamaPing,
          ollamaModels: mockOllamaModels,
          ollamaDetectBaseUrl: mockOllamaDetectBaseUrl,
          onOllamaChatEvent: mockOnOllamaChatEvent,
          ollamaChatAbort: mockOllamaChatAbort,
          ollamaChatStart: mockOllamaChatStart,
        },
      },
      configurable: true,
    });
  });

  describe('clearOllamaPromptCache', () => {
    it('clears cached prompt so subsequent call re-fetches', async () => {
      mockFetchAgentPrompt.mockResolvedValue({ systemPrompt: 'test prompt' });

      const { clearOllamaPromptCache, streamOllamaLocalAgent } = await import('../ollamaLocalAgent');

      await streamOllamaLocalAgent({ token: PRO_TOKEN, message: 'hello', model: 'test' });
      expect(mockFetchAgentPrompt).toHaveBeenCalledTimes(1);

      await streamOllamaLocalAgent({ token: PRO_TOKEN, message: 'hello', model: 'test' });
      expect(mockFetchAgentPrompt).toHaveBeenCalledTimes(1);

      clearOllamaPromptCache();

      await streamOllamaLocalAgent({ token: PRO_TOKEN, message: 'hello', model: 'test' });
      expect(mockFetchAgentPrompt).toHaveBeenCalledTimes(2);
    });
  });

  describe('isOllamaAvailable', () => {
    it('returns true when window.api.ollamaPing returns true', async () => {
      mockOllamaPing.mockResolvedValue(true);
      const { isOllamaAvailable } = await import('../ollamaLocalAgent');
      expect(await isOllamaAvailable()).toBe(true);
    });

    it('returns false on error', async () => {
      mockOllamaPing.mockRejectedValue(new Error('fail'));
      const { isOllamaAvailable } = await import('../ollamaLocalAgent');
      expect(await isOllamaAvailable()).toBe(false);
    });
  });

  describe('getOllamaModels', () => {
    it('returns models from window.api.ollamaModels', async () => {
      mockOllamaModels.mockResolvedValue(['llama3', 'mistral']);
      const { getOllamaModels } = await import('../ollamaLocalAgent');
      expect(await getOllamaModels()).toEqual(['llama3', 'mistral']);
    });

    it('returns empty array on error', async () => {
      mockOllamaModels.mockRejectedValue(new Error('fail'));
      const { getOllamaModels } = await import('../ollamaLocalAgent');
      expect(await getOllamaModels()).toEqual([]);
    });
  });

  describe('detectOllamaBaseUrl', () => {
    it('returns url from window.api.ollamaDetectBaseUrl', async () => {
      mockOllamaDetectBaseUrl.mockResolvedValue('http://localhost:11434');
      const { detectOllamaBaseUrl } = await import('../ollamaLocalAgent');
      expect(await detectOllamaBaseUrl()).toBe('http://localhost:11434');
    });

    it('returns null on error', async () => {
      mockOllamaDetectBaseUrl.mockRejectedValue(new Error('fail'));
      const { detectOllamaBaseUrl } = await import('../ollamaLocalAgent');
      expect(await detectOllamaBaseUrl()).toBeNull();
    });
  });

  describe('streamOllamaLocalAgent', () => {
    it('throws on empty token', async () => {
      const { streamOllamaLocalAgent } = await import('../ollamaLocalAgent');
      await expect(
        streamOllamaLocalAgent({ token: '', message: 'hello', model: 'test' }),
      ).rejects.toThrow('未登录，无法启动本地 Agent');
    });

    it('throws on empty message', async () => {
      const { streamOllamaLocalAgent } = await import('../ollamaLocalAgent');
      await expect(
        streamOllamaLocalAgent({ token: PRO_TOKEN, message: '  ', model: 'test' }),
      ).rejects.toThrow('message 不能为空');
    });

    it('throws when not pro user', async () => {
      const { streamOllamaLocalAgent } = await import('../ollamaLocalAgent');
      await expect(
        streamOllamaLocalAgent({ token: NON_PRO_TOKEN, message: 'hello', model: 'test' }),
      ).rejects.toThrow('本地模型仅 Pro 用户可用');
    });

    it('fetches prompt and starts chat for pro user', async () => {
      const mockOnEvent = vi.fn();
      mockFetchAgentPrompt.mockResolvedValue({ systemPrompt: 'system prompt' });

      const { streamOllamaLocalAgent } = await import('../ollamaLocalAgent');

      await streamOllamaLocalAgent({
        token: PRO_TOKEN,
        message: 'hello',
        model: 'llama3',
        onEvent: mockOnEvent,
      });

      expect(mockFetchAgentPrompt).toHaveBeenCalledTimes(1);
      expect(mockOnOllamaChatEvent).toHaveBeenCalledTimes(1);
      expect(mockOllamaChatStart).toHaveBeenCalledTimes(1);

      const startArgs = mockOllamaChatStart.mock.calls[0];
      expect(startArgs[1]).toMatchObject({
        token: PRO_TOKEN,
        model: 'llama3',
        systemPrompt: 'system prompt',
        userMessage: 'hello',
      });

      expect(mockOnEvent).toHaveBeenCalledWith({ type: 'final', payload: {} });
    });
  });
});
