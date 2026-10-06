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
 * @file qishuiAuthService.test.ts
 * @description 汽水 QR 登录桥接、过期时间与登录状态规范化测试。
 * @author 鸡哥
 */

import { Module } from 'module';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
interface Envelope { message?: string; data?: { token?: string; scan_url?: string; expire_time?: number; error_code?: number; status?: string | number; description?: string }; }
interface Bridge { createQrCode: () => Promise<Envelope>; checkQrConnect: (token: string) => Promise<Envelope>; getStatus: () => { loggedIn: boolean }; clear: () => Promise<{ loggedIn: boolean }>; }
const io = vi.hoisted(() => ({ packaged: false, createQrCode: vi.fn<() => Promise<Envelope>>(), checkQrConnect: vi.fn<(token: string) => Promise<Envelope>>(), getStatus: vi.fn<() => { loggedIn: boolean }>(), clear: vi.fn<() => Promise<{ loggedIn: boolean }>>(), createBridge: vi.fn<(options: { configFile: string }) => Bridge>(), runtimeLoads: [] as string[] }));
vi.mock('electron', () => ({ app: { get isPackaged() { return io.packaged; }, getAppPath: () => 'C:/app', getPath: () => 'C:/user-data' } }));
const loader = Module as unknown as { _load: (request: string, parent: unknown, isMain?: boolean) => unknown };
const originalResourcePath = Object.getOwnPropertyDescriptor(process, 'resourcesPath');
beforeEach(() => {
  vi.resetModules(); io.packaged = false; io.runtimeLoads = [];
  io.createQrCode.mockReset(); io.createQrCode.mockResolvedValue({ data: { token: 'token', scan_url: 'https://qr.test' } });
  io.checkQrConnect.mockReset(); io.checkQrConnect.mockResolvedValue({});
  io.getStatus.mockReset(); io.getStatus.mockReturnValue({ loggedIn: false });
  io.clear.mockReset(); io.clear.mockResolvedValue({ loggedIn: false });
  io.createBridge.mockReset(); io.createBridge.mockReturnValue({ createQrCode: io.createQrCode, checkQrConnect: io.checkQrConnect, getStatus: io.getStatus, clear: io.clear });
  const originalLoad = loader._load;
  vi.spyOn(loader, '_load').mockImplementation((request, parent, isMain) => {
    if (request.endsWith('qishui-qr-login.js')) { io.runtimeLoads.push(request); return { createQishuiQrLoginBridge: io.createBridge }; }
    return originalLoad(request, parent, isMain);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  if (originalResourcePath) Object.defineProperty(process, 'resourcesPath', originalResourcePath); else Reflect.deleteProperty(process, 'resourcesPath');
});
describe('Qishui QR bridge loading and state', () => {
  it('loads only the mocked development runtime once and uses the user-data config', async () => {
    const api = await import('../qishuiAuthService');
    expect(api.getQishuiAuthStatus()).toEqual({ provider: 'qishui', loggedIn: false, state: 'idle', retryAfterMs: 0 });
    io.getStatus.mockReturnValue({ loggedIn: true }); expect(api.getQishuiAuthStatus().state).toBe('confirmed');
    expect(io.runtimeLoads).toEqual([join('C:/app', 'resources', 'qishui-qr-login.js')]);
    expect(io.createBridge).toHaveBeenCalledOnce();
    expect(io.createBridge).toHaveBeenCalledWith({ configFile: join('C:/user-data', 'music-providers', 'qishui.json') });
  });
  it('loads the mocked packaged resource path', async () => {
    io.packaged = true; Object.defineProperty(process, 'resourcesPath', { configurable: true, value: 'C:/packaged' });
    const api = await import('../qishuiAuthService'); api.getQishuiAuthStatus();
    expect(io.runtimeLoads).toEqual([join('C:/packaged', 'qishui-qr-login.js')]);
  });
  it.each([[1_700_000_000, 1_700_000_000_000], [1_700_000_000_001, 1_700_000_000_001], [0, null], [Infinity, null], [undefined, null]])('normalizes expiration %s to %s', async (expireTime, expiresAt) => {
    io.createQrCode.mockResolvedValue({ data: { expire_time: expireTime, token: ' token ', scan_url: ' https://qr.test ' } });
    const api = await import('../qishuiAuthService');
    expect(await api.createQishuiQrCode()).toMatchObject({ expiresAt, provider: 'qishui', loggedIn: false, state: 'waiting', token: 'token', qrContent: 'https://qr.test' });
  });
  it.each([{}, { data: { token: ' ' } }, { data: { scan_url: 'https://qr.test' } }])('rejects incomplete QR payloads', async (result) => {
    io.createQrCode.mockResolvedValue(result);
    const api = await import('../qishuiAuthService'); await expect(api.createQishuiQrCode()).rejects.toThrow('QISHUI_QR_PAYLOAD_INCOMPLETE');
  });
  it('propagates bridge creation failures and clears a persisted session', async () => {
    io.createQrCode.mockRejectedValueOnce(new Error('QR unavailable'));
    const api = await import('../qishuiAuthService'); await expect(api.createQishuiQrCode()).rejects.toThrow('QR unavailable');
    expect(await api.clearQishuiAuth()).toMatchObject({ loggedIn: false, state: 'idle' }); expect(io.clear).toHaveBeenCalledOnce();
    io.clear.mockRejectedValueOnce(new Error('readonly')); await expect(api.clearQishuiAuth()).rejects.toThrow('readonly');
  });
});
describe('Qishui QR polling states', () => {
  it('empty polling envelope uses waiting state without an invented error or message', async () => {
    io.checkQrConnect.mockResolvedValue({});
    const api = await import('../qishuiAuthService');
    expect(await api.checkQishuiQrCode('token')).toMatchObject({ state: 'waiting', retryAfterMs: 0, loggedIn: false, message: undefined });
  });
  it.each([[{ error_code: 2 }, 'expired', 0], [{ error_code: 7 }, 'rate_limited', 60_000], [{ status: 2 }, 'scanned', 0], [{ status: ' 2 ' }, 'scanned', 0], [{ status: 0 }, 'waiting', 0]])('maps %s to %s', async (data, state, retryAfterMs) => {
    io.checkQrConnect.mockResolvedValue({ data });
    const api = await import('../qishuiAuthService'); expect(await api.checkQishuiQrCode('token')).toMatchObject({ state, retryAfterMs, loggedIn: false });
    expect(io.checkQrConnect).toHaveBeenCalledWith('token');
  });
  it('prioritizes the persisted login status and selects message fallbacks', async () => {
    io.checkQrConnect.mockResolvedValue({ data: { error_code: 2 } }); io.getStatus.mockReturnValue({ loggedIn: true });
    const api = await import('../qishuiAuthService'); expect((await api.checkQishuiQrCode('token')).state).toBe('confirmed');
    io.getStatus.mockReturnValue({ loggedIn: false }); io.checkQrConnect.mockResolvedValue({ message: 'top-level', data: { description: 'nested' } });
    expect((await api.checkQishuiQrCode('token')).message).toBe('top-level');
    io.checkQrConnect.mockResolvedValue({ data: { description: 'nested' } }); expect((await api.checkQishuiQrCode('token')).message).toBe('nested');
  });
  it('normalizes MFA cancellation while propagating unrelated failures', async () => {
    io.checkQrConnect.mockRejectedValueOnce(Object.assign(new Error('cancelled'), { code: 'QISHUI_MFA_CANCELLED' }));
    const api = await import('../qishuiAuthService'); expect(await api.checkQishuiQrCode('token')).toMatchObject({ state: 'mfa_cancelled', errorCode: 'QISHUI_MFA_CANCELLED', message: 'cancelled' });
    io.checkQrConnect.mockRejectedValueOnce(new Error('offline')); await expect(api.checkQishuiQrCode('token')).rejects.toThrow('offline');
  });
});
