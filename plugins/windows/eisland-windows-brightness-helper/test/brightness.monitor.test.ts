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
 * @file brightness.monitor.test.ts
 * @description BrightnessMonitor 单元测试
 * @author 鸡哥
 */

import { describe, it, expect } from 'vitest';

const bright = require('../') as {
  BrightnessMonitor: new () => {
    start(): void;
    stop(): void;
    isRunning(): boolean;
    on(event: string, listener: (...args: any[]) => void): any;
  };
};

describe('BrightnessMonitor', () => {
  it('exports BrightnessMonitor as a constructor', () => {
    expect(typeof bright.BrightnessMonitor).toBe('function');
  });

  it('creates an instance with expected methods', () => {
    const monitor = new bright.BrightnessMonitor();
    expect(typeof monitor.start).toBe('function');
    expect(typeof monitor.stop).toBe('function');
    expect(typeof monitor.isRunning).toBe('function');
    expect(typeof monitor.on).toBe('function');
  });

  it('start() does not throw', () => {
    const monitor = new bright.BrightnessMonitor();
    expect(() => monitor.start()).not.toThrow();
    monitor.stop();
  });

  it('stop() is idempotent', () => {
    const monitor = new bright.BrightnessMonitor();
    monitor.start();
    expect(() => {
      monitor.stop();
      monitor.stop();
    }).not.toThrow();
  });

  it('isRunning() reflects state', () => {
    const monitor = new bright.BrightnessMonitor();
    expect(monitor.isRunning()).toBe(false);
    monitor.start();
    expect(monitor.isRunning()).toBe(true);
    monitor.stop();
    expect(monitor.isRunning()).toBe(false);
  });

  it('emits error event on double start does not crash', () => {
    const monitor = new bright.BrightnessMonitor();
    monitor.start();
    // 第二次 start 应该是幂等的
    expect(() => monitor.start()).not.toThrow();
    monitor.stop();
  });
});
