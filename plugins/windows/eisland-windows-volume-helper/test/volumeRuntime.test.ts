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
 * @file volumeRuntime.test.ts
 * @description 真实音量插件 API 的原生进程协议、监控流和退出清理边界测试。
 * @author 鸡哥
 */

import { createRequire, Module } from 'node:module';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as VolumeApi from '../index';
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
let api: typeof VolumeApi;
/**
 * 重新执行真实 CommonJS 目标，只替换文件存在性及原生进程边界。
 * @returns 公开音量 API
 */
function read(): typeof VolumeApi {
  delete nodeRequire.cache[file];
  return nodeRequire(file) as typeof VolumeApi;
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
describe('音量插件原生调用协议', () => {
  it('非 Windows 在模块初始化明确拒绝，不启动原生进程', () => {
    Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });
    expect(read).toThrow('only supports Windows'); expect(native.spawn).not.toHaveBeenCalled();
  });
  it('打包路径优先，开发环境依序选择 Release 和 Debug 候选', () => {
    api.getVolume(); expect(native.sync.mock.calls[0]?.[0]).toContain('helpers');
    Reflect.deleteProperty(process, 'resourcesPath'); api = read();
    native.exists.mockImplementation((candidate) => candidate.includes('Debug')); api.getVolume();
    expect(native.sync.mock.calls.at(-1)?.[0]).toContain('Debug');
    expect(native.exists.mock.calls.map(([candidate]) => candidate).some((candidate) => candidate.includes('Release'))).toBe(true);
  });
  it('缺少 EXE 时查询返回 null、设置 false、监控启动报错', () => {
    native.exists.mockReturnValue(false);
    expect(api.getMute()).toBeNull(); expect(api.getVolume()).toBeNull(); expect(api.setMute(true)).toBe(false); expect(api.setVolume(50)).toBe(false);
    expect(() => new api.VolumeMonitor().start()).toThrow('EXE not found'); expect(native.sync).not.toHaveBeenCalled(); expect(native.spawn).not.toHaveBeenCalled();
  });
  it.each([
    { status: 1, stdout: '{}' },
    { status: 0, stdout: '{}', error: new Error('spawn failed') },
    { status: 0, stdout: '' },
    { status: 0, stdout: '{invalid' },
    { status: 0, stdout: 'null' }
  ])('原生进程状态 $status 输出 $stdout 降级无有效音量', (result) => {
    native.sync.mockReturnValue(result); expect(api.getVolume()).toBeNull(); expect(api.getMute()).toBeNull(); expect(api.setMute(false)).toBe(false); expect(api.setVolume(50)).toBe(false);
  });
  it.each([true, false])('静音 %s 保留布尔值并转发原生命令', (muted) => {
    native.sync.mockReturnValue({ status: 0, stdout: JSON.stringify({ muted, success: true }) });
    expect(api.getMute()).toBe(muted); expect(api.setMute(muted)).toBe(true);
    expect(native.sync).toHaveBeenLastCalledWith(expect.any(String), ['set-mute', String(muted)], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
  });
  it('非法静音类型不调用外部进程，错误返回字段不作为合法值', () => {
    // @ts-expect-error 公开静音契约禁止字符串，运行时边界仍需拒绝。
    expect(api.setMute('true')).toBe(false); expect(native.sync).not.toHaveBeenCalled();
    native.sync.mockReturnValue({ status: 0, stdout: '{"muted":"true","level":"50","success":1}' });
    expect(api.getMute()).toBeNull(); expect(api.getVolume()).toBeNull(); expect(api.setMute(true)).toBe(false);
  });
  it.each([[-5, '0'], [1000, '100'], [54.6, '55']])('目标音量 %d 规范化为 %s', (level, argument) => {
    native.sync.mockReturnValue({ status: 0, stdout: '{"success":true,"level":54.6}' });
    expect(api.getVolume()).toBe(54.6); expect(api.setVolume(level)).toBe(true);
    expect(native.sync.mock.calls.at(-1)?.[1]).toEqual(['set', argument]);
  });
});
describe('音量监控流、错误和停止清理', () => {
  it('重复启动不重复生成进程，跨chunk协议行保留尾段并忽略无效事件', () => {
    const monitor = new api.VolumeMonitor(); const levels = vi.fn(); const errors = vi.fn(); monitor.on('volume-changed', levels); monitor.on('error', errors);
    monitor.start(); monitor.start(); expect(monitor.isRunning()).toBe(true); expect(native.spawn).toHaveBeenCalledOnce();
    child.stdout.emit('data', Buffer.from('{"eventName":"volume-')); expect(levels).not.toHaveBeenCalled();
    child.stdout.emit('data', Buffer.from('changed","level":33,"timestamp":123}\n\nnot-json\n{"eventName":"volume-changed","level":"bad"}\n{"eventName":"unknown"}\n{"eventName":"error","message":2}\n'));
    expect(levels).toHaveBeenCalledExactlyOnceWith(33, 123); expect(errors).not.toHaveBeenCalled();
    child.stdout.emit('data', Buffer.from('{"eventName":"error","message":"native error"}\n')); expect(errors).toHaveBeenCalledWith(expect.objectContaining({ message: 'native error' }));
    monitor.stop(); expect(monitor.isRunning()).toBe(false); expect(child.stdin.end).toHaveBeenCalledExactlyOnceWith('\n');
  });
  it('stderr 和进程异常透传 error，异常后停止无二次写入', () => {
    const monitor = new api.VolumeMonitor(); const errors = vi.fn(); monitor.on('error', errors); monitor.start();
    child.stderr.emit('data', Buffer.from('  native stderr  \n')); expect(errors).toHaveBeenCalledWith(expect.objectContaining({ message: 'native stderr' }));
    const failure = new Error('process failed'); child.emit('error', failure); expect(errors).toHaveBeenLastCalledWith(failure);
    expect(monitor.isRunning()).toBe(false); monitor.stop(); expect(child.stdin.end).not.toHaveBeenCalled();
  });
  it('进程 close 清理未消费尾段，允许重新启动', () => {
    const monitor = new api.VolumeMonitor(); const levels = vi.fn(); monitor.on('volume-changed', levels); monitor.start();
    child.stdout.emit('data', Buffer.from('incomplete')); child.emit('close'); expect(monitor.isRunning()).toBe(false);
    child = new ProcessFixture(); native.spawn.mockReturnValue(child); monitor.start(); child.stdout.emit('data', Buffer.from('{"eventName":"volume-changed","level":70}\n'));
    expect(levels).toHaveBeenCalledExactlyOnceWith(70, undefined); monitor.stop();
  });
  it.each([true, false])('停止后进程 killed=%s 只对未退出进程超时 kill', (alreadyKilled) => {
    const monitor = new api.VolumeMonitor(); monitor.stop(); monitor.start(); monitor.stop(); monitor.stop(); child.killed = alreadyKilled;
    expect(child.stdin.end).toHaveBeenCalledOnce(); vi.advanceTimersByTime(1000); expect(child.kill).toHaveBeenCalledTimes(alreadyKilled ? 0 : 1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
