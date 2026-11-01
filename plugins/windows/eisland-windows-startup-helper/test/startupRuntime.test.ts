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
 * @file startupRuntime.test.ts
 * @description 真实插件入口的 helper 子命令转发、失败 reject 与路径缓存测试。
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
import type { NativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
import type * as StartupApi from '../index';

type ExecResult = { error?: Error | null; stdout?: string; stderr?: string };
type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;

const file = fileURLToPath(new URL('../index.js', import.meta.url));
const leaves = new Map<string, unknown>();
const exists = vi.fn<(candidate: string) => boolean>();
const exec = vi.fn<(file: string, args: string[], options: unknown, callback: ExecCallback) => void>();
let fixture: NativeRuntimeFixture;
let api: typeof StartupApi;

/**
 * 让 execFile mock 以给定结果回调
 * @param result - 回调参数，未给出的 stdout / stderr 视为空字符串
 * @returns 无返回值
 */
function execReturns(result: ExecResult) {
  exec.mockImplementation((_file, _args, _options, callback) => {
    callback(result.error ?? null, result.stdout ?? '', result.stderr ?? '');
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  leaves.clear();
  fixture = createNativeRuntimeFixture(file, leaves);
  leaves.set('node:fs', { existsSync: exists });
  leaves.set('node:child_process', { execFile: exec });
  exists.mockReturnValue(true);
  execReturns({ stdout: '{"items":[],"errors":[]}' });
  api = fixture.read<typeof api>();
});

afterEach(() => {
  fixture.dispose();
  vi.restoreAllMocks();
});

describe('启动项 helper 协议和路径缓存', () => {
  it.each([
    ['getStartupItems', 'startup'],
    ['getScheduledTasks', 'tasks'],
    ['getServices', 'services'],
  ] as const)('%s 转发 %s 子命令并保留 items 与 errors', async (method, command) => {
    execReturns({ stdout: '{"items":[{"fixtureId":1}],"errors":[{"source":"s","message":"m"}]}' });
    await expect(api[method]()).resolves.toEqual({
      items: [{ fixtureId: 1 }],
      errors: [{ source: 's', message: 'm' }],
    });
    expect(exec).toHaveBeenLastCalledWith(
      expect.any(String), [command], expect.objectContaining({ encoding: 'utf8', windowsHide: true }), expect.any(Function),
    );
  });

  it.each([
    { error: new Error('spawn'), stdout: '' },
    { error: new Error('exit 1'), stderr: 'Access denied' },
    { stdout: '' },
    { stdout: '[]' },
    { stdout: '{"items":[]}' },
    { stdout: '{invalid' },
  ])('错误结果 %o 以 StartupHelperError reject', async (result) => {
    execReturns(result);
    await expect(api.getServices()).rejects.toBeInstanceOf(api.StartupHelperError);
  });

  it('非零退出时错误信息带上 helper 的 stderr', async () => {
    execReturns({ error: new Error('exit 1'), stderr: 'Access denied\n' });
    await expect(api.getServices()).rejects.toThrow('Access denied');
  });

  it('缺失 helper 的负缓存避免重复磁盘扫描，reset 后重新解析 Debug', async () => {
    exists.mockReturnValue(false);
    await expect(api.getStartupItems()).rejects.toBeInstanceOf(api.StartupHelperError);
    const scans = exists.mock.calls.length;
    await expect(api.getScheduledTasks()).rejects.toBeInstanceOf(api.StartupHelperError);
    expect(exists).toHaveBeenCalledTimes(scans);
    expect(exec).not.toHaveBeenCalled();

    api.__resetHelperCache();
    exists.mockImplementation((candidate) => candidate.includes('Debug'));
    await api.getStartupItems();
    expect(exec).toHaveBeenCalledOnce();
    expect(exec.mock.calls[0]?.[0]).toContain('Debug');
    const resolved = exists.mock.calls.length;
    await api.getServices();
    expect(exists).toHaveBeenCalledTimes(resolved);
  });
});
