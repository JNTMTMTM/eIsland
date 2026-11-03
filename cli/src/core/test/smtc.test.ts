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
 * @description 验证 SMTC 插件快照转换、平台判断，以及插件监控的启动、定时读取全部会话、错误与停止处理
 * @author 鸡哥
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import {
  isSmtcSupported, SMTC_HELPER_DIR, SMTC_INTERVAL_MS, toSmtcSession, watchSmtc,
} from '../smtc';

import type {
  HelperModule, HelperMonitor, HelperSession, SmtcSession,
} from '../smtc';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

const raw = (overrides: Partial<HelperSession> = {}): HelperSession => ({
  sourceAppId: 'Spotify.exe',
  media: { title: 'Song', artist: 'Singer', albumTitle: 'Album' },
  playback: { playbackStatus: 4 },
  timeline: { position: 12, duration: 200, sampledAtMs: 1_000 },
  ...overrides,
});

/** 模拟插件监控器 */
const monitor = {
  start: vi.fn(),
  stop: vi.fn(),
  getMediaSessions: vi.fn((): HelperSession[] => []),
  on: vi.fn(),
};

/** 插件监控器替身，方法均委托给共享的模拟函数，便于断言 */
class FakeMonitor implements HelperMonitor {
  start = monitor.start;

  stop = monitor.stop;

  getMediaSessions = monitor.getMediaSessions;

  on = monitor.on;
}

/**
 * 模拟插件模块
 * @returns 构造监控器替身的模块
 */
const fakeModule = (): HelperModule => ({ SmtcMonitor: FakeMonitor });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

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
  it('插件路径指向仓库内的 SMTC 插件', () => {
    expect(existsSync(path.join(ROOT, SMTC_HELPER_DIR, 'package.json'))).toBe(true);
  });

  it('从仓库根目录加载插件并启动监控，每个间隔读取全部会话', () => {
    const load = vi.fn(fakeModule);
    const onUpdate = vi.fn<(sessions: SmtcSession[]) => void>();
    monitor.getMediaSessions.mockReturnValue([raw(), raw({ sourceAppId: 'Games.exe', timeline: null })]);
    watchSmtc('/repo', onUpdate, vi.fn(), load);
    expect(load).toHaveBeenCalledWith('/repo');
    expect(monitor.start).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SMTC_INTERVAL_MS * 2);
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(onUpdate.mock.calls[0][0].map((session) => session.app)).toEqual(['Spotify.exe', 'Games.exe']);
  });

  it('插件加载或启动失败时回调错误且不再读取', () => {
    const onError = vi.fn();
    const watcher = watchSmtc('/repo', vi.fn(), onError, () => {
      throw new Error('Unable to find eIslandSmtcHelper.dll');
    });
    expect(onError).toHaveBeenCalledWith('Unable to find eIslandSmtcHelper.dll');
    expect(() => watcher.stop()).not.toThrow();
  });

  it('读取失败或监控报错时回调错误', () => {
    const onError = vi.fn();
    monitor.getMediaSessions.mockImplementation(() => {
      throw new Error('read failed');
    });
    watchSmtc('/repo', vi.fn(), onError, fakeModule);
    vi.advanceTimersByTime(SMTC_INTERVAL_MS);
    expect(onError).toHaveBeenCalledWith('read failed');
    const [[event, listener]] = monitor.on.mock.calls as [string, (error: Error) => void][];
    expect(event).toBe('error');
    listener(new Error('monitor failed'));
    expect(onError).toHaveBeenCalledWith('monitor failed');
  });

  it('停止后关闭插件监控且不再读取', () => {
    const onUpdate = vi.fn();
    monitor.getMediaSessions.mockReturnValue([]);
    const watcher = watchSmtc('/repo', onUpdate, vi.fn(), fakeModule);
    watcher.stop();
    vi.advanceTimersByTime(SMTC_INTERVAL_MS * 3);
    expect(monitor.stop).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
