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
 * @file ffiEntryRuntime.test.ts
 * @description 真实 FFI 插件入口的平台限制、原生函数转发及空响应契约测试。
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../test/nativeRuntimeHarness';
import type { NativeRuntimeFixture } from '../../test/nativeRuntimeHarness';
const file = fileURLToPath(new URL('../index.js', import.meta.url));
const call = vi.fn<(...args: unknown[]) => unknown>();
const callJson = call;
const getLastError = vi.fn<() => string>();
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
let fixture: NativeRuntimeFixture; let api: Record<string, (...args: unknown[]) => unknown>;
beforeEach(() => { vi.resetAllMocks(); Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' });
  const leaves = new Map<string, unknown>([['./ffi-loader', { callJson, getLastError, bt: {} }]]);
  fixture = createNativeRuntimeFixture(file, leaves); api = fixture.read<typeof api>();
});
afterEach(() => { fixture.dispose(); vi.restoreAllMocks(); if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform); });
describe('真实 FFI 插件公开入口', () => {
  it('平台不支持时拒绝加载', () => { Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' }); expect(fixture.read).toThrow('only supports Windows'); });
  it.each([["getPairedDevices","bt_get_paired_devices"],["getConnectedDevices","bt_get_connected_devices"],["getAllDevices","bt_get_all_devices"],["getDevice","bt_get_device","device-id"]])('%s 使用 %s 原生函数及业务参数', (method: string, nativeName: string, argument?: string | number) => {
    const value = [{ deviceId: 'fixture' }];
    call.mockReturnValue(value);
    const args = argument === undefined ? [] : [argument]; expect(api[method]?.(...args)).toBe(value);
    expect(call).toHaveBeenCalledWith(nativeName, ...args); call.mockReturnValue(null);
    expect(api[method]?.(...args)).toEqual(method === 'getDevice' ? null : []);
  });
  it.each(['getPairedDevices', 'getConnectedDevices', 'getAllDevices'])('%s 非数组降级，数组保持设备载荷', (method) => {
    callJson.mockReturnValue(null); expect(api[method]?.()).toEqual([]);
    callJson.mockReturnValue({ invalid: true }); expect(api[method]?.()).toEqual([]);
    const devices = [{ deviceId: 'fixture' }]; callJson.mockReturnValue(devices); expect(api[method]?.()).toBe(devices);
  });
});
