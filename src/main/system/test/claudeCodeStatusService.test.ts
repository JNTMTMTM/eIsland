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
 * @file claudeCodeStatusService.test.ts
 * @description Claude hook 服务的 HTTP 输入、授权生命周期、持久化与配置保留测试。
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
/**
 * 构造常用 hook 载荷，同时保留单独会话的身份。
 * @param event - hook 事件名
 * @param id - 会话标识
 * @returns hook 请求载荷
 */
function payload(event: string, id = 'session'): Record<string, unknown> { return { hook_event_name: event, session_id: id, cwd: `C:/work/${  id}` }; }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now); io.files.clear(); io.handler = null; io.server = null; io.listenFails = false; io.listens = []; io.createServer.mockReset();
  io.read.mockReset(); io.read.mockImplementation((file) => io.files.get(file) ?? '');
  io.write.mockReset(); io.write.mockImplementation((file, content) => { io.files.set(file, content); });
  io.lastLines.mockReset(); io.lastLines.mockImplementation((file) => (io.files.get(file) ?? '').split('\n'));
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
describe('Claude receiver lifecycle', () => {
  it('starts once on loopback and closes once with a final disconnected snapshot', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window, port: 18000 });
    await service.start(); await service.start(); expect(io.createServer).toHaveBeenCalledOnce(); expect(io.listens).toEqual([{ port: 18000, host: '127.0.0.1' }]);
    expect(service.getSnapshot()).toMatchObject({ enabled: false, receiverRunning: true, receiverUrl: 'http://127.0.0.1:18000/claude-code/hook' });
    expect(io.files.get(script)).toContain('port: 18000');
    expect(io.files.get(script)).toContain('PermissionRequest');
    const close = vi.spyOn(io.server!, 'close'); service.stop(); service.stop();
    expect(close).toHaveBeenCalledOnce(); expect(service.getSnapshot()).toMatchObject({ receiverRunning: false, receiverUrl: null });
  });
  it('resolves startup on a listen error and suppresses sends to absent windows', async () => {
    io.listenFails = true; const service = createClaudeCodeStatusService({ getMainWindow: () => null }); await service.start();
    expect(service.getSnapshot()).toMatchObject({ receiverRunning: false, receiverUrl: null }); expect(send).not.toHaveBeenCalled();
  });
  it('restores historical pending sessions as idle and normalizes heatmap counts', async () => {
    io.files.set(persisted, JSON.stringify({ sessions: [{ id: 'saved', title: 'saved', phase: 'waiting_permission', cwd: 'C:/saved', transcriptPath: null, lastEventAt: now, events: [], pendingPermission: {} }], events: [] }));
    io.files.set(heatmap, JSON.stringify({ daily: { '2026-10-6': { session: 2, tool: 'bad' } } }));
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    expect(service.getSnapshot().sessions[0]).toMatchObject({ id: 'saved', phase: 'idle', pendingPermission: null });
    expect(service.getSnapshot().heatmap['2026-10-6']).toEqual({ session: 2, tool: 0, prompt: 0 }); service.stop();
  });
  it('ignores corrupt persistence and survives debounced disk write failures', async () => {
    io.files.set(persisted, '{'); io.files.set(heatmap, '{');
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    expect(service.getSnapshot().sessions).toHaveLength(0);
    io.write.mockImplementation(() => { throw new Error('disk full'); });
    request({ ...payload('UserPromptSubmit'), prompt: 'hello' });
    await vi.advanceTimersByTimeAsync(400); expect(service.getSnapshot().events).toHaveLength(1); service.stop();
  });
});
describe('Claude hook requests and state', () => {
  it.each([['GET', '/claude-code/hook'], ['POST', '/other']])('rejects %s %s without storing an event', async (method, url) => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    const response = request({}, method, url); expect(response.writeHead).toHaveBeenCalledWith(404); expect(service.getSnapshot().events).toHaveLength(0); service.stop();
  });
  it('returns 400 for invalid JSON, ignores Notification and accepts empty-body unknown events', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    expect(request('{bad').writeHead).toHaveBeenCalledWith(400, { 'content-type': 'application/json' });
    send.mockClear(); const ignored = request(payload('Notification')); expect(ignored.end).toHaveBeenCalledWith('{"ok":true}');
    expect(service.getSnapshot().events).toHaveLength(0); expect(send).not.toHaveBeenCalled();
    request(''); expect(service.getSnapshot().events[0]).toMatchObject({ eventName: 'Unknown', kind: 'unknown', sessionId: 'claude-code' }); service.stop();
  });
  it.each([['SessionStart', 'idle', 'session'], ['UserPromptSubmit', 'running', 'message'], ['PreToolUse', 'running', 'tool'], ['PostToolUseFailure', 'running', 'tool'], ['Stop', 'idle', 'completed'], ['SessionEnd', 'completed', 'completed']])('maps %s to %s and %s', async (event, phase, kind) => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ ...payload(event), tool_name: 'Bash', tool_input: { command: 'npm test' }, prompt: 'hello', last_assistant_message: 'Done' });
    expect(service.getSnapshot().sessions[0].phase).toBe(phase); expect(service.getSnapshot().events[0].kind).toBe(kind);
    expect(service.getSnapshot().events[0].detailItems).toContainEqual({ label: 'userInput', value: 'hello' }); service.stop();
  });
  it('merges identity aliases by cwd and transcript and retains recent event limits', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ hookEventName: 'SessionStart', cwd: 'C:/shared', transcriptPath: 'shared.jsonl' });
    request({ event: 'UserPromptSubmit', sessionId: 'canonical', cwd: 'C:/shared', transcriptPath: 'shared.jsonl', prompt: 'hello' });
    const snapshot = service.getSnapshot(); expect(snapshot.sessions).toHaveLength(1); expect(snapshot.sessions[0].id).toBe('canonical');
    expect(snapshot.events.every((event) => event.sessionId === 'canonical')).toBe(true);
    expect(snapshot.sessions[0].events.every((event) => event.sessionId === 'canonical')).toBe(true);
    Array.from({ length: 130 }).forEach((entry, index) => { void entry; vi.setSystemTime(now + index); request({ ...payload('PreToolUse'), tool_name: 'Read', tool_input: { file_path: 'README.md' } }); });
    expect(service.getSnapshot().events).toHaveLength(120); expect(service.getSnapshot().sessions.find((session) => session.id === 'session')?.events).toHaveLength(40); service.stop();
  });
  it('enriches tools from transcripts and backfills late assistant output', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    const transcript = 'C:/transcript.jsonl';
    io.files.set(transcript, JSON.stringify({ message: { role: 'assistant', model: 'test-model', content: [{ type: 'tool_use', id: 'use-1', name: 'Read', input: { file_path: 'README.md' } }] } }));
    request({ ...payload('PreToolUse'), transcript_path: transcript });
    expect(service.getSnapshot().events[0]).toMatchObject({ toolName: 'Read', toolInputPreview: 'README.md' });
    request({ ...payload('Stop'), transcript_path: transcript });
    expect(service.getSnapshot().events[0].detailItems.some((item) => item.label === 'assistantOutput')).toBe(false);
    io.files.set(transcript, JSON.stringify({ message: { role: 'assistant', content: [{ type: 'text', text: 'late answer' }] } }));
    await vi.advanceTimersByTimeAsync(350);
    expect(service.getSnapshot().events[0].detailItems).toContainEqual({ label: 'assistantOutput', value: 'late answer' }); service.stop();
  });
  it('clears selected events while keeping cumulative heatmap and debounces persistence', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start(); io.write.mockClear();
    request(payload('SessionStart', 'one')); request({ ...payload('UserPromptSubmit', 'two'), prompt: 'hello' });
    expect(service.deleteSessions(['', 'one', 'one']).sessions.map((session) => session.id)).toEqual(['two']);
    const noOp = service.deleteSessions(['']); expect(noOp.events).toHaveLength(1);
    const cleared = service.clearEvents(); expect(cleared.sessions).toHaveLength(0);
    expect(Object.values(cleared.heatmap)[0]).toEqual({ session: 1, tool: 0, prompt: 1 });
    await vi.advanceTimersByTimeAsync(399); expect(io.write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); expect(io.write).toHaveBeenCalledTimes(2); service.stop();
  });
});
describe('Claude permission lifecycle', () => {
  it.each(['allow', 'always', 'deny'] as const)('answers %s exactly once and clears pending permission state', async (decision) => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    const response = request({ ...payload('PermissionRequest'), tool_name: 'Bash' });
    expect(response.end).not.toHaveBeenCalled(); expect(service.getSnapshot().sessions[0].phase).toBe('waiting_permission');
    expect(service.resolvePermission('session', decision).sessions[0]).toMatchObject({ phase: 'running', pendingPermission: null });
    expect(response.end).toHaveBeenCalledWith(`{"ok":true,"decision":"${  decision  }"}`);
    service.resolvePermission('session', decision); expect(response.end).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10 * 60_000); expect(response.end).toHaveBeenCalledOnce(); service.stop();
  });
  it('expires unresolved permissions and replaces same-session waiters without hanging responses', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    const first = request(payload('PermissionRequest')); const second = request(payload('PermissionRequest'));
    expect(first.end).toHaveBeenCalledWith('{"ok":true,"decision":null}'); expect(second.end).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10 * 60_000); expect(second.end).toHaveBeenCalledWith('{"ok":true,"decision":null}'); service.stop();
  });
  it('releases all waiting requests on stop and tolerates disconnected clients', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    const first = request(payload('PermissionRequest', 'one')); const second = request(payload('PermissionRequest', 'two'));
    first.end.mockImplementation(() => { throw new Error('disconnected'); });
    expect(() => service.stop()).not.toThrow(); expect(second.end).toHaveBeenCalledWith('{"ok":true,"decision":null}');
    const calls = second.end.mock.calls.length; await vi.advanceTimersByTimeAsync(10 * 60_000); expect(second.end).toHaveBeenCalledTimes(calls);
  });
});
interface SettingsFixture { env?: { preserve: string }; hooks?: Record<string, { matcher?: string; hooks: { command: string; timeout?: number }[] }[]>; }
describe('Claude managed hook settings', () => {
  it('preserves user hooks and other keys, installs once and removes legacy managed groups', async () => {
    io.files.set(settings, JSON.stringify({ env: { preserve: 'yes' }, hooks: { PreToolUse: [{ matcher: 'Read', hooks: [{ command: 'custom-command' }] }], Notification: [{ hooks: [{ command: 'old # eisland-claude-code-status' }] }] } }));
    const service = createClaudeCodeStatusService({ getMainWindow: () => window });
    expect((await service.installHook()).ok).toBe(true); expect((await service.installHook()).snapshot.enabled).toBe(true);
    const installed = JSON.parse(io.files.get(settings)!) as SettingsFixture;
    expect(installed.env).toEqual({ preserve: 'yes' }); expect(installed.hooks!.PreToolUse).toHaveLength(2);
    expect(installed.hooks!.PreToolUse[0].hooks[0].command).toBe('custom-command');
    expect(installed.hooks!.PermissionRequest[0].hooks[0]).toMatchObject({ timeout: 86400 });
    expect(installed.hooks!.PermissionRequest[0].matcher).toBe('*');
    expect((await service.uninstallHook()).ok).toBe(true);
    const removed = JSON.parse(io.files.get(settings)!) as SettingsFixture;
    expect(removed.env).toEqual({ preserve: 'yes' }); expect(Object.keys(removed.hooks!)).toEqual(['PreToolUse']); service.stop();
  });
  it('uninstalls absent settings and drops the hooks key when only managed entries exist', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); expect((await service.uninstallHook()).ok).toBe(true);
    await service.installHook(); await service.uninstallHook();
    expect(JSON.parse(io.files.get(settings)!) as SettingsFixture).not.toHaveProperty('hooks'); service.stop();
  });
  it('returns mutation failures for malformed settings and filesystem errors', async () => {
    io.files.set(settings, '{broken'); const service = createClaudeCodeStatusService({ getMainWindow: () => window });
    expect((await service.installHook()).ok).toBe(false); expect((await service.uninstallHook()).ok).toBe(false);
    io.files.delete(settings); io.write.mockImplementation(() => { throw new Error('readonly'); });
    const fresh = createClaudeCodeStatusService({ getMainWindow: () => window }); expect((await fresh.installHook()).message).toContain('readonly'); service.stop();
  });
});

