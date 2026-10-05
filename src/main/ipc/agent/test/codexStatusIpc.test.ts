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
 * @file codexStatusIpc.test.ts
 * @description Codex监控IPC注册、参数转发、服务失败和空会话边界。
 * @author 鸡哥
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCodexStatusIpcHandlers } from '../codexStatusIpc';

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>()
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, callback: (...args: unknown[]) => unknown) => mocks.handlers.set(channel, callback)
  }
}));

const snapshot = {
  enabled: true,
  receiverRunning: false,
  receiverUrl: null,
  settingsPath: '',
  hookScriptPath: '',
  sessions: [],
  events: [],
  heatmap: {},
  updatedAt: 1
};

const service = {
  start: vi.fn(() => Promise.resolve()),
  stop: vi.fn(),
  getSnapshot: vi.fn(() => snapshot),
  enableMonitor: vi.fn(() => Promise.resolve({
    snapshot,
    ok: true,
    message: ''
  })),
  disableMonitor: vi.fn(() => Promise.resolve({
    snapshot,
    ok: true,
    message: ''
  })),
  clearEvents: vi.fn(() => snapshot),
  deleteSessions: vi.fn((ids: string[]) => {
    void ids;
    return snapshot;
  })
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.handlers.clear();
  registerCodexStatusIpcHandlers(service);
});

describe('Codex监控IPC', () => {
  it('只注册五个公开通道，查询和清理同步返回快照', () => {
    expect([...mocks.handlers.keys()]).toEqual([
      'codex:status:get',
      'codex:monitor:enable',
      'codex:monitor:disable',
      'codex:events:clear',
      'codex:sessions:delete'
    ]);
    expect(mocks.handlers.get('codex:status:get')?.()).toBe(snapshot);
    expect(mocks.handlers.get('codex:events:clear')?.()).toBe(snapshot);
  });

  it.each(['enableMonitor', 'disableMonitor'] as const)('%s保留异步结果', async (method) => {
    const channel = method === 'enableMonitor' ? 'codex:monitor:enable' : 'codex:monitor:disable';
    await expect(Promise.resolve(mocks.handlers.get(channel)?.())).resolves.toEqual({
      snapshot,
      ok: true,
      message: ''
    });
    expect(service[method]).toHaveBeenCalledOnce();
  });

  it.each([{
    ids: []
  }, {
    ids: ['a', 'b']
  }])('会话删除原样转发 %j', ({
    ids
  }) => {
    expect(mocks.handlers.get('codex:sessions:delete')?.({}, ids)).toBe(snapshot);
    expect(service.deleteSessions).toHaveBeenCalledWith(ids);
  });

  it('服务拒绝会传给调用方', async () => {
    service.enableMonitor.mockRejectedValueOnce(new Error('offline'));
    await expect(Promise.resolve(mocks.handlers.get('codex:monitor:enable')?.())).rejects.toThrow('offline');
  });
});
