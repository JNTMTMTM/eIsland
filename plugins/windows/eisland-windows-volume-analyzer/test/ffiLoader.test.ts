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
 * @file ffiLoader.test.ts
 * @description 音频分析EXE包装器的资源路径、进程参数、超时和JSON结果边界测试。
 * @author 鸡哥
 */

import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface ExeLoader {
  findExe: () => string | null;
  callExe: (args: string[], timeout?: number) => unknown;
  toUnpackedPath: (candidate: string) => string;
}
const file = fileURLToPath(new URL('../ffi-loader.js', import.meta.url));
const nodeRequire = createRequire(import.meta.url);
const loader = Module as unknown as { _load: (request: string, parent: unknown, isMain?: boolean) => unknown };
const resources = Object.getOwnPropertyDescriptor(process, 'resourcesPath');
const exists = vi.fn<(candidate: string) => boolean>();
const spawn = vi.fn<(exe: string, args: string[], options: unknown) => { status: number | null; stdout: string; error?: Error }>();
let addon: ExeLoader;

beforeEach(() => {
  exists.mockReset().mockReturnValue(false);
  spawn.mockReset().mockReturnValue({ status: 0, stdout: ' {"amplitude":0.25} ' });
  Reflect.deleteProperty(process, 'resourcesPath');
  const original = loader._load;
  vi.spyOn(loader, '_load').mockImplementation((request, parent, isMain) => {
    if (request === 'node:fs') return { existsSync: exists };
    if (request === 'node:child_process') return { spawnSync: spawn };
    return original(request, parent, isMain);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  if (resources) Object.defineProperty(process, 'resourcesPath', resources);
  else Reflect.deleteProperty(process, 'resourcesPath');
});

/**
 * 重新加载真实包装器以按每次资源路径初始化候选列表。
 * @returns 当前资源路径对应的真实 EXE 包装器导出。
 */
function readLoader(): ExeLoader {
  delete nodeRequire.cache[nodeRequire.resolve(file)];
  const exported: unknown = nodeRequire(file);
  return exported as ExeLoader;
}

describe('volume analyzer EXE boundary', () => {
  it('没有EXE时返回null且不启动进程', () => {
    addon = readLoader();
    expect(addon.findExe()).toBeNull();
    expect(addon.callExe(['status'])).toBeNull();
    expect(spawn).not.toHaveBeenCalled();
  });
  it('资源目录优先并将asar路径转换成可执行的unpacked路径', () => {
    const base = join('C:', 'app.asar');
    Object.defineProperty(process, 'resourcesPath', { configurable: true, value: base });
    const candidate = join(base, 'helpers', 'analyzer', 'eIslandVolumeAnalyzer.exe');
    exists.mockImplementation((name) => name === candidate);
    addon = readLoader();
    expect(addon.findExe()).toBe(candidate);
    expect(addon.callExe(['status'])).toEqual({ amplitude: 0.25 });
    expect(spawn).toHaveBeenCalledWith(candidate.replace(`${sep  }app.asar${  sep}`, `${sep  }app.asar.unpacked${  sep}`), ['status'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
  });
  it.each([
    ['Release', false], ['Release', true], ['Debug', false], ['Debug', true]
  ] as const)('资源路径不存在时搜索%s目录，RID=%s', (mode, rid) => {
    const folder = join(dirname(file), 'src', 'bin', mode, 'net10.0');
    const candidate = rid ? join(folder, 'win-x64', 'eIslandVolumeAnalyzer.exe') : join(folder, 'eIslandVolumeAnalyzer.exe');
    exists.mockImplementation((name) => name === candidate);
    addon = readLoader();
    expect(addon.findExe()).toBe(candidate);
    expect(addon.callExe(['status'], 250)).toEqual({ amplitude: 0.25 });
    expect(spawn).toHaveBeenCalledWith(candidate, ['status'], { encoding: 'utf8', windowsHide: true, timeout: 250 });
  });
  it.each([
    { status: 1, stdout: '{"value":1}' },
    { status: 0, stdout: '{"value":1}', error: new Error('spawn') },
    { status: 0, stdout: '' },
    { status: 0, stdout: '{broken' },
    { status: 0, stdout: '   ' },
  ])('进程失败或非法载荷返回null：%j', (result) => {
    exists.mockReturnValue(true);
    spawn.mockReturnValue(result);
    addon = readLoader();
    expect(addon.callExe(['status'])).toBeNull();
  });
  it('非asar路径保持原值', () => {
    addon = readLoader();
    expect(addon.toUnpackedPath('C:/ordinary/analyzer.exe')).toBe('C:/ordinary/analyzer.exe');
  });
});
