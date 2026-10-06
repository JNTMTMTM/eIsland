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
 * @file netProtocolSupplement.test.ts
 * @description 网络代理真实 IPC 的来源、请求头、敏感日志、关闭竞态与叶接口失败测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerNetIpcHandlers } from '../net';
import { MAX_NET_RESPONSE_BYTES } from '../config/net';

interface RequestFixture extends EventEmitter {
  abort: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>;
}
interface FetchOptionsFixture {
  method?: string;
  headers?: Record<string, unknown>;
  body?: string;
  timeoutMs?: number;
}
type FetchHandler = (event: { senderFrame?: { url: string } }, url: string, options?: FetchOptionsFixture) => Promise<{ ok: boolean; status: number; body: string }>;
const boundary = vi.hoisted(() => ({
  handle: vi.fn<(channel: string, handler: FetchHandler) => void>(),
  request: vi.fn<() => RequestFixture>(),
  log: vi.fn<(level: string, message: string) => void>(),
}));

vi.mock('electron', () => ({ ipcMain: { handle: boundary.handle }, net: { request: boundary.request } }));

/**
 * 模拟可由真实处理器监听的请求与响应事件。
 * @param status - HTTP 状态。
 * @returns 事件边界。
 */
function fixture(status = 200) {
  const request = Object.assign(new EventEmitter(), { abort: vi.fn(), end: vi.fn(), write: vi.fn(), setHeader: vi.fn() });
  const response = Object.assign(new EventEmitter(), { statusCode: status, headers: {} });
  boundary.request.mockReturnValue(request);
  registerNetIpcHandlers({ writeMainLog: boundary.log });
  const handler = boundary.handle.mock.calls[0]?.[1];
  return { request, response, handler };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('网络代理真实请求协议与日志', () => {
  it.each([undefined, { senderFrame: { url: '' } }, { senderFrame: { url: 'https://untrusted.test' } }])('无可信来源 %s 在请求前拒绝', async (event) => {
    const state = fixture();
    await expect(state.handler?.(event ?? {}, 'https://fixture.test')).resolves.toEqual({ ok: false, status: 403, body: '' });
    expect(boundary.request).not.toHaveBeenCalled();
    expect(boundary.log).toHaveBeenCalledWith('warn', expect.stringContaining('untrusted sender'));
  });

  it.each(['file://fixture', 'http://localhost:3000', 'http://127.0.0.1:3000', 'https://localhost:3000', 'https://127.0.0.1:3000', 'app://fixture'])('可信来源 %s 可以发起请求', async (url) => {
    const state = fixture();
    const pending = state.handler?.({ senderFrame: { url } }, 'https://fixture.test');
    state.request.emit('response', state.response);
    state.response.emit('data', 'string data');
    state.response.emit('end');
    await expect(pending).resolves.toEqual({ ok: true, status: 200, body: 'string data' });
  });

  it.each(['not a url', 'ftp://fixture.test/file'])('非法目标地址 %s 解析或协议校验失败', async (url) => {
    const state = fixture();
    await expect(state.handler?.({ senderFrame: { url: 'app://fixture' } }, url)).resolves.toEqual({ ok: false, status: 400, body: '' });
    expect(boundary.request).not.toHaveBeenCalled();
  });
  it('请求头去空白、过滤空键/非法键/非 ByteString 并隐藏敏感信息', async () => {
    const state = fixture();
    state.request.setHeader.mockImplementation((name: string) => { if (name === 'broken') throw new Error('header failed'); });
    const pending = state.handler?.({ senderFrame: { url: 'app://fixture' } }, 'https://fixture.test/path?token=secret', {
      method: 'POST',
      headers: { ' ': 'empty', 'bad key': 'invalid', ' valid ': 'abc汉字', Authorization: 'secret', nullable: null, broken: 'value' },
      body: JSON.stringify({ token: 'secret', nested: [{ password: 'secret', safe: 1 }, null, 'safe'] }),
    });
    state.request.emit('response', state.response);
    state.response.emit('end');
    await expect(pending).resolves.toMatchObject({ ok: true });
    expect(state.request.setHeader).toHaveBeenCalledWith('valid', 'abc');
    expect(state.request.setHeader).toHaveBeenCalledWith('nullable', '');
    expect(state.request.setHeader).not.toHaveBeenCalledWith('bad key', 'invalid');
    const requestLog = boundary.log.mock.calls.find(([, message]) => message.startsWith('[Net] request'))?.[1] ?? '';
    expect(requestLog).toContain('[REDACTED]');
    expect(requestLog).not.toContain('secret');
    const logged: unknown = JSON.parse(requestLog.slice('[Net] request '.length));
    expect(logged).toMatchObject({ body: JSON.stringify({ token: '[REDACTED]', nested: [{ password: '[REDACTED]', safe: 1 }, null, 'safe'] }) });
    expect(boundary.log).toHaveBeenCalledWith('warn', expect.stringContaining('drop header on setHeader failure'));
  });

  it('非 JSON 请求体仅记录长度且 HEAD 不发送 body', async () => {
    const state = fixture();
    const pending = state.handler?.({ senderFrame: { url: 'app://fixture' } }, 'https://fixture.test', { method: 'HEAD', body: 'private body' });
    state.request.emit('response', state.response);
    state.response.emit('end');
    await expect(pending).resolves.toMatchObject({ ok: true });
    expect(state.request.write).not.toHaveBeenCalled();
    expect(boundary.log).toHaveBeenCalledWith('info', expect.stringContaining('[REDACTED_NON_JSON_BODY length=12]'));
  });

  it('响应结束后 stream error、aborted、请求 close/error 均忽略', async () => {
    const state = fixture();
    const pending = state.handler?.({ senderFrame: { url: 'app://fixture' } }, 'https://fixture.test');
    state.request.emit('response', state.response);
    state.response.emit('end');
    state.response.emit('error', new Error('late response'));
    state.response.emit('aborted');
    state.request.emit('close');
    state.request.emit('error', new Error('late request'));
    await expect(pending).resolves.toEqual({ ok: true, status: 200, body: '' });
    expect(boundary.log.mock.calls.filter(([level]) => level === 'error')).toEqual([]);
  });

  it('请求 abort 事件结算并清除超时', async () => {
    const state = fixture();
    const pending = state.handler?.({ senderFrame: { url: 'app://fixture' } }, 'https://fixture.test');
    state.request.emit('abort');
    await expect(pending).resolves.toEqual({ ok: false, status: 0, body: '' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('net.request 同步构造错误经外层 catch 返回失败', async () => {
    const state = fixture();
    boundary.request.mockImplementationOnce(() => { throw new Error('request creation failed'); });
    await expect(state.handler?.({ senderFrame: { url: 'app://fixture' } }, 'https://fixture.test')).resolves.toEqual({ ok: false, status: 0, body: '' });
    expect(console.error).toHaveBeenCalledWith('[Net] fetch proxy error:', expect.any(Error));
  });

  it.each(['timeout', 'oversized', 'send'])('阶段 %s 的 abort 异常不覆盖已结算结果', async (mode) => {
    const state = fixture();
    state.request.abort.mockImplementation(() => { throw new Error('already closed'); });
    if (mode === 'send') state.request.end.mockImplementation(() => { throw new Error('send failure'); });
    const pending = state.handler?.({ senderFrame: { url: 'app://fixture' } }, 'https://fixture.test', { timeoutMs: 1 });
    if (mode === 'timeout') await vi.advanceTimersByTimeAsync(1);
    else if (mode === 'oversized') {
      state.response.headers['content-length'] = String(MAX_NET_RESPONSE_BYTES + 1);
      state.request.emit('response', state.response);
    }
    const status = { timeout: 408, oversized: 413, send: 0 }[mode];
    await expect(pending).resolves.toMatchObject({ status, ok: false });
    expect(state.request.abort).toHaveBeenCalledOnce();
  });
});
