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
 * @file wifiMonitorRuntime.test.ts
 * @description 真实监控器的原生启动错误、快照规范化、变化事件与停止轮询测试。
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../test/nativeRuntimeHarness';
import type { NativeRuntimeFixture } from '../../test/nativeRuntimeHarness';
import type * as PluginApi from '../index';
const file = fileURLToPath(new URL('../wifi-monitor.js', import.meta.url));
const json = vi.fn<(name: string) => unknown>();
const start = vi.fn<() => number>(); const stop = vi.fn<() => number>(); const wait = vi.fn<(timeout: number) => number>();
let fixture: NativeRuntimeFixture; let api: Pick<typeof PluginApi, 'WifiMonitor'>;
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); start.mockReturnValue(0); wait.mockReturnValue(0); json.mockReturnValue({});
  fixture = createNativeRuntimeFixture(file, new Map<string, unknown>([['./ffi-loader', { wf: { wf_start_monitoring: start, wf_stop_monitoring: stop, wf_wait_for_changes: wait }, callJson: json }]])); api = fixture.read<typeof api>();
});
afterEach(() => { fixture.dispose(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe('Wifi 实际监控器轮询和事件协议', () => {
  it('原生启动失败抛错，成功启动重复调用不重复注册，停止清除监听并终止待调度循环', () => {
    const monitor = new api.WifiMonitor(); monitor.stop(); start.mockReturnValue(2); expect(() => monitor.start()).toThrow('DLL returned 2');
    start.mockReturnValue(0); monitor.start(); monitor.start(); expect(start).toHaveBeenCalledTimes(2); expect(wait).toHaveBeenCalledWith(1000);
    monitor.stop(); monitor.stop(); vi.runOnlyPendingTimers(); expect(stop).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it('空变更无事件，解析异常通知error且下一轮可以恢复', () => {
    const monitor = new api.WifiMonitor(); const changed = vi.fn(); const errors = vi.fn(); monitor.on('wifi-changed', changed); monitor.on('error', errors);
    json.mockReturnValue(null); monitor.start(); expect(changed).not.toHaveBeenCalled();
    const failure = new Error('invalid native JSON'); json.mockImplementationOnce(() => { throw failure; }); vi.advanceTimersToNextTimer(); expect(errors).toHaveBeenCalledWith(failure);
    json.mockReturnValue({}); vi.advanceTimersToNextTimer(); expect(changed).toHaveBeenCalledOnce(); monitor.stop();
  });

  it('连接、断开、SSID切换与信号变化对应通知', () => {
    const monitor = new api.WifiMonitor(); const connected = vi.fn(); const disconnected = vi.fn(); const ssid = vi.fn(); const signal = vi.fn();
    monitor.on('wifi-connected', connected); monitor.on('wifi-disconnected', disconnected); monitor.on('ssid-changed', ssid); monitor.on('signal-changed', signal);
    json.mockReturnValue({ isConnected: false, ssid: null, signalBars: -1 }); monitor.start();
    json.mockReturnValue({ isConnected: true, ssid: 'fixture', signalBars: 4 }); vi.advanceTimersToNextTimer(); expect(connected).toHaveBeenCalledOnce(); expect(ssid).toHaveBeenCalledOnce(); expect(signal).toHaveBeenCalledOnce();
    vi.advanceTimersToNextTimer(); expect(ssid).toHaveBeenCalledOnce(); expect(signal).toHaveBeenCalledOnce();
    json.mockReturnValue({ isConnected: false, ssid: null, signalBars: -1 }); vi.advanceTimersToNextTimer(); expect(disconnected).toHaveBeenCalledOnce(); expect(ssid).toHaveBeenCalledTimes(2); expect(signal).toHaveBeenCalledOnce(); monitor.stop();
  });
  it('默认字段与有效原始字段标准化，初次快照缺失后恢复', () => {
    const monitor = new api.WifiMonitor(); json.mockReturnValue(null); expect(monitor.getWifiInfo()).toBeNull();
    json.mockReturnValue({}); expect(monitor.getWifiInfo()).toEqual({ isConnected: false, ssid: null, signalBars: -1, connectivityLevel: 0, adapterName: null, isWifiAdapter: false });
    const info = { isConnected: true, ssid: 'fixture', signalBars: 3, connectivityLevel: 4, adapterName: 'adapter', isWifiAdapter: true };
    json.mockReturnValue(info); expect(monitor.getWifiInfo()).toEqual(info);
    json.mockReturnValueOnce(null).mockReturnValue(info); const changes = vi.fn(); monitor.on('wifi-changed', changes); monitor.start(); expect(changes).toHaveBeenCalledExactlyOnceWith(info); monitor.stop();
  });
});
