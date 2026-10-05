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
 * @file codexStatusService.test.ts
 * @description Codex 状态服务的真实 rollout、缓存、监视切换与删除阈值测试。
 * @author 鸡哥
 */

import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCodexStatusService } from '../codexStatusService';
import type { BrowserWindow } from 'electron';
interface Entry { name: string; isDirectory: () => boolean; isFile: () => boolean; }
const io = vi.hoisted(() => ({ files: new Map<string, string>(), entries: new Map<string, Entry[]>(), meta: new Map<string, { mtimeMs: number; size: number }>(), readLines: vi.fn<(file: string) => Iterable<string>>(), write: vi.fn<(file: string, text: string) => void>(), scan: vi.fn<(directory: string) => Entry[]>(), stat: vi.fn<(file: string) => { mtimeMs: number; size: number }>() }));
vi.mock('electron', () => ({ app: { getPath: (name: string) => name === 'home' ? 'C:/test-home' : 'C:/test-data' } }));
vi.mock('fs', () => ({ existsSync: (file: string) => io.files.has(file) || io.entries.has(file), mkdirSync: vi.fn(), readFileSync: (file: string) => io.files.get(file) ?? '', readdirSync: io.scan, statSync: io.stat, writeFileSync: io.write }));
vi.mock('../../utils/textFileLines', () => ({ readTextLinesSync: io.readLines }));
const root = join('C:/test-home', '.codex', 'sessions');
const persisted = join('C:/test-data', 'eIsland_store', 'codex-status-state.json');
const send = vi.fn();
const window = { isDestroyed: () => false, webContents: { send } } as unknown as BrowserWindow;
const now = Date.parse('2026-10-06T00:00:00Z');
/**
 * 添加虚拟 rollout，文件读取仅来自内存。
 * @param id - 会话标识
 * @param event - 最新事件类型
 * @param timestamp - 最新事件毫秒时间
 * @returns 内存文件路径
 */
function rollout(id = 'session', event = 'user_message', timestamp = now - 1000): string {
  const file = join(root, `${id  }.jsonl`);
  const content = [{ type: 'session_meta', timestamp: new Date(timestamp - 1000).toISOString(), payload: { id, cwd: 'C:/work/demo' } }, { type: 'event_msg', timestamp: new Date(timestamp).toISOString(), payload: { type: event, message: 'Prompt', last_agent_message: 'Done' } }].map((line) => JSON.stringify(line)).join('\n');
  io.files.set(file, content); io.meta.set(file, { mtimeMs: timestamp, size: content.length });
  io.entries.set(root, [...(io.entries.get(root) ?? []).filter((entry) => entry.name !== `${id  }.jsonl`), { name: `${id  }.jsonl`, isDirectory: () => false, isFile: () => true }]);
  return file;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now); io.files.clear(); io.entries.clear(); io.meta.clear();
  io.write.mockReset(); io.write.mockImplementation((file, content) => { io.files.set(file, content); });
  io.scan.mockReset(); io.scan.mockImplementation((directory) => io.entries.get(directory) ?? []);
  io.stat.mockReset(); io.stat.mockImplementation((file) => { const meta = io.meta.get(file); if (!meta) throw new Error('rotated'); return meta; });
  io.readLines.mockReset(); io.readLines.mockImplementation((file) => (io.files.get(file) ?? '').split('\n'));
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
describe('createCodexStatusService', () => {
  it('starts with real parsed rollouts, caches unchanged files and only emits changed signatures', async () => {
    const file = rollout();
    const service = createCodexStatusService({ getMainWindow: () => window, pollIntervalMs: 100 });
    await service.start(); expect(service.getSnapshot()).toMatchObject({ enabled: true, receiverRunning: true });
    expect(service.getSnapshot().sessions[0]).toMatchObject({ id: 'session', phase: 'running', title: 'demo' });
    const reads = io.readLines.mock.calls.length; const notifications = send.mock.calls.length;
    await vi.advanceTimersByTimeAsync(100);
    expect(io.readLines).toHaveBeenCalledTimes(reads); expect(send).toHaveBeenCalledTimes(notifications);
    io.meta.set(file, { mtimeMs: now, size: 123 }); io.files.set(file, `${io.files.get(file)!  }\n${  JSON.stringify({ type: 'event_msg', timestamp: new Date(now).toISOString(), payload: { type: 'task_complete', last_agent_message: 'Done' } })}`);
    await vi.advanceTimersByTimeAsync(100); expect(service.getSnapshot().sessions[0].phase).toBe('idle');
    expect(io.readLines.mock.calls.length).toBeGreaterThan(reads); service.stop(); expect(vi.getTimerCount()).toBe(0);
  });
  it('removes disappeared files and ignores invalid, unreadable and rotated entries', async () => {
    const file = rollout(); rollout('invalid'); io.files.set(join(root, 'invalid.jsonl'), '{broken');
    const service = createCodexStatusService({ getMainWindow: () => window, pollIntervalMs: 100 });
    await service.start(); expect(service.getSnapshot().sessions).toHaveLength(1);
    io.meta.delete(file); await vi.advanceTimersByTimeAsync(100); expect(service.getSnapshot().sessions).toHaveLength(0);
    io.scan.mockImplementationOnce(() => { throw new Error('denied'); }); await vi.advanceTimersByTimeAsync(100);
    expect(service.getSnapshot().events).toHaveLength(0); service.stop();
  });
  it('loads disabled persistence and toggles monitoring without duplicate intervals', async () => {
    io.files.set(persisted, JSON.stringify({ enabled: false })); rollout();
    const service = createCodexStatusService({ getMainWindow: () => window });
    await service.start(); expect(service.getSnapshot()).toMatchObject({ enabled: false, receiverRunning: false, sessions: [] });
    expect(vi.getTimerCount()).toBe(0); expect((await service.enableMonitor()).ok).toBe(true);
    await service.enableMonitor(); expect(vi.getTimerCount()).toBe(1);
    expect((await service.disableMonitor()).snapshot).toMatchObject({ enabled: false, receiverRunning: false });
    expect(vi.getTimerCount()).toBe(0); service.stop();
  });
  it('falls back for corrupt config and survives persistence and file read failures', async () => {
    io.files.set(persisted, '{'); rollout(); io.readLines.mockImplementationOnce(() => { throw new Error('read error'); });
    io.write.mockImplementation(() => { throw new Error('disk full'); });
    const service = createCodexStatusService({ getMainWindow: () => null }); await service.start();
    expect(service.getSnapshot().enabled).toBe(true); expect(service.getSnapshot().sessions).toHaveLength(0);
    expect((await service.disableMonitor()).ok).toBe(true); service.stop(); expect(send).not.toHaveBeenCalled();
  });
  it('deletes only selected sessions until a new event arrives and retains aggregate heatmap', async () => {
    rollout('one'); rollout('two'); const service = createCodexStatusService({ getMainWindow: () => window, pollIntervalMs: 100 }); await service.start();
    const deleted = service.deleteSessions(['', 'one', 'one']); expect(deleted.sessions.map((session) => session.id)).toEqual(['two']);
    expect(Object.values(deleted.heatmap)[0].prompt).toBe(2);
    rollout('one', 'user_message', now + 1); await vi.advanceTimersByTimeAsync(100); expect(service.getSnapshot().sessions).toHaveLength(2);
    const cleared = service.clearEvents(); expect(cleared.sessions).toHaveLength(0); expect(Object.values(cleared.heatmap)[0].prompt).toBe(2); service.stop();
  });
  it('marks stale activity completed and suppresses broadcasts to destroyed windows', async () => {
    rollout('old', 'user_message', now - 11 * 60_000);
    const target = { isDestroyed: () => true } as unknown as BrowserWindow;
    const service = createCodexStatusService({ getMainWindow: () => target }); await service.start();
    expect(service.getSnapshot().sessions[0].phase).toBe('completed'); expect(send).not.toHaveBeenCalled(); service.stop();
  });
});

