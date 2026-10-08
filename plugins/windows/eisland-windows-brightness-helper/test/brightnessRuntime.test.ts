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
 * @file brightnessRuntime.test.ts
 * @description 真实亮度插件原生命令、平台和路径回退、流监控及清理测试。
 * @author 鸡哥
 */

import { createRequire, Module } from 'node:module';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as BrightnessApi from '../index';
const nodeRequire = createRequire(import.meta.url);
const file = fileURLToPath(new URL('../index.js', import.meta.url));
const loader = Module as unknown as { _load: (request: string, parent: { filename?: string } | undefined, isMain?: boolean) => unknown };
class ProcessFixture extends EventEmitter {
  stdout = new EventEmitter();

  stderr = new EventEmitter();

  stdin = { end: vi.fn() };

  killed = false;

  kill = vi.fn(() => { this.killed = true; });
}
const native = { exists: vi.fn<(candidate: string) => boolean>(), sync: vi.fn<(file: string, args: string[], options: unknown) => { status: number; stdout: string; error?: Error }>(), spawn: vi.fn<() => ProcessFixture>() };
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const originalResources = Object.getOwnPropertyDescriptor(process, 'resourcesPath');
let child: ProcessFixture;
let api: typeof BrightnessApi;
/**
 * 重新执行真实 CommonJS 目标，只替换文件存在性及原生进程边界。
 * @returns 公开音量 API
 */
function read(): typeof BrightnessApi {
  delete nodeRequire.cache[file];
  return nodeRequire(file) as typeof BrightnessApi;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.resetAllMocks(); child = new ProcessFixture();
  Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' });
  Object.defineProperty(process, 'resourcesPath', { configurable: true, value: 'C:/resources' });
  native.exists.mockReturnValue(true); native.sync.mockReturnValue({ status: 0, stdout: '{}' }); native.spawn.mockReturnValue(child);
  const original = loader._load;
  vi.spyOn(loader, '_load').mockImplementation((request, parent, isMain) => {
    if (parent?.filename === file && request === 'node:fs') return { existsSync: native.exists };
    if (parent?.filename === file && request === 'node:child_process') return { spawnSync: native.sync, spawn: native.spawn };
    return original(request, parent, isMain);
  });
  api = read();
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); delete nodeRequire.cache[file];
  if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
  if (originalResources) Object.defineProperty(process, 'resourcesPath', originalResources); else Reflect.deleteProperty(process, 'resourcesPath');
});
describe('亮度插件原生协议', () => {
  it('非 Windows 拒绝初始化，开发候选允许 Debug 回退', () => {
    Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' }); expect(read).toThrow('only supports Windows');
    Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' }); Reflect.deleteProperty(process, 'resourcesPath'); api = read();
    native.exists.mockImplementation((candidate) => candidate.includes('Debug')); api.getBrightness(); expect(native.sync.mock.calls.at(-1)?.[0]).toContain('Debug');
  });
  it('缺少 EXE 查询 null、设置 false、监控启动报错', () => {
    native.exists.mockReturnValue(false); expect(api.getBrightness()).toBeNull(); expect(api.setBrightness(50)).toBe(false);
    expect(() => new api.BrightnessMonitor().start()).toThrow('EXE not found'); expect(native.sync).not.toHaveBeenCalled();
  });
  it.each([{ status: 2, stdout: '{}' }, { status: 0, stdout: '{}', error: new Error('spawn') }, { status: 0, stdout: '' }, { status: 0, stdout: '{invalid' }])('错误状态 $status/$stdout 返回空结果', (result) => {
    native.sync.mockReturnValue(result); expect(api.getBrightness()).toBeNull(); expect(api.setBrightness(50)).toBe(false);
  });
  it.each([[-10, '0'], [500, '100'], [45.5, '46']])('亮度 %d 规范化为 %s', (brightness, argument) => {
    native.sync.mockReturnValue({ status: 0, stdout: '{"success":true,"brightness":46}' }); expect(api.setBrightness(brightness)).toBe(true);
    expect(native.sync.mock.calls.at(-1)?.[1]).toEqual(['set', argument]); expect(api.getBrightness()).toEqual({ success: true, brightness: 46 });
  });
  it('monitor 流分块保留尾行，忽略空行、无效JSON与非数值亮度', () => {
    const monitor = new api.BrightnessMonitor(); const changes = vi.fn(); monitor.on('brightness-changed', changes);
    monitor.start(); monitor.start(); expect(native.spawn).toHaveBeenCalledOnce(); expect(monitor.isRunning()).toBe(true);
    child.stdout.emit('data', Buffer.from('{"brightness":')); expect(changes).not.toHaveBeenCalled();
    child.stdout.emit('data', Buffer.from('42,"timestamp":123}\n\ninvalid\n{"brightness":"bad"}\n'));
    expect(changes).toHaveBeenCalledExactlyOnceWith(42, 123); monitor.stop(); monitor.stop(); expect(child.kill).toHaveBeenCalledOnce(); expect(monitor.listenerCount('brightness-changed')).toBe(0);
  });
  it('stderr 及进程 error 透传，关闭后允许重启并正常停止', () => {
    const monitor = new api.BrightnessMonitor(); const errors = vi.fn(); monitor.on('error', errors); monitor.stop(); monitor.start();
    child.stderr.emit('data', Buffer.from('native stderr')); expect(errors).toHaveBeenCalledWith(expect.objectContaining({ message: 'native stderr' }));
    const failure = new Error('process failed'); child.emit('error', failure); expect(errors).toHaveBeenLastCalledWith(failure); expect(monitor.isRunning()).toBe(false);
    monitor.stop(); expect(child.kill).not.toHaveBeenCalled(); monitor.start(); child.emit('close'); expect(monitor.isRunning()).toBe(false); monitor.start(); monitor.stop(); expect(child.kill).toHaveBeenCalledOnce();
  });
});
