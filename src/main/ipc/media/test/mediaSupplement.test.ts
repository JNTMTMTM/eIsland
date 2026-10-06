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
 * @file mediaSupplement.test.ts
 * @description 媒体真实 IPC 会话状态、白名单控制、单位转换与原生查询测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerMediaIpcHandlers } from '../media';

type HandlerFixture = (...arguments_: unknown[]) => unknown;
const native = vi.hoisted(() => ({
  handlers: new Map<string, HandlerFixture>(), play: vi.fn(), pause: vi.fn(), next: vi.fn(), previous: vi.fn(),
  seek: vi.fn(), timestamp: vi.fn(), mute: vi.fn<() => boolean | null>(), setMute: vi.fn<(value: boolean) => boolean>(),
  send: vi.fn(), destroyedSend: vi.fn(),
}));
vi.mock('electron', () => ({
  ipcMain: { handle: (channel: string, handler: HandlerFixture) => native.handlers.set(channel, handler) },
  BrowserWindow: { getAllWindows: () => [
    { isDestroyed: () => false, webContents: { send: native.send } },
    { isDestroyed: () => true, webContents: { send: native.destroyedSend } },
  ] },
}));
vi.mock('@eisland/windows-smtc-helper', () => ({
  play: native.play, pause: native.pause, next: native.next, previous: native.previous, seek: native.seek, getTimestamp: native.timestamp,
}));
vi.mock('@eisland/windows-volume-helper', () => ({ getMute: native.mute, setMute: native.setMute }));

/**
 * 注册真实媒体处理器并提供可控制的当前会话和切换状态。
 * @returns 当前配置和处理器调用函数。
 */
function fixture() {
  let device = 'source';
  let pending = 'new-source';
  let pendingEntry: unknown = {};
  const runtime = new Map<string, { payload: unknown; hasTitle: boolean }>();
  const options: Parameters<typeof registerMediaIpcHandlers>[0] = {
    getMainWindow: () => null, isWhitelisted: () => true,
    getPendingSourceSwitchId: () => pending, setPendingSourceSwitchId: (id) => { pending = id; },
    getPendingSourceSwitchEntry: () => pendingEntry, clearPendingSourceSwitchEntry: () => { pendingEntry = null; },
    getCurrentDeviceId: () => device, setCurrentDeviceId: (id) => { device = id; },
    getSmtcSessionRuntime: () => runtime,
  };
  registerMediaIpcHandlers(options);
  return { options, runtime, invoke: (channel: string, payload?: unknown) => native.handlers.get(channel)?.({}, payload) };
}

beforeEach(() => {
  vi.resetAllMocks();
  native.handlers.clear();
});
describe('媒体控制会话与原生接口', () => {
  it('标题会话读取真实 payload，播放暂停由当前会话状态决定', () => {
    const state = fixture();
    expect(state.invoke('media:current-info:get')).toBeNull();
    state.runtime.set('source', { hasTitle: true, payload: { title: 'fixture', isPlaying: true } });
    expect(state.invoke('media:current-info:get')).toEqual({ title: 'fixture', isPlaying: true });
    state.invoke('media:play-pause');
    expect(native.pause).toHaveBeenCalledOnce();
    state.runtime.clear();
    state.invoke('media:play-pause');
    expect(native.play).toHaveBeenCalledOnce();
  });
  it('白名单允许 next/prev/seek，时间单位转换为秒', () => {
    const state = fixture();
    state.invoke('media:next');
    state.invoke('media:prev');
    state.invoke('media:seek', 1500);
    expect(native.next).toHaveBeenCalledOnce();
    expect(native.previous).toHaveBeenCalledOnce();
    expect(native.seek).toHaveBeenCalledExactlyOnceWith(1.5);
    state.options.isWhitelisted = () => false;
    state.invoke('media:seek', 2000);
    expect(native.seek).toHaveBeenCalledTimes(1);
  });
  it('未准备切换时不广播，接受无标题会话广播 null 且清空待切换状态', () => {
    const state = fixture();
    state.invoke('media:reject-source-switch');
    state.invoke('media:accept-source-switch');
    expect(native.send).not.toHaveBeenCalled();
    const nextState = fixture();
    nextState.runtime.set('new-source', { hasTitle: false, payload: { title: '' } });
    nextState.invoke('media:accept-source-switch');
    expect(native.send).toHaveBeenCalledExactlyOnceWith('nowplaying:info', null);
    expect(native.destroyedSend).not.toHaveBeenCalled();
    nextState.invoke('media:accept-source-switch');
    expect(native.send).toHaveBeenCalledTimes(1);
  });
  it('默认音量与不支持的应用级音量 setter 不调用原生静音接口', () => {
    const state = fixture();
    expect(state.invoke('media:get-volume')).toBe(0.5);
    expect(state.invoke('media:set-volume', 0.8)).toBeUndefined();
    expect(native.setMute).not.toHaveBeenCalled();
  });
  it('静音读取与时间戳返回原生结果', () => {
    const state = fixture();
    native.mute.mockReturnValue(true);
    native.timestamp.mockReturnValue({ position: 12 });
    expect(state.invoke('media:get-muted')).toBe(true);
    expect(state.invoke('smtc:get-timestamp')).toEqual({ position: 12 });
  });
});
