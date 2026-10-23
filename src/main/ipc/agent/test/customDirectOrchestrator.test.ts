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
 * @file customDirectOrchestrator.test.ts
 * @description customDirectOrchestrator 单元测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenAIStreamCallbacks } from '../openaiCompatClient';

const { streamOpenAIChatMock } = vi.hoisted(() => ({
  streamOpenAIChatMock: vi.fn(),
}));

vi.mock('../openaiCompatClient', () => ({
  streamOpenAIChat: streamOpenAIChatMock,
}));

import { orchestrateCustomDirectChat } from '../customDirectOrchestrator';
import type { CustomDirectEvent, CustomDirectOrchestratorCallbacks } from '../customDirectOrchestrator';

describe('orchestrateCustomDirectChat', () => {
  let events: CustomDirectEvent[];
  let callbacks: CustomDirectOrchestratorCallbacks;

  beforeEach(() => {
    events = [];
    streamOpenAIChatMock.mockReset();
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

  /** Helper: simulate streamOpenAIChat calling onChunk + onDone with the given text. */
  function makeStreamResponse(text: string, usage?: { prompt_tokens?: number; completion_tokens?: number }) {
    return (_req: unknown, cbs: OpenAIStreamCallbacks) => {
      cbs.onChunk?.(text);
      cbs.onDone?.(text, usage);
      return { abort: vi.fn() };
    };
  }

  const baseRequest = {
    model: 'gpt-4o',
    systemPrompt: 'sys',
    userMessage: 'hi',
    baseUrl: 'https://api.example.com',
    apiKey: 'sk-test',
  };

  it('emits meta, status, chunk and final for a simple final answer', async () => {
    streamOpenAIChatMock.mockImplementation(
      makeStreamResponse('{"type":"final","answer":"Hello there!"}'),
    );

    await orchestrateCustomDirectChat(baseRequest, callbacks);

    const metaEvents = events.filter((e) => e.type === 'meta');
    expect(metaEvents).toHaveLength(1);
    expect(metaEvents[0].payload).toMatchObject({
      agent: 'mihtnelis agent (direct)',
      provider: 'custom-direct',
      model: 'gpt-4o',
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
      agent: 'mihtnelis agent (direct)',
      provider: 'custom-direct',
      model: 'gpt-4o',
    });
  });

  it('tracks usage tokens in the final event', async () => {
    streamOpenAIChatMock.mockImplementation(
      makeStreamResponse('{"type":"final","answer":"ok"}', {
        prompt_tokens: 100,
        completion_tokens: 50,
      }),
    );

    await orchestrateCustomDirectChat(baseRequest, callbacks);

    const finalEvents = events.filter((e) => e.type === 'final');
    expect(finalEvents[0].payload).toMatchObject({
      billedInputTokens: 100,
      billedOutputTokens: 50,
      billedTokenTotal: 150,
      tokenSource: 'api',
    });
  });

  it('emits error event when streamOpenAIChat fails', async () => {
    streamOpenAIChatMock.mockImplementation(
      (_req: unknown, cbs: OpenAIStreamCallbacks) => {
        cbs.onError?.(new Error('connection refused'));
        return { abort: vi.fn() };
      },
    );

    await orchestrateCustomDirectChat(baseRequest, callbacks);

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

    await orchestrateCustomDirectChat(
      { ...baseRequest, signal: controller.signal },
      callbacks,
    );

    expect(streamOpenAIChatMock).not.toHaveBeenCalled();

    const errorEvents = events.filter((e) => e.type === 'error');
    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0].payload).toMatchObject({ code: 'ABORTED' });
  });

  it('handles tool_call then final answer across two turns', async () => {
    const toolCallText = '{"type":"tool_call","tool":"web_search","purpose":"search the web","arguments":{"query":"test"}}';
    const finalText = '{"type":"final","answer":"Here are the results"}';

    streamOpenAIChatMock
      .mockImplementationOnce(makeStreamResponse(toolCallText))
      .mockImplementationOnce(makeStreamResponse(finalText));

    await orchestrateCustomDirectChat(
      { ...baseRequest, userMessage: 'search for test' },
      callbacks,
    );

    expect(streamOpenAIChatMock).toHaveBeenCalledTimes(2);

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
    streamOpenAIChatMock.mockImplementation(
      (_req: unknown, cbs: OpenAIStreamCallbacks) => {
        cbs.onThinkChunk?.('Let me think...');
        cbs.onChunk?.('{"type":"final","answer":"Thought about it"}');
        cbs.onDone?.('{"type":"final","answer":"Thought about it"}');
        return { abort: vi.fn() };
      },
    );

    await orchestrateCustomDirectChat(
      { ...baseRequest, userMessage: 'think' },
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

    streamOpenAIChatMock
      .mockImplementationOnce(makeStreamResponse(toolCallText))
      .mockImplementationOnce(makeStreamResponse(finalText));

    (callbacks.executeLocalTool as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('tool exploded'));

    await orchestrateCustomDirectChat(
      { ...baseRequest, userMessage: 'test' },
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
    streamOpenAIChatMock.mockImplementation((request: unknown, streamCallbacks: OpenAIStreamCallbacks) => makeStreamResponse(JSON.stringify({
      type: 'tool_call', tool: 'noop', purpose: 'loop', arguments: { index: index++ },
    }))(request, streamCallbacks));

    await orchestrateCustomDirectChat(
      { ...baseRequest, userMessage: 'loop forever' },
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
