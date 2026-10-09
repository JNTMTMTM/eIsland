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
 * @file bluetooth.polling.test.ts
 * @description 验证原生监控延迟重启期间 JS 轮询不阻塞、不空转、不叠加定时器。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 加载真实监控器代码，替换原生边界以模拟清理中的设备查询。
 * @returns 监控器和可观测的原生接口
 */
function createMonitor() {
  const native = {
    bt_start_monitoring: vi.fn(() => 0),
    bt_stop_monitoring: vi.fn(() => 0),
    bt_get_changes_count: vi.fn(() => 0),
    bt_wait_for_changes: vi.fn(() => -1),
  };
  const callJson = vi.fn((): unknown[] => []);
  const module = { exports: {} as { BluetoothMonitor: new () => EventEmitter & { start(): void; stop(): void } } };
  runInNewContext(readFileSync(join(__dirname, '../bluetooth-monitor.js'), 'utf8'), {
    module,
    require: (name: string) => name === 'node:events' ? { EventEmitter } : { bt: native, callJson },
    setTimeout,
    clearTimeout,
  });
  return { monitor: new module.exports.BluetoothMonitor(), native, callJson };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('BluetoothMonitor polling', () => {
  it('waits between polls while native cleanup is pending and skips unchanged snapshots', () => {
    const { monitor, native, callJson } = createMonitor();
    monitor.start();
    vi.advanceTimersByTime(1000);
    expect(native.bt_wait_for_changes).not.toHaveBeenCalled();
    expect(native.bt_get_changes_count).toHaveBeenCalledTimes(6);
    expect(callJson).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    monitor.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels pending polls during repeated immediate restarts', () => {
    const { monitor } = createMonitor();
    for (let index = 0; index < 100; index++) {
      monitor.start();
      monitor.stop();
    }
    expect(vi.getTimerCount()).toBe(0);
    monitor.start();
    expect(vi.getTimerCount()).toBe(1);
    monitor.stop();
  });

  it('loads a restarted snapshot even when its event count matches the previous generation', () => {
    const { monitor, native, callJson } = createMonitor();
    native.bt_get_changes_count.mockReturnValue(7);
    callJson.mockReturnValue([{ deviceId: 'old-device' }]);
    monitor.start();
    monitor.stop();

    native.bt_get_changes_count.mockReturnValue(-1);
    callJson.mockReturnValue([]);
    monitor.start();
    const added = vi.fn();
    monitor.on('device-added', added);
    native.bt_get_changes_count.mockReturnValue(7);
    callJson.mockReturnValue([{ deviceId: 'new-device' }]);
    vi.advanceTimersByTime(200);
    expect(added).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ deviceId: 'new-device' }));
    monitor.stop();
  });

  it('keeps one polling loop when an event listener restarts the monitor', () => {
    const { monitor, callJson } = createMonitor();
    callJson.mockReturnValue([{ deviceId: 'test-device' }]);
    monitor.once('device-added', () => {
      monitor.stop();
      monitor.start();
    });
    monitor.start();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(200);
    expect(vi.getTimerCount()).toBe(1);
    monitor.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});
