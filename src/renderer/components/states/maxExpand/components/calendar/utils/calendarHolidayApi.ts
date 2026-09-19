/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarHolidayApi.ts
 * @description Nager.Holidays 网络代理、年度缓存与并发请求去重。
 * @author 鸡哥
 */

import { HOLIDAY_API_BASE, HOLIDAY_CACHE_LIMIT, HOLIDAY_CACHE_MS, HOLIDAY_TIMEOUT_MS } from '../config/calendarConfig';
import type { CalendarHoliday } from '../types/calendarHolidayTypes';
import { parseCalendarHolidays } from './calendarHolidayUtils';

interface CachedRequest {
  expires: number;
  promise: Promise<CalendarHoliday[]>;
}

const years = new Map<string, CachedRequest>();

/** 服务不支持该国家，与临时网络失败区分。 */
export class UnsupportedHolidayCountryError extends Error {}

/** 服务未提供所请求年份的数据。 */
export class UnsupportedHolidayYearError extends Error {}

/**
 * 按国家和年份加载节假日；成功缓存一天，失败允许立即重试。
 * @param countryCode - ISO 国家代码
 * @param year - 公历年份
 * @returns 已校验的年度节假日
 */
export function fetchCalendarHolidays(countryCode: string, year: number): Promise<CalendarHoliday[]> {
  if (!/^[A-Z]{2}$/.test(countryCode) || !Number.isInteger(year) || year < 1 || year > 9999) {
    return Promise.reject(new Error('Invalid holiday request'));
  }
  const key = `${countryCode}/${year}`;
  const cached = years.get(key);
  if (cached && cached.expires > Date.now()) return cached.promise;
  const promise = window.api.netFetch(`${HOLIDAY_API_BASE}/Holidays/${key}`, { timeoutMs: HOLIDAY_TIMEOUT_MS })
    .then((response) => {
      if (response.status === 404) throw new UnsupportedHolidayCountryError();
      if (response.status === 400) throw new UnsupportedHolidayYearError();
      if (!response.ok) throw new Error(`Holiday request failed: ${response.status}`);
      return parseCalendarHolidays(response.status === 204 ? [] : JSON.parse(response.body), countryCode, year);
    });
  const entry = { expires: Date.now() + HOLIDAY_CACHE_MS, promise };
  years.delete(key);
  years.set(key, entry);
  if (years.size > HOLIDAY_CACHE_LIMIT) years.delete(years.keys().next().value!);
  void promise.catch(() => { if (years.get(key) === entry) years.delete(key); });
  return promise;
}
