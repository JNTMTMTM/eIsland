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

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type WheelEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getCalendarDayDifference, getCalendarWeeks, shiftCalendarMonth } from '../utils/calendarUtils';
import type { CalendarFormats, UseCalendarReturn } from '../types/calendarTypes';

const MONTH_SCROLL_THRESHOLD = 40;

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
  const monthScrollDeltaRef = useRef(0);

  const locale = i18n.resolvedLanguage ?? i18n.language;
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const weeks = useMemo(() => getCalendarWeeks(new Date(year, month, 1)), [year, month]);

  const formats = useMemo<CalendarFormats>(() => ({
    month: new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }),
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    full: new Intl.DateTimeFormat(locale, { dateStyle: 'full' }),
    lunar: new Intl.DateTimeFormat(locale, { calendar: 'chinese', year: 'numeric', month: 'long', day: 'numeric' }),
    lunarDay: new Intl.DateTimeFormat(locale, { calendar: 'chinese', month: 'short', day: 'numeric' }),
  }), [locale]);

  const difference = getCalendarDayDifference(selectedDate, today);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const selectedDay = selectedDate.getDate();
  const monthProgress = Math.round(selectedDay / daysInMonth * 100);

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

  // 键盘导航后将焦点移到新选中的日期按钮。
  useEffect(() => {
    if (focusDateRef.current) {
      selectedButtonRef.current?.focus();
      focusDateRef.current = false;
    }
  }, [selectedDate]);

  /** 在月历区域滚动时切换月份，累积触控板的小幅滚动以避免误触。 */
  const handleMonthWheel = (event: WheelEvent<HTMLElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    monthScrollDeltaRef.current += event.deltaY;
    if (Math.abs(monthScrollDeltaRef.current) < MONTH_SCROLL_THRESHOLD) return;
    const offset = monthScrollDeltaRef.current > 0 ? 1 : -1;
    monthScrollDeltaRef.current = 0;
    setSelectedDate((date) => shiftCalendarMonth(date, offset));
  };

  /** 选中指定日期 */
  const selectDate = (date: Date): void => {
    setSelectedDate(date);
  };

  /** 日期按钮键盘导航：方向键逐日/逐周，PageUp/PageDown 切月，Home/End 跳首尾 */
  const handleDateKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: Date): void => {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -((date.getDay() + 6) % 7),
      End: 6 - ((date.getDay() + 6) % 7),
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
  };

  return {
    today,
    selectedDate,
    selectedButtonRef,
    locale,
    year,
    month,
    weeks,
    formats,
    difference,
    daysInMonth,
    selectedDay,
    monthProgress,
    relativeLabel,
    handleMonthWheel,
    selectDate,
    handleDateKeyDown,
  };
}
