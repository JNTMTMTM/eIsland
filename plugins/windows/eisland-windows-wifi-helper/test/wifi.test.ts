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
 * @file wifi.test.ts
 * @description @eisland/windows-wifi-helper 单元测试
 * @author 鸡哥
 */

import { describe, it, expect } from 'vitest';
import type { WifiInfo } from '../index';

const wf = require('../') as {
  getWifiInfo(): WifiInfo | null;
};

/** 验证 WifiInfo 的字段类型和结构 */
function expectValidWifiInfoShape(info: WifiInfo) {
  expect(typeof info.isConnected).toBe('boolean');

  if (info.ssid !== null) expect(typeof info.ssid).toBe('string');

  expect(typeof info.signalBars).toBe('number');
  expect(info.signalBars).toBeGreaterThanOrEqual(-1);
  expect(info.signalBars).toBeLessThanOrEqual(5);

  expect(typeof info.connectivityLevel).toBe('number');
  expect([0, 1, 2, 3]).toContain(info.connectivityLevel);

  if (info.adapterName !== null) expect(typeof info.adapterName).toBe('string');
  expect(typeof info.isWifiAdapter).toBe('boolean');
}

describe('@eisland/windows-wifi-helper', () => {
  it('exports getWifiInfo function', () => {
    expect(typeof wf.getWifiInfo).toBe('function');
  });

  describe('getWifiInfo', () => {
    it('returns a valid WifiInfo object', () => {
      const info = wf.getWifiInfo();
      expect(info).not.toBeNull();
      if (info) expectValidWifiInfoShape(info);
    });

    it('never throws', () => {
      expect(() => wf.getWifiInfo()).not.toThrow();
    });

    it('returns consistent data on repeated calls', () => {
      const info1 = wf.getWifiInfo();
      const info2 = wf.getWifiInfo();
      expect(info1).not.toBeNull();
      expect(info2).not.toBeNull();
      if (info1 && info2) {
        // 连接状态和 SSID 短时间内应该一致
        expect(info1.isConnected).toBe(info2.isConnected);
        expect(info1.ssid).toBe(info2.ssid);
      }
    });

    it('isConnected and connectivityLevel are consistent', () => {
      const info = wf.getWifiInfo();
      expect(info).not.toBeNull();
      if (info) {
        if (info.isConnected) {
          expect(info.connectivityLevel).toBeGreaterThan(0);
        }
        if (info.connectivityLevel === 0) {
          expect(info.isConnected).toBe(false);
        }
      }
    });

    it('ssid is present when connected', () => {
      const info = wf.getWifiInfo();
      expect(info).not.toBeNull();
      if (info && info.isConnected && info.isWifiAdapter) {
        // WiFi 连接时应该有 SSID
        expect(info.ssid).not.toBeNull();
      }
    });
  });
});
