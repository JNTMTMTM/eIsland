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
 * @file claudeCodeStatusSupplement.test.ts
 * @description Claude 状态服务的结构化预览、转录富化、历史恢复、配置迁移及身份边界测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'events';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClaudeCodeStatusService } from '../claudeCodeStatusService';
import type { BrowserWindow } from 'electron';
import type { IncomingMessage, ServerResponse } from 'http';
const io = vi.hoisted(() => ({ files: new Map<string, string>(), write: vi.fn<(file: string, content: string) => void>(), read: vi.fn<(file: string) => string>(), lastLines: vi.fn<(file: string) => string[]>(), handler: null as ((request: IncomingMessage, response: ServerResponse) => void) | null, server: null as (EventEmitter & { close: () => void }) | null, listenFails: false, listens: [] as { port: number; host: string }[], createServer: vi.fn<(...args: unknown[]) => unknown>() }));
vi.mock('electron', () => ({ BrowserWindow: class {}, app: { getPath: (name: string) => name === 'home' ? 'C:/test-home' : 'C:/test-data' } }));
vi.mock('fs', () => ({ existsSync: (file: string) => io.files.has(file), mkdirSync: vi.fn(), readFileSync: io.read, writeFileSync: io.write }));
vi.mock('../../utils/textFileLines', () => ({ readLastTextLinesSync: io.lastLines }));
vi.mock('http', async () => {
  const { EventEmitter: Emitter } = await import('events');
  const createServer = (handler: (request: IncomingMessage, response: ServerResponse) => void) => {
    io.createServer(handler); io.handler = handler;
    const server = Object.assign(new Emitter(), { close: vi.fn(), listen: vi.fn((port: number, host: string, done: () => void) => {
      io.listens.push({ port, host });
      if (io.listenFails) queueMicrotask(() => server.emit('error', new Error('port in use'))); else done();
      return server;
    }) });
    io.server = server; return server;
  };
  return { default: { createServer } };
});
const now = Date.parse('2026-10-06T00:00:00Z');
const settings = join('C:/test-home', '.claude', 'settings.json');
const persisted = join('C:/test-data', 'eIsland_store', 'claude-code-status.json');
const heatmap = join('C:/test-data', 'eIsland_store', 'claude-code-heatmap.json');
const script = join('C:/test-data', 'claude-code-hook.cjs');
const send = vi.fn();
const window = { isDestroyed: () => false, webContents: { send } } as unknown as BrowserWindow;
/**
 * 向真实 hook 请求处理器派发内存请求。
 * @param payload - 原始请求正文或待序列化载荷
 * @param method - HTTP 方法
 * @param url - 请求路径
 * @returns 响应写入记录
 */
function request(payload: Record<string, unknown> | string, method = 'POST', url = '/claude-code/hook') {
  const incoming = Object.assign(new EventEmitter(), { method, url, setEncoding: vi.fn() });
  const response = { writeHead: vi.fn<(status: number, headers?: Record<string, string>) => void>(), end: vi.fn<(body?: string) => void>() };
  if (!io.handler) throw new Error('receiver not started');
  io.handler(incoming as unknown as IncomingMessage, response as unknown as ServerResponse);
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  incoming.emit('data', body.slice(0, Math.floor(body.length / 2))); incoming.emit('data', body.slice(Math.floor(body.length / 2))); incoming.emit('end');
  return response;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now); io.files.clear(); io.handler = null; io.server = null; io.listenFails = false; io.listens = []; io.createServer.mockReset();
  io.read.mockReset(); io.read.mockImplementation((file) => io.files.get(file) ?? '');
  io.write.mockReset(); io.write.mockImplementation((file, content) => { io.files.set(file, content); });
  io.lastLines.mockReset(); io.lastLines.mockImplementation((file) => (io.files.get(file) ?? '').split('\n'));
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

/**
 * 最新事件必须存在，避免空集合导致行为断言被跳过。
 * @param service - 真实服务。
 * @returns 最新 hook 事件。
 */
function latest(service: ReturnType<typeof createClaudeCodeStatusService>): ReturnType<typeof service.getSnapshot>['events'][number] {
  const [event] = service.getSnapshot().events;
  if (!event) throw new Error('missing hook event');
  return event;
}
/**
 * 在内存文件边界写入转录正文。
 * @param entries - 时间正序的 JSONL 条目。
 * @returns 虚构转录路径。
 */
