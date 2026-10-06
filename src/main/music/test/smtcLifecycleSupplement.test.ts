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
 * @file smtcLifecycleSupplement.test.ts
 * @description SMTC 旧 Worker 事件隔离、异步终止失败、源请求窗口变化和缩略图保留测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSmtcService } from '../smtcService';
import type { BrowserWindow } from 'electron';
interface WorkerFixture extends EventEmitter { postMessage: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn>; }
const io = vi.hoisted(() => ({ workers: [] as WorkerFixture[], windows: vi.fn(), now: 100, constructionFailure: null as Error | null }));
vi.mock('electron', () => ({ BrowserWindow: { getAllWindows: io.windows } }));
vi.mock('worker_threads', () => ({
  Worker: class extends EventEmitter {
    postMessage = vi.fn();

    terminate = vi.fn<() => Promise<number>>().mockResolvedValue(0);

    constructor() { super(); if (io.constructionFailure) throw io.constructionFailure; io.workers.push(this); }
  },
}));
const win = { isDestroyed: vi.fn<() => boolean>(), webContents: { send: vi.fn() } };
let getWindow: ReturnType<typeof vi.fn<() => BrowserWindow | null>>;
/**
 * 创建服务及真实消息处理入口，只替换窗口与 Worker 叶边界。
 * @returns 真实 SMTC 服务
 */
function create(): ReturnType<typeof createSmtcService> {
  return createSmtcService({ getMainWindow: getWindow, getWhitelist: () => ['spotify', 'foobar'],
    getSmtcUnsubscribeMs: () => 30_000, unsubscribeNeverValue: -1, cleanupIntervalMs: 1000 });
}
/**
 * 发送媒体更新消息。
 * @param sourceAppId - 播放源
 * @param extra - 会话字段覆盖
 */
