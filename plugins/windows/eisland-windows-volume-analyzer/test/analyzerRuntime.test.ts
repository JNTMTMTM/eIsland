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
 * @file analyzerRuntime.test.ts
 * @description 真实音频分析器的进程协议、结果标准化、错误订阅与轮询清理测试。
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
import type { NativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
import type * as AnalyzerApi from '../index';
const file = fileURLToPath(new URL('../index.js', import.meta.url));
class CaptureFixture extends EventEmitter {
  stdout = new EventEmitter();

  stderr = new EventEmitter();

  stdin = { end: vi.fn() };

  killed = false;

  kill = vi.fn(() => { this.killed = true; });
}
const find = vi.fn<() => string | null>(); const call = vi.fn<(args: string[]) => unknown>();
const unpack = vi.fn<(file: string) => string>(); const spawn = vi.fn<(file: string, args: string[], options: unknown) => CaptureFixture>();
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
let fixture: NativeRuntimeFixture; let api: typeof AnalyzerApi; let child: CaptureFixture;
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' });
  child = new CaptureFixture(); find.mockReturnValue('fixture.asar/analyzer.exe'); unpack.mockReturnValue('fixture.asar.unpacked/analyzer.exe'); spawn.mockReturnValue(child);
  fixture = createNativeRuntimeFixture(file, new Map<string, unknown>([['./ffi-loader', { findExe: find, callExe: call, toUnpackedPath: unpack }], ['node:child_process', { spawn }]])); api = fixture.read<typeof api>();
});
afterEach(() => { api.stop(); fixture.dispose(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform); });
describe('音频分析器原生进程及结果协议', () => {
  it.each([0, -1, 1.5, Number.NaN, 0x100000000])('非法进程ID %s 不查找 EXE 也不生成进程', (id) => {
    expect(api.start(id)).toMatchObject({ success: false, error: 'processId must be a positive 32-bit integer.' }); expect(find).not.toHaveBeenCalled(); expect(spawn).not.toHaveBeenCalled();
  });
  it('非 Windows 拒绝初始化，EXE 缺失或spawn异常保留错误状态', () => {
    Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' }); expect(fixture.read).toThrow('only supports Windows'); Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' });
    find.mockReturnValue(null); expect(api.start(1)).toMatchObject({ success: false }); expect(api.getStatus()).toMatchObject({ isRunning: false, error: expect.stringContaining('EXE not found') as unknown });
    find.mockReturnValue('fixture'); spawn.mockImplementation(() => { throw new Error('spawn denied'); });
    expect(api.start(1)).toEqual({ success: false, error: 'spawn denied' });
  });
  it('解包 EXE 路径与 include-tree 参数正确，重复start先停止旧进程', () => {
    expect(api.start(123)).toEqual({ success: true, error: null }); expect(unpack).toHaveBeenCalledWith('fixture.asar/analyzer.exe');
    expect(spawn).toHaveBeenCalledWith('fixture.asar.unpacked/analyzer.exe', ['capture', '123', '--include-tree'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    api.startEx(124, false); expect(child.stdin.end).toHaveBeenCalledOnce(); expect(spawn.mock.calls.at(-1)?.[1]).toEqual(['capture', '124']);
  });
  it('完整分析数据跨块解析，空行与坏JSON不会覆盖结果', () => {
    const raw = { error: null, frequency: { spectrum: [1, 2], dominantHz: 440, topFrequencies: [{ hz: 440, amplitude: 1 }] }, amplitude: { rms: 0.3, peak: 0.7 }, beat: { isBeat: true, bpm: 120, intensity: 0.6 } };
    api.start(123); const json = JSON.stringify(raw); child.stdout.emit('data', Buffer.from(json.slice(0, 20))); expect(api.getResult().frequency.spectrum).toEqual([]);
    child.stdout.emit('data', Buffer.from(`${json.slice(20)  }\n\ninvalid\n`)); expect(api.getResult()).toEqual(raw); expect(api.getStatus()).toEqual({ isRunning: true, error: null });
  });
  it.each([null, 3, {}, { error: 'analysis failed', frequency: { spectrum: 'invalid', topFrequencies: null }, amplitude: {}, beat: {} }])('不完整结果 %j 使用稳定默认字段', (raw) => {
    api.start(123); child.stdout.emit('data', Buffer.from(`${JSON.stringify(raw)  }\n`));
    expect(api.getResult()).toMatchObject({ frequency: { spectrum: [], dominantHz: 0, topFrequencies: [] }, amplitude: { rms: 0, peak: 0 }, beat: { isBeat: false, bpm: 0, intensity: 0 } });
    if (raw && typeof raw === 'object' && 'error' in raw) expect(api.getStatus().error).toBe('analysis failed'); else expect(api.getStatus().error).toBeNull();
  });
  it('stderr 空行忽略，有文案时通知error回调；进程异常清除当前进程', () => {
    const errors = vi.fn(); api.startPolling(50, vi.fn(), errors); api.start(123);
    child.stderr.emit('data', Buffer.from('  ')); expect(errors).not.toHaveBeenCalled(); child.stderr.emit('data', Buffer.from(' native stderr '));
    expect(errors).toHaveBeenCalledWith(expect.objectContaining({ message: 'native stderr' }));
    const failure = new Error('process failed'); child.emit('error', failure); expect(errors).toHaveBeenLastCalledWith(failure); expect(api.getStatus()).toEqual({ isRunning: false, error: 'process failed' });
  });
  it('旧进程close/error不清除新进程，当前close结束运行', () => {
    api.start(123); const old = child; child = new CaptureFixture(); spawn.mockReturnValue(child); api.start(124);
    old.emit('close'); expect(api.getStatus().isRunning).toBe(true); old.emit('error', new Error('old failure')); expect(api.getStatus().isRunning).toBe(true);
    child.emit('close'); expect(api.getStatus().isRunning).toBe(false);
  });
  it.each([true, false])('停止 killed=%s 的进程时只终止仍存活进程，stdin错误不影响清理', (killed) => {
    api.start(123); child.killed = killed; child.stdin.end.mockImplementation(() => { throw new Error('stdin closed'); });
    expect(api.stop()).toEqual({ success: true, error: null }); vi.advanceTimersByTime(1000); expect(child.kill).toHaveBeenCalledTimes(killed ? 0 : 1);
    expect(api.getResult().frequency.spectrum).toEqual([]); expect(api.getStatus().isRunning).toBe(false);
  });
  it('轮询最小16ms和默认50ms，stopPolling停止回调并清除错误订阅', () => {
    const updates = vi.fn(); const errors = vi.fn(); api.startPolling(1, updates, errors); vi.advanceTimersByTime(16); expect(updates).toHaveBeenCalledOnce();
    api.startPolling(0, updates); vi.advanceTimersByTime(49); expect(updates).toHaveBeenCalledOnce(); vi.advanceTimersByTime(1); expect(updates).toHaveBeenCalledTimes(2);
    api.stopPolling(); expect(vi.getTimerCount()).toBe(0); api.start(123); child.stderr.emit('data', Buffer.from('ignored callback')); child.emit('error', new Error('no subscriber')); expect(errors).not.toHaveBeenCalled();
  });
  it.each([true, false])('轮询回调抛错时 error 订阅=%s 决定是否通知', (subscribed) => {
    const failure = new Error('consumer failed'); const error = vi.fn(); api.startPolling(16, () => { throw failure; }, subscribed ? error : undefined);
    vi.advanceTimersByTime(16); expect(error).toHaveBeenCalledTimes(subscribed ? 1 : 0); if (subscribed) expect(error).toHaveBeenCalledWith(failure);
  });
  it.each([undefined, false])('音频进程 activeOnly=%s 参数及缺省字段归一化', (activeOnly) => {
    call.mockReturnValue(null); expect(api.getPlayingProcesses(activeOnly)).toEqual([]);
    call.mockReturnValue([{}, { processId: 123, processName: 'editor', state: 'active', displayName: 'Editor' }]);
    expect(api.getPlayingProcesses(activeOnly)).toEqual([{ processId: 0, processName: null, state: 'unknown', displayName: null }, { processId: 123, processName: 'editor', state: 'active', displayName: 'Editor' }]);
    expect(call).toHaveBeenLastCalledWith(activeOnly === false ? ['processes', '--all'] : ['processes']);
  });
});

it('JavaScript 调用遗漏更新回调时轮询不会抛错，仍可停止', () => {
  // @ts-expect-error 公开类型要求更新回调；运行时 JavaScript 调用可能漏传，边界应安全跳过。
  api.startPolling(16, undefined);
  expect(() => vi.advanceTimersByTime(16)).not.toThrow();
  api.stopPolling(); expect(vi.getTimerCount()).toBe(0);
});