function transcript(entries: Record<string, unknown>[]): string {
  const path = 'C:/fixture/transcript.jsonl';
  io.files.set(path, entries.map((entry) => JSON.stringify(entry)).join('\n'));
  return path;
}

describe('Claude structured payload previews and summaries', () => {
  it.each([
    ['PostToolUse', { tool_name: 'Bash', output: 42 }, 'Bash 已完成：42'],
    ['PostToolUse', { tool_name: 'Bash' }, 'Bash 已完成'],
    ['PostToolUseFailure', { tool_name: 'Bash' }, 'Bash 执行失败'],
    ['PostToolUseFailure', {}, 'PostToolUseFailure'],
    ['PermissionDenied', { tool_name: 'Bash' }, 'Bash 授权被拒绝'],
    ['PermissionDenied', {}, '授权被拒绝'],
    ['StopFailure', {}, '本轮异常结束'],
    ['SubagentStart', {}, '子代理开始'],
    ['SubagentStop', {}, '子代理完成'],
    ['PreCompact', {}, '正在压缩上下文'],
  ] as const)('%s returns its concrete summary without a direct message', async (event, fields, summary) => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event, ...fields });
    expect(latest(service).summary).toBe(summary);
    service.stop();
  });
  it.each([
    { value: null, expected: 'null' },
    { value: true, expected: 'true' },
    { value: 'text', expected: 'text' },
    { value: [null, 'item', 2, false], expected: '[null, item, 2, false]' },
    { value: { z: 1, a: 'first' }, expected: '{a: first, z: 1}' },
  ])('renders response preview $expected from actual JSON values', async ({ value, expected }) => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'PostToolUse', tool_name: 'Fixture', output: value });
    expect(latest(service).summary).toBe(`Fixture 已完成：${  expected}`);
    expect(latest(service).detail).toBe(expected);
    service.stop();
  });
  it('clips long previews and collapses whitespace-only values to null', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'x'.repeat(1100) }, message: ' ' });
    expect(latest(service).toolInputPreview).toBe(`${'x'.repeat(999)  }…`);
    const path = transcript([{ role: 'user', content: '\n\t' }]);
    request({ event: 'UserPromptSubmit', transcript_path: path });
    expect(latest(service).detailItems.some((item) => item.label === 'userInput')).toBe(false);
    service.stop();
  });
  it('keeps Notification entirely outside the event stream', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start(); send.mockClear();
    request({ event: 'Notification', title: 'Fixture', message: 'Body' });
    expect(service.getSnapshot().events).toEqual([]);
    expect(send).not.toHaveBeenCalled();
    service.stop();
  });
  it('uses an explicit session title without cwd and keeps a root-only directory title', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'SessionStart', session_id: 'explicit' });
    expect(service.getSnapshot().sessions[0].title).toBe('explicit');
    vi.advanceTimersByTime(1);
    request({ event: 'SessionStart', session_id: 'root', cwd: '/' });
    expect(service.getSnapshot().sessions.find((session) => session.id === 'root')?.title).toBe('/');
    service.stop();
  });
});

