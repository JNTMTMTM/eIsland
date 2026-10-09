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
 * @file hardwareRuntime.test.ts
 * @description 真实插件入口的原生加载、helper 响应校验、失败降级与缓存测试。
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
import type { NativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
import type * as HardwareApi from '../index';
const file = fileURLToPath(new URL('../index.js', import.meta.url));
const leaves = new Map<string, unknown>();
const exists = vi.fn<(candidate: string) => boolean>();
const sync = vi.fn<(file: string, args: string[], options: unknown) => { status: number; stdout: string; error?: Error }>();
let fixture: NativeRuntimeFixture; let api: typeof HardwareApi & { __resetHelperCache: () => void };
beforeEach(() => { vi.resetAllMocks(); leaves.clear(); fixture = createNativeRuntimeFixture(file, leaves);
  leaves.set('node:fs', { existsSync: exists }); leaves.set('node:child_process', { spawnSync: sync });
  exists.mockReturnValue(true); sync.mockReturnValue({ status: 0, stdout: '[]' }); api = fixture.read<typeof api>();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { fixture.dispose(); vi.restoreAllMocks(); });
describe('硬件信息 helper 协议和路径缓存', () => {
  it.each([['getCpuInfo', 'cpu'], ['getGpuInfo', 'gpu'], ['getMemoryInfo', 'memory'], ['getDiskInfo', 'disk'], ['getNetworkAdapterInfo', 'network'], ['getBluetoothDevices', 'bluetooth'], ['getMotherboardInfo', 'motherboard'], ['getMonitorInfo', 'monitor']] as const)('%s 转发 %s 子命令并保留合法数组', (method, command) => {
    sync.mockReturnValue({ status: 0, stdout: '[{"fixtureId":1}]' });
    expect(api[method]()).toEqual([{ fixtureId: 1 }]);
    expect(sync).toHaveBeenLastCalledWith(expect.any(String), [command], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
  });
  it.each([{ status: 0, stdout: '[]', error: new Error('spawn') }, { status: 2, stdout: '[]' }, { status: 0, stdout: '' }, { status: 0, stdout: '{}' }, { status: 0, stdout: '{invalid' }])('错误结果 $status/$stdout 记录诊断并返回空数组', (result) => {
    sync.mockReturnValue(result); expect(api.getCpuInfo()).toEqual([]); expect(console.error).toHaveBeenCalledOnce();
  });
  it('缺失 helper 的负缓存避免重复磁盘扫描，reset 后重新解析 Debug', () => {
    exists.mockReturnValue(false); expect(api.getCpuInfo()).toEqual([]); const scans = exists.mock.calls.length; expect(api.getGpuInfo()).toEqual([]); expect(exists).toHaveBeenCalledTimes(scans);
    expect(sync).not.toHaveBeenCalled(); api.__resetHelperCache();
    exists.mockImplementation((candidate) => candidate.includes('Debug')); expect(api.getCpuInfo()).toEqual([]); expect(sync).toHaveBeenCalledOnce();
    expect(sync.mock.calls[0]?.[0]).toContain('Debug');
    const resolved = exists.mock.calls.length; api.getMemoryInfo(); expect(exists).toHaveBeenCalledTimes(resolved);
  });
});
