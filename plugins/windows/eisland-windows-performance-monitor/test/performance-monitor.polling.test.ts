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
 * @file performance-monitor.polling.test.ts
 * @description Windows 性能采集插件轮询测试
 * @description 验证 CPU 与内存采集在连续轮询场景下保持可用结构
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';

const monitor = require('../') as {
  getCpu: () => {
    usagePercent: number;
    hasBaseline: boolean;
  };
  getMemory: () => {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    usagePercent: number;
  };
};

const wait = (delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs));

describe('windows-performance-monitor polling', () => {
  it('keeps CPU baseline and memory snapshots valid during polling', async () => {
    monitor.getCpu();

    for (let index = 0; index < 5; index += 1) {
      await wait(20);

      const cpu = monitor.getCpu();
      const memory = monitor.getMemory();

      expect(cpu.hasBaseline).toBe(true);
      expect(cpu.usagePercent).toBeGreaterThanOrEqual(0);
      expect(cpu.usagePercent).toBeLessThanOrEqual(100);
      expect(memory.totalBytes).toBeGreaterThan(0);
      expect(memory.usedBytes).toBeGreaterThanOrEqual(0);
      expect(memory.availableBytes).toBeGreaterThanOrEqual(0);
      expect(memory.usagePercent).toBeGreaterThanOrEqual(0);
      expect(memory.usagePercent).toBeLessThanOrEqual(100);
    }
  });
});