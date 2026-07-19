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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/**
 * @file hardware-info.test.ts
 * @description Unit tests for hardware info helper query functions
 * @author 鸡哥
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

const isWin = process.platform === 'win32';
const describeWin = isWin ? describe : describe.skip;

// Conditionally require — avoids crashing on non-Windows CI
let hw: {
  getCpuInfo(): unknown[];
  getGpuInfo(): unknown[];
  getMemoryInfo(): unknown[];
  getDiskInfo(): unknown[];
  getNetworkAdapterInfo(): unknown[];
  getBluetoothDevices(): unknown[];
  getMotherboardInfo(): unknown[];
  getMonitorInfo(): unknown[];
  __resetHelperCache(): void;
};

try {
  hw = require('../');
} catch {
  hw = {} as any;
}

describeWin('@eisland/windows-hardware-info-helper fallback behavior', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const childProcess = require('node:child_process');

  const apiNames: Array<keyof typeof hw> = [
    'getCpuInfo',
    'getGpuInfo',
    'getMemoryInfo',
    'getDiskInfo',
    'getNetworkAdapterInfo',
    'getBluetoothDevices',
    'getMotherboardInfo',
    'getMonitorInfo',
  ];

  const callAllAndExpectEmptyArray = () => {
    for (const name of apiNames) {
      const fn = (hw as any)[name] as () => unknown[];
      const result = fn();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    }
  };

  afterEach(() => {
    vi.restoreAllMocks();
    hw.__resetHelperCache();
  });

  it('returns empty array when helper executable is not found', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('node:fs');
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    callAllAndExpectEmptyArray();
  });

  it('returns empty array when helper exits non-zero', () => {
    vi.spyOn(childProcess, 'spawnSync').mockReturnValue({
      status: 1,
      stdout: '',
      stderr: 'some error',
      error: undefined,
    } as any);
    callAllAndExpectEmptyArray();
  });

  it('returns empty array when helper reports spawn error', () => {
    vi.spyOn(childProcess, 'spawnSync').mockReturnValue({
      status: null,
      stdout: '',
      stderr: '',
      error: new Error('spawn error'),
    } as any);
    callAllAndExpectEmptyArray();
  });

  it('returns empty array when helper outputs invalid JSON', () => {
    vi.spyOn(childProcess, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: 'not-json',
      stderr: '',
      error: undefined,
    } as any);
    callAllAndExpectEmptyArray();
  });

  it('returns empty array when helper outputs non-array JSON', () => {
    vi.spyOn(childProcess, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: JSON.stringify({ error: 'unexpected structure' }),
      stderr: '',
      error: undefined,
    } as any);
    callAllAndExpectEmptyArray();
  });
});

describeWin('@eisland/windows-hardware-info-helper', () => {
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
    it('CPU items have expected shape', () => {
      const items = hw.getCpuInfo();
      for (const item of items) {
        expect(item).not.toBeNull();
        expect(typeof item).toBe('object');
      }
      if (items.length > 0) {
        const cpu = items[0] as { name: string | null };
        expect(cpu.name === null || typeof cpu.name === 'string').toBe(true);
      }
    });
  });

  describe('getGpuInfo', () => {
    it('GPU items have expected shape', () => {
      const items = hw.getGpuInfo();
      for (const item of items) {
        expect(item).not.toBeNull();
        expect(typeof item).toBe('object');
      }
      if (items.length > 0) {
        const gpu = items[0] as { adapterRamBytes: number | null };
        expect(
          gpu.adapterRamBytes === null || typeof gpu.adapterRamBytes === 'number',
        ).toBe(true);
      }
    });
  });

  describe('getDiskInfo', () => {
    it('Disk items have expected shape', () => {
      const items = hw.getDiskInfo();
      for (const item of items) {
        expect(item).not.toBeNull();
        expect(typeof item).toBe('object');
      }
      if (items.length > 0) {
        const disk = items[0] as { sizeBytes: number | null };
        expect(
          disk.sizeBytes === null || typeof disk.sizeBytes === 'number',
        ).toBe(true);
      }
    });
  });

  describe('getNetworkAdapterInfo', () => {
    it('Network adapter items have expected shape', () => {
      const items = hw.getNetworkAdapterInfo();
      for (const item of items) {
        expect(item).not.toBeNull();
        expect(typeof item).toBe('object');
      }
      if (items.length > 0) {
        const adapter = items[0] as { netConnectionStatus: boolean | null };
        expect(
          adapter.netConnectionStatus === null ||
            typeof adapter.netConnectionStatus === 'boolean',
        ).toBe(true);
      }
    });
  });

  describe('getMotherboardInfo', () => {
    it('Motherboard items have expected shape', () => {
      const items = hw.getMotherboardInfo();
      for (const item of items) {
        expect(item).not.toBeNull();
        expect(typeof item).toBe('object');
      }
      if (items.length > 0) {
        const mb = items[0] as { manufacturer: string | null; product: string | null };
        expect(mb.manufacturer === null || typeof mb.manufacturer === 'string').toBe(true);
        expect(mb.product === null || typeof mb.product === 'string').toBe(true);
      }
    });
  });
});
