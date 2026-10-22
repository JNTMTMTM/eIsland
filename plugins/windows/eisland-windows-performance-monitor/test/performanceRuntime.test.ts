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
 * @file performanceRuntime.test.ts
 * @description 真实插件入口的原生加载、helper 响应校验、失败降级与缓存测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
import type { NativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
import type * as PerformanceApi from '../index';

const file = fileURLToPath(new URL('../index.js', import.meta.url));
const leaves = new Map<string, unknown>();
const exists = vi.fn<(candidate: string) => boolean>();
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const reading = { id: '/cpu/0/temperature/0', label: 'CPU package', category: 'cpu', temperatureCelsius: 65, source: 'libre-hardware-monitor' };
const device = { id: '/cpu/0', name: 'CPU', category: 'cpu', hardwareType: 'Cpu', source: 'libre-hardware-monitor' };
const payload = {
  temperature: { isAvailable: true, readings: [reading], maxTemperatureCelsius: 65 },
  hardwareList: { isAvailable: true, cpus: [device], gpus: [] },
};
/**
 * 构造可控制分包、写入和退出事件的 helper 进程。
 * @returns 可控制的进程边界
 */
function createChild() {
  return Object.assign(new EventEmitter(), {
    stdout: Object.assign(new EventEmitter(), { setEncoding: vi.fn(), ref: vi.fn(), unref: vi.fn() }),
    stdin: Object.assign(new EventEmitter(), { write: vi.fn(), end: vi.fn(), ref: vi.fn(), unref: vi.fn() }),
    kill: vi.fn(), ref: vi.fn(), unref: vi.fn(),
  });
}
let child: ReturnType<typeof createChild>;
const spawn = vi.fn();
let fixture: NativeRuntimeFixture;
let api: typeof PerformanceApi;
let binding: Record<string, unknown>;
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(100000); leaves.clear();
  Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' });
  binding = {}; child = createChild(); spawn.mockReturnValue(child);
  fixture = createNativeRuntimeFixture(file, leaves);
  leaves.set(join(dirname(file), 'build', 'Release', 'windows_performance_monitor.node'), binding);
  leaves.set('node:fs', { existsSync: exists }); leaves.set('node:child_process', { spawn });
  exists.mockReturnValue(true); api = fixture.read<typeof PerformanceApi>();
});
afterEach(() => {
  api.dispose(); fixture.dispose(); vi.useRealTimers(); vi.restoreAllMocks();
  if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
});
/**
 * 将一条完整响应送入真实插件入口。
 * @param value - helper 的响应载荷
 */
function respond(value: unknown = payload) { child.stdout.emit('data', `${JSON.stringify(value)}\n`); }

