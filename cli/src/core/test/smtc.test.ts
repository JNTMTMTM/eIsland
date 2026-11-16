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
 * @description 验证 SMTC 原生快照转换、平台判断及定时读取的并发控制和取消行为
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

describe('watchSmtc', () => {
  it('每次查询读取全部会话', async () => {
    const read = vi.fn().mockResolvedValue([raw(), raw({ sourceAppId: 'Games.exe' })]);
    const onUpdate = vi.fn<(sessions: SmtcSession[]) => void>();
    const watcher = watchSmtc('/repo', onUpdate, vi.fn(), read);
    await vi.advanceTimersByTimeAsync(SMTC_INTERVAL_MS * 2);
    expect(read).toHaveBeenCalledWith('/repo', expect.any(AbortSignal));
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(onUpdate.mock.calls[0][0].map((session) => session.app)).toEqual(['Spotify.exe', 'Games.exe']);
    watcher.stop();
  });

  it('上次查询未结束时跳过轮询，停止后忽略迟到的结果', async () => {
    const deferred = Promise.withResolvers<NativeSession[]>();
    const read = vi.fn<(_root: string, _signal: AbortSignal) => Promise<NativeSession[]>>(() => deferred.promise);
    const onUpdate = vi.fn();
    const watcher = watchSmtc('/repo', onUpdate, vi.fn(), read);
    await vi.advanceTimersByTimeAsync(SMTC_INTERVAL_MS * 3);
    expect(read).toHaveBeenCalledTimes(1);
    const [[, signal]] = read.mock.calls;
    watcher.stop();
    expect(signal.aborted).toBe(true);
    deferred.resolve([raw()]);
    await vi.advanceTimersByTimeAsync(SMTC_INTERVAL_MS * 2);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('报告读取错误，下一次查询可以恢复', async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error('read failed')).mockResolvedValue([raw()]);
    const onError = vi.fn();
    const onUpdate = vi.fn();
    const watcher = watchSmtc('/repo', onUpdate, onError, read);
    await vi.advanceTimersByTimeAsync(SMTC_INTERVAL_MS * 2);
    expect(onError).toHaveBeenCalledWith('read failed');
    expect(onUpdate).toHaveBeenCalledWith([toSmtcSession(raw())]);
    watcher.stop();
  });
});
