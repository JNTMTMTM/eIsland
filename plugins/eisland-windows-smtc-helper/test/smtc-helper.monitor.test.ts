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
 * @file smtc-helper.monitor.test.ts
 * @description 验证监控器空闲、故障和重启时不会重复复制封面或堆积轮询任务
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SmtcMonitor } from '../index';

/**
 * 用可控的原生快照加载真实监控器，隔离外部播放器和 DLL。
 * @returns 监控器及原生接口桩
 */
function createMonitor() {
  const native = {
    smtc_start_monitoring: vi.fn(() => 0),
    smtc_stop_monitoring: vi.fn(() => 0),
    smtc_get_sessions_changed: vi.fn(() => 0),
    smtc_wait_for_changes: vi.fn(() => -1),
  };
  const callJson = vi.fn((): unknown => []);
  const module = { exports: {} as { SmtcMonitor: new () => SmtcMonitor } };
  runInNewContext(readFileSync(resolve(__dirname, '../smtc-monitor.js'), 'utf8'), {
    module,
    require: (id: string) => {
      if (id === 'node:events') return { EventEmitter };
      if (id === './ffi-loader') return { smtc: native, callJson };
      throw new Error(`Unexpected dependency: ${id}`);
    },
    setTimeout,
    clearTimeout,
    setImmediate,
  });
  return { monitor: new module.exports.SmtcMonitor(), native, callJson };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('SmtcMonitor resource usage', () => {
  it('does not fetch unchanged artwork on idle polls', () => {
    const { monitor, callJson } = createMonitor();
    callJson.mockReturnValue([{ sourceAppId: 'player', media: { thumbnail: 'x'.repeat(1024 * 1024) } }]);
    monitor.start();
    vi.advanceTimersByTime(60_000);
    expect(callJson).toHaveBeenCalledTimes(1);
    monitor.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('coalesces native changes and publishes current playback and timeline', () => {
    const { monitor, native, callJson } = createMonitor();
    const added = vi.fn();
    const playback = vi.fn();
    const timeline = vi.fn();
    monitor.on('session-added', added);
    monitor.on('session-playback-changed', playback);
    monitor.on('session-timeline-changed', timeline);
    callJson.mockReturnValue([{ sourceAppId: 'player', playback: { playbackStatus: 4 }, timeline: { position: 0 } }]);
    monitor.start();
    native.smtc_get_sessions_changed.mockReturnValue(50);
    callJson.mockReturnValue([{ sourceAppId: 'player', playback: { playbackStatus: 5 }, timeline: { position: 20 } }]);
    vi.advanceTimersByTime(100);
    expect(added).toHaveBeenCalledTimes(1);
    expect(playback).toHaveBeenCalledWith('player', expect.objectContaining({ playbackStatus: 5 }));
    expect(timeline).toHaveBeenCalledWith('player', expect.objectContaining({ position: 20 }));
    expect(callJson).toHaveBeenCalledTimes(2);
    monitor.stop();
  });

  it('backs off native failures without blocking or spinning', () => {
    const { monitor, native, callJson } = createMonitor();
    native.smtc_get_sessions_changed.mockReturnValue(-1);
    monitor.start();
    vi.advanceTimersByTime(1000);
    expect(native.smtc_get_sessions_changed).toHaveBeenCalledTimes(11);
    expect(native.smtc_wait_for_changes).not.toHaveBeenCalled();
    expect(callJson).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
    monitor.stop();
  });

  it('retries an invalid snapshot without waiting for another native event', () => {
    const { monitor, callJson } = createMonitor();
    callJson.mockReturnValueOnce(null);
    monitor.start();
    vi.advanceTimersByTime(200);
    expect(callJson).toHaveBeenCalledTimes(2);
    monitor.stop();
  });

  it('keeps exactly one poll loop across repeated stop and restart', () => {
    const { monitor, native } = createMonitor();
    for (let i = 0; i < 20; i++) {
      monitor.start();
      expect(vi.getTimerCount()).toBe(1);
      monitor.stop();
      expect(vi.getTimerCount()).toBe(0);
    }
    monitor.start();
    native.smtc_get_sessions_changed.mockClear();
    vi.advanceTimersByTime(1000);
    expect(native.smtc_get_sessions_changed).toHaveBeenCalledTimes(10);
    monitor.stop();
  });
});
