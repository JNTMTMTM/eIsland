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
 * @file useMusicProviderQrLoginRuntime.test.ts
 * @description 音乐扫码登录真实状态、轮询代际、失败重试及卸载边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import type { MusicProviderAuthState, MusicProviderAuthStatus, MusicProviderId, MusicProviderQrCodeResult } from '../../../../../../shared/musicProviderAuth';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const api = {
  musicProviderAuthStatus: vi.fn<(provider: MusicProviderId) => Promise<MusicProviderAuthStatus>>(),
  musicProviderAuthCreateQr: vi.fn<(provider: MusicProviderId) => Promise<MusicProviderQrCodeResult>>(),
  musicProviderAuthCheckQr: vi.fn<(provider: MusicProviderId, token: string) => Promise<MusicProviderAuthStatus>>(),
  musicProviderAuthClear: vi.fn<(provider: MusicProviderId) => Promise<MusicProviderAuthStatus>>()
};
let module: typeof import('../useMusicProviderQrLogin');
/** 返回真实协议形状的 IPC 叶响应。
 * @param state - 登录状态
 * @returns IPC 状态
 */
function status(state: MusicProviderAuthState = 'waiting'): MusicProviderAuthStatus {
  return {
    state,
    provider: 'qishui',
    loggedIn: state === 'confirmed',
    retryAfterMs: 0
  };
}
/** 生成原生二维码 IPC 叶响应。
 * @param token - 扫码令牌
 * @returns 二维码响应
 */
function qr(token = 'token'): MusicProviderQrCodeResult {
  return {
    token,
    ...status(),
    qrContent: `qr:${token}`,
    expiresAt: null
  };
}
/** 执行真实 Hook。
 * @returns 当前状态
 */
function run() {
  return renderHook(module.useMusicProviderQrLogin, 'qishui');
}
/** 完成一次真实挂载及初始 IPC 请求。
 * @returns 当前状态
 */
