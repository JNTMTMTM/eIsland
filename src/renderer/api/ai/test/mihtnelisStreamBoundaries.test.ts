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
 * @file mihtnelisStreamBoundaries.test.ts
 * @description Agent SSE 真实流读取、事件类型、响应 traceId 和失败响应正文读取边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn<typeof fetch>();
let api: typeof import('../mihtnelisAgentStream');
const kinds = ['stream', 'web', 'local', 'result', 'prompt'] as const;
type Kind = typeof kinds[number];
const auth = { token: 'token', requestId: 'request', allow: true, success: true };

beforeEach(async () => {
  vi.resetModules();vi.resetAllMocks();
  vi.stubGlobal('window', { location: { hostname: 'eisland.local' }, api: { updaterVersion: vi.fn().mockResolvedValue('1.2.3') } });
  vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null) });
  vi.stubGlobal('fetch', fetchMock);
  api = await import('../mihtnelisAgentStream');
});
afterEach(() => { vi.restoreAllMocks();vi.unstubAllGlobals(); });

/**
 * 根据公开操作入口发送请求，保留真实请求头与响应处理。
 * @param kind - 要调用的公开操作类型
 * @returns 对应入口的完成结果
 */
async function send(kind: Kind): Promise<unknown> {
  if (kind === 'stream') return api.streamMihtnelisAgent({ token: 'token', message: 'hello' });
  if (kind === 'web') return api.resolveMihtnelisWebAccess(auth);
  if (kind === 'local') return api.resolveMihtnelisLocalToolAccess(auth);
  if (kind === 'result') return api.resolveMihtnelisLocalToolResult(auth);
  return api.fetchAgentPrompt({ token: 'token' });
}

/**
 * 创建真实正文读取失败的响应，模拟连接在 HTTP 错误正文传输中断。
 * @returns 读取正文时失败的 HTTP 响应
 */
function unreadableResponse(): Response {
  const stream = new ReadableStream({ start(controller) { controller.error(new Error('body disconnected')); } });
  return new Response(stream, { status: 503, statusText: 'Unavailable' });
}

describe('real agent error response body boundaries', () => {
  it.each(['web', 'local', 'result', 'prompt'] as const)('omits unavailable version headers for %s', async (kind) => {
    vi.stubGlobal('window', { location: { hostname: 'eisland.local' }, api: { updaterVersion: vi.fn().mockResolvedValue(null) } });
    fetchMock.mockResolvedValue(Response.json({ success: true, systemPrompt: 'Prompt' }));
    await send(kind);
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['X-Client-Version']).toBeUndefined();
  });
  it.each(kinds)('uses statusText after %s response body read rejects', async (kind) => {
    fetchMock.mockResolvedValue(unreadableResponse());
    await expect(send(kind)).rejects.toThrow('Unavailable');
  });
  it.each(['web', 'local', 'result', 'prompt'] as const)('uses statusText for %s empty error body', async (kind) => {
    fetchMock.mockResolvedValue(new Response('', { status: 503, statusText: 'Unavailable' }));
    await expect(send(kind)).rejects.toThrow('Unavailable');
  });
  it.each([{ message: ' Message ' }, { error: 1, message: 'ignored' }, { error: '' }, {}])('uses real prompt error detail fields %j', async (body) => {
    fetchMock.mockResolvedValue(Response.json(body, { status: 503, statusText: 'Unavailable' }));
    const promise = send('prompt');
    await expect(promise).rejects.toThrow('获取 agent prompt 失败');
    if ('message' in body && !('error' in body)) await expect(promise).rejects.toThrow('Message');
  });
});

describe('real SSE stream events and terminal buffers', () => {
  it('rejects a successful response without a readable body', async () => {
    fetchMock.mockResolvedValue(new Response(null));
    await expect(send('stream')).rejects.toThrow('无法读取');
  });
  it('parses every supported event, ignores unknown lines and preserves malformed JSON as text', async () => {
    const types = ['meta', 'tool', 'tool_call_request', 'tool_call_result', 'think', 'chunk', 'billing', 'web_access_request', 'web_access_resolved', 'todo', 'final', 'error'];
    const chunks = `: heartbeat\nid: ignored\nevent: unknown\ndata: ignored\n\n${  types.map((type) => `event: ${  type.toUpperCase()  }\ndata: {"value":1}\n\n`).join('')  }event: chunk\ndata: {broken\n\n`;
    const onEvent = vi.fn<(event: { type: string; payload: unknown }) => void>(); fetchMock.mockResolvedValue(new Response(chunks));
    await api.streamMihtnelisAgent({ onEvent, token: 'token', message: 'hello' });
    expect(onEvent.mock.calls.map(([event]) => event.type)).toEqual([...types, 'chunk']);
    expect(onEvent).toHaveBeenLastCalledWith({ type: 'chunk', payload: '{broken' });
  });
  it.each(['event: chunk\ndata: trailing', 'event: chunk\ndata: [broken'])('flushes a final buffer without a newline: %s', async (body) => {
    const onEvent = vi.fn();fetchMock.mockResolvedValue(new Response(body));
    await api.streamMihtnelisAgent({ onEvent, token: 'token', message: 'hello' });
    expect(onEvent).toHaveBeenCalledWith({ type: 'chunk', payload: body.endsWith('trailing') ? 'trailing' : '[broken' });
  });
  it.each([
    [{}, { traceId: 'header-trace' }],
    [{ traceid: 'already' }, { traceid: 'already' }],
    [{ trace_id: 'already' }, { trace_id: 'already' }],
    [{ traceId: 123 }, { traceId: 'header-trace' }],
    [[], []], ['raw', 'raw'],
  ])('keeps final payload trace semantics for %j', async (payload, expected) => {
    const onEvent = vi.fn();const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
    fetchMock.mockResolvedValue(new Response(`event: final\ndata: ${  text  }\n\n`, { headers: { 'x-trace-id': 'header-trace' } }));
    await api.streamMihtnelisAgent({ onEvent, token: 'token', message: 'hello' });
    expect(onEvent).toHaveBeenCalledWith({ type: 'final', payload: expected });
  });
});
