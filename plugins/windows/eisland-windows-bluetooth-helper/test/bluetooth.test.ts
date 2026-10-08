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
 * @file bluetooth.test.ts
 * @description @eisland/windows-bluetooth-helper 单元测试
 * @author 鸡哥
 */

import { describe, it, expect } from 'vitest';
import type { BluetoothDeviceInfo } from '../index';

const bt = require('../') as {
  getPairedDevices(): BluetoothDeviceInfo[];
  getConnectedDevices(): BluetoothDeviceInfo[];
  getAllDevices(): BluetoothDeviceInfo[];
  getDevice(deviceId: string): BluetoothDeviceInfo | null;
};

/** 验证单个 BluetoothDeviceInfo 的字段类型和结构 */
function expectValidDeviceShape(device: BluetoothDeviceInfo) {
  expect(typeof device.deviceId).toBe('string');
  expect(device.deviceId.length).toBeGreaterThan(0);

  if (device.name !== null) expect(typeof device.name).toBe('string');
  if (device.bluetoothAddress !== null) expect(typeof device.bluetoothAddress).toBe('string');

  expect(typeof device.isConnected).toBe('boolean');
  expect(typeof device.isPaired).toBe('boolean');

  if (device.signalStrength !== null) {
    expect(typeof device.signalStrength).toBe('number');
    expect(device.signalStrength).toBeLessThanOrEqual(0);
  }

  if (device.deviceClass !== null) expect(typeof device.deviceClass).toBe('number');
  if (device.appearance !== null) expect(typeof device.appearance).toBe('number');

  if (device.deviceType != null) expect(typeof device.deviceType).toBe('string');
  if (device.batteryLevel != null) {
    expect(typeof device.batteryLevel).toBe('number');
    expect(device.batteryLevel).toBeGreaterThanOrEqual(0);
    expect(device.batteryLevel).toBeLessThanOrEqual(100);
  }

  expect(Array.isArray(device.serviceUuids)).toBe(true);
  for (const uuid of device.serviceUuids) {
    expect(typeof uuid).toBe('string');
  }
}

describe('@eisland/windows-bluetooth-helper', () => {
  it('exports all expected functions', () => {
    expect(typeof bt.getPairedDevices).toBe('function');
    expect(typeof bt.getConnectedDevices).toBe('function');
    expect(typeof bt.getAllDevices).toBe('function');
    expect(typeof bt.getDevice).toBe('function');
  });

  describe('getPairedDevices', () => {
    it('returns an array of BluetoothDeviceInfo', () => {
      const devices = bt.getPairedDevices();
      expect(Array.isArray(devices)).toBe(true);
      for (const device of devices) expectValidDeviceShape(device);
    });

    it('never throws', () => {
      expect(() => bt.getPairedDevices()).not.toThrow();
    });

    it('returns only paired devices', () => {
      const devices = bt.getPairedDevices();
      for (const device of devices) {
        expect(device.isPaired).toBe(true);
      }
    });
  });

  describe('getConnectedDevices', () => {
    it('returns an array of BluetoothDeviceInfo', () => {
      const devices = bt.getConnectedDevices();
      expect(Array.isArray(devices)).toBe(true);
      for (const device of devices) expectValidDeviceShape(device);
    });

    it('never throws', () => {
      expect(() => bt.getConnectedDevices()).not.toThrow();
    });

    it('returns only connected devices', () => {
      const devices = bt.getConnectedDevices();
      for (const device of devices) {
        expect(device.isConnected).toBe(true);
      }
    });
  });

  describe('getAllDevices', () => {
    it('returns an array of BluetoothDeviceInfo', () => {
      const devices = bt.getAllDevices();
      expect(Array.isArray(devices)).toBe(true);
      for (const device of devices) expectValidDeviceShape(device);
    });

    it('never throws', () => {
      expect(() => bt.getAllDevices()).not.toThrow();
    });

    it('superset of paired devices', () => {
      const all = bt.getAllDevices();
      const paired = bt.getPairedDevices();
      const pairedIds = new Set(paired.map((d) => d.deviceId));
      for (const id of pairedIds) {
        expect(all.some((d) => d.deviceId === id)).toBe(true);
      }
    });
  });

  describe('getDevice', () => {
    it('returns null for non-existent deviceId', () => {
      const result = bt.getDevice('non-existent-device-id');
      expect(result).toBeNull();
    });

    it('returns a valid shape for an existing device', () => {
      const all = bt.getAllDevices();
      if (all.length === 0) return; // skip if no devices
      const first = all[0];
      const result = bt.getDevice(first.deviceId);
      expect(result).not.toBeNull();
      if (result) {
        expectValidDeviceShape(result);
        expect(result.deviceId).toBe(first.deviceId);
      }
    });

    it('never throws', () => {
      expect(() => bt.getDevice('non-existent')).not.toThrow();
    });
  });
});
