/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarHolidayUtils.test.ts
 * @description 验证地区过滤、无效数据及跨周跨月假期横线边界。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import type { CalendarHoliday } from '../types/calendarHolidayTypes';
import { getCalendarDateKey, getCalendarSubdivision, indexCalendarHolidays, parseCalendarHolidays } from './calendarHolidayUtils';

const national: CalendarHoliday = { date: '2026-09-25', name: 'Holiday', countryCode: 'US', nationalHoliday: true, subdivisionCodes: null, holidayTypes: ['Public'] };

describe('calendar holidays', () => {
  it('includes national and matching regional public holidays and deduplicates names', () => {
    const regional = { ...national, name: 'Regional', nationalHoliday: false, subdivisionCodes: ['US-CA'] };
    const records = [national, national, regional, { ...regional, name: 'Other state', subdivisionCodes: ['US-NY'] }, { ...national, name: 'Observance', holidayTypes: ['Observance'] }, { ...national, countryCode: 'CA', name: 'Other country' }];
    expect(indexCalendarHolidays(records, 'US', 'US-CA').get(national.date)).toEqual(['Holiday', 'Regional']);
    expect(indexCalendarHolidays(records, 'US', '').get(national.date)).toEqual(['Holiday']);
  });

  it('does not turn unknown FIPS region codes into ISO subdivisions', () => {
    expect(getCalendarSubdivision('US', 'CA')).toBe('US-CA');
    expect(getCalendarSubdivision('GB', 'SCT')).toBe('GB-SCT');
    expect(getCalendarSubdivision('FR', '11')).toBe('');
    expect(getCalendarSubdivision('US')).toBe('');
  });

  it('rejects malformed, impossible or mismatched API records', () => {
    expect(parseCalendarHolidays([national], 'US', 2026)).toEqual([national]);
    for (const record of [{ ...national, date: '2026-02-30' }, { ...national, countryCode: 'CN' }, { ...national, date: '2025-09-25' }, { ...national, holidayTypes: null }, { ...national, subdivisionCodes: 1 }]) {
      expect(() => parseCalendarHolidays([record], 'US', 2026)).toThrow();
    }
    expect(() => parseCalendarHolidays({}, 'US', 2026)).toThrow();
  });


  it('uses local calendar fields at midnight and year boundaries', () => {
    expect(getCalendarDateKey(new Date(2026, 0, 1, 0))).toBe('2026-01-01');
    expect(getCalendarDateKey(new Date(2026, 11, 31, 23))).toBe('2026-12-31');
  });
});
