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
 * @file urlWatcherSupplement.test.ts
 * @description 真实剪贴板 URL 监听器的空值、请求超时取消与流读取清理失败测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startClipboardUrlWatcher, stopClipboardUrlWatcher } from '../urlWatcher';
import type { BrowserWindow } from 'electron';
interface FetchOptions { signal: AbortSignal }
interface ReaderResult { done: boolean; value?: Uint8Array }
interface TitleResponse {
  ok: boolean;
  status: number;
  headers: { get: (name: string) => string | null };
  body: { getReader: () => { read: () => Promise<ReaderResult>; cancel: () => Promise<void> } };
}
const mocks = vi.hoisted(() => ({
  read: vi.fn<() => string>(),
  fetch: vi.fn<(url: string, options: FetchOptions) => Promise<TitleResponse>>(),
  send: vi.fn<(channel: string, payload: unknown) => void>(),
}));
vi.mock('electron', () => ({ clipboard: { readText: mocks.read }, net: { fetch: mocks.fetch } }));
const windowFixture = { isDestroyed: () => false, webContents: { send: mocks.send } } as unknown as BrowserWindow;
const options = { getWindow: () => windowFixture, getEnabled: () => true, getDetectMode: () => 'http-https' as const, getBlacklist: () => [] };
beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); mocks.read.mockReturnValue(''); });
afterEach(() => { stopClipboardUrlWatcher(); vi.restoreAllMocks(); vi.useRealTimers(); });
describe('clipboard title request cleanup', () => {
  it('times out a body that stalls after headers and releases its reader', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    const releaseLock = vi.fn();
    mocks.fetch.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'text/html' }, body: {
      getReader: () => ({ read: () => new Promise(() => {}), cancel, releaseLock }),
    } });
    startClipboardUrlWatcher(options);
    mocks.read.mockReturnValue('https://fixture.example/stalled');
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(3000);
    expect(cancel).toHaveBeenCalledOnce();
    expect(releaseLock).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledWith('clipboard:urls-detected', { urls: ['https://fixture.example/stalled'], title: '' });
  });
  it('replaces pending requests and ignores late results after stopping', async () => {
    const signals: AbortSignal[] = [];
    mocks.fetch.mockImplementation((_url, init) => {
      signals.push(init.signal);
      return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    });
    startClipboardUrlWatcher(options);
    mocks.read.mockReturnValue('https://fixture.example/one');
    await vi.advanceTimersByTimeAsync(1000);
    mocks.read.mockReturnValue('https://fixture.example/two');
    await vi.advanceTimersByTimeAsync(1000);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    stopClipboardUrlWatcher();
    await vi.advanceTimersByTimeAsync(5000);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not retain or parse a title beyond the byte budget in one oversized chunk', async () => {
    const read = vi.fn().mockResolvedValue({ done: false, value: new TextEncoder().encode('x'.repeat(8192) + '<title>Too late</title>') });
    const cancel = vi.fn().mockResolvedValue(undefined);
    mocks.fetch.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'text/html' }, body: { getReader: () => ({ read, cancel }) } });
    startClipboardUrlWatcher(options);
    mocks.read.mockReturnValue('https://fixture.example/large');
    await vi.advanceTimersByTimeAsync(1000);
    expect(read).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledWith('clipboard:urls-detected', { urls: ['https://fixture.example/large'], title: '' });
  });
  it('handles empty clipboard values at startup and on a poll without fetching', async () => {
    startClipboardUrlWatcher(options);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.read).toHaveBeenCalledTimes(2);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('aborts a hung fetch after three seconds and reports an empty title', async () => {
    let signal: AbortSignal | undefined;
    mocks.fetch.mockImplementation((url, fetchOptions) => {
      void url; ({ signal } = fetchOptions);
      return new Promise((resolve, reject) => {
        void resolve;
        fetchOptions.signal.addEventListener('abort', () => { reject(new Error('request aborted')); }, { once: true });
      });
    });
    startClipboardUrlWatcher(options);
    mocks.read.mockReturnValue('https://fixture.example/');
    await vi.advanceTimersByTimeAsync(1000);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(2999);
    expect(mocks.send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(signal?.aborted).toBe(true);
    expect(mocks.send).toHaveBeenCalledWith('clipboard:urls-detected', { urls: ['https://fixture.example/'], title: '' });
  });
  it('ignores a reader cancellation rejection after extracting the page title', async () => {
    const read = vi.fn<() => Promise<ReaderResult>>()
      .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('<title>Fixture</title>') })
      .mockResolvedValueOnce({ done: true });
    const cancel = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('already closed'));
    mocks.fetch.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'text/html' }, body: { getReader: () => ({ read, cancel }) } });
    startClipboardUrlWatcher(options);
    mocks.read.mockReturnValue('https://fixture.example/');
    await vi.advanceTimersByTimeAsync(1000);
    expect(cancel).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledWith('clipboard:urls-detected', { urls: ['https://fixture.example/'], title: 'Fixture' });
  });
});
