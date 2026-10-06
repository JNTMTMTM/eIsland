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
 * @file customDirectAgentRuntime.test.ts
 * @description 自定义直连 Agent 真实提示词网络、缓存、IPC 事件和取消边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CustomDirectAgentRequest } from '../types/CustomDirectAgentRequest';

interface Event { type: string; payload: Record<string, unknown> }
const token = `header.${  Buffer.from(JSON.stringify({ role: 'pro' })).toString('base64url')  }.sig`;
const base: CustomDirectAgentRequest = { token, message: ' hello ', model: 'model', baseUrl: 'https://model.example', apiKey: 'key' };
const fetchMock = vi.fn<typeof fetch>();
const unsubscribe = vi.fn();
const abort = vi.fn<(id: string) => Promise<void>>();
const start = vi.fn<(id: string, params: Record<string, unknown>) => Promise<void>>();
let listener: (event: Event) => void;
let stream: typeof import('../customDirectAgent').streamCustomDirectAgent;
let clearCache: typeof import('../customDirectAgent').clearCustomDirectPromptCache;

beforeEach(async () => {
  vi.resetModules(); vi.resetAllMocks();
  listener = () => { throw new Error('IPC listener not registered'); };
  fetchMock.mockImplementation(() => Promise.resolve(Response.json({ success: true, systemPrompt: 'Prompt' })));
  abort.mockResolvedValue();
  start.mockImplementation(() => { listener({ type: 'final', payload: { text: 'Done' } }); return Promise.resolve(); });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null) });
  vi.stubGlobal('window', { location: { hostname: 'eisland.local' }, api: {
    updaterVersion: vi.fn().mockResolvedValue('1.2.3'),
    onCustomDirectChatEvent: (id: string, callback: (event: Event) => void) => { expect(id).toMatch(/^(ollama|custom-direct)-/); listener = callback; return unsubscribe; },
    customDirectChatStart: start, customDirectChatAbort: abort,
  } });
  const module = await import('../customDirectAgent'); stream = module.streamCustomDirectAgent; clearCache = module.clearCustomDirectPromptCache;
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('customDirectAgent real prompt and IPC boundary', () => {
  it.each([{ token: '' }, { token: undefined }, { message: '' }, { message: undefined }, { baseUrl: '' }, { baseUrl: undefined }, { apiKey: '' }, { apiKey: undefined }])('rejects missing public request values %j', async (patch) => {
    await expect(stream({ ...base, ...patch } as CustomDirectAgentRequest)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled(); expect(start).not.toHaveBeenCalled();
  });

  it('requests the real prompt and sends trimmed user input to IPC', async () => {
    await stream(base);
    expect(fetchMock.mock.calls[0][0]).toContain('/agent/prompt');
    expect(start.mock.calls[0][1]).toMatchObject({ userMessage: 'hello', systemPrompt: 'Prompt' });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
  it('reuses equivalent cache keys then invalidates a changed or explicitly cleared prompt', async () => {
    const first = { ...base, workspaces: ['b', 'a'], skills: [{ name: 'two', content: '2' }, { name: 'one', content: '1' }], snapshotMode: true, agentMode: 'custom-mode' };
    await stream(first);
    await stream({ ...first, workspaces: ['a', 'b'], skills: first.skills.toReversed() });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await stream({ ...first, snapshotMode: false }); expect(fetchMock).toHaveBeenCalledTimes(2);
    clearCache(); await stream(base); expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it('refetches an empty cached prompt and handles empty arrays', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({ success: true, systemPrompt: '' })));
    await stream({ ...base, workspaces: [], skills: [] }); await stream({ ...base, workspaces: [], skills: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it.each([true, false])('maps all intermediate events with callback enabled=%s', async (enabled) => {
    const onEvent = vi.fn();
    const types = ['chunk', 'tool_call_request', 'tool_call_result', 'think', 'stream_rollback', 'meta', 'todo'];
    start.mockImplementation(() => { types.forEach((type) => listener({ type, payload: { text: 'data', thinkingEnabled: true } })); listener({ type: 'final', payload: {} }); return Promise.resolve(); });
    await stream({ ...base, onEvent: enabled ? onEvent : undefined });
    if (enabled) {
      expect(onEvent.mock.calls.map(([event]) => (event as Event).type)).toEqual([...types, 'final']);
      expect(onEvent).toHaveBeenCalledWith({ type: 'meta', payload: { text: 'data', thinkingEnabled: true } });
      expect(onEvent).toHaveBeenCalledWith({ type: 'chunk', payload: { text: 'data' } });
    }
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
  it.each([true, false])('completes an error terminal event with callback enabled=%s', async (enabled) => {
    const onEvent = vi.fn(); start.mockImplementation(() => { listener({ type: 'error', payload: { message: 'Failed' } }); return Promise.resolve(); });
    await stream({ ...base, onEvent: enabled ? onEvent : undefined });
    if (enabled) expect(onEvent).toHaveBeenCalledWith({ type: 'error', payload: { message: 'Failed' } });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
  it.each([new Error('offline'), 'offline'])('reports prompt transport rejection %s', async (error) => {
    fetchMock.mockRejectedValue(error);const onEvent = vi.fn(); await stream({ onEvent, ...base });
    expect(onEvent).toHaveBeenCalledWith({ type: 'error', payload: { code: 'PROMPT_FETCH_FAILED', message: '获取系统提示词失败: offline' } });
    expect(start).not.toHaveBeenCalled();
  });
  it('contains prompt failure without an event callback', async () => {
    fetchMock.mockRejectedValue(new Error('offline')); await stream(base); expect(start).not.toHaveBeenCalled();
  });
  it.each([new Error('offline'), 'offline'])('reports IPC start rejection %s', async (error) => {
    start.mockRejectedValue(error);const onEvent = vi.fn();await stream({ onEvent, ...base });
    expect(onEvent).toHaveBeenCalledWith({ type: 'error', payload: { code: 'IPC_START_FAILED', message: '启动直连 Agent 失败: offline' } });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
  it('contains IPC failure without an event callback', async () => {
    start.mockRejectedValue(new Error('offline'));await stream(base);expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
  it.each([true, false])('completes cancellation when abort IPC fails=%s', async (failed) => {
    const controller = new AbortController(); if (failed) abort.mockRejectedValue(new Error('offline'));
    start.mockImplementation(() => { controller.abort(); return Promise.resolve(); });
    await stream({ ...base, signal: controller.signal });
    expect(abort).toHaveBeenCalledWith(start.mock.calls[0][0]);expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
