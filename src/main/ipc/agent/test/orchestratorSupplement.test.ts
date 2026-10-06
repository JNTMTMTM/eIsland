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
 * @file orchestratorSupplement.test.ts
 * @description 两种真实 ReAct 编排器的流式解析、JSON 修复、工具边界、取消及失败观察测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { orchestrateCustomDirectChat } from '../customDirectOrchestrator';
import { orchestrateOllamaChat } from '../ollamaOrchestrator';
import type { streamOpenAIChat, OpenAIStreamCallbacks } from '../openaiCompatClient';
import type { streamOllamaChat, OllamaStreamCallbacks } from '../ollamaClient';
import type { AgentLocalToolResult } from '../localToolIpc';

const mocks = vi.hoisted(() => ({ custom: vi.fn<typeof streamOpenAIChat>(), ollama: vi.fn<typeof streamOllamaChat>() }));
vi.mock('../openaiCompatClient', () => ({ streamOpenAIChat: mocks.custom }));
vi.mock('../ollamaClient', () => ({ streamOllamaChat: mocks.ollama }));
interface Event { type: string; payload: Record<string, unknown> }
interface Turn {
  chunks: string[];
  reasoning?: string[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  failure?: Error;
  throwValue?: unknown;
  beforeError?: () => void;
}
const turns: Turn[] = [];
let events: Event[];
const execute = vi.fn<Parameters<typeof orchestrateOllamaChat>[1]['executeLocalTool']>();
const request = { model: 'fixture', systemPrompt: 'System', userMessage: ' question ', baseUrl: 'https://fixture.invalid', apiKey: 'fixture' };

/**
 * 用脚本化流替代网络客户端，正文结算始终等于实际分片拼接。
 * @param ignored - 网络请求参数。
 * @param callbacks - 真实编排器传入的客户端回调。
 * @returns 不发出真实请求的取消句柄。
 */
function respond(ignored: unknown, callbacks: OpenAIStreamCallbacks | OllamaStreamCallbacks): { abort: () => void } {
  void ignored;
  const turn = turns.shift();
  if (!turn) throw new Error('unexpected LLM turn');
  turn.reasoning?.forEach((chunk) => {
    if ('onThinkChunk' in callbacks) callbacks.onThinkChunk?.(chunk);
  });
  turn.chunks.forEach((chunk) => { callbacks.onChunk?.(chunk); });
  turn.beforeError?.();
  if ('throwValue' in turn) {

    throw turn.throwValue;
  }
  if (turn.failure) callbacks.onError?.(turn.failure);
  else callbacks.onDone?.(turn.chunks.join(''), turn.usage);
  return { abort: vi.fn<() => void>() };
}
/**
 * 读取客户端当前有效正文，回滚事件会清除旧正文。
 * @returns 业务最终可见的文本。
 */
function visibleText(): string {
  return events.reduce((text, event) => {
    if (event.type === 'stream_rollback') return '';
    if (event.type === 'chunk') return text + String(event.payload.text);
    return text;
  }, '');
}
beforeEach(() => {
  vi.resetAllMocks();
  turns.length = 0;
  events = [];
  mocks.custom.mockImplementation(respond);
  mocks.ollama.mockImplementation(respond);
  execute.mockResolvedValue({ success: true, result: { fixture: 'value' }, error: '', durationMs: 2 });
});
afterEach(() => { vi.restoreAllMocks(); });

describe.each([
  ['custom', orchestrateCustomDirectChat],
  ['ollama', orchestrateOllamaChat],
] as const)('%s real orchestrator parser and lifecycle', (provider, orchestrate) => {
  const callbacks = { onEvent: (event: Event): void => { events.push(event); }, executeLocalTool: execute };
  it.each(['plain answer', '{', '}{', '{}', '{"type":"other","answer":""}', '{"type":"other","answer":3}'])('finalizes unknown output %s without running tools', async (text) => {
    turns.push({ chunks: [text] });
    await orchestrate(request, callbacks);
    expect(events.at(-1)).toMatchObject({ type: 'final', payload: { tokenSource: 'estimate', done: true } });
    expect(execute).not.toHaveBeenCalled();
  });
  it.each([
    '{"answer":"fallback"}',
    '{"type":"final","answer":"first\nsecond\r\tlast"}',
    `${'a'.repeat(21)  }{}`,
    `{}${  'a'.repeat(21)}`,
  ])('parses fallback answers and repairs JSON strings %s', async (text) => {
    turns.push({ chunks: [text] });
    await orchestrate({ ...request, context: ' context ' }, callbacks);
    let expected = text;
    if (text.includes('fallback')) expected = 'fallback';
    else if (text.includes('"answer"')) expected = 'first\nsecond\r\tlast';
    expect(visibleText()).toBe(expected);
    expect(mocks[provider].mock.calls[0][0].messages[1].content).toContain('对话上下文:\ncontext');
  });
  it.each(['{"type":"final"}', '{"type":"final","answer":null}', '{"type":"final","answer":42}'])('accepts explicit final output %s', async (text) => {
    turns.push({ chunks: [text] });
    await orchestrate(request, callbacks);
    expect(events.at(-1)).toMatchObject({ type: 'final', payload: { done: true } });
    expect(visibleText()).toBe(text.includes('42') ? '42' : '');
  });
  it('replaces the leaked extra JSON field with the actual final answer', async () => {
    turns.push({ chunks: ['{"type":"final","answer":"answer","metadata":true}'] });
    await orchestrate(request, callbacks);
    expect(events.some((event) => event.type === 'stream_rollback')).toBe(true);
    expect(visibleText()).toBe('answer');
  });
  it('avoids rollback for an empty answer despite extra JSON metadata', async () => {
    turns.push({ chunks: ['{"type":"final","answer":"","metadata":true}'] });
    await orchestrate(request, callbacks);
    expect(events.some((event) => event.type === 'stream_rollback')).toBe(false);
    expect(events.at(-1)?.type).toBe('final');
  });
  it.each([null, 'not an object', 0, undefined])('normalizes invalid tool arguments %s and missing names', async (args) => {
    turns.push({ chunks: [JSON.stringify({ type: 'tool_call', arguments: args })] }, { chunks: ['{"type":"final","answer":"done"}'] });
    await orchestrate(request, callbacks);
    expect(execute).toHaveBeenCalledWith({ tool: '', arguments: {} });
    expect(visibleText()).toBe('done');
  });
  it('rolls back a tool decision streamed after prose and suppresses subsequent JSON pieces', async () => {
    turns.push({ chunks: ['prose ', '{"type":"tool_call","tool":"file.read",', '"purpose":"fixture","arguments":{}}'] }, { chunks: ['{"type":"final","answer":"done"}'] });
    await orchestrate(request, callbacks);
    expect(events.some((event) => event.type === 'stream_rollback')).toBe(true);
    expect(execute).toHaveBeenCalledWith({ tool: 'file.read', arguments: {} });
    expect(visibleText()).toBe('done');
  });
  it('suppresses long undecided JSON and handles a subsequent fragment', async () => {
    turns.push({ chunks: [`{"unknown":"${  'x'.repeat(85)}`, '","extra":true}'] });
    await orchestrate(request, callbacks);
    expect(visibleText()).toBe('');
    expect(events.at(-1)?.type).toBe('final');
  });
  it('streams every JSON escape and handles incomplete backslash and unknown escapes', async () => {
    turns.push({ chunks: ['{"answer":"a\\nX', 'Y\\tZ\\rQ\\"R\\\\S\\/T\\qU\\u0041"}'] });
    await orchestrate(request, callbacks);
    expect(visibleText()).toContain('a\nXY\tZ\rQ"R\\S/T\\qU\\u0041');
    expect(events.at(-1)?.type).toBe('final');
  });
  it('flushes an incomplete trailing backslash from an unfinished answer', async () => {
    turns.push({ chunks: ['{"answer":"partial\\'] });
    await orchestrate(request, callbacks);
    expect(visibleText()).toBe('partial\\');
    expect(events.at(-1)?.type).toBe('final');
  });
  it.each(['{"answer": "ok" }', '{"answer":"ok"} ', '{"answer":"ok"}x'])('flushes alternate answer endings %s', async (text) => {
    turns.push({ chunks: [text] });
    await orchestrate(request, callbacks);
    expect(visibleText()).toBe('ok');
  });
  it.each([
    ['before<think>thought</think>after'],
    ['before<th', 'ink>thought</th', 'ink>after'],
    ['<th', 'ink></think>after'],
    ['before<think>', 'thought', '</th', 'ink>after'],
    ['<think>thought</thi'],
    ['outside<thi'],
  ])('parses fragmented thinking tags %#', async (...chunks) => {
    turns.push({ chunks });
    await orchestrate(request, callbacks);
    const thinking = events.filter((event) => event.type === 'think').map((event) => String(event.payload.text)).join('');
    const full = chunks.join('');
    if (full.includes('thought')) expect(thinking).toContain('thought');
    expect(visibleText()).not.toContain('<think>');
    expect(events.at(-1)?.type).toBe('final');
  });
  it('accounts for missing token counters on unknown output', async () => {
    turns.push({ chunks: ['plain'], usage: {} });
    await orchestrate(request, callbacks);
    expect(events.at(-1)).toMatchObject({ type: 'final', payload: { billedInputTokens: 0, billedOutputTokens: 0, tokenSource: 'api' } });
  });
  it('returns LLM_ERROR after flushing incomplete thinking and answer buffers', async () => {
    turns.push({ chunks: ['{"answer":"partial<thi'], failure: new Error('network denied') });
    await orchestrate(request, callbacks);
    expect(events.at(-1)).toMatchObject({ type: 'error', payload: { code: 'LLM_ERROR', message: 'network denied' } });
    expect(visibleText()).toContain('partial');
  });
  it('normalizes non-Error network exceptions and cancellation during a turn', async () => {
    const controller = new AbortController();
    turns.push({ chunks: ['<think>partial</thi'], throwValue: 'network denied', beforeError: () => { controller.abort(); } });
    await orchestrate({ ...request, signal: controller.signal }, callbacks);
    expect(events.at(-1)).toMatchObject({ type: 'error', payload: { code: 'ABORTED', message: 'network denied' } });
    expect(events.some((event) => event.type === 'think')).toBe(true);
  });
  it('normalizes non-Error tool rejection and carries the failure into the next prompt', async () => {
    execute.mockRejectedValue('tool denied');
    turns.push({ chunks: ['{"type":"tool_call","tool":"file.read","arguments":{}}'] }, { chunks: ['{"answer":"done"}'] });
    await orchestrate(request, callbacks);
    expect(events.find((event) => event.type === 'tool_call_result')).toMatchObject({ payload: { success: false, error: 'tool denied', durationMs: 0 } });
    expect(mocks[provider].mock.calls[1][0].messages[1].content).toContain('"error":"tool denied"');
  });
  it('truncates large observations and arguments while preserving two-turn history', async () => {
    execute.mockResolvedValue({ success: true, result: { text: 'x'.repeat(9000) }, error: '', durationMs: 2 });
    turns.push(
      { chunks: [JSON.stringify({ type: 'tool_call', tool: 'fixture', purpose: 'fixture', arguments: { text: 'a'.repeat(1500) } })] },
      { chunks: ['{"type":"tool_call","tool":"fixture","arguments":{}}'] },
      { chunks: ['{"answer":"done"}'] },
    );
    await orchestrate(request, callbacks);
    const prompt = mocks[provider].mock.calls[2][0].messages[1].content;
    expect(prompt).toContain('Turn 1:');
    expect(prompt).toContain('\n\nTurn 2:');
    expect(prompt).toContain('...');
    expect(prompt).not.toContain('x'.repeat(8001));
    expect(prompt).not.toContain('a'.repeat(1201));
  });
  it('survives cyclic tool results and arguments mutated by the public tool callback', async () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    execute.mockImplementation((input) => {
      const args = input.arguments as Record<string, unknown>;
      args.self = args;
      return Promise.resolve({ success: true, result: cycle, error: '', durationMs: 2 } satisfies AgentLocalToolResult);
    });
    turns.push({ chunks: ['{"type":"tool_call","tool":"fixture","arguments":{}}'] }, { chunks: ['{"answer":"done"}'] });
    await orchestrate(request, callbacks);
    const prompt = mocks[provider].mock.calls[1][0].messages[1].content;
    expect(prompt).toContain('result serialization failed');
    expect(prompt).toContain('Action Input: {}');
    expect(visibleText()).toBe('done');
  });
});
it('forwards direct-provider reasoning independently from answer text', async () => {
  turns.push({ chunks: ['{"answer":"done"}'], reasoning: ['thinking'] });
  await orchestrateCustomDirectChat(request, { onEvent: (event): void => { events.push(event); }, executeLocalTool: execute });
  expect(events.find((event) => event.type === 'think')).toMatchObject({ payload: { text: 'thinking', index: 0 } });
  expect(visibleText()).toBe('done');
});
