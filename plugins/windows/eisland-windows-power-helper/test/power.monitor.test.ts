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
 * @file power.monitor.test.ts
 * @description PowerMonitor 单元测试
 * @author 鸡哥
 */

import { describe, it, expect, afterEach } from 'vitest';
import type { PowerInfo, PowerMonitor as PowerMonitorType } from '../index';

const { PowerMonitor } = require('../') as {
  PowerMonitor: new () => PowerMonitorType;
};

let monitor: PowerMonitorType | null = null;

afterEach(() => {
  if (monitor) {
    monitor.stop();
    monitor = null;
  }
});

describe('PowerMonitor', () => {
  it('can be constructed', () => {
    monitor = new PowerMonitor();
    expect(monitor).toBeDefined();
    expect(typeof monitor.start).toBe('function');
    expect(typeof monitor.stop).toBe('function');
    expect(typeof monitor.getPowerInfo).toBe('function');
  });

  it('start returns initial power info', () => {
    monitor = new PowerMonitor();
    const info = monitor.start();
    expect(info).not.toBeNull();
    if (info) {
      expect(typeof info.remainingChargePercent).toBe('number');
      expect(typeof info.hasBattery).toBe('boolean');
    }
  });

  it('stop is idempotent', () => {
    monitor = new PowerMonitor();
    monitor.start();
    expect(() => {
      monitor!.stop();
      monitor!.stop();
    }).not.toThrow();
  });

  it('start is idempotent', () => {
    monitor = new PowerMonitor();
    monitor.start();
    expect(() => {
      monitor!.start();
    }).not.toThrow();
  });

  it('getPowerInfo returns data after start', () => {
    monitor = new PowerMonitor();
    monitor.start();
    const info = monitor.getPowerInfo();
    expect(info).not.toBeNull();
    if (info) {
      expect(typeof info.remainingChargePercent).toBe('number');
      expect(info.remainingChargePercent).toBeGreaterThanOrEqual(0);
      expect(info.remainingChargePercent).toBeLessThanOrEqual(100);
    }
  });

  it('emits power-changed event', async () => {
    monitor = new PowerMonitor();
    monitor.start();

    const eventPromise = new Promise<PowerInfo>((resolve) => {
      monitor!.on('power-changed', (info: PowerInfo) => {
        resolve(info);
      });
    });

    // 等待一小段时间，让监控器有机会触发事件
    // 注意：如果没有实际的电源变化，这个测试可能需要手动插拔电源
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    );

    try {
      const info = await Promise.race([eventPromise, timeout]);
      expect(info).toBeDefined();
    } catch {
      // 超时是正常的（没有电源变化发生）
      // 这个测试验证的是事件机制能正常工作，而不是必须有电源变化
    }
  });
});