describe('性能插件异步采集与生命周期', () => {
  it('非 Windows 拒绝加载，Release 失败可回退 Debug，双失败透传最后错误', () => {
    leaves.set(join(dirname(file), 'build', 'Release', 'windows_performance_monitor.node'), new Error('release absent'));
    leaves.set(join(dirname(file), 'build', 'Debug', 'windows_performance_monitor.node'), binding);
    expect(fixture.read()).toBe(binding);
    const failure = new Error('debug absent');
    leaves.set(join(dirname(file), 'build', 'Debug', 'windows_performance_monitor.node'), failure);
    expect(fixture.read).toThrow(failure);
    Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });
    expect(fixture.read).toThrow('only supports Windows');
  });
  it('导入不启动 helper，同步查询立即返回缓存并合并后台刷新', () => {
    expect(spawn).not.toHaveBeenCalled();
    expect(api.getTemperature()).toEqual({ isAvailable: false, readings: [], maxTemperatureCelsius: null });
    expect(api.getHardwareList().isAvailable).toBe(false);
    expect(spawn).toHaveBeenCalledExactlyOnceWith(expect.any(String), ['server'], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    expect(child.stdin.write).toHaveBeenCalledExactlyOnceWith('snapshot\n');
    respond();
    expect(api.getTemperature()).toEqual(payload.temperature);
    expect(api.getHardwareList()).toEqual(payload.hardwareList);
  });
  it('并发查询共用请求、支持分包，缓存过期后复用进程', async () => {
    const temperatures = Array.from({ length: 100 }, () => api.getTemperatureAsync());
    const hardware = api.getHardwareListAsync();
    const line = JSON.stringify(payload);
    child.stdout.emit('data', line.slice(0, 20));
    expect(api.getTemperature().isAvailable).toBe(false);
    child.stdout.emit('data', `${line.slice(20)}\n`);
    expect(await Promise.all(temperatures)).toEqual(Array(100).fill(payload.temperature));
    expect(await hardware).toEqual(payload.hardwareList);
    await api.getTemperatureAsync();
    expect(child.stdin.write).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    const next = api.getTemperatureAsync(); respond(); await next;
    expect(spawn).toHaveBeenCalledOnce(); expect(child.stdin.write).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    await api.getHardwareListAsync();
    expect(child.stdin.write).toHaveBeenCalledTimes(2);
  });
  it('helper 缺失和启动抛错都退避，不循环检查文件或启动进程', async () => {
    exists.mockReturnValue(false);
    await api.getTemperatureAsync(); await api.getHardwareListAsync();
    expect(spawn).not.toHaveBeenCalled(); expect(exists).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(10000); exists.mockReturnValue(true);
    spawn.mockImplementation(() => { throw new Error('spawn failed'); });
    await api.getTemperatureAsync(); await api.getTemperatureAsync();
    expect(spawn).toHaveBeenCalledOnce();
  });
  it.each(['error', 'exit', 'stdin-error', 'stdout-error', 'timeout', 'invalid', 'null', 'oversize'])('%s 完成等待者、清除过期温度，退避后恢复', async (failure) => {
    const initial = api.getTemperatureAsync(); respond(); await initial;
    await vi.advanceTimersByTimeAsync(2000);
    const pending = api.getTemperatureAsync();
    if (failure === 'timeout') await vi.advanceTimersByTimeAsync(5000);
    else if (failure === 'invalid') child.stdout.emit('data', '{invalid}\n');
    else if (failure === 'null') respond(null);
    else if (failure === 'oversize') child.stdout.emit('data', 'x'.repeat(1024 * 1024 + 1));
    else if (failure === 'stdin-error') child.stdin.emit('error', new Error('pipe'));
    else if (failure === 'stdout-error') child.stdout.emit('error', new Error('pipe'));
    else child.emit(failure, failure === 'error' ? new Error('spawn') : 1);
    expect((await pending).isAvailable).toBe(false); expect(child.kill).toHaveBeenCalledOnce();
    await api.getTemperatureAsync(); expect(spawn).toHaveBeenCalledOnce();
    const oldChild = child; child = createChild(); spawn.mockReturnValue(child);
    await vi.advanceTimersByTimeAsync(10000);
    const retry = api.getTemperatureAsync();
    oldChild.emit('exit', 1); oldChild.stdout.emit('data', '{}\n');
    respond(); expect(await retry).toEqual(payload.temperature); expect(spawn).toHaveBeenCalledTimes(2);
  });
  it('过滤非法传感器和设备，缓存不能被调用方改写', async () => {
    const pending = api.getTemperatureAsync();
    respond({
      temperature: { isAvailable: true, readings: [null, 1, {}, { ...reading, temperatureCelsius: '65' }, reading], maxTemperatureCelsius: 999 },
      hardwareList: { isAvailable: true, cpus: [null, {}, device], gpus: [device] },
    });
    const snapshot = await pending;
    expect(snapshot).toEqual(payload.temperature); expect(api.getHardwareList()).toEqual(payload.hardwareList);
    expect(() => { snapshot.readings[0].temperatureCelsius = 999; }).toThrow();
  });
  it('空闲结束 stdin 且无后台轮询，下次温度请求重新启动', async () => {
    const pending = api.getTemperatureAsync(); respond(); await pending;
    await vi.advanceTimersByTimeAsync(15000);
    expect(child.stdin.end).toHaveBeenCalledOnce(); expect(child.stdin.write).toHaveBeenCalledOnce();
    const next = api.getTemperatureAsync(); respond(); await next;
    expect(spawn).toHaveBeenCalledTimes(2);
  });
  it('dispose 完成请求、清空缓存并移除退出钩子，可以重新采集', async () => {
    const listeners = process.listenerCount('exit');
    const pending = api.getTemperatureAsync(); expect(process.listenerCount('exit')).toBe(listeners + 1);
    api.dispose(); expect((await pending).isAvailable).toBe(false);
    expect(process.listenerCount('exit')).toBe(listeners);
    const next = api.getTemperatureAsync(); respond(); expect(await next).toEqual(payload.temperature);
  });
});