async function mount() {
  run();
  flushHookEffects();
  await settleHook();
  return run();
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  api.musicProviderAuthStatus.mockResolvedValue(status());
  api.musicProviderAuthCreateQr.mockResolvedValue(qr());
  api.musicProviderAuthCheckQr.mockResolvedValue(status('scanned'));
  api.musicProviderAuthClear.mockResolvedValue(status('idle'));
  vi.stubGlobal('window', {
    api
  });
  module = await import('../useMusicProviderQrLogin');
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('useMusicProviderQrLogin native IPC lifecycle', () => {
  it('existing authenticated session skips QR and polling', async () => {
    api.musicProviderAuthStatus.mockResolvedValue(status('confirmed'));
    expect(await mount()).toMatchObject({
      authState: 'confirmed',
      loading: false,
      error: '',
      qrContent: ''
    });
    expect(api.musicProviderAuthCreateQr).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('initial QR polls after 1200, then explicit retry and default delays', async () => {
    api.musicProviderAuthCheckQr.mockResolvedValueOnce({
      ...status('rate_limited'),
      retryAfterMs: 2700
    }).mockResolvedValueOnce(status('scanned'));
    expect(await mount()).toMatchObject({
      qrContent: 'qr:token',
      loading: false
    });
    await vi.advanceTimersByTimeAsync(1199);
    expect(api.musicProviderAuthCheckQr).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run().authState).toBe('rate_limited');
    await vi.advanceTimersByTimeAsync(2700);
    expect(run().authState).toBe('scanned');
    await vi.advanceTimersByTimeAsync(4499);
    expect(api.musicProviderAuthCheckQr).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(api.musicProviderAuthCheckQr).toHaveBeenCalledTimes(3);
  });
  it.each(['confirmed', 'expired', 'mfa_cancelled'] as const)('%s terminal result stops polling', async (state) => {
    api.musicProviderAuthCheckQr.mockResolvedValue(status(state));
    await mount();
    await vi.advanceTimersByTimeAsync(1200);
    expect(run().authState).toBe(state);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([new Error('poll fail'), 'string fail'])('poll rejection %j retries after eight seconds', async (cause) => {
    api.musicProviderAuthCheckQr.mockRejectedValueOnce(cause);
    await mount();
    await vi.advanceTimersByTimeAsync(1200);
    expect(run()).toMatchObject({
      authState: 'error',
      error: cause instanceof Error ? cause.message : cause
    });
    await vi.advanceTimersByTimeAsync(7999);
    expect(api.musicProviderAuthCheckQr).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(run()).toMatchObject({
      authState: 'scanned',
      error: ''
    });
  });
  it.each([new Error('create fail'), 'string fail'])('QR creation rejection %j resets loading and leaves no poll', async (cause) => {
    api.musicProviderAuthCreateQr.mockRejectedValue(cause);
    expect(await mount()).toMatchObject({
      authState: 'error',
      loading: false,
      error: cause instanceof Error ? cause.message : cause,
      qrContent: ''
    });
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([new Error('status fail'), 'string fail'])('initial status rejection %j ends loading without creation', async (cause) => {
    api.musicProviderAuthStatus.mockRejectedValue(cause);
    expect(await mount()).toMatchObject({
      authState: 'error',
      loading: false,
      error: cause instanceof Error ? cause.message : cause
    });
    expect(api.musicProviderAuthCreateQr).not.toHaveBeenCalled();
  });
  it.each(['resolve', 'reject'] as const)('late initial status %s after unmount is ignored', async (mode) => {
    const pending = deferred<MusicProviderAuthStatus>();
    api.musicProviderAuthStatus.mockReturnValue(pending.promise);
    run();
    flushHookEffects();
    unmountHook();
    if (mode === 'resolve') pending.resolve(status());else pending.reject(new Error('late'));
    await settleHook();
    expect(api.musicProviderAuthCreateQr).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['resolve', 'reject'] as const)('late old-generation poll %s cannot overwrite refreshed state', async (mode) => {
    const pending = deferred<MusicProviderAuthStatus>();
    api.musicProviderAuthCheckQr.mockReturnValueOnce(pending.promise);
    await mount();
    await vi.advanceTimersByTimeAsync(1200);
    api.musicProviderAuthCreateQr.mockResolvedValue(qr('next'));
    await run().refresh();
    if (mode === 'resolve') pending.resolve(status('confirmed'));else pending.reject(new Error('old failure'));
    await settleHook();
    expect(run()).toMatchObject({
      authState: 'waiting',
      error: '',
      qrContent: 'qr:next'
    });
    expect(vi.getTimerCount()).toBe(1);
  });
  it('empty native token aborts first scheduled poll, and unmount clears queued normal poll', async () => {
    api.musicProviderAuthCreateQr.mockResolvedValue(qr(''));
    await mount();
    await vi.advanceTimersByTimeAsync(1200);
    expect(api.musicProviderAuthCheckQr).not.toHaveBeenCalled();
    await run().refresh();
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('logout clears native session and refreshes a new QR', async () => {
    await mount();
    api.musicProviderAuthCreateQr.mockResolvedValue(qr('after-logout'));
    await run().logout();
    expect(api.musicProviderAuthClear).toHaveBeenCalledWith('qishui');
    expect(run()).toMatchObject({
      authState: 'waiting',
      loading: false,
      error: '',
      qrContent: 'qr:after-logout'
    });
    expect(vi.getTimerCount()).toBe(1);
  });
  it.each([new Error('clear fail'), 'string fail'])('logout rejection %j clears pending polling and reports error', async (cause) => {
    await mount();
    api.musicProviderAuthClear.mockRejectedValue(cause);
    await run().logout();
    expect(run()).toMatchObject({
      authState: 'error',
      loading: false,
      error: cause instanceof Error ? cause.message : cause
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});
it('older QR creation cannot replace newer QR or add a poll', async () => {
  api.musicProviderAuthStatus.mockResolvedValue(status('confirmed'));
  await mount();
  const old = deferred<MusicProviderQrCodeResult>();
  const next = deferred<MusicProviderQrCodeResult>();
  api.musicProviderAuthCreateQr.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
  const first = run().refresh();
  const second = run().refresh();
  next.resolve(qr('new'));
  await second;
  old.resolve(qr('old'));
  await first;
  expect(run().qrContent).toBe('qr:new');
  expect(vi.getTimerCount()).toBe(1);
  await vi.advanceTimersByTimeAsync(1200);
  expect(api.musicProviderAuthCheckQr).toHaveBeenCalledWith('qishui', 'new');
});
it.each(['resolve', 'reject'] as const)('pending QR creation %s after unmount never restarts polling or updates state', async (mode) => {
  const pending = deferred<MusicProviderQrCodeResult>();
  api.musicProviderAuthCreateQr.mockReturnValue(pending.promise);
  await mount();
  unmountHook();
  if (mode === 'resolve') pending.resolve(qr('late'));else pending.reject(new Error('late failure'));
  await settleHook();
  expect(vi.getTimerCount()).toBe(0);
  expect(run()).toMatchObject({
    loading: true,
    authState: 'idle',
    error: '',
    qrContent: ''
  });
});
it.each(['resolve', 'reject'] as const)('older QR creation %s cannot clear current pending loading or expose an old failure', async (mode) => {
  api.musicProviderAuthStatus.mockResolvedValue(status('confirmed'));
  await mount();
  const old = deferred<MusicProviderQrCodeResult>();
  const next = deferred<MusicProviderQrCodeResult>();
  api.musicProviderAuthCreateQr.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
  const first = run().refresh();
  const second = run().refresh();
  if (mode === 'resolve') old.resolve(qr('old'));else old.reject(new Error('old error'));
  await first;
  expect(run()).toMatchObject({
    loading: true,
    error: '',
    qrContent: ''
  });
  next.resolve(qr('new'));
  await second;
  expect(run()).toMatchObject({
    loading: false,
    qrContent: 'qr:new'
  });
});
it.each(['resolve', 'reject'] as const)('logout clear %s after unmount never creates QR or changes loading', async (mode) => {
  await mount();
  const clear = deferred<MusicProviderAuthStatus>();
  api.musicProviderAuthClear.mockReturnValue(clear.promise);
  const logout = run().logout();
  unmountHook();
  if (mode === 'resolve') clear.resolve(status('idle'));else clear.reject(new Error('late clear failure'));
  await logout;
  expect(api.musicProviderAuthCreateQr).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
  expect(run()).toMatchObject({
    loading: true,
    error: ''
  });
});
it.each(['resolve', 'reject'] as const)('logout clear %s cannot supersede a newer pending refresh', async (mode) => {
  await mount();
  const clear = deferred<MusicProviderAuthStatus>();
  const create = deferred<MusicProviderQrCodeResult>();
  api.musicProviderAuthClear.mockReturnValue(clear.promise);
  api.musicProviderAuthCreateQr.mockReturnValue(create.promise);
  const logout = run().logout();
  const refresh = run().refresh();
  if (mode === 'resolve') clear.resolve(status('idle'));else clear.reject(new Error('old clear'));
  await logout;
  expect(api.musicProviderAuthCreateQr).toHaveBeenCalledTimes(2);
  expect(run()).toMatchObject({
    loading: true,
    error: '',
    qrContent: ''
  });
  create.resolve(qr('new'));
  await refresh;
  expect(run()).toMatchObject({
    loading: false,
    qrContent: 'qr:new'
  });
  expect(vi.getTimerCount()).toBe(1);
});
