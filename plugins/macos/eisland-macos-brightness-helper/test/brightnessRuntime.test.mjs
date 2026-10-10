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
 * @file brightnessRuntime.test.mjs
 * @description Vitest 验证同步接口、监控生命周期、Swift 核心与真实 Node-API 参数边界。
 * @author 鸡哥
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// CommonJS 包的同步加载顺序用于替换内部硬件入口，不向生产 API 添加测试钩子。
const require = createRequire(import.meta.url);
// eslint-disable-next-line import-x/no-commonjs -- 替换内部 CommonJS 加载器需同步 require。
const loader = require('../native-loader');
const originalLoader = loader.loadNative;
let snapshot;
let readError;
const write = vi.fn(() => true);
loader.loadNative = () => ({
  getJson: () => { if (readError) throw readError; return JSON.stringify(snapshot); },
  setBrightness: write,
});
// eslint-disable-next-line import-x/no-commonjs, import-x/extensions -- 按 package.json 同步加载 CommonJS 入口，避免解析同名类型文件。
const { getBrightness, setBrightness, BrightnessMonitor } = require('..');
const monitors = [];

/**
 * 注册测试监控器，确保测试结束时清理所有计时器。
 * @returns 新建的监控实例。
 */
function monitor() {
  const instance = new BrightnessMonitor();
  monitors.push(instance);
  return instance;
}
beforeEach(() => {
  vi.useFakeTimers();
  snapshot = { currentBrightness: 50, levels: null, instanceName: 'display:1', source: 'display-services' };
  readError = null;
  write.mockClear();
});
afterEach(() => {
  monitors.splice(0).forEach((instance) => instance.stop());
  vi.useRealTimers();
});
afterAll(() => { loader.loadNative = originalLoader; });

/**
 * 在独立进程中模拟平台，并禁止测试预处理调用原生工具链。
 * @param platform - 要验证的非 macOS 平台。
 * @param testsOnly - true 验证预测试；false 验证原生构建限制。
 * @returns 子进程状态与输出。
 */
function runBuildOnPlatform(platform, testsOnly) {
  const script = `
    import childProcess from 'node:child_process';
    import { syncBuiltinESMExports } from 'node:module';
    childProcess.execFileSync = () => { throw new Error('Unexpected native tool invocation'); };
    syncBuiltinESMExports();
    Object.defineProperty(process, 'platform', { value: ${JSON.stringify(platform)} });
    if (${testsOnly}) process.argv.push('--tests');
    await import(${JSON.stringify(new URL('../scripts/build.mjs', import.meta.url).href)});
  `;
  return spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
}

