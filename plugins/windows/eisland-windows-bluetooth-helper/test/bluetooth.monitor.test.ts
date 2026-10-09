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
 * @file bluetooth.monitor.test.ts
 * @description BluetoothMonitor 单元测试
 * @author 鸡哥
 */

import { describe, it, expect } from 'vitest';
import type { BluetoothDeviceInfo } from '../index';

const bt = require('../') as {
  BluetoothMonitor: new () => {
    start(): void;
    stop(): void;
    getDevices(): BluetoothDeviceInfo[];
    on(event: string, listener: (...args: any[]) => void): any;
  };
};

describe('BluetoothMonitor', () => {
  it('exports BluetoothMonitor as a constructor', () => {
    expect(typeof bt.BluetoothMonitor).toBe('function');
  });

  it('creates an instance with expected methods', () => {
    const monitor = new bt.BluetoothMonitor();
    expect(typeof monitor.start).toBe('function');
    expect(typeof monitor.stop).toBe('function');
    expect(typeof monitor.getDevices).toBe('function');
    expect(typeof monitor.on).toBe('function');
  });

  it('start() does not throw', () => {
    const monitor = new bt.BluetoothMonitor();
    expect(() => monitor.start()).not.toThrow();
    monitor.stop();
  });

  it('stop() is idempotent', () => {
    const monitor = new bt.BluetoothMonitor();
    monitor.start();
    expect(() => {
      monitor.stop();
      monitor.stop();
    }).not.toThrow();
  });

  it('getDevices() returns an array after start', { timeout: 10000 }, async () => {
    const monitor = new bt.BluetoothMonitor();
    monitor.start();

    // 等待 DeviceWatcher 初始化
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const devices = monitor.getDevices();
    expect(Array.isArray(devices)).toBe(true);

    for (const device of devices) {
      expect(typeof device.deviceId).toBe('string');
      expect(typeof device.isConnected).toBe('boolean');
      expect(typeof device.isPaired).toBe('boolean');
      expect(Array.isArray(device.serviceUuids)).toBe(true);
      if (device.deviceType != null) expect(typeof device.deviceType).toBe('string');
      if (device.batteryLevel != null) {
        expect(typeof device.batteryLevel).toBe('number');
        expect(device.batteryLevel).toBeGreaterThanOrEqual(0);
        expect(device.batteryLevel).toBeLessThanOrEqual(100);
      }
    }

    monitor.stop();
  });

  it('emits error event on double start does not crash', () => {
    const monitor = new bt.BluetoothMonitor();
    monitor.start();
    // 第二次 start 应该是幂等的
    expect(() => monitor.start()).not.toThrow();
    monitor.stop();
  });
});
