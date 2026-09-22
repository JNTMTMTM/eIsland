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
 * @file agentHandlers.test.ts
 * @description agent IPC handlers 单元测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
}));

const {
  pingOllamaMock,
  listOllamaModelsMock,
  detectOllamaBaseUrlMock,
  orchestrateOllamaChatMock,
  orchestrateCustomDirectChatMock,
} = vi.hoisted(() => ({
  pingOllamaMock: vi.fn(),
  listOllamaModelsMock: vi.fn(),
  detectOllamaBaseUrlMock: vi.fn(),
  orchestrateOllamaChatMock: vi.fn(),
  orchestrateCustomDirectChatMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
  },
}));

vi.mock('../ollamaClient', () => ({
  pingOllama: pingOllamaMock,
  listOllamaModels: listOllamaModelsMock,
  detectOllamaBaseUrl: detectOllamaBaseUrlMock,
}));

vi.mock('../ollamaOrchestrator', () => ({
  orchestrateOllamaChat: orchestrateOllamaChatMock,
}));

vi.mock('../customDirectOrchestrator', () => ({
  orchestrateCustomDirectChat: orchestrateCustomDirectChatMock,
}));

import { registerAgentIpcHandlers } from '../index';
import { registerAgentLocalToolIpcHandlers } from '../localToolIpc';
import { registerOllamaIpcHandlers } from '../ollamaIpc';

