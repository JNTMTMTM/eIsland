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
 * @file power.test.ts
 * @description @eisland/windows-power-helper 单元测试
 * @author 鸡哥
 */

import { describe, it, expect } from 'vitest';
import type { PowerInfo } from '../index';

const pw = require('../') as {
  getPowerInfo(): PowerInfo | null;
};

/** 验证 PowerInfo 的字段类型和结构 */
function expectValidPowerInfoShape(info: PowerInfo) {
  expect(typeof info.remainingChargePercent).toBe('number');
  expect(info.remainingChargePercent).toBeGreaterThanOrEqual(0);
  expect(info.remainingChargePercent).toBeLessThanOrEqual(100);

  expect(typeof info.batteryStatus).toBe('number');
  expect([0, 1, 2, 3]).toContain(info.batteryStatus);

  expect(typeof info.powerSupplyStatus).toBe('number');
  expect([0, 1, 2, 3]).toContain(info.powerSupplyStatus);

  expect(typeof info.energySaverStatus).toBe('number');
  expect([0, 1, 2]).toContain(info.energySaverStatus);

  expect(typeof info.hasBattery).toBe('boolean');
  expect(typeof info.isCharging).toBe('boolean');
  expect(typeof info.isOnAcPower).toBe('boolean');
}

describe('@eisland/windows-power-helper', () => {
  it('exports getPowerInfo function', () => {
    expect(typeof pw.getPowerInfo).toBe('function');
  });

  describe('getPowerInfo', () => {
    it('returns a valid PowerInfo object', () => {
      const info = pw.getPowerInfo();
      expect(info).not.toBeNull();
      if (info) expectValidPowerInfoShape(info);
    });

    it('never throws', () => {
      expect(() => pw.getPowerInfo()).not.toThrow();
    });

    it('returns consistent data on repeated calls', () => {
      const info1 = pw.getPowerInfo();
      const info2 = pw.getPowerInfo();
      expect(info1).not.toBeNull();
      expect(info2).not.toBeNull();
      if (info1 && info2) {
        // 电量和电池状态应该一致（短时间内不会变化）
        expect(info1.remainingChargePercent).toBe(info2.remainingChargePercent);
        expect(info1.hasBattery).toBe(info2.hasBattery);
      }
    });

    it('hasBattery reflects actual hardware', () => {
      const info = pw.getPowerInfo();
      expect(info).not.toBeNull();
      if (info) {
        // 台式机: hasBattery=false, batteryStatus=0
        // 笔记本: hasBattery=true, batteryStatus!=0
        if (!info.hasBattery) {
          expect(info.batteryStatus).toBe(0); // NotPresent
        }
      }
    });

    it('isCharging and batteryStatus are consistent', () => {
      const info = pw.getPowerInfo();
      expect(info).not.toBeNull();
      if (info) {
        if (info.isCharging) {
          expect(info.batteryStatus).toBe(3); // Charging
        }
        if (info.batteryStatus === 3) {
          expect(info.isCharging).toBe(true);
        }
      }
    });
  });
});
