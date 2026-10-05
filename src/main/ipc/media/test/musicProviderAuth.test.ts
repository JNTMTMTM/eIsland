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
 * @file musicProviderAuth.test.ts
 * @description 音乐认证IPC通道、提供方校验、token和异步错误转发。
 * @author 鸡哥
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerMusicProviderAuthIpcHandlers } from '../musicProviderAuth';

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  create: vi.fn(),
  check: vi.fn(),
  status: vi.fn(),
  clear: vi.fn()
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, callback: (...args: unknown[]) => unknown) => mocks.handlers.set(channel, callback)
  }
}));

vi.mock('../../../music/providers/qishuiAuthService', () => ({
  createQishuiQrCode: mocks.create,
  checkQishuiQrCode: mocks.check,
  getQishuiAuthStatus: mocks.status,
  clearQishuiAuth: mocks.clear
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.handlers.clear();
  registerMusicProviderAuthIpcHandlers();
});

describe('音乐提供方认证IPC', () => {
  it.each([['status', 'status'], ['create-qr', 'create'], ['check-qr', 'check'], ['clear', 'clear']] as const)('qishui %s转发及拒绝未知提供方', async (suffix, method) => {
    const result = {
      provider: 'qishui'
    };
    mocks[method].mockReturnValueOnce(result);
    expect(await Promise.resolve(mocks.handlers.get(`music-provider-auth:${suffix}`)?.({}, 'qishui', 'token'))).toBe(result);
    expect(() => mocks.handlers.get(`music-provider-auth:${suffix}`)?.({}, 'unknown')).toThrow('MUSIC_PROVIDER_NOT_SUPPORTED');
    if (method === 'check') {
      expect(mocks.check).toHaveBeenCalledWith('token');
    } else {
      expect(mocks[method]).toHaveBeenCalledWith();
    }
  });

  it('透传认证服务拒绝，不吞掉失败', async () => {
    mocks.create.mockRejectedValueOnce(new Error('offline'));
    await expect(Promise.resolve(mocks.handlers.get('music-provider-auth:create-qr')?.({}, 'qishui'))).rejects.toThrow('offline');
  });
});
