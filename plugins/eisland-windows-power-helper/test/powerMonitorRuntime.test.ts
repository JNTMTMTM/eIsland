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
 * @file powerMonitorRuntime.test.ts
 * @description 真实监控器的原生启动错误、快照规范化、变化事件与停止轮询测试。
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../test/nativeRuntimeHarness';
import type { NativeRuntimeFixture } from '../../test/nativeRuntimeHarness';
import type * as PluginApi from '../index';
const file = fileURLToPath(new URL('../power-monitor.js', import.meta.url));
const json = vi.fn<(name: string) => unknown>();
const start = vi.fn<() => number>(); const stop = vi.fn<() => number>(); const wait = vi.fn<(timeout: number) => number>();
let fixture: NativeRuntimeFixture; let api: Pick<typeof PluginApi, 'PowerMonitor'>;
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); start.mockReturnValue(0); wait.mockReturnValue(0); json.mockReturnValue({});
  fixture = createNativeRuntimeFixture(file, new Map<string, unknown>([['./ffi-loader', { pw: { pw_start_monitoring: start, pw_stop_monitoring: stop, pw_wait_for_changes: wait }, callJson: json }]])); api = fixture.read<typeof api>();
});
afterEach(() => { fixture.dispose(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe('Power 实际监控器轮询和事件协议', () => {
  it('原生启动失败抛错，成功启动重复调用不重复注册，停止清除监听并终止待调度循环', () => {
    const monitor = new api.PowerMonitor(); monitor.stop(); start.mockReturnValue(2); expect(() => monitor.start()).toThrow('DLL returned 2');
    start.mockReturnValue(0); monitor.start(); monitor.start(); expect(start).toHaveBeenCalledTimes(2); expect(wait).toHaveBeenCalledWith(1000);
    monitor.stop(); monitor.stop(); vi.runOnlyPendingTimers(); expect(stop).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it('空变更无事件，解析异常通知error且下一轮可以恢复', () => {
    const monitor = new api.PowerMonitor(); const changed = vi.fn(); const errors = vi.fn(); monitor.on('power-changed', changed); monitor.on('error', errors);
    json.mockReturnValue(null); monitor.start(); expect(changed).not.toHaveBeenCalled();
    const failure = new Error('invalid native JSON'); json.mockImplementationOnce(() => { throw failure; }); vi.advanceTimersToNextTimer(); expect(errors).toHaveBeenCalledWith(failure);
    json.mockReturnValue({}); vi.advanceTimersToNextTimer(); expect(changed).toHaveBeenCalledOnce(); monitor.stop();
  });

  it('AC、充电和低电量变化仅在阈值穿越时通知', () => {
    const monitor = new api.PowerMonitor(); const acOn = vi.fn(); const acOff = vi.fn(); const charging = vi.fn(); const discharging = vi.fn(); const low = vi.fn();
    monitor.on('ac-connected', acOn); monitor.on('ac-disconnected', acOff); monitor.on('charging', charging); monitor.on('discharging', discharging); monitor.on('battery-low', low);
    json.mockReturnValue({ remainingChargePercent: 80, hasBattery: true, isOnAcPower: false, isCharging: false }); monitor.start();
    json.mockReturnValue({ remainingChargePercent: 70, hasBattery: true, isOnAcPower: true, isCharging: true }); vi.advanceTimersToNextTimer(); expect(acOn).toHaveBeenCalledOnce(); expect(charging).toHaveBeenCalledOnce(); expect(low).not.toHaveBeenCalled();
    json.mockReturnValue({ remainingChargePercent: 15, hasBattery: true, isOnAcPower: false, isCharging: false }); vi.advanceTimersToNextTimer(); expect(acOff).toHaveBeenCalledOnce(); expect(discharging).toHaveBeenCalledOnce(); expect(low).toHaveBeenCalledOnce();
    vi.advanceTimersToNextTimer(); expect(low).toHaveBeenCalledOnce();
    json.mockReturnValue({ remainingChargePercent: 5, hasBattery: false }); vi.advanceTimersToNextTimer(); expect(low).toHaveBeenCalledOnce(); monitor.stop();
  });
  it('默认字段与有效原始字段标准化，初次快照缺失后恢复', () => {
    const monitor = new api.PowerMonitor(); json.mockReturnValue(null); expect(monitor.getPowerInfo()).toBeNull();
    json.mockReturnValue({}); expect(monitor.getPowerInfo()).toEqual({ remainingChargePercent: 100, batteryStatus: 0, powerSupplyStatus: 0, energySaverStatus: 0, hasBattery: false, isCharging: false, isOnAcPower: false });
    const info = { remainingChargePercent: 50, batteryStatus: 1, powerSupplyStatus: 2, energySaverStatus: 3, hasBattery: true, isCharging: true, isOnAcPower: true };
    json.mockReturnValue(info); expect(monitor.getPowerInfo()).toEqual(info);
    json.mockReturnValueOnce(null).mockReturnValue(info); const changes = vi.fn(); monitor.on('power-changed', changes); monitor.start(); expect(changes).toHaveBeenCalledExactlyOnceWith(info); monitor.stop();
  });
});