describe('Claude transcript enrichment through real JSONL readers', () => {
  it('collects all details and stops when user, assistant, tool input and result are complete', async () => {
    const path = transcript([
      { role: 'other', content: [] },
      { sessionId: 'transcript-session', role: 'assistant', model: 'fixture-model', content: [{ type: 'text', text: 'Answer' }, { type: 'tool_use', id: 'wanted', name: 'Bash', input: { command: 'fixture' } }] },
      { role: 'user', content: [{ type: 'text', text: 'Question' }, { type: 'image' }, { type: 'tool_result', tool_use_id: 'wrong', content: 'Wrong' }, { type: 'tool_result', toolUseId: 'wanted', content: 'Result' }] },
    ]);
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'PostToolUse', transcript_path: path, tool_use_id: 'wanted' });
    const event = latest(service);
    expect(event.toolName).toBe('Bash');
    expect(event.toolInputPreview).toBe('fixture');
    expect(event.detailItems).toEqual(expect.arrayContaining([
      { label: 'userInput', value: 'Question' }, { label: 'assistantOutput', value: 'Answer' },
      { label: 'toolUseId', value: 'wanted' }, { label: 'toolResult', value: 'Result' }, { label: 'model', value: 'fixture-model' },
    ]));
    expect(io.lastLines).toHaveBeenCalledWith(path, 260);
    service.stop();
  });
  it('skips unnamed and mismatched tool blocks and matches a requested name without an ID', async () => {
    const path = transcript([{ role: 'assistant', content: [
      { type: 'tool_use', id: 'wanted', name: 'Bash', input: { command: 'fixture' } },
      { type: 'tool_use', id: 'other', name: 'Read', input: {} },
      { type: 'tool_use', id: 'empty-name' }, { type: 'tool_use', name: 'Bash' },
    ] }]);
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'PreToolUse', transcript_path: path, tool_name: 'Bash' });
    expect(latest(service).detailItems).toContainEqual({ label: 'toolUseId', value: 'wanted' });
    expect(latest(service).toolInputPreview).toBe('fixture');
    service.stop();
  });
  it('retains the most recent assistant details while inspecting older entries for user text', async () => {
    const path = transcript([
      { role: 'user', content: [{ type: 'text', text: 'Question' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Old' }, { type: 'tool_use', id: 'old', name: 'Bash', input: { command: 'old' } }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Recent' }, { type: 'tool_use', id: 'new', name: 'Bash', input: { command: 'new' } }] },
    ]);
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'Stop', transcript_path: path });
    expect(latest(service).detailItems).toContainEqual({ label: 'assistantOutput', value: 'Recent' });
    expect(latest(service).detailItems).toContainEqual({ label: 'userInput', value: 'Question' });
    expect(latest(service).toolInputPreview).toBe('new');
    service.stop();
  });
  it('extracts role-level text arrays, content fallbacks and plain strings', async () => {
    const path = transcript([
      { role: 'assistant', content: ['raw assistant', { type: 'text', content: 'content fallback' }, { text: 'no-type' }, { type: 'image', text: 'skip' }, { type: 'text' }] },
      { role: 'user', content: ['raw user', { type: 'text', content: 'user fallback' }] },
    ]);
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'Stop', transcript_path: path });
    expect(latest(service).detailItems).toContainEqual({ label: 'assistantOutput', value: 'raw assistant\ncontent fallback\nno-type' });
    expect(latest(service).detailItems).toContainEqual({ label: 'userInput', value: 'raw user\nuser fallback' });
    service.stop();
  });
  it('uses a summary entry and ignores unrelated transcript roles', async () => {
    const path = transcript([{ role: 'other' }, { type: 'summary', summary: 'Summary' }, { type: 'summary', summary: 'Latest summary' }]);
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'Stop', transcript_path: path });
    expect(latest(service).detailItems).toContainEqual({ label: 'assistantOutput', value: 'Latest summary' });
    service.stop();
  });
  it('matches a tool result without an expected ID and retains empty result block details', async () => {
    const path = transcript([
      { role: 'assistant', content: [{ type: 'tool_use', id: 'other', name: 'Read', input: {} }] },
      { role: 'user', content: [{ type: 'text', text: 'Question' }, { type: 'tool_result', toolUseId: 'wanted', content: null }] },
    ]);
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'PostToolUse', transcript_path: path });
    expect(latest(service).detailItems).toContainEqual({ label: 'toolUseId', value: 'wanted' });
    expect(latest(service).detailItems.find((item) => item.label === 'toolResult')?.value).toContain('"toolUseId": "wanted"');
    service.stop();
  });
  it('handles clipped transcript strings and missing matching tool IDs', async () => {
    const path = transcript([{ role: 'assistant', content: 'A'.repeat(200) }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'wrong', content: 'Result' }] }]);
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'Stop', transcript_path: path, tool_use_id: 'wanted' });
    expect(latest(service).detailItems).toContainEqual({ label: 'assistantOutput', value: `${'A'.repeat(139)  }…` });
    expect(latest(service).detailItems.some((item) => item.label === 'toolResult')).toBe(false);
    service.stop();
  });
  it('backfills an already-cleared event without recreating its deleted session', async () => {
    const path = 'C:/fixture/late.jsonl'; io.files.set(path, '');
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'Stop', session_id: 'late', transcript_path: path });
    service.clearEvents();
    io.files.set(path, JSON.stringify({ role: 'assistant', content: 'Late answer' }));
    await vi.advanceTimersByTimeAsync(350);
    expect(service.getSnapshot().sessions).toEqual([]);
    expect(service.getSnapshot().events).toEqual([]);
    service.stop();
  });
});

