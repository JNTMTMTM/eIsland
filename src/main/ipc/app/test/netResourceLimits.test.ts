/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file netResourceLimits.test.ts
 * @description 网络代理缓冲边界、超时和提前关闭的资源回归测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_NET_RESPONSE_BYTES } from '../config/net';
import { registerNetIpcHandlers } from '../net';

const mocks = vi.hoisted(() => ({ handle: vi.fn(), request: vi.fn() }));
vi.mock('electron', () => ({ ipcMain: { handle: mocks.handle }, net: { request: mocks.request } }));

type FetchHandler = (event: { senderFrame: { url: string } }, url: string, options: { timeoutMs: number }) => Promise<{ ok: boolean; status: number; body: string }>;

describe('network proxy resource bounds', () => {
  let request: EventEmitter & { abort: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; write: ReturnType<typeof vi.fn>; setHeader: ReturnType<typeof vi.fn> };
  let response: EventEmitter & { statusCode: number; headers: Record<string, string> };
  let fetch: () => Promise<{ ok: boolean; status: number; body: string }>;

  beforeEach(() => {
    vi.useFakeTimers();
    request = Object.assign(new EventEmitter(), {
      abort: vi.fn(() => request.emit('error', new Error('aborted'))),
      end: vi.fn(), write: vi.fn(), setHeader: vi.fn(),
    });
    response = Object.assign(new EventEmitter(), { statusCode: 200, headers: {} });
    mocks.request.mockReturnValue(request);
    registerNetIpcHandlers({ writeMainLog: vi.fn() });
    const handler = mocks.handle.mock.calls.at(-1)?.[1] as FetchHandler;
    fetch = () => handler({ senderFrame: { url: 'app://index.html' } }, 'https://example.com/lyrics', { timeoutMs: 1000 });
  });

  afterEach(() => vi.useRealTimers());

  it('aborts an oversized chunked response and ignores late data/end', async () => {
    const result = fetch();
    request.emit('response', response);
    response.emit('data', Buffer.alloc(MAX_NET_RESPONSE_BYTES));
    response.emit('data', Buffer.from('x'));
    response.emit('data', Buffer.from('late'));
    response.emit('end');
    await expect(result).resolves.toEqual({ ok: false, status: 413, body: 'response too large' });
    expect(request.abort).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects a known oversized response before receiving its body', async () => {
    response.headers['content-length'] = String(MAX_NET_RESPONSE_BYTES + 1);
    const result = fetch();
    request.emit('response', response);
    await expect(result).resolves.toMatchObject({ ok: false, status: 413 });
    expect(request.abort).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves UTF-8 split across chunks and settles once on normal close', async () => {
    const result = fetch();
    request.emit('response', response);
    const bytes = Buffer.from('歌词');
    response.emit('data', bytes.subarray(0, 2));
    response.emit('data', bytes.subarray(2));
    response.emit('end');
    response.emit('close');
    request.emit('close');
    await expect(result).resolves.toEqual({ ok: true, status: 200, body: '歌词' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['aborted', 'close', 'error'])('cleans up partial data on response %s', async (event) => {
    const result = fetch();
    request.emit('response', response);
    response.emit('data', Buffer.from('partial'));
    if (event === 'close') request.emit('close');
    else response.emit(event, new Error('closed'));
    response.emit('end');
    await expect(result).resolves.toEqual({ ok: false, status: 0, body: '' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('settles timeout before synchronous abort errors and ignores remaining data', async () => {
    const result = fetch();
    request.emit('response', response);
    response.emit('data', Buffer.from('partial'));
    await vi.advanceTimersByTimeAsync(1000);
    response.emit('data', Buffer.from('late'));
    response.emit('end');
    await expect(result).resolves.toEqual({ ok: false, status: 408, body: 'timeout' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts and clears its timeout if sending the request throws', async () => {
    request.end.mockImplementation(() => { throw new Error('send failed'); });
    await expect(fetch()).resolves.toEqual({ ok: false, status: 0, body: '' });
    expect(request.abort).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
