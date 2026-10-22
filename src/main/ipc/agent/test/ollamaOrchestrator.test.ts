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
 * @file ollamaOrchestrator.test.ts
 * @description ollamaOrchestrator 单元测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OllamaStreamCallbacks } from '../ollamaClient';

const { streamOllamaChatMock } = vi.hoisted(() => ({
  streamOllamaChatMock: vi.fn(),
}));

vi.mock('../ollamaClient', () => ({
  streamOllamaChat: streamOllamaChatMock,
}));

import { orchestrateOllamaChat } from '../ollamaOrchestrator';
import type { OllamaEvent, OllamaOrchestratorCallbacks } from '../ollamaOrchestrator';

describe('orchestrateOllamaChat', () => {
  let events: OllamaEvent[];
  let callbacks: OllamaOrchestratorCallbacks;

  beforeEach(() => {
    events = [];
    streamOllamaChatMock.mockReset();
    callbacks = {
      onEvent: (event) => events.push(event),
      executeLocalTool: vi.fn().mockResolvedValue({
        success: true,
        result: {},
        error: '',
        durationMs: 0,
      }),
    };
  });

  /** Helper: simulate streamOllamaChat calling onChunk + onDone with the given text. */
  function makeStreamResponse(text: string, usage?: { prompt_tokens?: number; completion_tokens?: number }) {
    return (_req: unknown, cbs: OllamaStreamCallbacks) => {
      cbs.onChunk?.(text);
      cbs.onDone?.(text, usage);
      return { abort: vi.fn() };
    };
  }

  it('emits meta, status, chunk and final for a simple final answer', async () => {
    streamOllamaChatMock.mockImplementation(
      makeStreamResponse('{"type":"final","answer":"Hello there!"}'),
    );

    await orchestrateOllamaChat(
      { model: 'qwen2.5', systemPrompt: 'sys', userMessage: 'hi' },
      callbacks,
    );

    const metaEvents = events.filter((e) => e.type === 'meta');
    expect(metaEvents).toHaveLength(1);
    expect(metaEvents[0].payload).toMatchObject({
      agent: 'mihtnelis agent (local)',
      provider: 'ollama',
      model: 'qwen2.5',
    });

    const statusEvents = events.filter((e) => e.type === 'status');
    expect(statusEvents).toHaveLength(1);
    expect(statusEvents[0].payload).toMatchObject({ phase: 'orchestrating' });

    const chunkEvents = events.filter((e) => e.type === 'chunk');
    expect(chunkEvents.length).toBeGreaterThanOrEqual(1);
    expect(chunkEvents.some((e) => (e.payload.text as string).includes('Hello there!'))).toBe(true);

    const finalEvents = events.filter((e) => e.type === 'final');
    expect(finalEvents).toHaveLength(1);
    expect(finalEvents[0].payload).toMatchObject({
      done: true,
      agent: 'mihtnelis agent (local)',
      provider: 'ollama',
      model: 'qwen2.5',
    });
  });

  it('tracks usage tokens in the final event', async () => {
    streamOllamaChatMock.mockImplementation(
      makeStreamResponse('{"type":"final","answer":"ok"}', {
        prompt_tokens: 100,
        completion_tokens: 50,
      }),
    );

    await orchestrateOllamaChat(
      { model: 'qwen2.5', systemPrompt: 'sys', userMessage: 'hi' },
      callbacks,
    );

    const finalEvents = events.filter((e) => e.type === 'final');
    expect(finalEvents[0].payload).toMatchObject({
      billedInputTokens: 100,
      billedOutputTokens: 50,
      billedTokenTotal: 150,
      tokenSource: 'api',
    });
  });

  it('emits error event when streamOllamaChat fails', async () => {
    streamOllamaChatMock.mockImplementation(
      (_req: unknown, cbs: OllamaStreamCallbacks) => {
        cbs.onError?.(new Error('connection refused'));
        return { abort: vi.fn() };
      },
    );

    await orchestrateOllamaChat(
      { model: 'qwen2.5', systemPrompt: 'sys', userMessage: 'hi' },
      callbacks,
    );

    const errorEvents = events.filter((e) => e.type === 'error');
    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0].payload).toMatchObject({
      code: 'LLM_ERROR',
      message: 'connection refused',
    });

    expect(events.filter((e) => e.type === 'final')).toHaveLength(0);
  });

  it('emits ABORTED error when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await orchestrateOllamaChat(
      { model: 'qwen2.5', systemPrompt: 'sys', userMessage: 'hi', signal: controller.signal },
      callbacks,
    );

    expect(streamOllamaChatMock).not.toHaveBeenCalled();

    const errorEvents = events.filter((e) => e.type === 'error');
    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0].payload).toMatchObject({ code: 'ABORTED' });
  });

  it('handles tool_call then final answer across two turns', async () => {
    const toolCallText = '{"type":"tool_call","tool":"web_search","purpose":"search the web","arguments":{"query":"test"}}';
    const finalText = '{"type":"final","answer":"Here are the results"}';

    streamOllamaChatMock
      .mockImplementationOnce(makeStreamResponse(toolCallText))
      .mockImplementationOnce(makeStreamResponse(finalText));

    await orchestrateOllamaChat(
      { model: 'qwen2.5', systemPrompt: 'sys', userMessage: 'search for test' },
      callbacks,
    );

    expect(streamOllamaChatMock).toHaveBeenCalledTimes(2);

    const toolReqEvents = events.filter((e) => e.type === 'tool_call_request');
    expect(toolReqEvents).toHaveLength(1);
    expect(toolReqEvents[0].payload).toMatchObject({
      turn: 1,
      tool: 'web_search',
      purpose: 'search the web',
      arguments: { query: 'test' },
      riskLevel: 'local',
    });

    const toolResultEvents = events.filter((e) => e.type === 'tool_call_result');
    expect(toolResultEvents).toHaveLength(1);
    expect(toolResultEvents[0].payload).toMatchObject({
      turn: 1,
      tool: 'web_search',
      success: true,
    });

    expect(callbacks.executeLocalTool).toHaveBeenCalledWith({
      tool: 'web_search',
      arguments: { query: 'test' },
    });

    const finalEvents = events.filter((e) => e.type === 'final');
    expect(finalEvents).toHaveLength(1);
    expect(finalEvents[0].payload).toMatchObject({ done: true });
  });

  it('handles think tags in streaming response', async () => {
    const text = '<think>Let me think...</think>{"type":"final","answer":"Thought about it"}';
    streamOllamaChatMock.mockImplementation(makeStreamResponse(text));

    await orchestrateOllamaChat(
      { model: 'qwen2.5', systemPrompt: 'sys', userMessage: 'think' },
      callbacks,
    );

    const thinkEvents = events.filter((e) => e.type === 'think');
    expect(thinkEvents.length).toBeGreaterThanOrEqual(1);
    expect(thinkEvents[0].payload).toMatchObject({
      text: 'Let me think...',
      index: 0,
    });

    const finalEvents = events.filter((e) => e.type === 'final');
    expect(finalEvents).toHaveLength(1);
    expect(finalEvents[0].payload).toMatchObject({ done: true });
  });

  it('handles executeLocalTool throwing an error', async () => {
    const toolCallText = '{"type":"tool_call","tool":"bad_tool","purpose":"test","arguments":{}}';
    const finalText = '{"type":"final","answer":"Tool failed but I recovered"}';

    streamOllamaChatMock
      .mockImplementationOnce(makeStreamResponse(toolCallText))
      .mockImplementationOnce(makeStreamResponse(finalText));

    (callbacks.executeLocalTool as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('tool exploded'));

    await orchestrateOllamaChat(
      { model: 'qwen2.5', systemPrompt: 'sys', userMessage: 'test' },
      callbacks,
    );

    const toolResultEvents = events.filter((e) => e.type === 'tool_call_result');
    expect(toolResultEvents).toHaveLength(1);
    expect(toolResultEvents[0].payload).toMatchObject({
      success: false,
      error: 'tool exploded',
    });

    const finalEvents = events.filter((e) => e.type === 'final');
    expect(finalEvents).toHaveLength(1);
  });

  it('emits max-turns message after exceeding MAX_REACT_TURNS', async () => {
    let index = 0;
    streamOllamaChatMock.mockImplementation((request: unknown, streamCallbacks: OllamaStreamCallbacks) => makeStreamResponse(JSON.stringify({
      type: 'tool_call', tool: 'noop', purpose: 'loop', arguments: { index: index++ },
    }))(request, streamCallbacks));

    await orchestrateOllamaChat(
      { model: 'qwen2.5', systemPrompt: 'sys', userMessage: 'loop forever' },
      callbacks,
    );

    const toolReqEvents = events.filter((e) => e.type === 'tool_call_request');
    expect(toolReqEvents).toHaveLength(15);

    const chunkEvents = events.filter((e) => e.type === 'chunk');
    const maxTurnsChunk = chunkEvents.find(
      (e) => typeof e.payload.text === 'string' && e.payload.text.includes('步骤过多'),
    );
    expect(maxTurnsChunk).toBeDefined();

    const finalEvents = events.filter((e) => e.type === 'final');
    expect(finalEvents).toHaveLength(1);
    expect(finalEvents[0].payload).toMatchObject({
      done: true,
      tokenSource: 'estimate',
    });
  });
});
