/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file mediaJsRuntime.test.mjs
 * @description 验证默认客户端、顶层 API、监控错误去重与事件回调停止，不触发真实播放器。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import loadCommonJs from './loadCommonJs.mjs';

let native;
let clients;
let MediaMonitor;
let media;
let state;
let sessions;
let timestamp;
const monitors = [];

/**
 * 构造当前播放源事件快照。
 * @param overrides - 覆盖媒体、播放状态与时间线字段。
 * @returns 与原生会话结构一致的快照。
 */
function session(overrides = {}) {
  return {
    sourceAppId: 'com.eisland.fixture',
    media: { title: 'Track' },
    playback: { playbackStatus: 4 },
    timeline: { position: 5, duration: 100 },
    ...overrides,
  };
}

/**
 * 注册监控器，测试结束后统一清理计时器。
 * @param client - 可选的独立媒体客户端。
 * @returns 使用真实 JS 监控源码的实例。
 */
function monitor(client) {
  const instance = new MediaMonitor(client);
  monitors.push(instance);
  return instance;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  state = { revision: 1, running: true, error: null };
  sessions = [session()];
  timestamp = { timeline: { position: 5, endTime: 100 } };
  native = {
    snapshot: vi.fn((kind) => JSON.stringify([{ isAvailable: true }, timestamp, sessions, state][kind])),
    start: vi.fn(() => JSON.stringify({ success: true, error: null })),
    stop: vi.fn(),
    request: vi.fn(async () => JSON.stringify({ success: true, error: null })),
    close: vi.fn(),
  };
  clients = loadCommonJs('client.js', {
    require: (id) => id === './native-loader' ? { createNativeClient: () => native } : undefined,
  });
  const monitorModule = loadCommonJs('media-monitor.js', {
    require: (id) => id === './client' ? clients : undefined,
  });
  ({ MediaMonitor } = monitorModule);
  media = loadCommonJs('index.js', {
    require: (id) => {
      if (id === './client') return clients;
      if (id === './media-monitor') return monitorModule;
      return undefined;
    },
  });
});
afterEach(() => {
  monitors.splice(0).forEach((instance) => instance.stop());
  clients.shutdown();
  vi.useRealTimers();
});

describe('default client and public API', () => {
  it('forwards all public queries and commands to the shared client', async () => {
    expect(media.getStatus()).toEqual({ isAvailable: true });
    expect(media.getTimestamp()).toEqual(timestamp);
    expect(media.getMediaSessions()).toEqual(sessions);
    expect(await media.refresh()).toEqual({ isAvailable: true });
    const operations = [
      ['play', [], 'play', 0], ['pause', [], 'pause', 0], ['next', [], 'next', 0],
      ['previous', [], 'previous', 0], ['stop', [], 'stop', 0], ['seek', [42.25], 'seek', 42.25],
      ['setShuffle', [true], 'shuffle', 1], ['setRepeatMode', [2], 'repeat', 2],
      ['setPlaybackRate', [2], 'rate', 2],
    ];
    await Promise.all(operations.map(async ([method, args, operation, value]) => {
      expect(await media[method](...args)).toEqual({ success: true, error: null });
      expect(native.request).toHaveBeenCalledWith(operation, value);
    }));
    expect(media.SmtcMonitor).toBe(media.MediaMonitor);
    expect(media.MediaClient).toBe(clients.MediaClient);
  });
  it('reuses open clients, recreates closed clients, and makes shutdown idempotent', () => {
    media.shutdown();
    const first = clients.getDefaultClient();
    expect(clients.getDefaultClient()).toBe(first);
    first.close();
    const second = clients.getDefaultClient();
    expect(second).not.toBe(first);
    media.shutdown();
    media.shutdown();
    expect(native.close).toHaveBeenCalledTimes(2);
    expect(clients.getDefaultClient()).not.toBe(second);
  });
  it('rejects closed monitor acquisition and keeps reference counts valid after start failures', () => {
    const client = new clients.MediaClient();
    native.start.mockReturnValueOnce(JSON.stringify({ success: false, error: 'Bridge unavailable' }));
    expect(() => client.acquireMonitor()).toThrow('Bridge unavailable');
    expect(client.monitorCount).toBe(0);
    client.acquireMonitor();
    client.acquireMonitor();
    expect(client.monitorCount).toBe(2);
    expect(native.start).toHaveBeenCalledTimes(2);
    client.releaseMonitor();
    expect(native.stop).not.toHaveBeenCalled();
    client.releaseMonitor();
    client.releaseMonitor();
    expect(client.monitorCount).toBe(0);
    client.close();
    expect(() => client.acquireMonitor()).toThrow('Media client is closed.');
  });
  it('returns a closed request result without invoking native work and rejects refresh', async () => {
    const client = new clients.MediaClient();
    client.close();
    client.close();
    expect(await client.play()).toEqual({ success: false, error: 'Media client is closed.' });
    await expect(client.refresh()).rejects.toThrow('Media client is closed.');
    expect(native.request).not.toHaveBeenCalled();
    expect(native.close).toHaveBeenCalledTimes(1);
  });
  it('validates all argument boundaries and sends no native requests for invalid values', async () => {
    const client = new clients.MediaClient();
    await Promise.all([NaN, Infinity, -1, 9.22e12, '5'].map((value) => expect(client.seek(value)).rejects.toThrow(/Seek position/)));
    await Promise.all([0, 3, '1', null].map((value) => expect(client.setShuffle(value)).rejects.toThrow(/Shuffle value/)));
    await Promise.all([-1, 3, NaN, '1'].map((value) => expect(client.setRepeatMode(value)).rejects.toThrow(/Repeat mode/)));
    await Promise.all([0, -1, 1.5, Infinity, 2147483648].map((value) => expect(client.setPlaybackRate(value)).rejects.toThrow(/positive integer/)));
    expect(native.request).not.toHaveBeenCalled();
    await client.seek(0);
    await client.setPlaybackRate(2147483647);
    expect(native.request).toHaveBeenCalledWith('seek', 0);
    expect(native.request).toHaveBeenCalledWith('rate', 2147483647);
  });
});

