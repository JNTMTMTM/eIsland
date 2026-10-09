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
 * @file bluetoothMonitorRuntime.test.ts
 * @description 蓝牙真实监控器快照标准化、设备差异、错误重试及事件中重启代际测试。
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
import type { NativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
import type { BluetoothMonitor } from '../index';
const file = fileURLToPath(new URL('../bluetooth-monitor.js', import.meta.url));
const json = vi.fn<(name: string) => unknown>(); const start = vi.fn<() => number>(); const stop = vi.fn<() => number>(); const counter = vi.fn<() => number>();
let fixture: NativeRuntimeFixture; let Monitor: new () => BluetoothMonitor; const monitors: BluetoothMonitor[] = [];
/**
 * 创建真实监控器并登记停止清理。
 * @returns 蓝牙监控器
 */
function monitor(): BluetoothMonitor { const result = new Monitor(); monitors.push(result); return result; }
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); start.mockReturnValue(0); counter.mockReturnValue(0); json.mockReturnValue([]);
  fixture = createNativeRuntimeFixture(file, new Map<string, unknown>([['./ffi-loader', { bt: { bt_start_monitoring: start, bt_stop_monitoring: stop, bt_get_changes_count: counter }, callJson: json }]])); Monitor = fixture.read<{ BluetoothMonitor: typeof Monitor }>().BluetoothMonitor;
});
afterEach(() => { monitors.splice(0).forEach((item) => item.stop()); fixture.dispose(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe('真实蓝牙监控器设备变化与轮询代际', () => {
  it('原生启动失败抛错，重复启动和停止幂等，计数不变不重读快照', () => {
    const target = monitor(); target.stop(); start.mockReturnValue(2); expect(() => target.start()).toThrow('DLL returned 2'); start.mockReturnValue(0);
    target.start(); target.start(); expect(start).toHaveBeenCalledTimes(2); vi.advanceTimersByTime(600); expect(json).toHaveBeenCalledOnce(); expect(counter).toHaveBeenCalledTimes(4);
    target.stop(); target.stop(); expect(stop).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it('非法快照可重试，原生计数异常通知error后继续轮询', () => {
    const target = monitor(); const errors = vi.fn(); target.on('error', errors); json.mockReturnValue(null); target.start(); vi.advanceTimersByTime(200); expect(json).toHaveBeenCalledTimes(2);
    const failure = new Error('native unavailable'); counter.mockImplementationOnce(() => { throw failure; }); vi.advanceTimersByTime(200); expect(errors).toHaveBeenCalledWith(failure);
    json.mockReturnValue([]); vi.advanceTimersByTime(200); expect(vi.getTimerCount()).toBe(1); target.stop();
  });
  it('getDevices 非数组返回空，完整字段和缺省字段实际标准化', () => {
    const target = monitor(); json.mockReturnValue(null); expect(target.getDevices()).toEqual([]);
    json.mockReturnValue([{}, { deviceId: 'id', name: 'Headset', bluetoothAddress: 'AA', isConnected: true, isPaired: true, signalStrength: -30, deviceClass: 1, appearance: 2, serviceUuids: ['uuid'] }]);
    expect(target.getDevices()).toEqual([{ deviceId: '', name: null, bluetoothAddress: null, isConnected: false, isPaired: false, signalStrength: null, deviceClass: null, appearance: null, serviceUuids: [] },
      { deviceId: 'id', name: 'Headset', bluetoothAddress: 'AA', isConnected: true, isPaired: true, signalStrength: -30, deviceClass: 1, appearance: 2, serviceUuids: ['uuid'] }]);
  });
  it('新设备、连接、断开、移除依照真实快照差异通知，缺少ID的记录忽略', () => {
    const target = monitor(); const added = vi.fn(); const connected = vi.fn(); const disconnected = vi.fn(); const removed = vi.fn();
    target.on('device-added', added); target.on('device-connected', connected); target.on('device-disconnected', disconnected); target.on('device-removed', removed);
    json.mockReturnValue([{ deviceId: 'id', isConnected: false }, {}]); target.start(); expect(added).toHaveBeenCalledOnce();
    counter.mockReturnValue(1); json.mockReturnValue([{ deviceId: 'id', isConnected: true }]); vi.advanceTimersByTime(200); expect(connected).toHaveBeenCalledWith(expect.objectContaining({ deviceId: 'id' }));
    counter.mockReturnValue(2); json.mockReturnValue([{ deviceId: 'id', isConnected: false }]); vi.advanceTimersByTime(200); expect(disconnected).toHaveBeenCalledWith('id');
    counter.mockReturnValue(3); json.mockReturnValue([]); vi.advanceTimersByTime(200); expect(removed).toHaveBeenCalledExactlyOnceWith('id'); target.stop();
  });
  it.each([['name', 'New'], ['signalStrength', -20], ['isPaired', true], ['bluetoothAddress', 'BB']] as const)('设备属性 %s 独立变化通知更新，重复快照无事件', (key, value) => {
    const target = monitor(); const updates = vi.fn(); target.on('device-updated', updates); const initial = { deviceId: 'id', name: 'Old', signalStrength: -30, isPaired: false, bluetoothAddress: 'AA' };
    json.mockReturnValue([initial]); target.start(); counter.mockReturnValue(1); json.mockReturnValue([{ ...initial, [key]: value }]); vi.advanceTimersByTime(200); expect(updates).toHaveBeenCalledOnce();
    counter.mockReturnValue(2); vi.advanceTimersByTime(200); expect(updates).toHaveBeenCalledOnce(); target.stop();
  });
  it('device-added 回调停止时跳过剩余设备且不再创建轮询定时器', () => {
    const target = monitor(); const added = vi.fn(() => target.stop()); target.on('device-added', added); json.mockReturnValue([{ deviceId: 'one' }, { deviceId: 'two' }]);
    target.start(); expect(added).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it.each([1, 2])('事件回调重启代际，旧批次 %d 设备不覆盖新快照也不叠加定时器', (length) => {
    const target = monitor(); target.once('device-added', () => { target.stop(); json.mockReturnValue([{ deviceId: 'new' }]); target.start(); });
    json.mockReturnValue(Array.from({ length }, (...[, index]) => ({ deviceId: `old-${  index}` }))); target.start();
    expect(target.getDevices()[0]?.deviceId).toBe('new'); expect(vi.getTimerCount()).toBe(1); target.stop();
  });
});