describe('build platform guard', () => {
  it.each(['linux', 'win32'])('allows tests on %s without native compilation', (platform) => {
    const result = runBuildOnPlatform(platform, true);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
  it.each(['linux', 'win32'])('still rejects native builds on %s', (platform) => {
    const result = runBuildOnPlatform(platform, false);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Build requires macOS and Xcode Command Line Tools.');
    expect(result.stderr).not.toContain('Unexpected native tool invocation');
  });
});

describe('Windows-compatible brightness API', () => {
  it('returns all snapshot fields and explicit null levels', () => {
    expect(getBrightness()).toEqual(snapshot);
    snapshot = null;
    expect(getBrightness()).toBeNull();
  });
  it('rounds and clamps finite percentages before native writes', () => {
    [50.6, -1, 200].forEach((value) => expect(setBrightness(value)).toBe(true));
    expect(write.mock.calls).toEqual([[51], [0], [100]]);
  });
  it('rejects malformed input without accessing native writes', () => {
    [NaN, Infinity, -Infinity, undefined, null, '50'].forEach((value) => {
      expect(() => setBrightness(value)).toThrow(RangeError);
    });
    expect(write).not.toHaveBeenCalled();
  });
  it('propagates native failure and malformed JSON', () => {
    readError = new Error('Native failure');
    expect(() => getBrightness()).toThrow('Native failure');
    readError = null;
    snapshot = undefined;
    expect(() => getBrightness()).toThrow(SyntaxError);
    write.mockReturnValueOnce(false);
    expect(setBrightness(50)).toBe(false);
  });
});

describe('BrightnessMonitor lifecycle', () => {
  it('starts once, keeps the initial reading as baseline, and emits timestamped changes', () => {
    const instance = monitor();
    const changed = vi.fn();
    instance.on('brightness-changed', changed);
    instance.start();
    instance.start();
    expect(instance.isRunning()).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(500);
    expect(changed).not.toHaveBeenCalled();
    snapshot.currentBrightness = 60;
    vi.advanceTimersByTime(500);
    expect(changed).toHaveBeenCalledExactlyOnceWith(60, Date.now());
    vi.advanceTimersByTime(1000);
    expect(changed).toHaveBeenCalledTimes(1);
  });
  it('reports display replacement even when brightness matches', () => {
    const changed = vi.fn();
    const instance = monitor();
    instance.on('brightness-changed', changed);
    instance.start();
    snapshot.instanceName = 'display:2';
    vi.advanceTimersByTime(500);
    expect(changed).toHaveBeenCalledWith(50, expect.any(Number));
  });
  it('stops idempotently and preserves listeners for restarting', () => {
    const changed = vi.fn();
    const instance = monitor();
    instance.on('brightness-changed', changed);
    instance.start();
    instance.stop();
    instance.stop();
    expect(instance.isRunning()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    snapshot.currentBrightness = 60;
    vi.advanceTimersByTime(500);
    expect(changed).not.toHaveBeenCalled();
    instance.start();
    snapshot.currentBrightness = 70;
    vi.advanceTimersByTime(500);
    expect(changed).toHaveBeenCalledWith(70, expect.any(Number));
  });
  it('leaves no running timer when the initial display is unavailable', () => {
    snapshot = null;
    const instance = monitor();
    expect(() => instance.start()).toThrow('No supported display');
    expect(instance.isRunning()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('stops and emits error when a display becomes unavailable', () => {
    const instance = monitor();
    const error = vi.fn();
    instance.on('error', error);
    instance.start();
    snapshot = null;
    vi.advanceTimersByTime(500);
    expect(error).toHaveBeenCalledWith(expect.any(Error));
    expect(instance.isRunning()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('stops before emitting a native read exception', () => {
    const instance = monitor();
    const error = vi.fn();
    instance.on('error', error);
    instance.start();
    readError = new Error('Read failed');
    vi.advanceTimersByTime(500);
    expect(error).toHaveBeenCalledWith(readError);
    expect(instance.isRunning()).toBe(false);
  });
  it('supports independent instances and stopping from a change listener', () => {
    const a = monitor();
    const b = monitor();
    const changed = vi.fn();
    a.on('brightness-changed', () => a.stop());
    b.on('brightness-changed', changed);
    a.start();
    b.start();
    snapshot.currentBrightness = 60;
    vi.advanceTimersByTime(500);
    expect(a.isRunning()).toBe(false);
    expect(b.isRunning()).toBe(true);
    snapshot.currentBrightness = 70;
    vi.advanceTimersByTime(500);
    expect(changed).toHaveBeenCalledTimes(2);
  });
});

if (process.platform === 'darwin') {
  const cases = JSON.parse(execFileSync(fileURLToPath(new URL('../build/native-tests', import.meta.url)), { encoding: 'utf8' }));
  describe('compiled Swift core and DDC protocol', () => {
    cases.forEach(({ name, passed }) => it(name, () => expect(passed).toBe(true)));
  });
  describe('real Node-API boundary (read only)', () => {
    const native = require(`../prebuilds/darwin-${process.arch}/brightness.node`);
    it('returns valid JSON with the public snapshot shape', () => {
      const value = JSON.parse(native.getJson());
      if (value !== null) {
        expect(value.currentBrightness).toBeGreaterThanOrEqual(0);
        expect(value.currentBrightness).toBeLessThanOrEqual(100);
        expect(value.levels).toBeNull();
        expect(value.instanceName).toEqual(expect.any(String));
        expect(['display-services', 'iokit', 'ddc-ci']).toContain(value.source);
      }
    });
    it('rejects invalid direct native input before hardware access', () => {
      [NaN, Infinity, -Infinity, undefined, '50'].forEach((value) => {
        expect(() => native.setBrightness(value)).toThrow(RangeError);
      });
    });
  });
}
