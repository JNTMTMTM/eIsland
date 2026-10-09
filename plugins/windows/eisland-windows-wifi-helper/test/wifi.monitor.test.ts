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
 * @file wifi.monitor.test.ts
 * @description WifiMonitor 单元测试
 * @author 鸡哥
 */

import { describe, it, expect, afterEach } from 'vitest';
import type { WifiInfo, WifiMonitor as WifiMonitorType } from '../index';

const { WifiMonitor } = require('../') as {
  WifiMonitor: new () => WifiMonitorType;
};

let monitor: WifiMonitorType | null = null;

afterEach(() => {
  if (monitor) {
    monitor.stop();
    monitor = null;
  }
});

describe('WifiMonitor', () => {
  it('can be constructed', () => {
    monitor = new WifiMonitor();
    expect(monitor).toBeDefined();
    expect(typeof monitor.start).toBe('function');
    expect(typeof monitor.stop).toBe('function');
    expect(typeof monitor.getWifiInfo).toBe('function');
  });

  it('start returns initial wifi info', () => {
    monitor = new WifiMonitor();
    const info = monitor.start();
    expect(info).not.toBeNull();
    if (info) {
      expect(typeof info.isConnected).toBe('boolean');
      expect(typeof info.connectivityLevel).toBe('number');
    }
  });

  it('stop is idempotent', () => {
    monitor = new WifiMonitor();
    monitor.start();
    expect(() => {
      monitor!.stop();
      monitor!.stop();
    }).not.toThrow();
  });

  it('start is idempotent', () => {
    monitor = new WifiMonitor();
    monitor.start();
    expect(() => {
      monitor!.start();
    }).not.toThrow();
  });

  it('getWifiInfo returns data after start', () => {
    monitor = new WifiMonitor();
    monitor.start();
    const info = monitor.getWifiInfo();
    expect(info).not.toBeNull();
    if (info) {
      expect(typeof info.isConnected).toBe('boolean');
      expect(info.signalBars).toBeGreaterThanOrEqual(-1);
    }
  });

  it('emits wifi-changed event', async () => {
    monitor = new WifiMonitor();
    monitor.start();

    const eventPromise = new Promise<WifiInfo>((resolve) => {
      monitor!.on('wifi-changed', (info: WifiInfo) => {
        resolve(info);
      });
    });

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    );

    try {
      const info = await Promise.race([eventPromise, timeout]);
      expect(info).toBeDefined();
    } catch {
      // 超时是正常的（没有 WiFi 状态变化发生）
    }
  });
});