describe('Claude canonical event identity regression', () => {
  it('normalizes nested events and pending permissions when a provisional session receives its explicit ID', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    const provisional = request({ event: 'PermissionRequest', cwd: 'C:/shared', transcriptPath: 'shared.jsonl', tool_name: 'Bash' });
    expect(service.getSnapshot().sessions[0].pendingPermission?.sessionId).toBe('shared.jsonl');
    const canonical = request({ event: 'PermissionRequest', sessionId: 'canonical', cwd: 'C:/shared', transcriptPath: 'shared.jsonl', tool_name: 'Read' });
    const snapshot = service.getSnapshot();
    expect(snapshot.events.map((event) => event.sessionId)).toEqual(['canonical', 'canonical']);
    expect(snapshot.sessions).toHaveLength(1);
    expect(snapshot.sessions[0].events.map((event) => event.sessionId)).toEqual(['canonical', 'canonical']);
    expect(snapshot.sessions[0].pendingPermission).toMatchObject({ eventName: 'PermissionRequest', sessionId: 'canonical', toolName: 'Read' });
    expect(provisional.end).toHaveBeenCalledWith('{"ok":true,"decision":null}');
    service.stop(); expect(provisional.end).toHaveBeenCalledOnce(); expect(canonical.end).toHaveBeenCalledOnce();
  });
});