describe('monitor state transitions', () => {
  it('can stop in the initial added callback before any timer is scheduled', () => {
    const instance = monitor();
    instance.on('session-added', () => instance.stop());
    instance.start();
    expect(instance.running).toBe(false);
    expect(instance.timer).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    expect(native.stop).toHaveBeenCalledTimes(1);
  });
  it('shares the default client and returns sessions without starting a listener', () => {
    const instance = monitor();
    expect(instance.client).toBe(clients.getDefaultClient());
    expect(instance.getMediaSessions()).toEqual(sessions);
    expect(native.start).not.toHaveBeenCalled();
  });
  it('keeps timers stopped when acquisition fails and ignores polls after stopping', () => {
    const instance = monitor();
    native.start.mockReturnValueOnce(JSON.stringify({ success: false, error: 'Start failed' }));
    expect(() => instance.start()).toThrow('Start failed');
    expect(instance.running).toBe(false);
    instance.poll();
    expect(native.snapshot).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('deduplicates errors and allows the same error after recovery', () => {
    sessions = [];
    const instance = monitor();
    const error = vi.fn();
    instance.on('error', error);
    instance.start();
    state.error = 'Transient failure';
    vi.advanceTimersByTime(200);
    expect(error).toHaveBeenCalledTimes(1);
    state.error = null;
    vi.advanceTimersByTime(100);
    state.error = 'Transient failure';
    vi.advanceTimersByTime(100);
    expect(error).toHaveBeenCalledTimes(2);
    state.running = false;
    vi.advanceTimersByTime(100);
    expect(instance.running).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('ignores missing timestamps and accumulates sub-threshold position changes', () => {
    const instance = monitor();
    const changed = vi.fn();
    instance.on('session-timeline-changed', changed);
    instance.start();
    timestamp = { timeline: null };
    vi.advanceTimersByTime(500);
    expect(changed).not.toHaveBeenCalled();
    timestamp.timeline = { position: 5.2, endTime: 100 };
    vi.advanceTimersByTime(500);
    timestamp.timeline.position = 5.4;
    vi.advanceTimersByTime(500);
    expect(changed).not.toHaveBeenCalled();
    timestamp.timeline.position = 5.6;
    vi.advanceTimersByTime(500);
    expect(changed).toHaveBeenCalledExactlyOnceWith('com.eisland.fixture', { position: 5.6, duration: 100 });
    timestamp.timeline.endTime = 101;
    vi.advanceTimersByTime(500);
    expect(changed).toHaveBeenCalledTimes(2);
  });
  it('keeps a source without a timeline quiet until a timeline becomes available', () => {
    sessions = [session({ timeline: null })];
    const instance = monitor();
    const changed = vi.fn();
    instance.on('session-timeline-changed', changed);
    instance.start();
    state.revision += 1;
    vi.advanceTimersByTime(100);
    expect(changed).not.toHaveBeenCalled();
    sessions = [session()];
    state.revision += 1;
    vi.advanceTimersByTime(100);
    expect(changed).toHaveBeenCalledWith('com.eisland.fixture', { position: 5, duration: 100 });
    sessions = [session({ timeline: null })];
    state.revision += 1;
    vi.advanceTimersByTime(100);
    expect(changed).toHaveBeenLastCalledWith('com.eisland.fixture', null);
  });
  it('stops from a removal callback before adding the replacement source', () => {
    const instance = monitor();
    const added = vi.fn();
    instance.on('session-added', added);
    instance.on('session-removed', () => instance.stop());
    instance.start();
    sessions = [session({ sourceAppId: 'com.eisland.other' })];
    state.revision += 1;
    vi.advanceTimersByTime(100);
    expect(added).toHaveBeenCalledTimes(1);
    expect(instance.cache.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['session-media-changed', 'session-playback-changed'])('stops from %s before later events are dispatched', (event) => {
    const instance = monitor();
    const timeline = vi.fn();
    instance.on('session-timeline-changed', timeline);
    instance.on(event, () => instance.stop());
    instance.start();
    sessions = [session({ media: { title: 'Changed' }, playback: { playbackStatus: 5 }, timeline: { position: 10, duration: 100 } })];
    state.revision += 1;
    vi.advanceTimersByTime(100);
    expect(instance.running).toBe(false);
    expect(timeline).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('distinguishes metadata-only changes from playback changes', () => {
    const instance = monitor();
    const playback = vi.fn();
    instance.on('session-playback-changed', playback);
    instance.start();
    sessions = [session({ media: { title: 'Changed' } })];
    state.revision += 1;
    vi.advanceTimersByTime(100);
    expect(playback).not.toHaveBeenCalled();
    sessions = [session({ media: { title: 'Changed' }, playback: { playbackStatus: 5 } })];
    state.revision += 1;
    vi.advanceTimersByTime(100);
    expect(playback).toHaveBeenCalledExactlyOnceWith('com.eisland.fixture', { playbackStatus: 5 });
  });
});
