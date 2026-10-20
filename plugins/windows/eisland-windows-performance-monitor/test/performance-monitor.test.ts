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
 * @file performance-monitor.test.ts
 * @description Windows 性能采集插件单元测试
 * @description 隔离原生采集边界，验证真实入口的导出、返回结构与不可变快照类型
 * @author 鸡哥
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../../test/nativeRuntimeHarness';
import type * as PerformanceApi from '../index';

// 执行真实 JS 入口，仅隔离原生采集边界；干净 CI 不依赖已编译的 .node 或 helper。
const entry = fileURLToPath(new URL('../index.js', import.meta.url));
const platform = Object.getOwnPropertyDescriptor(process, 'platform');
Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' });
const fixture = createNativeRuntimeFixture(entry, new Map<string, unknown>([
  [join(dirname(entry), 'build', 'Release', 'windows_performance_monitor.node'), {
    getCpu: () => ({ usagePercent: 25, hasBaseline: true }),
    getMemory: () => ({ totalBytes: 1000, usedBytes: 250, availableBytes: 750, usagePercent: 25 }),
  }],
  ['node:fs', { existsSync: () => false }],
]));
const monitor = fixture.read<typeof PerformanceApi>();

afterAll(() => {
  monitor.dispose();
  fixture.dispose();
  vi.restoreAllMocks();
  if (platform) Object.defineProperty(process, 'platform', platform);
});

describe('windows-performance-monitor', () => {
  it('exports CPU, memory, temperature, and hardware list snapshot methods', () => {
    expect(typeof monitor.getCpu).toBe('function');
    expect(typeof monitor.getMemory).toBe('function');
    expect(typeof monitor.getTemperature).toBe('function');
    expect(typeof monitor.getHardwareList).toBe('function');
    expect(typeof monitor.dispose).toBe('function');
    expectTypeOf(monitor.dispose).toEqualTypeOf<() => void>();
    expectTypeOf<PerformanceApi.TemperatureSnapshot['readings']>().toEqualTypeOf<readonly PerformanceApi.TemperatureReading[]>();
    expectTypeOf<PerformanceApi.HardwareListSnapshot['cpus']>().toEqualTypeOf<readonly PerformanceApi.HardwareDevice[]>();
    expectTypeOf<PerformanceApi.HardwareListSnapshot['gpus']>().toEqualTypeOf<readonly PerformanceApi.HardwareDevice[]>();
    expectTypeOf<PerformanceApi.TemperatureSnapshot>().toEqualTypeOf<Readonly<PerformanceApi.TemperatureSnapshot>>();
    expectTypeOf<PerformanceApi.TemperatureReading>().toEqualTypeOf<Readonly<PerformanceApi.TemperatureReading>>();
    expectTypeOf<PerformanceApi.HardwareListSnapshot>().toEqualTypeOf<Readonly<PerformanceApi.HardwareListSnapshot>>();
    expectTypeOf<PerformanceApi.HardwareDevice>().toEqualTypeOf<Readonly<PerformanceApi.HardwareDevice>>();
  });

  it('returns CPU snapshot shape after baseline warmup', () => {
    monitor.getCpu();
    const cpu = monitor.getCpu();

    expect(cpu.usagePercent).toBeTypeOf('number');
    expect(cpu.hasBaseline).toBe(true);
    expect(cpu.usagePercent).toBeGreaterThanOrEqual(0);
    expect(cpu.usagePercent).toBeLessThanOrEqual(100);
  });

  it('returns memory snapshot shape', () => {
    const memory = monitor.getMemory();

    expect(memory.totalBytes).toBeTypeOf('number');
    expect(memory.usedBytes).toBeTypeOf('number');
    expect(memory.availableBytes).toBeTypeOf('number');
    expect(memory.usagePercent).toBeTypeOf('number');
    expect(memory.totalBytes).toBeGreaterThan(0);
    expect(memory.usedBytes).toBeGreaterThanOrEqual(0);
    expect(memory.availableBytes).toBeGreaterThanOrEqual(0);
    expect(memory.usagePercent).toBeGreaterThanOrEqual(0);
    expect(memory.usagePercent).toBeLessThanOrEqual(100);
  });

  it('returns temperature snapshot shape without blocking the event loop', async () => {
    let heartbeat = false;
    const timer = setTimeout(() => { heartbeat = true; }, 0);
    const temperature = await monitor.getTemperatureAsync();
    clearTimeout(timer);
    if (temperature.isAvailable) expect(heartbeat).toBe(true);

    expect(temperature.isAvailable).toBeTypeOf('boolean');
    expect(Array.isArray(temperature.readings)).toBe(true);
    expect(
      typeof temperature.maxTemperatureCelsius === 'number' || temperature.maxTemperatureCelsius === null,
    ).toBe(true);

    temperature.readings.forEach((reading) => {
      expect(reading.id).toBeTypeOf('string');
      expect(reading.label).toBeTypeOf('string');
      expect(reading.category).toBeTypeOf('string');
      expect(reading.temperatureCelsius).toBeTypeOf('number');
      expect(reading.source).toBeTypeOf('string');
    });
  });

  it('returns hardware list snapshot shape', async () => {
    const hardwareList = await monitor.getHardwareListAsync();

    expect(hardwareList.isAvailable).toBeTypeOf('boolean');
    expect(Array.isArray(hardwareList.cpus)).toBe(true);
    expect(Array.isArray(hardwareList.gpus)).toBe(true);

    [...hardwareList.cpus, ...hardwareList.gpus].forEach((device) => {
      expect(device.id).toBeTypeOf('string');
      expect(device.name).toBeTypeOf('string');
      expect(device.category === 'cpu' || device.category === 'gpu').toBe(true);
      expect(device.hardwareType).toBeTypeOf('string');
      expect(device.source).toBeTypeOf('string');
    });
  });
});