describe('Codex scanning and history boundaries', () => {
  it('recurses directories and skips non-jsonl files and entries that are neither files nor folders', async () => {
    const original = rollout('nested');
    const child = join(root, '2026'); const file = join(child, 'nested.jsonl');
    io.files.set(file, io.files.get(original)!); io.meta.set(file, io.meta.get(original)!);
    io.entries.set(child, [{ name: 'nested.jsonl', isDirectory: () => false, isFile: () => true }]);
    io.entries.set(root, [{ name: '2026', isDirectory: () => true, isFile: () => false }, { name: 'notes.txt', isDirectory: () => false, isFile: () => true }, { name: 'link.jsonl', isDirectory: () => false, isFile: () => false }]);
    const service = createCodexStatusService({ getMainWindow: () => window }); await service.start();
    expect(service.getSnapshot().sessions).toHaveLength(1); expect(io.readLines).toHaveBeenCalledWith(file);
    expect(io.stat).not.toHaveBeenCalledWith(join(root, 'notes.txt')); service.stop();
  });
  it('caps file scanning at forty recent rollout candidates', async () => {
    Array.from({ length: 50 }).forEach((entry, index) => { void entry; rollout(`session-${  String(index).padStart(2, '0')}`, 'user_message', now + index); });
    const service = createCodexStatusService({ getMainWindow: () => window }); await service.start();
    expect(service.getSnapshot().sessions).toHaveLength(40); expect(io.stat).toHaveBeenCalledTimes(40);
    expect(service.getSnapshot().sessions[0].id).toBe('session-49'); expect(service.getSnapshot().sessions.at(-1)?.id).toBe('session-10'); service.stop();
  });
  it('caps visible session events and the global feed without truncating heatmap totals', async () => {
    ['one', 'two', 'three', 'four'].forEach((id) => {
      const file = rollout(id);
      const prompts = Array.from({ length: 70 }, (...[, index]) => JSON.stringify({ type: 'event_msg', timestamp: new Date(now + index).toISOString(), payload: { type: 'user_message', message: `Prompt ${  index}` } })).join('\n');
      const content = `${io.files.get(file)!  }\n${  prompts}`; io.files.set(file, content); io.meta.set(file, { mtimeMs: now, size: content.length });
    });
    const service = createCodexStatusService({ getMainWindow: () => window }); await service.start();
    const snapshot = service.getSnapshot(); expect(snapshot.sessions.every((session) => session.events.length === 40)).toBe(true);
    expect(snapshot.events).toHaveLength(120); expect(Object.values(snapshot.heatmap)[0].prompt).toBe(284); service.stop();
  });
  it('exposes a permission request as pending and persists deletion and clear cutoffs', async () => {
    rollout('permission', 'exec_approval_request');
    const service = createCodexStatusService({ getMainWindow: () => window }); await service.start();
    const [session] = service.getSnapshot().sessions; expect(session.phase).toBe('waiting_permission');
    expect(session.pendingPermission).toEqual(session.events[0]);
    service.deleteSessions(['permission']);
    expect(JSON.parse(io.files.get(persisted)!) as unknown).toMatchObject({ deletedBeforeBySession: { permission: now } });
    service.clearEvents(); expect(JSON.parse(io.files.get(persisted)!) as unknown).toMatchObject({ clearBefore: now, deletedBeforeBySession: {} }); service.stop();
  });
});