describe('agent ipc handlers', () => {
  const handleHandlers = new Map<string, (...args: unknown[]) => unknown>();

  beforeEach(() => {
    handleHandlers.clear();
    handleMock.mockReset();
    pingOllamaMock.mockReset();
    listOllamaModelsMock.mockReset();
    detectOllamaBaseUrlMock.mockReset();
    orchestrateOllamaChatMock.mockReset();
    orchestrateCustomDirectChatMock.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handleHandlers.set(channel, handler);
    });
  });

  it('handles agent local tool execute success and error', async () => {
    const executeAgentLocalTool = vi.fn().mockResolvedValue({
      success: true,
      result: { ok: 1 },
      error: '',
      durationMs: 8,
    });

    registerAgentLocalToolIpcHandlers({ executeAgentLocalTool });

    const handler = handleHandlers.get('agent:local-tool:execute');
    await expect(handler?.({}, { tool: 'x' })).resolves.toEqual({
      success: true,
      result: { ok: 1 },
      error: '',
      durationMs: 8,
    });

    executeAgentLocalTool.mockRejectedValueOnce(new Error('execute failed'));
    await expect(handler?.({}, { tool: 'x' })).resolves.toEqual({
      success: false,
      result: {},
      error: 'execute failed',
      durationMs: 0,
    });
  });

  it('registers both local-tool and ollama handler groups via entrypoint', () => {
    registerAgentIpcHandlers({
      executeAgentLocalTool: vi.fn().mockResolvedValue({
        success: true,
        result: {},
        error: '',
        durationMs: 1,
      }),
    });

    expect(handleHandlers.has('agent:local-tool:execute')).toBe(true);
    expect(handleHandlers.has('ollama:ping')).toBe(true);
    expect(handleHandlers.has('ollama:chat:start')).toBe(true);
    expect(handleHandlers.has('customDirect:chat:start')).toBe(true);
  });

  it('returns fallbacks when ollama base handlers throw', async () => {
    registerOllamaIpcHandlers({
      executeAgentLocalTool: vi.fn(),
    });

    const pingHandler = handleHandlers.get('ollama:ping');
    const modelsHandler = handleHandlers.get('ollama:models');
    const detectHandler = handleHandlers.get('ollama:detectBaseUrl');

    pingOllamaMock.mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('down'));
    await expect(pingHandler?.({}, 'http://localhost:11434')).resolves.toBe(true);
    await expect(pingHandler?.({}, 'http://localhost:11434')).resolves.toBe(false);

    listOllamaModelsMock.mockResolvedValueOnce(['qwen']).mockRejectedValueOnce(new Error('down'));
    await expect(modelsHandler?.({}, 'http://localhost:11434')).resolves.toEqual(['qwen']);
    await expect(modelsHandler?.({}, 'http://localhost:11434')).resolves.toEqual([]);

    detectOllamaBaseUrlMock.mockResolvedValueOnce('http://127.0.0.1:11434').mockRejectedValueOnce(new Error('down'));
    await expect(detectHandler?.({})).resolves.toBe('http://127.0.0.1:11434');
    await expect(detectHandler?.({})).resolves.toBeNull();
  });

  it('starts chat orchestration and supports abort lifecycle', async () => {
    const executeLocalTool = vi.fn();
    registerOllamaIpcHandlers({ executeAgentLocalTool: executeLocalTool });

    const sender = {
      isDestroyed: vi.fn(() => false),
      send: vi.fn(),
      once: vi.fn(),
      removeListener: vi.fn(),
    };

    const startHandler = handleHandlers.get('ollama:chat:start');
    const abortHandler = handleHandlers.get('ollama:chat:abort');

    orchestrateOllamaChatMock.mockRejectedValueOnce(new Error('orchestrator boom'));

    expect(
      startHandler?.(
        { sender },
        's1',
        {
          model: 'qwen2.5',
          systemPrompt: 'system',
          userMessage: 'hi',
        },
      ),
    ).toEqual({ started: true, sessionId: 's1' });

    await Promise.resolve();
    await Promise.resolve();

    expect(sender.send).toHaveBeenCalledWith(
      'ollama:chat:event:s1',
      expect.objectContaining({
        type: 'error',
        payload: expect.objectContaining({
          code: 'ORCHESTRATOR_ERROR',
          message: 'orchestrator boom',
        }),
      }),
    );

    orchestrateOllamaChatMock.mockImplementationOnce(() => new Promise(() => {}));
    startHandler?.(
      { sender },
      's2',
      {
        model: 'qwen2.5',
        systemPrompt: 'system',
        userMessage: 'hi',
      },
    );

    expect(abortHandler?.({}, 's2')).toEqual({ aborted: true });
    expect(abortHandler?.({}, 's2')).toEqual({ aborted: false });

    expect(orchestrateOllamaChatMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'qwen2.5',
        signal: expect.any(Object),
      }),
      expect.objectContaining({
        executeLocalTool,
      }),
    );
  });

  it('starts custom direct chat orchestration', () => {
    registerOllamaIpcHandlers({
      executeAgentLocalTool: vi.fn(),
    });

    orchestrateCustomDirectChatMock.mockResolvedValueOnce(undefined);

    const customStartHandler = handleHandlers.get('customDirect:chat:start');
    const sender = {
      isDestroyed: vi.fn(() => false),
      send: vi.fn(),
      once: vi.fn(),
      removeListener: vi.fn(),
    };

    expect(
      customStartHandler?.(
        { sender },
        'cd1',
        {
          model: 'minimax-2.5',
          systemPrompt: 'system',
          userMessage: 'hello',
          baseUrl: 'https://api.example.com',
          apiKey: 'k',
          temperature: 0.5,
        },
      ),
    ).toEqual({ started: true, sessionId: 'cd1' });

    expect(orchestrateCustomDirectChatMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'minimax-2.5',
        apiKey: 'k',
        baseUrl: 'https://api.example.com',
      }),
      expect.objectContaining({
        executeLocalTool: expect.any(Function),
      }),
    );
  });

  it.each(['ollama', 'customDirect'])('cancels %s generation when its renderer is destroyed', async (provider) => {
    registerOllamaIpcHandlers({ executeAgentLocalTool: vi.fn() });
    const orchestrate = provider === 'ollama' ? orchestrateOllamaChatMock : orchestrateCustomDirectChatMock;
    orchestrate.mockReturnValue(new Promise(() => {}));
    const sender = Object.assign(new EventEmitter(), { isDestroyed: () => false, send: vi.fn() });
    handleHandlers.get(`${provider}:chat:start`)?.({ sender }, `closed-${provider}`, { model: 'model' });
    const signal = orchestrate.mock.lastCall![0].signal as AbortSignal;
    sender.emit('destroyed');
    expect(signal.aborted).toBe(true);
    expect(sender.listenerCount('destroyed')).toBe(0);
    expect(handleHandlers.get(`${provider}:chat:abort`)?.({}, `closed-${provider}`)).toEqual({ aborted: false });
  });

  it('keeps the new controller when an older request for the same session finishes', async () => {
    registerOllamaIpcHandlers({ executeAgentLocalTool: vi.fn() });
    let finishFirst!: () => void;
    let finishSecond!: () => void;
    orchestrateOllamaChatMock
      .mockReturnValueOnce(new Promise<void>((resolve) => { finishFirst = resolve; }))
      .mockReturnValueOnce(new Promise<void>((resolve) => { finishSecond = resolve; }));
    const sender = Object.assign(new EventEmitter(), { isDestroyed: () => false, send: vi.fn() });
    const start = handleHandlers.get('ollama:chat:start')!;
    start({ sender }, 'reused', { model: 'model' });
    const firstSignal = orchestrateOllamaChatMock.mock.calls[0][0].signal as AbortSignal;
    start({ sender }, 'reused', { model: 'model' });
    const secondSignal = orchestrateOllamaChatMock.mock.calls[1][0].signal as AbortSignal;
    expect(firstSignal.aborted).toBe(true);
    finishFirst();
    await Promise.resolve();
    await Promise.resolve();
    expect(handleHandlers.get('ollama:chat:abort')?.({}, 'reused')).toEqual({ aborted: true });
    expect(secondSignal.aborted).toBe(true);
    finishSecond();
    await Promise.resolve();
    await Promise.resolve();
    expect(sender.listenerCount('destroyed')).toBe(0);
  });
});
