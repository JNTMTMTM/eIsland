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
 * @file performance.types.test.ts
 * @description performance 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { PerformanceHardwareSelection, PerformanceHardwareOption, PerformanceHardwareOptions, PerformanceSnapshot } from '../performance';
describe('performance contracts', () => {
  it('fixes PerformanceHardwareSelection fields and accepts its explicit legal fixture', () => {
    expectTypeOf<PerformanceHardwareSelection>().toEqualTypeOf<{
      cpu?: string;
      gpu?: string;
      disk?: string;
    }>();
    const fixture: PerformanceHardwareSelection = { cpu: 'sample', gpu: 'sample', disk: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error PerformanceHardwareSelection.cpu 禁止使用契约外字段值。
    const invalid: PerformanceHardwareSelection['cpu'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes PerformanceHardwareOption fields and accepts its explicit legal fixture', () => {
    expectTypeOf<PerformanceHardwareOption>().toEqualTypeOf<{
      id: string;
      label: string;
    }>();
    const fixture: PerformanceHardwareOption = { id: 'sample', label: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error PerformanceHardwareOption.id 禁止使用契约外字段值。
    const invalid: PerformanceHardwareOption['id'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes PerformanceHardwareOptions fields and accepts its explicit legal fixture', () => {
    expectTypeOf<PerformanceHardwareOptions>().toEqualTypeOf<{
      cpu: PerformanceHardwareOption[];
      gpu: PerformanceHardwareOption[];
      disk: PerformanceHardwareOption[];
    }>();
    const fixture: PerformanceHardwareOptions = { cpu: [], gpu: [], disk: [] };
    expect(fixture).toBeDefined();
  });
  it('fixes PerformanceSnapshot fields and accepts its explicit legal fixture', () => {
    expectTypeOf<PerformanceSnapshot>().toEqualTypeOf<{
      timestamp: number;
      host: {
        hostname: string;
        platform: string;
        release: string;
        arch: string;
        uptimeSeconds: number;
      };
      cpu: {
        manufacturer: string;
        brand: string;
        cores: number;
        physicalCores: number;
        speedGhz: number | null;
        speedMaxGhz: number | null;
        loadPercent: number;
        temperatureCelsius: number | null;
      };
      memory: {
        totalBytes: number;
        usedBytes: number;
        availableBytes: number;
        usagePercent: number;
      };
      gpu: {
        vendor: string;
        model: string;
        vramTotalMb: number | null;
        loadPercent: number | null;
        temperatureCelsius: number | null;
      } | null;
      disk: {
        totalBytes: number;
        usedBytes: number;
        usagePercent: number;
        temperatureCelsius: number | null;
      };
      hardwareOptions: PerformanceHardwareOptions;
    }>();
    const fixture: PerformanceSnapshot = { timestamp: 0, host: { hostname: 'sample', platform: 'sample', release: 'sample', arch: 'sample', uptimeSeconds: 0 }, cpu: { manufacturer: 'sample', brand: 'sample', cores: 0, physicalCores: 0, speedGhz: null, speedMaxGhz: null, loadPercent: 0, temperatureCelsius: null }, memory: { totalBytes: 0, usedBytes: 0, availableBytes: 0, usagePercent: 0 }, gpu: null, disk: { totalBytes: 0, usedBytes: 0, usagePercent: 0, temperatureCelsius: null }, hardwareOptions: { cpu: [], gpu: [], disk: [] } };
    expect(fixture).toBeDefined();
    // @ts-expect-error PerformanceSnapshot.timestamp 禁止使用契约外字段值。
    const invalid: PerformanceSnapshot['timestamp'] = 'invalid';
    expect(invalid).toBeDefined();
  });
});
