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
 * @file agentUsageIpc.test.ts
 * @description Agent 用量 IPC 注册、快照转发与服务失败传播。
 * @author 鸡哥
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAgentUsageIpcHandlers } from '../agentUsageIpc';

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>()
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, callback: (...args: unknown[]) => unknown) => mocks.handlers.set(channel, callback)
  }
}));

const snapshot = { generatedAt: 1, providers: [] };
const service = { getSnapshot: vi.fn(() => Promise.resolve(snapshot)) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.handlers.clear();
  registerAgentUsageIpcHandlers(service);
});

describe('Agent用量IPC', () => {
  it('只注册快照通道并返回服务快照', async () => {
    expect([...mocks.handlers.keys()]).toEqual(['agent-usage:snapshot:get']);
    await expect(mocks.handlers.get('agent-usage:snapshot:get')?.()).resolves.toBe(snapshot);
    expect(service.getSnapshot).toHaveBeenCalledOnce();
  });

  it('服务失败时原样拒绝', async () => {
    service.getSnapshot.mockRejectedValueOnce(new Error('scan failed'));
    await expect(mocks.handlers.get('agent-usage:snapshot:get')?.()).rejects.toThrow('scan failed');
  });
});
