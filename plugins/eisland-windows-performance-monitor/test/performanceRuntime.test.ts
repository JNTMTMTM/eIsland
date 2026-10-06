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

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../test/nativeRuntimeHarness';
import type { NativeRuntimeFixture } from '../../test/nativeRuntimeHarness';
import type * as PerformanceApi from '../index';
const file = fileURLToPath(new URL('../index.js', import.meta.url));
const leaves = new Map<string, unknown>();
const binding: Record<string, unknown> = {};
const exists = vi.fn<(candidate: string) => boolean>();
const sync = vi.fn<(file: string, args: string[], options: unknown) => { status: number; stdout: string; error?: Error }>();
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
let fixture: NativeRuntimeFixture; let api: typeof PerformanceApi;
beforeEach(() => { vi.resetAllMocks(); leaves.clear(); Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' }); fixture = createNativeRuntimeFixture(file, leaves);
  leaves.set(join(dirname(file), 'build', 'Release', 'windows_performance_monitor.node'), binding);
  leaves.set('node:fs', { existsSync: exists }); leaves.set('node:child_process', { spawnSync: sync });
  exists.mockReturnValue(true); sync.mockReturnValue({ status: 0, stdout: '{}' }); api = fixture.read<typeof PerformanceApi>();
});
afterEach(() => { fixture.dispose(); vi.restoreAllMocks(); if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform); });
describe('性能插件原生加载与温度 helper 协议', () => {
  it('非 Windows 拒绝加载，Release 失败可回退 Debug，双失败透传最后错误', () => {
    leaves.set(join(dirname(file), 'build', 'Release', 'windows_performance_monitor.node'), new Error('release absent'));
    leaves.set(join(dirname(file), 'build', 'Debug', 'windows_performance_monitor.node'), binding);
    expect(fixture.read()).toBe(binding);
    const failure = new Error('debug absent'); leaves.set(join(dirname(file), 'build', 'Debug', 'windows_performance_monitor.node'), failure); expect(fixture.read).toThrow(failure);
    Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' }); expect(fixture.read).toThrow('only supports Windows');
  });
  it('helper 缺失返回空温度与硬件快照，不启动进程', () => {
    exists.mockReturnValue(false);
    expect(api.getTemperature()).toEqual({ isAvailable: false, readings: [], maxTemperatureCelsius: null });
    expect(api.getHardwareList()).toEqual({ isAvailable: false, cpus: [], gpus: [] }); expect(sync).not.toHaveBeenCalled();
  });
  it.each([{ status: 1, stdout: '{}' }, { status: 0, stdout: '{}', error: new Error('spawn') }, { status: 0, stdout: '' }, { status: 0, stdout: '{invalid' }])('helper 错误 $status/$stdout 返回默认快照', (result) => {
    sync.mockReturnValue(result); expect(api.getTemperature().isAvailable).toBe(false); expect(api.getHardwareList().isAvailable).toBe(false);
  });
  it.each([
    { isAvailable: true, readings: [1], maxTemperatureCelsius: 77, expected: true },
    { isAvailable: false, readings: [1], maxTemperatureCelsius: 'bad', expected: false },
    { isAvailable: true, readings: [], maxTemperatureCelsius: null, expected: false },
    { isAvailable: true, readings: 'bad', expected: false }
  ])('温度 isAvailable=$isAvailable readings=$readings 保留合法数组与数值', ({ expected, ...snapshot }) => {
    sync.mockReturnValue({ status: 0, stdout: JSON.stringify(snapshot) });
    expect(api.getTemperature()).toEqual({ isAvailable: expected, readings: Array.isArray(snapshot.readings) ? snapshot.readings : [], maxTemperatureCelsius: typeof snapshot.maxTemperatureCelsius === 'number' ? snapshot.maxTemperatureCelsius : null });
  });
  it.each([
    { isAvailable: true, cpus: [1], gpus: [], expected: true },
    { isAvailable: true, cpus: [], gpus: [2], expected: true },
    { isAvailable: true, cpus: [], gpus: [], expected: false },
    { isAvailable: false, cpus: [1], gpus: [2], expected: false },
    { isAvailable: true, cpus: 'bad', gpus: null, expected: false }
  ])('硬件列表 availability=$expected 由有效CPU/GPU数量决定', ({ expected, ...snapshot }) => {
    sync.mockReturnValue({ status: 0, stdout: JSON.stringify(snapshot) }); expect(api.getHardwareList().isAvailable).toBe(expected);
    expect(sync).toHaveBeenLastCalledWith(expect.any(String), ['hardware-list'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
  });
});
