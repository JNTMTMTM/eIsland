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
 * @file useCalendar.ts
 * @description 日历模块状态管理 hook：日期选择、月份导航、键盘交互、午夜刷新。
 * @author 鸡哥
 */

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getCalendarDayDifference, shiftCalendarMonth } from '../utils/calendarUtils';
import type { CalendarFormats, UseCalendarReturn } from '../types/calendarTypes';

/**
 * 日历模块状态管理 hook
 * @description 封装 CalendarTab 的全部状态、格式化器与交互逻辑
 * @returns 日历面板所需的全部数据与操作
 */
export function useCalendar(): UseCalendarReturn {
  const { t, i18n } = useTranslation();
  const [today, setToday] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const selectedButtonRef = useRef<HTMLButtonElement>(null);
  const focusDateRef = useRef(false);

  const locale = i18n.resolvedLanguage ?? i18n.language;
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const formats = useMemo<CalendarFormats>(() => ({
    month: new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }),
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    full: new Intl.DateTimeFormat(locale, { dateStyle: 'full' }),
    lunar: new Intl.DateTimeFormat(locale, { calendar: 'chinese', year: 'numeric', month: 'long', day: 'numeric' }),
    lunarDay: new Intl.DateTimeFormat(locale, { calendar: 'chinese', month: 'short', day: 'numeric' }),
  }), [locale]);

  const difference = getCalendarDayDifference(selectedDate, today);
  const selectedDay = selectedDate.getDate();

  let relativeLabel = t('maxExpand.calendar.today');
  if (difference > 0) relativeLabel = t('maxExpand.calendar.daysAfter', { count: difference });
  if (difference < 0) relativeLabel = t('maxExpand.calendar.daysBefore', { count: Math.abs(difference) });

  // 午夜与休眠恢复时刷新今日标记，不打断用户正在浏览的日期。
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const refreshToday = (): void => setToday(new Date());
    const timer = window.setTimeout(refreshToday, midnight.getTime() - now.getTime() + 100);
    window.addEventListener('focus', refreshToday);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refreshToday);
    };
  }, [today]);

  /** 选中指定日期 */
  const selectDate = useCallback((date: Date): void => {
    setSelectedDate(date);
  }, []);

  /** 日期按钮键盘导航：方向键逐日/逐周，PageUp/PageDown 切月，Home/End 跳首尾 */
  const handleDateKeyDown = useCallback((event: KeyboardEvent<HTMLElement>, date: Date): void => {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -date.getDay(),
      End: 6 - date.getDay(),
    };
    let next: Date;
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      next = shiftCalendarMonth(date, event.key === 'PageUp' ? -1 : 1);
    } else if (Object.hasOwn(offsets, event.key)) {
      next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsets[event.key], 12);
    } else {
      return;
    }
    event.preventDefault();
    focusDateRef.current = true;
    setSelectedDate(next);
  }, []);

  return {
    today,
    selectedDate,
    selectedButtonRef,
    focusDateRef,
    locale,
    year,
    month,
    formats,
    difference,
    selectedDay,
    relativeLabel,
    selectDate,
    handleDateKeyDown,
  };
}
