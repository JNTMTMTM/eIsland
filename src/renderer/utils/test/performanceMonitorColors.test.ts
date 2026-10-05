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
 * @file performanceMonitorColors.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PERFORMANCE_MONITOR_CHART_COLORS,
  DEFAULT_PERFORMANCE_MONITOR_HARDWARE_SELECTION,
  isPerformanceMonitorColor,
  normalizePerformanceMonitorChartColors,
  normalizePerformanceMonitorHardwareSelection,
} from '../performanceMonitorColors';

describe('performanceMonitorColors', () => {
  it('validates color format', () => {
    expect(isPerformanceMonitorColor('#AABBCC')).toBe(true);
    expect(isPerformanceMonitorColor('#abc')).toBe(false);
    expect(isPerformanceMonitorColor('AABBCC')).toBe(false);
  });

  it('normalizes chart colors with defaults', () => {
    expect(normalizePerformanceMonitorChartColors(null)).toEqual(DEFAULT_PERFORMANCE_MONITOR_CHART_COLORS);
    expect(normalizePerformanceMonitorChartColors({ cpu: '#112233', memory: '#445566' })).toEqual({
      cpu: '#112233',
      gpu: DEFAULT_PERFORMANCE_MONITOR_CHART_COLORS.gpu,
      memory: '#445566',
      disk: DEFAULT_PERFORMANCE_MONITOR_CHART_COLORS.disk,
    });
  });

  it('normalizes hardware selection with defaults', () => {
    expect(normalizePerformanceMonitorHardwareSelection(null)).toEqual(DEFAULT_PERFORMANCE_MONITOR_HARDWARE_SELECTION);
    expect(normalizePerformanceMonitorHardwareSelection({ cpu: '0', gpu: '', disk: 'disk-1' })).toEqual({
      cpu: '0',
      gpu: DEFAULT_PERFORMANCE_MONITOR_HARDWARE_SELECTION.gpu,
      disk: 'disk-1',
    });
  });
});
