/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file useCalendarHolidays.ts
 * @description 复用天气定位状态，按当前国家及可视年份加载节假日。
 * @author 鸡哥
 */

import { useEffect, useMemo, useState } from 'react';
import { useIslandStore } from '../../../../../../store/index/index';
import { HOLIDAY_SUBDIVISION_KEY } from '../config/calendarConfig';
import { fetchCalendarHolidays, UnsupportedHolidayCountryError, UnsupportedHolidayYearError } from '../utils/calendarHolidayApi';
import { getCalendarSubdivision, indexCalendarHolidays } from '../utils/calendarHolidayUtils';
import type { CalendarHoliday, CalendarHolidayInfo, CalendarHolidayStatus } from '../types/calendarHolidayTypes';

/**
 * 订阅共享位置，加载当前国家、可视年份及临近年份的节假日。
 * @param selectedYear - 所选日期年份
 * @returns 节日状态及可视年份更新方法
 */
export function useCalendarHolidays(selectedYear: number): CalendarHolidayInfo & { setVisibleYear: (year: number) => void } {
  const location = useIslandStore((store) => store.location);
  const refreshLocation = useIslandStore((store) => store.refreshLocation);
  const countryCode = location?.countryCode && /^[A-Z]{2}$/.test(location.countryCode) ? location.countryCode : '';
  const automaticSubdivision = getCalendarSubdivision(countryCode, location?.regionCode);
  const [locating, setLocating] = useState(!countryCode);
  const [visibleYear, setVisibleYear] = useState(selectedYear);
  const [revision, setRevision] = useState(0);
  const [subdivisionCode, setSubdivisionCode] = useState('');
  const [state, setState] = useState<{
    records: CalendarHoliday[];
    countryCode: string;
    status: CalendarHolidayStatus;
  }>({ records: [], countryCode: '', status: 'loading' });

  // 旧缓存缺少代码时沿用现有定位策略补齐；不会另建定位请求或强制改用 IP。
  useEffect(() => {
    if (/^[A-Z]{2}$/.test(useIslandStore.getState().location?.countryCode ?? '')) return;
    let active = true;
    setLocating(true);
    void refreshLocation().catch(() => undefined).finally(() => { if (active) setLocating(false); });
    return () => { active = false; };
  }, [refreshLocation, revision]);

  useEffect(() => {
    let code = automaticSubdivision;
    try { code = localStorage.getItem(`${HOLIDAY_SUBDIVISION_KEY}${countryCode}`) ?? code; } catch { /* 继续使用自动匹配地区。 */ }
    setSubdivisionCode(code.startsWith(`${countryCode}-`) ? code : '');
  }, [countryCode, automaticSubdivision]);

  useEffect(() => {
    if (!countryCode) return;
    let active = true;
    void (async () => {
      try {
        setState((current) => ({ records: current.countryCode === countryCode ? current.records : [], countryCode, status: 'loading' }));
        // 月份跨年时提前准备相邻年份，仅保留当前浏览及所选日期所需的数据。
        const years = [...new Set([selectedYear, visibleYear - 1, visibleYear, visibleYear + 1])].filter((year) => year >= 1 && year <= 9999);
        const results = await Promise.allSettled(years.map((year) => fetchCalendarHolidays(countryCode, year)));
        if (!active) return;
        // 邻年仅为预取，其范围限制或失败不应覆盖正在查看年份的状态。
        const failure = results.find((result, index) => result.status === 'rejected'
          && (years[index] === visibleYear || years[index] === selectedYear));
        setState({
          countryCode,
          records: results.flatMap((result) => result.status === 'fulfilled' ? result.value : []),
          status: failure?.status === 'rejected'
            ? (failure.reason instanceof UnsupportedHolidayCountryError || failure.reason instanceof UnsupportedHolidayYearError ? 'unsupported' : 'error')
            : 'ready',
        });
      } catch {
        if (active) setState({ records: [], countryCode, status: 'error' });
      }
    })();
    return () => { active = false; };
  }, [countryCode, selectedYear, visibleYear, revision]);

  const holidays = useMemo(() => indexCalendarHolidays(state.records, countryCode, subdivisionCode), [state.records, countryCode, subdivisionCode]);
  const subdivisionCodes = useMemo(() => [...new Set(state.records.filter((holiday) => holiday.countryCode === countryCode && holiday.holidayTypes.includes('Public'))
    .flatMap((holiday) => holiday.subdivisionCodes ?? []).concat(subdivisionCode.startsWith(`${countryCode}-`) ? [subdivisionCode] : []))].sort(), [state.records, countryCode, subdivisionCode]);

  return {
    holidays,
    countryCode,
    status: !countryCode ? (locating ? 'loading' : 'locationUnavailable') : (state.countryCode === countryCode ? state.status : 'loading'),
    subdivisionCode,
    subdivisionCodes,
    setVisibleYear,
    retry: () => setRevision((current) => current + 1),
    selectSubdivision: (code) => {
      if (code && !subdivisionCodes.includes(code)) return;
      setSubdivisionCode(code);
      try { localStorage.setItem(`${HOLIDAY_SUBDIVISION_KEY}${countryCode}`, code); } catch { /* 存储不可用不影响本次选择。 */ }
    },
  };
}