describe('Claude persisted state, hook migration and retained identity mappings', () => {
  it.each([{ events: {}, sessions: {} }, { events: [], sessions: [null] }, { events: [], sessions: [{ id: 3, lastEventAt: 1 }] }])('ignores invalid persisted shapes %#', async (stored) => {
    io.files.set(persisted, JSON.stringify(stored));
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    expect(service.getSnapshot().sessions).toEqual([]);
    expect(service.getSnapshot().events).toEqual([]);
    service.stop();
  });
  it('restores a transcript-only running session and all heatmap counter types', async () => {
    io.files.set(persisted, JSON.stringify({ sessions: [{ id: 'saved', title: 'saved', phase: 'running', cwd: null, transcriptPath: 'saved.jsonl', lastEventAt: now, events: [], pendingPermission: null }] }));
    io.files.set(heatmap, JSON.stringify({ daily: { numeric: { session: 1, tool: 2, prompt: 3 }, missing: { session: 'bad' } } }));
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'Unknown', transcript_path: 'saved.jsonl' });
    expect(service.getSnapshot().sessions).toHaveLength(1);
    expect(service.getSnapshot().sessions[0].id).toBe('saved');
    expect(service.getSnapshot().heatmap).toEqual({ numeric: { session: 1, tool: 2, prompt: 3 }, missing: { session: 0, tool: 0, prompt: 0 } });
    service.stop();
  });
  it('keeps installed hook commands unchanged on an identical second startup', async () => {
    const first = createClaudeCodeStatusService({ getMainWindow: () => window }); await first.installHook(); first.stop();
    io.write.mockClear();
    const second = createClaudeCodeStatusService({ getMainWindow: () => window }); await second.start();
    expect(io.write.mock.calls.filter(([file]) => file === settings)).toEqual([]);
    expect(io.files.get(script)).toContain('PermissionRequest');
    second.stop();
  });
  it('removes malformed managed groups while preserving arbitrary user hooks', async () => {
    io.files.set(settings, JSON.stringify({ hooks: { Unknown: [{ hooks: 'bad' }, { hooks: [{}, { command: 'keep' }, { command: 'eisland-claude-code-status' }] }] } }));
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.uninstallHook();
    expect(JSON.parse(io.files.get(settings) ?? '{}')).toEqual({ hooks: { Unknown: [{ hooks: [{}, { command: 'keep' }] }] } });
    service.stop();
  });
  it('uses a cwd mapping without an explicit session ID and tolerates a deleted merge source', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'SessionStart', session_id: 'old', cwd: 'C:/shared' });
    request({ event: 'Unknown', cwd: 'C:/shared' });
    expect(service.getSnapshot().sessions).toHaveLength(1);
    service.deleteSessions(['old']);
    request({ event: 'Unknown', session_id: 'new', cwd: 'C:/shared' });
    expect(service.getSnapshot().sessions.map((session) => session.id)).toEqual(['new']);
    service.stop();
  });
  it('merges a still-open permission waiter after its source status has changed', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'SessionStart', session_id: 'target', cwd: 'C:/target' });
    const waiting = request({ event: 'PermissionRequest', session_id: 'source', cwd: 'C:/source' });
    request({ event: 'PreToolUse', session_id: 'source', cwd: 'C:/source', tool_name: 'Bash' });
    request({ event: 'Unknown', session_id: 'target', cwd: 'C:/source' });
    service.resolvePermission('target', 'allow');
    expect(waiting.end).toHaveBeenCalledWith('{"ok":true,"decision":"allow"}');
    expect(service.getSnapshot().sessions).toHaveLength(1);
    service.stop();
  });
});

