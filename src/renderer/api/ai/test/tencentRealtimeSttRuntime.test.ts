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
 * @file tencentRealtimeSttRuntime.test.ts
 * @description 腾讯实时语音客户端的真实请求头、WebSocket 状态、缺省事件文本和停止生命周期测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RealtimeSttEvent } from '../types/RealtimeSttEvent';

let sockets: FixtureSocket[];
class FixtureSocket {
  static OPEN = 1;

  readyState = 0;

  binaryType = 'blob';

  onopen: (() => void) | null = null;

  onmessage: ((event: { data: unknown }) => void) | null = null;

  onerror: (() => void) | null = null;

  onclose: (() => void) | null = null;

  send = vi.fn<(payload: string | ArrayBuffer) => void>();

  url: string;

  /**
   * 记录客户端在网络边界传入的连接地址。
   * @param url - WebSocket 连接地址
   */
  constructor(url: string) { this.url = url; sockets.push(this); }

  /** 关闭后在微任务中派发一次真实关闭事件。 */
  close(): void {
    if (this.readyState >= 2) return;
    this.readyState = 2;
    queueMicrotask(() => { this.readyState = 3; this.onclose?.(); });
  }

  /**
   * 按原生连接状态派发服务端消息和连接事件。
   * @param type - 要派发的事件类型
   * @param data - 文本或二进制消息内容
   */
  emit(type: 'open' | 'message' | 'close' | 'error', data?: unknown): void {
    if (this.readyState >= 2) return;
    if (type === 'open') { this.readyState = 1; this.onopen?.(); }
    if (type === 'message' && this.readyState === 1) this.onmessage?.({ data });
    if (type === 'close') { this.readyState = 3; this.onclose?.(); }
    if (type === 'error') { this.onerror?.(); this.close(); }
  }
}
let start: typeof import('../tencentRealtimeStt').startTencentRealtimeStt;
const onEvent = vi.fn<(event: RealtimeSttEvent) => void>();

beforeEach(async () => {
  vi.resetModules();vi.resetAllMocks();sockets = [];
  vi.stubGlobal('window', { location: { hostname: 'eisland.local' }, api: { updaterVersion: vi.fn().mockResolvedValue('1.2.3') } });
  vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null) });
  vi.stubGlobal('WebSocket', FixtureSocket);
  start = (await import('../tencentRealtimeStt')).startTencentRealtimeStt;
});
afterEach(() => { vi.restoreAllMocks();vi.unstubAllGlobals(); });

describe('real STT request headers and socket lifecycle', () => {
  it('uses real replay headers and omits unavailable client version', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(59000);
    vi.stubGlobal('window', { location: { hostname: 'eisland.local' }, api: { updaterVersion: vi.fn().mockResolvedValue(null) } });
    await start({ onEvent, token: ' token ' });
    const query = new URL(sockets[0].url).searchParams;
    expect(query.get('token')).toBe('token');expect(query.get('appName')).toBe('eisland');
    expect(query.has('clientVersion')).toBe(false);expect(query.get('nonce')).toMatch(/^[a-f0-9]+$/);
    expect(query.get('timestamp')).toBe(String(Date.now()));
  });
  it.each([{ event: 'stt_partial' }, { event: 'stt_final' }])('defaults missing text for %j', async (payload) => {
    await start({ onEvent, token: 'token' });sockets[0].emit('open');sockets[0].emit('message', JSON.stringify(payload));
    expect(onEvent).toHaveBeenCalledWith({ type: payload.event === 'stt_partial' ? 'partial' : 'final', text: '' });
  });
  it.each([{}, { event: '' }, null, 'not json', new Blob(['binary'])])('ignores unusable server payload %j', async (payload) => {
    await start({ onEvent, token: 'token' });sockets[0].emit('open');
    let data: unknown = JSON.stringify(payload);
    if (payload instanceof Blob || typeof payload === 'string') data = payload;
    sockets[0].emit('message', data);
    expect(onEvent).not.toHaveBeenCalled();
  });
  it('notifies a natural close once and prevents subsequent audio sends', async () => {
    const onClose = vi.fn();const session = await start({ onClose, onEvent, token: 'token' });
    sockets[0].emit('open');sockets[0].emit('close');session.stop();session.pushAudioFrame(new Int16Array([1]));
    expect(onClose).toHaveBeenCalledTimes(1);expect(sockets[0].send).toHaveBeenCalledTimes(1);
  });
  it('keeps stop idempotent when the socket later emits its queued close event', async () => {
    const onClose = vi.fn();const session = await start({ onClose, onEvent, token: 'token' });
    sockets[0].emit('open');session.stop();await Promise.resolve();session.stop();
    expect(onClose).toHaveBeenCalledTimes(1);expect(sockets[0].readyState).toBe(3);
  });
  it('stops while connecting without sending a stop packet', async () => {
    const session = await start({ onEvent, token: 'token' });session.stop();await Promise.resolve();
    expect(sockets[0].send).not.toHaveBeenCalled();expect(sockets[0].readyState).toBe(3);
  });
});