describe('Claude canonical permission waiter regression', () => {
  it.each(['allow', 'deny'] as const)('answers the original request with %s after its session ID changes', async (decision) => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    const original = request({ event: 'PermissionRequest', cwd: 'C:/shared', transcriptPath: 'shared.jsonl', tool_name: 'Bash' });
    request({ event: 'Unknown', sessionId: 'canonical', cwd: 'C:/shared', transcriptPath: 'shared.jsonl' });
    const snapshot = service.getSnapshot();
    expect(snapshot.events.every((event) => event.sessionId === 'canonical')).toBe(true);
    expect(snapshot.sessions[0].events.every((event) => event.sessionId === 'canonical')).toBe(true);
    expect(snapshot.sessions[0]).toMatchObject({ id: 'canonical', phase: 'waiting_permission', pendingPermission: { eventName: 'PermissionRequest', sessionId: 'canonical', toolName: 'Bash' } });
    service.resolvePermission('canonical', decision);
    expect(original.end).toHaveBeenCalledWith(`{"ok":true,"decision":"${decision}"}`);
    expect(service.getSnapshot().sessions[0]).toMatchObject({ phase: 'running', pendingPermission: null });
    await vi.advanceTimersByTimeAsync(10 * 60_000); expect(original.end).toHaveBeenCalledOnce(); service.stop();
  });
  it('retains the original timeout deadline through consecutive canonical ID changes', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    const original = request({ event: 'PermissionRequest', cwd: 'C:/shared', transcriptPath: 'shared.jsonl' });
    await vi.advanceTimersByTimeAsync(9 * 60_000);
    request({ event: 'Unknown', sessionId: 'canonical', cwd: 'C:/shared', transcriptPath: 'shared.jsonl' });
    request({ event: 'Unknown', sessionId: 'new-canonical', cwd: 'C:/shared', transcriptPath: 'shared.jsonl' });
    await vi.advanceTimersByTimeAsync(59_999); expect(original.end).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); expect(original.end).toHaveBeenCalledWith('{"ok":true,"decision":null}');
    service.resolvePermission('new-canonical', 'allow'); expect(original.end).toHaveBeenCalledOnce(); service.stop();
  });
  it('cleans up the migrated response and timer on stop', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    const original = request({ event: 'PermissionRequest', cwd: 'C:/shared', transcriptPath: 'shared.jsonl' });
    request({ event: 'Unknown', sessionId: 'canonical', cwd: 'C:/shared', transcriptPath: 'shared.jsonl' });
    service.stop(); expect(original.end).toHaveBeenCalledWith('{"ok":true,"decision":null}');
    await vi.advanceTimersByTimeAsync(10 * 60_000); expect(original.end).toHaveBeenCalledOnce();
  });
  it('clears the visible permission when a real tool completion exits the waiting phase', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    const original = request({ event: 'PermissionRequest', cwd: 'C:/shared', transcriptPath: 'shared.jsonl' });
    request({ event: 'PostToolUse', sessionId: 'canonical', cwd: 'C:/shared', transcriptPath: 'shared.jsonl' });
    expect(service.getSnapshot().sessions[0]).toMatchObject({ phase: 'running', pendingPermission: null });
    service.stop(); expect(original.end).toHaveBeenCalledWith('{"ok":true,"decision":null}'); expect(original.end).toHaveBeenCalledOnce();
  });
  it('moves an unanswered request into an existing target session without a target waiter', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    request({ event: 'SessionStart', sessionId: 'canonical', cwd: 'C:/target', transcriptPath: 'target.jsonl' });
    const original = request({ event: 'PermissionRequest', cwd: 'C:/shared', transcriptPath: 'shared.jsonl', tool_name: 'Bash' });
    request({ event: 'Unknown', sessionId: 'canonical', cwd: 'C:/shared', transcriptPath: 'shared.jsonl' });
    const snapshot = service.getSnapshot(); expect(snapshot.sessions).toHaveLength(1);
    expect(snapshot.sessions[0]).toMatchObject({ phase: 'waiting_permission', pendingPermission: { eventName: 'PermissionRequest', sessionId: 'canonical', toolName: 'Bash' } });
    expect(snapshot.events.every((event) => event.sessionId === 'canonical')).toBe(true);
    expect(snapshot.sessions[0].events.every((event) => event.sessionId === 'canonical')).toBe(true);
    service.resolvePermission('canonical', 'deny'); expect(original.end).toHaveBeenCalledWith('{"ok":true,"decision":"deny"}');
    service.stop(); expect(original.end).toHaveBeenCalledOnce();
  });
  it('retains the target waiter and releases the source waiter when sessions merge', async () => {
    const service = createClaudeCodeStatusService({ getMainWindow: () => window }); await service.start();
    const target = request({ event: 'PermissionRequest', sessionId: 'canonical', cwd: 'C:/target', transcriptPath: 'target.jsonl', tool_name: 'Read' });
    const source = request({ event: 'PermissionRequest', cwd: 'C:/shared', transcriptPath: 'shared.jsonl', tool_name: 'Bash' });
    request({ event: 'Unknown', sessionId: 'canonical', cwd: 'C:/shared', transcriptPath: 'shared.jsonl' });
    expect(source.end).toHaveBeenCalledWith('{"ok":true,"decision":null}'); expect(target.end).not.toHaveBeenCalled();
    const snapshot = service.getSnapshot(); expect(snapshot.sessions).toHaveLength(1);
    expect(snapshot.events.every((event) => event.sessionId === 'canonical')).toBe(true);
    expect(snapshot.sessions[0].events.every((event) => event.sessionId === 'canonical')).toBe(true);
    expect(snapshot.sessions[0]).toMatchObject({ phase: 'waiting_permission', pendingPermission: { eventName: 'PermissionRequest', sessionId: 'canonical', toolName: 'Read' } });
    await vi.advanceTimersByTimeAsync(400); expect(vi.getTimerCount()).toBe(1);
    service.resolvePermission('canonical', 'allow'); expect(target.end).toHaveBeenCalledWith('{"ok":true,"decision":"allow"}');
    await vi.advanceTimersByTimeAsync(10 * 60_000); expect(target.end).toHaveBeenCalledOnce(); expect(source.end).toHaveBeenCalledOnce(); service.stop();
  });
});
