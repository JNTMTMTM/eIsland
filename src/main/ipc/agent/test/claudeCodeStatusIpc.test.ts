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
 * @file claudeCodeStatusIpc.test.ts
 * @description Claude会话IPC注册、权限决策及失败转发契约。
 * @author 鸡哥
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerClaudeCodeStatusIpcHandlers } from '../claudeCodeStatusIpc';

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
  installHook: vi.fn(() => Promise.resolve({
    snapshot,
    ok: true,
    message: ''
  })),
  uninstallHook: vi.fn(() => Promise.resolve({
    snapshot,
    ok: true,
    message: ''
  })),
  clearEvents: vi.fn(() => snapshot),
  deleteSessions: vi.fn((ids: string[]) => {
    void ids;
    return snapshot;
  }),
  resolvePermission: vi.fn((id: string, decision: 'allow' | 'always' | 'deny') => {
    void id;
    void decision;
    return snapshot;
  })
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.handlers.clear();
  registerClaudeCodeStatusIpcHandlers({
    service
  });
});

describe('Claude会话IPC', () => {
  it('注册六通道并保留快照身份', () => {
    expect(mocks.handlers.size).toBe(6);
    expect(mocks.handlers.get('claude-code:status:get')?.()).toBe(snapshot);
    expect(mocks.handlers.get('claude-code:events:clear')?.()).toBe(snapshot);
  });

  it.each(['installHook', 'uninstallHook'] as const)('转发%s异步结果', async (method) => {
    const channel = method === 'installHook' ? 'claude-code:hook:install' : 'claude-code:hook:uninstall';
    await expect(Promise.resolve(mocks.handlers.get(channel)?.())).resolves.toEqual({
      snapshot,
      ok: true,
      message: ''
    });
  });

  it.each(['allow', 'always', 'deny'] as const)('权限决策%s原样转发', (decision) => {
    expect(mocks.handlers.get('claude-code:permission:resolve')?.({}, 's1', decision)).toBe(snapshot);
    expect(service.resolvePermission).toHaveBeenCalledWith('s1', decision);
  });

  it('删除会话并传播服务错误', () => {
    mocks.handlers.get('claude-code:sessions:delete')?.({}, []);
    expect(service.deleteSessions).toHaveBeenCalledWith([]);
    service.clearEvents.mockImplementationOnce(() => {
      throw new Error('failed');
    });
    expect(() => mocks.handlers.get('claude-code:events:clear')?.()).toThrow('failed');
  });
});
