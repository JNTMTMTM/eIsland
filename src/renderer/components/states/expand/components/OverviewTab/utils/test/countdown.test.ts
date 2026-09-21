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
 * @file countdown.test.ts
 * @description Unit tests for countdown.ts utility functions.
 * @author 鸡哥
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cdDiffDays } from '../countdown';

describe('cdDiffDays', () => {
  beforeEach(() => {
    // Fix "today" to 2026-05-31 00:00:00 local time for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T00:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('happy path', () => {
    it('returns 1 when target is tomorrow', () => {
      expect(cdDiffDays('2026-06-01')).toBe(1);
    });

    it('returns 7 when target is one week in the future', () => {
      expect(cdDiffDays('2026-06-07')).toBe(7);
    });

    it('returns 30 when target is 30 days in the future', () => {
      expect(cdDiffDays('2026-06-30')).toBe(30);
    });

    it('returns -1 when target was yesterday', () => {
      expect(cdDiffDays('2026-05-30')).toBe(-1);
    });

    it('returns -30 when target was 30 days ago', () => {
      expect(cdDiffDays('2026-05-01')).toBe(-30);
    });
  });

  describe('edge cases', () => {
    it('returns 0 when target is today', () => {
      expect(cdDiffDays('2026-05-31')).toBe(0);
    });

    it('returns 365 when target is exactly one year later', () => {
      expect(cdDiffDays('2027-05-31')).toBe(365);
    });

    it('handles leap year correctly (2028-02-29)', () => {
      // Fix today to just before leap day
      vi.setSystemTime(new Date('2028-02-28T00:00:00'));
      expect(cdDiffDays('2028-02-29')).toBe(1);
    });

    it('handles cross-year boundary (Dec 31 -> Jan 1)', () => {
      vi.setSystemTime(new Date('2026-12-31T00:00:00'));
      expect(cdDiffDays('2027-01-01')).toBe(1);
    });

    it('handles distant future date', () => {
      // 日历日期差不能使用跨夏令时的本地毫秒差向上取整。
      expect(cdDiffDays('2099-12-31')).toBe(26877);
    });

    it('ignores the current time of day (today is normalized to midnight)', () => {
      // Set system time to 23:59:59 — should still count from midnight
      vi.setSystemTime(new Date('2026-05-31T23:59:59'));
      // Target is tomorrow: difference from midnight 2026-05-31 to midnight 2026-06-01
      expect(cdDiffDays('2026-06-01')).toBe(1);
    });
  });

  describe('boundary conditions', () => {
    it('returns 1 when target is one millisecond after today (next day)', () => {
      // The function normalizes today to midnight and parses target as midnight,
      // so any valid next-day string yields 1
      expect(cdDiffDays('2026-06-01')).toBe(1);
    });

    it('handles same date in different year as negative', () => {
      // 2025-05-31 is one year before today
      expect(cdDiffDays('2025-05-31')).toBe(-365);
    });

    it('returns 0 when target string equals today even with different system time', () => {
      vi.setSystemTime(new Date('2026-05-31T15:30:00'));
      expect(cdDiffDays('2026-05-31')).toBe(0);
    });
  });

  describe('input format', () => {
    it('accepts ISO date-only string (YYYY-MM-DD)', () => {
      expect(cdDiffDays('2026-06-15')).toBe(15);
    });

    it('produces a number result', () => {
      const result = cdDiffDays('2026-06-01');
      expect(typeof result).toBe('number');
    });
  });
});