describe('Claude delayed transcript backfills and session retention', () => {
  it('backfills missing prompt, tool identifier and tool result after the transcript arrives', async () => {
    const path = 'C:/fixture/backfill.jsonl'; io.files.set(path, '');
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'UserPromptSubmit', session_id: 'late', transcript_path: path });
    request({ event: 'PostToolUse', session_id: 'late', transcript_path: path });
    io.files.set(path, [
      JSON.stringify({ role: 'assistant', content: [{ type: 'tool_use', id: 'late-tool', name: 'Bash', input: { command: 'fixture' } }] }),
      JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'Late question' }, { type: 'tool_result', tool_use_id: 'late-tool', content: 'Late result' }] }),
    ].join('\n'));
    await vi.advanceTimersByTimeAsync(350);
    const promptEvent = service.getSnapshot().events.find((event) => event.eventName === 'UserPromptSubmit');
    const toolEvent = service.getSnapshot().events.find((event) => event.eventName === 'PostToolUse');
    expect(promptEvent?.detailItems).toContainEqual({ label: 'userInput', value: 'Late question' });
    expect(toolEvent?.detailItems).toContainEqual({ label: 'toolUseId', value: 'late-tool' });
    expect(toolEvent?.detailItems).toContainEqual({ label: 'toolResult', value: 'Late result' });
    service.stop();
  });
  it('retains the newest user input and tool result across earlier user entries', async () => {
    const path = transcript([
      { role: 'user', content: [{ type: 'text', text: 'Old question' }, { type: 'tool_result', tool_use_id: 'old', content: 'Old result' }] },
      { role: 'user', content: [{ type: 'text', text: 'New question' }, { type: 'tool_result', tool_use_id: 'new', content: 'New result' }] },
    ]);
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'PostToolUse', transcript_path: path });
    expect(latest(service).detailItems).toContainEqual({ label: 'userInput', value: 'New question' });
    expect(latest(service).detailItems).toContainEqual({ label: 'toolResult', value: 'New result' });
    expect(latest(service).detailItems.some((item) => item.value === 'Old result')).toBe(false);
    service.stop();
  });
  it('omits whitespace-only structured detail values', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'PreToolUse', tool_input: ' ', reason: ' ' });
    expect(latest(service).toolInputPreview).toBeNull();
    expect(latest(service).detailItems.some((item) => item.label === 'toolInput' || item.label === 'reason')).toBe(false);
    service.stop();
  });
  it('merges an old identity through its transcript anchor without a cwd anchor', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'SessionStart', session_id: 'old', transcript_path: 'fixture.jsonl' });
    request({ event: 'Unknown', session_id: 'new', transcript_path: 'fixture.jsonl' });
    expect(service.getSnapshot().sessions.map((session) => session.id)).toEqual(['new']);
    expect(service.getSnapshot().events.every((event) => event.sessionId === 'new')).toBe(true);
    service.stop();
  });
  it('evicts sessions outside the forty-session retention limit', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    Array.from({ length: 41 }, (value, index) => { void value; return index; }).forEach((index) => {
      vi.advanceTimersByTime(1);
      request({ event: 'SessionStart', session_id: `session-${  index}` });
    });
    expect(service.getSnapshot().sessions).toHaveLength(40);
    expect(service.getSnapshot().sessions.some((session) => session.id === 'session-0')).toBe(false);
    expect(service.getSnapshot().sessions.some((session) => session.id === 'session-40')).toBe(true);
    service.stop();
  });
});

describe('Claude retry timing and unreadable settings', () => {
  it('retries missing transcript details at the exact twelve-hundred-millisecond boundary', async () => {
    const path = 'C:/fixture/retry.jsonl'; io.files.set(path, '');
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'Stop', transcript_path: path });
    await vi.advanceTimersByTimeAsync(350);
    expect(latest(service).detailItems.some((item) => item.label === 'assistantOutput')).toBe(false);
    io.files.set(path, JSON.stringify({ role: 'assistant', content: 'Retry answer' }));
    await vi.advanceTimersByTimeAsync(849);
    expect(latest(service).detailItems.some((item) => item.label === 'assistantOutput')).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(latest(service).detailItems).toContainEqual({ label: 'assistantOutput', value: 'Retry answer' });
    service.stop();
  });
  it('reports disabled status when installed settings cannot be read', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    io.files.set(settings, 'eisland-claude-code-status');
    io.read.mockImplementation(() => { throw new Error('permission denied'); });
    expect(service.getSnapshot().enabled).toBe(false);
    service.stop();
  });
});
