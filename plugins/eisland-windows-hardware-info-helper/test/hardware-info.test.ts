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
 * @file hardware-info.test.ts
 * @description Unit tests for hardware info helper query functions
 * @author JNTMTMTM
 */

import { describe, it, expect } from 'vitest';

const hw = require('../') as {
  getCpuInfo(): unknown[];
  getGpuInfo(): unknown[];
  getMemoryInfo(): unknown[];
  getDiskInfo(): unknown[];
  getNetworkAdapterInfo(): unknown[];
  getBluetoothDevices(): unknown[];
  getMotherboardInfo(): unknown[];
  getMonitorInfo(): unknown[];
};

describe('@eisland/windows-hardware-info-helper', () => {
  it('exports all expected functions', () => {
    expect(typeof hw.getCpuInfo).toBe('function');
    expect(typeof hw.getGpuInfo).toBe('function');
    expect(typeof hw.getMemoryInfo).toBe('function');
    expect(typeof hw.getDiskInfo).toBe('function');
    expect(typeof hw.getNetworkAdapterInfo).toBe('function');
    expect(typeof hw.getBluetoothDevices).toBe('function');
    expect(typeof hw.getMotherboardInfo).toBe('function');
    expect(typeof hw.getMonitorInfo).toBe('function');
  });

  const queries = [
    { name: 'getCpuInfo',          fn: () => hw.getCpuInfo() },
    { name: 'getGpuInfo',          fn: () => hw.getGpuInfo() },
    { name: 'getMemoryInfo',       fn: () => hw.getMemoryInfo() },
    { name: 'getDiskInfo',         fn: () => hw.getDiskInfo() },
    { name: 'getNetworkAdapterInfo', fn: () => hw.getNetworkAdapterInfo() },
    { name: 'getBluetoothDevices', fn: () => hw.getBluetoothDevices() },
    { name: 'getMotherboardInfo',  fn: () => hw.getMotherboardInfo() },
    { name: 'getMonitorInfo',      fn: () => hw.getMonitorInfo() },
  ];

  for (const q of queries) {
    describe(q.name, () => {
      it('returns an array', () => {
        const result = q.fn();
        expect(Array.isArray(result)).toBe(true);
      });

      it('never throws', () => {
        expect(() => q.fn()).not.toThrow();
      });

      it('items have expected shape (non-null items are objects)', () => {
        const result = q.fn();
        for (const item of result) {
          expect(typeof item).toBe('object');
          expect(item).not.toBeNull();
        }
      });
    });
  }

  describe('getCpuInfo', () => {
    it('CPU items have name or null', () => {
      for (const item of hw.getCpuInfo()) {
        const cpu = item as { name: string | null };
        expect(cpu.name === null || typeof cpu.name === 'string').toBe(true);
      }
    });
  });

  describe('getMotherboardInfo', () => {
    it('motherboard items have manufacturer or null', () => {
      for (const item of hw.getMotherboardInfo()) {
        const mb = item as { manufacturer: string | null };
        expect(mb.manufacturer === null || typeof mb.manufacturer === 'string').toBe(true);
      }
    });
  });
});
