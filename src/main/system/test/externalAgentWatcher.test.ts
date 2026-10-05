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
 * @file externalAgentWatcher.test.ts
 * @description 外部 Agent 轮询、通知去重、并发保护及定时器清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExternalAgentWatcher } from '../externalAgentWatcher';
import type { BrowserWindow } from 'electron';
const processes = vi.hoisted(() => vi.fn<(names: string[]) => Promise<boolean>>());
vi.mock('electron', () => ({ BrowserWindow: class {} }));
vi.mock('../runningProcesses', () => ({ hasAnyRunningProcess: processes }));
let running: Set<string>;
const send = vi.fn();
const window = { isDestroyed: () => false, webContents: { send } } as unknown as BrowserWindow;
beforeEach(() => { vi.useFakeTimers(); running = new Set(); processes.mockReset(); processes.mockImplementation((names) => Promise.resolve(running.has(names[0]))); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
describe('createExternalAgentWatcher', () => {
  it('uses delayed polling, collapses aliases and emits start/stop only on transitions', async () => {
    const watcher = createExternalAgentWatcher({ getMainWindow: () => window });
    running.add('Claude.exe'); running.add('claude.exe'); running.add('Codex.exe');
    watcher.start(); expect(processes).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(4000);
    expect(send).toHaveBeenCalledWith('external-agent:started', { agentNames: ['Claude Code', 'Codex'] });
    await vi.advanceTimersByTimeAsync(4000); expect(send).toHaveBeenCalledOnce();
    running.clear(); await vi.advanceTimersByTimeAsync(4000);
    expect(send).toHaveBeenLastCalledWith('external-agent:stopped', { agentNames: ['Claude Code', 'Codex'] });
    running.add('claude.exe'); await vi.advanceTimersByTimeAsync(4000);
    expect(send).toHaveBeenLastCalledWith('external-agent:started', { agentNames: ['Claude Code'] });
    watcher.stop();
  });
  it('restarts a single interval and stops all future polling', async () => {
    const watcher = createExternalAgentWatcher({ getMainWindow: () => window, pollIntervalMs: 100 });
    watcher.start(); watcher.start(); expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(100); expect(processes).toHaveBeenCalledTimes(9);
    watcher.stop(); watcher.stop(); expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(1000); expect(processes).toHaveBeenCalledTimes(9);
  });
  it.each([null, { isDestroyed: () => true }])('skips polling without a live window', async (target) => {
    const watcher = createExternalAgentWatcher({ getMainWindow: () => target as BrowserWindow | null, pollIntervalMs: 100 });
    watcher.start(); await vi.advanceTimersByTimeAsync(100); expect(processes).not.toHaveBeenCalled(); watcher.stop();
  });
  it('does not overlap pending checks and resumes after the pending check completes', async () => {
    let resolve: (running: boolean) => void = () => {};
    processes.mockImplementationOnce(() => new Promise<boolean>((done) => { resolve = done; }));
    const watcher = createExternalAgentWatcher({ getMainWindow: () => window, pollIntervalMs: 100 });
    watcher.start(); await vi.advanceTimersByTimeAsync(300);
    expect(processes).toHaveBeenCalledOnce(); resolve(false);
    await vi.advanceTimersByTimeAsync(100); expect(processes).toHaveBeenCalledTimes(18); watcher.stop();
  });
  it('recovers from rejected process queries on the following interval', async () => {
    processes.mockRejectedValueOnce(new Error('process query unavailable'));
    const watcher = createExternalAgentWatcher({ getMainWindow: () => window, pollIntervalMs: 100 });
    watcher.start(); await vi.advanceTimersByTimeAsync(100); expect(send).not.toHaveBeenCalled();
    running.add('Cursor.exe'); await vi.advanceTimersByTimeAsync(100);
    expect(send).toHaveBeenCalledWith('external-agent:started', { agentNames: ['Cursor'] }); watcher.stop();
  });
});
