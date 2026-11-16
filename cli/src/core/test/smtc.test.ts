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
 * @file smtc.test.ts
 * @description 验证 SMTC 原生快照转换、平台判断及常驻读取的停止与重启行为
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isSmtcSupported, SMTC_INTERVAL_MS, toSmtcSession, watchSmtc } from '../smtc';
import type { NativeSession, SmtcSession } from '../smtc';

const raw = (overrides: Partial<NativeSession> = {}): NativeSession => ({
  sourceAppId: 'Spotify.exe',
  media: { title: 'Song', artist: 'Singer', albumTitle: 'Album' },
  playback: { playbackStatus: 4 },
  timeline: { position: 12, duration: 200, sampledAtMs: 1_000 },
  ...overrides,
});

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('toSmtcSession', () => {
  it('转换媒体、状态与时间线字段', () => {
    expect(toSmtcSession(raw())).toEqual({
      app: 'Spotify.exe', title: 'Song', artist: 'Singer', album: 'Album', status: 'playing', position: 12, duration: 200, updated: 1_000,
    });
  });

  it('缺失的媒体与时间线取默认值，未知状态归为 unknown', () => {
    expect(toSmtcSession(raw({ media: null, playback: null, timeline: null }))).toEqual({
      app: 'Spotify.exe', title: '', artist: '', album: '', status: 'unknown', position: 0, duration: 0, updated: 0,
    });
    expect(toSmtcSession(raw({ playback: { playbackStatus: 5 } })).status).toBe('paused');
    expect(toSmtcSession(raw({ playback: { playbackStatus: 9 } })).status).toBe('unknown');
  });
});

describe('isSmtcSupported', () => {
  it('仅 Windows 支持', () => {
    expect(isSmtcSupported('win32')).toBe(true);
    expect(isSmtcSupported('darwin')).toBe(false);
    expect(isSmtcSupported('linux')).toBe(false);
  });
});

type OnSessions = (sessions: NativeSession[]) => void;

/**
 * 模拟常驻读取进程：保存回调与停止信号，停止后 resolve
 * @returns 读取函数及测试控制句柄
 */
function fakeStream() {
  const calls: { signal: AbortSignal; emit: OnSessions }[] = [];
  const stream = vi.fn((root: string, signal: AbortSignal, emit: OnSessions) => {
    calls.push({ signal, emit });
    return new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve(), { once: true }));
  });
  return { stream, calls };
}

describe('watchSmtc', () => {
  it('同一读取进程的每份快照都会回调全部会话', async () => {
    const { stream, calls } = fakeStream();
    const onUpdate = vi.fn<(sessions: SmtcSession[]) => void>();
    const watcher = watchSmtc('/repo', onUpdate, vi.fn(), stream);
    await vi.advanceTimersByTimeAsync(0);
    calls[0].emit([raw(), raw({ sourceAppId: 'Games.exe' })]);
    calls[0].emit([raw()]);
    await vi.advanceTimersByTimeAsync(SMTC_INTERVAL_MS * 3);
    expect(stream).toHaveBeenCalledTimes(1);
    expect(stream).toHaveBeenCalledWith('/repo', expect.any(AbortSignal), expect.any(Function));
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(onUpdate.mock.calls[0][0].map((session) => session.app)).toEqual(['Spotify.exe', 'Games.exe']);
    watcher.stop();
  });

  it('停止后结束读取进程并忽略迟到的结果', async () => {
    const { stream, calls } = fakeStream();
    const onUpdate = vi.fn();
    const watcher = watchSmtc('/repo', onUpdate, vi.fn(), stream);
    await vi.advanceTimersByTimeAsync(0);
    watcher.stop();
    expect(calls[0].signal.aborted).toBe(true);
    calls[0].emit([raw()]);
    await vi.advanceTimersByTimeAsync(SMTC_INTERVAL_MS * 3);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(stream).toHaveBeenCalledTimes(1);
  });

  it('读取进程退出时报告错误，间隔后重启', async () => {
    const { stream, calls } = fakeStream();
    stream.mockRejectedValueOnce(new Error('read failed'));
    const onError = vi.fn();
    const onUpdate = vi.fn();
    const watcher = watchSmtc('/repo', onUpdate, onError, stream);
    await vi.advanceTimersByTimeAsync(0);
    expect(onError).toHaveBeenCalledWith('read failed');
    expect(stream).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(SMTC_INTERVAL_MS);
    expect(stream).toHaveBeenCalledTimes(2);
    calls[0].emit([raw()]);
    expect(onUpdate).toHaveBeenCalledWith([toSmtcSession(raw())]);
    watcher.stop();
  });
});
