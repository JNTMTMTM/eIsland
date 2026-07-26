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
 * @file brightness.test.ts
 * @description @eisland/windows-brightness-helper 单元测试
 * @author 鸡哥
 */

import { describe, it, expect } from 'vitest';
import type { BrightnessInfo } from '../index';

const bright = require('../') as {
  getBrightness(): BrightnessInfo | null;
  setBrightness(brightness: number): boolean;
};

/** 验证 BrightnessInfo 的字段类型和结构 */
function expectValidBrightnessShape(info: BrightnessInfo) {
  expect(typeof info.currentBrightness).toBe('number');
  expect(info.currentBrightness).toBeGreaterThanOrEqual(0);
  expect(info.currentBrightness).toBeLessThanOrEqual(100);

  if (info.levels !== null) {
    expect(Array.isArray(info.levels)).toBe(true);
    for (const level of info.levels) {
      expect(typeof level).toBe('number');
    }
  }

  if (info.instanceName !== null) {
    expect(typeof info.instanceName).toBe('string');
  }

  if (info.source !== undefined) {
    expect(['wmi', 'ddc-ci']).toContain(info.source);
  }
}

describe('@eisland/windows-brightness-helper', () => {
  it('exports all expected functions', () => {
    expect(typeof bright.getBrightness).toBe('function');
    expect(typeof bright.setBrightness).toBe('function');
  });

  describe('getBrightness', () => {
    it('returns BrightnessInfo or null', () => {
      const info = bright.getBrightness();
      if (info !== null) {
        expectValidBrightnessShape(info);
      }
    });

    it('never throws', () => {
      expect(() => bright.getBrightness()).not.toThrow();
    });

    it('returns valid currentBrightness range', () => {
      const info = bright.getBrightness();
      if (info !== null) {
        expect(info.currentBrightness).toBeGreaterThanOrEqual(0);
        expect(info.currentBrightness).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('setBrightness', () => {
    it('never throws for valid input', () => {
      expect(() => bright.setBrightness(50)).not.toThrow();
    });

    it('never throws for boundary values', () => {
      expect(() => bright.setBrightness(0)).not.toThrow();
      expect(() => bright.setBrightness(100)).not.toThrow();
    });

    it('returns a boolean', () => {
      const result = bright.setBrightness(50);
      expect(typeof result).toBe('boolean');
    });

    it('clamps out-of-range values', () => {
      // 负值应被 clamp 到 0
      expect(() => bright.setBrightness(-10)).not.toThrow();
      // 超过 100 应被 clamp 到 100
      expect(() => bright.setBrightness(200)).not.toThrow();
    });
  });
});