function update(sourceAppId: string, extra: Record<string, unknown> = {}): void {
  io.workers.at(-1)?.emit('message', { sourceAppId, type: 'session-update', session: {
    media: { title: 'Track', artist: 'Artist', albumTitle: 'Album', thumbnail: null },
    playback: { playbackStatus: 4, playbackType: 1 }, timeline: { duration: 10, position: 2 }, ...extra,
  } });
}
beforeEach(() => {
  vi.resetAllMocks(); io.workers.length = 0; io.now = 100; io.constructionFailure = null;
  win.isDestroyed.mockReturnValue(false); getWindow = vi.fn<() => BrowserWindow | null>().mockReturnValue(win as unknown as BrowserWindow);
  io.windows.mockReturnValue([win]); vi.spyOn(Date, 'now').mockImplementation(() => io.now);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe('SMTC 延迟事件和检测失败边界', () => {
  it('Worker 构造失败记录初始化错误，重复无 Worker 清理不调用终止', () => {
    const service = create();
    io.constructionFailure = new Error('worker script unavailable'); service.initWorker();
    expect(console.error).toHaveBeenCalledWith('[SMTC] Worker init error:', io.constructionFailure);
    service.cleanupWorker(); service.cleanupWorker(); expect(io.workers).toHaveLength(0);
  });
  it('清理后的旧 Worker 消息、错误和退出不影响新实例', () => {
    const service = create(); service.initWorker(); const [old] = io.workers;
    service.cleanupWorker(); service.initWorker();
    old.emit('message', { type: 'session-update', sourceAppId: 'spotify' });
    old.emit('error', new Error('late error')); old.emit('exit', 1);
    expect(console.error).not.toHaveBeenCalled(); expect(io.workers[1].terminate).not.toHaveBeenCalled();
    expect(service.getCurrentDeviceId()).toBe(''); expect(service.getSmtcSessionRuntime()?.size).toBe(0);
    service.cleanupWorker();
  });
  it('Worker terminate 拒绝会记录异步错误且状态已清理', async () => {
    const service = create(); service.initWorker();
    io.workers[0].terminate.mockRejectedValue(new Error('termination unavailable'));
    service.cleanupWorker(); await Promise.resolve();
    expect(service.getSmtcSessionRuntime()).toBeNull(); expect(service.getCurrentDeviceId()).toBe('');
    expect(console.error).toHaveBeenCalledWith('[SMTC] Worker termination error:', expect.any(Error));
  });
  it('检测 postMessage 同步失败立即完成并清理定时器', async () => {
    vi.useFakeTimers(); const service = create(); service.initWorker();
    io.workers[0].postMessage.mockImplementation(() => { throw new Error('port closed'); });
    await expect(service.detectAllSources()).resolves.toEqual([]);
    expect(vi.getTimerCount()).toBe(0); service.cleanupWorker();
  });
  it('探测中 Worker 清理完成等待者，随后无 Worker 返回空列表', async () => {
    vi.useFakeTimers(); const service = create(); service.initWorker();
    const pending = service.detectAllSources(); service.cleanupWorker();
    await expect(pending).resolves.toEqual([]); await expect(service.detectAllSources()).resolves.toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
describe('SMTC 标题、缩略图和源请求边界', () => {
  it('清理周期内未达到 TTL 的会话仍保留，空源标识不移除有效会话', () => {
    const service = create(); service.initWorker(); update('spotify'); io.now = 2000; update('foobar');
    expect(service.getSmtcSessionRuntime()?.size).toBe(2);
    io.workers[0].emit('message', { type: 'session-removed', sourceAppId: '' });
    update(''); expect(service.getSmtcSessionRuntime()?.size).toBe(2);
    expect(service.getCurrentDeviceId()).toBe('spotify'); service.cleanupWorker();
  });
  it('重复没有媒体信息的会话使用空标题及上次零时间轴', () => {
    const service = create(); service.initWorker(); update('spotify', { media: null, playback: null, timeline: null });
    service.setCurrentDeviceId('spotify'); update('spotify', { media: null, playback: null, timeline: null });
    expect(service.getSmtcSessionRuntime()?.get('spotify')).toMatchObject({ payload: { title: '', artist: '', duration_ms: 0, position_ms: 0 } });
    service.cleanupWorker();
  });
  it.each(['missing', 'destroyed'])('%s 主窗口忽略普通消息与源请求', (state) => {
    const service = create(); service.initWorker();
    if (state === 'missing') getWindow.mockReturnValue(null); else win.isDestroyed.mockReturnValue(true);
    update('spotify'); expect(win.webContents.send).not.toHaveBeenCalled();
    expect(service.getSmtcSessionRuntime()?.size).toBe(0); service.cleanupWorker();
  });
  it.each(['missing', 'destroyed'])('源切换通知前 %s 窗口时不发送通知', (state) => {
    const service = create(); service.initWorker(); update('spotify'); win.webContents.send.mockClear();
    if (state === 'missing') getWindow.mockReturnValueOnce(win as unknown as BrowserWindow).mockReturnValueOnce(null);
    else win.isDestroyed.mockReturnValueOnce(false).mockReturnValueOnce(true);
    update('foobar');
    expect(service.getPendingSourceSwitchId()).toBe('foobar'); expect(win.webContents.send).not.toHaveBeenCalled();
    service.cleanupWorker();
  });
  it('较旧的候选不会覆盖已经更新的播放和标题候选', async () => {
    const service = create(); service.initWorker(); update('spotify'); io.now = 200; update('foobar');
    io.now = 300; update('spotify');
    await expect(service.pickDetectedSourceAppId()).resolves.toBe('spotify'); service.cleanupWorker();
  });
  it('无缩略图的同曲更新保留 null 和时间轴，不产生新源请求', () => {
    const service = create(); service.initWorker(); update('spotify');
    update('spotify', { media: { title: 'Track', artist: 'Artist', albumTitle: 'Album' }, timeline: null });
    expect(win.webContents.send).toHaveBeenLastCalledWith('nowplaying:info', expect.objectContaining({ duration_ms: 10000, position_ms: 2000 }));
    update('foobar'); const requests = win.webContents.send.mock.calls.filter(([channel]) => channel === 'media:source-switch-request');
    update('foobar');
    expect(win.webContents.send.mock.calls.filter(([channel]) => channel === 'media:source-switch-request')).toHaveLength(requests.length);
    expect(service.getPendingSourceSwitchEntry()).toMatchObject({ payload: { thumbnail: null } });
    service.cleanupWorker();
  });
  it('广播跳过销毁窗口，重复播放在零时刻仍建立开始时间', () => {
    const destroyed = { isDestroyed: () => true, webContents: { send: vi.fn() } };
    io.windows.mockReturnValue([win, destroyed]); io.now = 0;
    const service = create(); service.initWorker(); update('spotify'); io.now = 1; update('spotify');
    expect(destroyed.webContents.send).not.toHaveBeenCalled(); expect(win.webContents.send).toHaveBeenCalledTimes(2);
    service.cleanupWorker();
  });
});
