/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarHolidayUtils.ts
 * @description 校验节假日数据，按地区筛选并生成不受时区影响的日期索引。
 * @author 鸡哥
 */

import type { CalendarHoliday, CalendarHolidayIndex } from '../types/calendarHolidayTypes';
import { HOLIDAY_AUTO_SUBDIVISION_COUNTRIES } from '../config/calendarConfig';

/**
 * 将已知使用 ISO 字母代码的定位地区转换为节假日地区；不猜测 FIPS 数字码。
 * @param countryCode - 国家代码
 * @param regionCode - 共用定位返回的地区短码
 * @returns 可自动匹配的 ISO 地区代码，否则为空
 */
export function getCalendarSubdivision(countryCode: string, regionCode?: string): string {
  return HOLIDAY_AUTO_SUBDIVISION_COUNTRIES.includes(countryCode) && regionCode && /^[A-Z]{2,3}$/.test(regionCode)
    ? `${countryCode}-${regionCode}` : '';
}

/**
 * 获取本地日历日期键，避免 UTC 转换导致日期错位。
 * @param date - 本地日期
 * @returns YYYY-MM-DD
 */
export function getCalendarDateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * 校验外部响应，拒绝损坏的日期和不完整的适用范围。
 * @param data - API 响应
 * @param countryCode - 请求的国家代码
 * @param year - 请求的年份
 * @returns 已校验的记录
 */
export function parseCalendarHolidays(data: unknown, countryCode: string, year: number): CalendarHoliday[] {
  if (!Array.isArray(data)) throw new Error('Invalid holiday response');
  return data.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid holiday');
    const record = item as Record<string, unknown>;
    if (typeof record.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)
      || !record.date.startsWith(`${String(year).padStart(4, '0')}-`)
      || new Date(`${record.date}T12:00:00Z`).toISOString().slice(0, 10) !== record.date
      || typeof record.name !== 'string' || !record.name.trim()
      || record.countryCode !== countryCode || typeof record.nationalHoliday !== 'boolean'
      || !Array.isArray(record.holidayTypes) || !record.holidayTypes.every((type) => typeof type === 'string')
      || !(record.subdivisionCodes === null || (Array.isArray(record.subdivisionCodes)
        && record.subdivisionCodes.every((code) => typeof code === 'string')))) {
      throw new Error('Invalid holiday');
    }
    return record as unknown as CalendarHoliday;
  });
}

/**
 * 仅保留全国及匹配地区的公共假日，未知地区不混入其他地区的假期。
 * @param holidays - 已校验的年度记录
 * @param countryCode - 国家代码
 * @param subdivisionCode - 可选州、省代码
 * @returns 去重的日期与节日名称索引
 */
export function indexCalendarHolidays(holidays: CalendarHoliday[], countryCode: string, subdivisionCode: string): CalendarHolidayIndex {
  const index: CalendarHolidayIndex = new Map();
  for (const holiday of holidays) {
    if (holiday.countryCode !== countryCode || !holiday.holidayTypes.includes('Public')) continue;
    if (!holiday.nationalHoliday && (!subdivisionCode || !holiday.subdivisionCodes?.includes(subdivisionCode))) continue;
    const names = index.get(holiday.date) ?? [];
    if (!names.includes(holiday.name)) names.push(holiday.name);
    index.set(holiday.date, names);
  }
  return index;
}
