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
 * @file calendarTypes.ts
 * @description 日历模块类型定义：hook 返回值、组件入参。
 * @author 鸡哥
 */

import type { KeyboardEvent, RefObject } from 'react';

/** useCalendar hook 返回值类型 */
export interface UseCalendarReturn {
  /** 当前日期（用于"今天"标记） */
  today: Date;
  /** 选中日期 */
  selectedDate: Date;
  /** 选中日期按钮的 ref，用于键盘导航后聚焦 */
  selectedButtonRef: RefObject<HTMLButtonElement | null>;
  /** 本地化语言代码 */
  locale: string;
  /** 选中日期所在年份 */
  year: number;
  /** 选中日期所在月份（0-indexed） */
  month: number;
  /** 六周日历网格，按周分组 */
  weeks: Date[][];
  /** Intl 格式化器集合 */
  formats: CalendarFormats;
  /** 选中日期与今天的日历天数差 */
  difference: number;
  /** 当月天数 */
  daysInMonth: number;
  /** 选中日期的日号 */
  selectedDay: number;
  /** 月份进度百分比 */
  monthProgress: number;
  /** 相对今天的人类可读标签 */
  relativeLabel: string;
  /** 切换到上个月 */
  goToPreviousMonth: () => void;
  /** 切换到下个月 */
  goToNextMonth: () => void;
  /** 选中指定日期 */
  selectDate: (date: Date) => void;
  /** 日期按钮键盘导航 */
  handleDateKeyDown: (event: KeyboardEvent<HTMLButtonElement>, date: Date) => void;
}

/** Intl.DateTimeFormat 格式化器集合 */
export interface CalendarFormats {
  /** 年月格式 */
  month: Intl.DateTimeFormat;
  /** 星期缩写 */
  weekday: Intl.DateTimeFormat;
  /** 完整日期 */
  full: Intl.DateTimeFormat;
  /** 农历年月日 */
  lunar: Intl.DateTimeFormat;
  /** 农历月日 */
  lunarDay: Intl.DateTimeFormat;
}

/** CalendarGrid 组件入参 */
export interface CalendarGridProps {
  /** 六周日历网格 */
  weeks: Date[][];
  /** 选中日期 */
  selectedDate: Date;
  /** 今天日期 */
  today: Date;
  /** 当前月份（0-indexed） */
  month: number;
  /** 本地化语言代码 */
  locale: string;
  /** Intl 格式化器集合 */
  formats: CalendarFormats;
  /** 选中日期按钮的 ref */
  selectedButtonRef: RefObject<HTMLButtonElement | null>;
  /** 切换到上个月 */
  onPreviousMonth: () => void;
  /** 切换到下个月 */
  onNextMonth: () => void;
  /** 选中指定日期 */
  onSelectDate: (date: Date) => void;
  /** 日期按钮键盘导航 */
  onDateKeyDown: (event: KeyboardEvent<HTMLButtonElement>, date: Date) => void;
}

/** CalendarDetailPanel 组件入参 */
export interface CalendarDetailPanelProps {
  /** 选中日期 */
  selectedDate: Date;
  /** 本地化语言代码 */
  locale: string;
  /** Intl 格式化器集合 */
  formats: CalendarFormats;
  /** 选中日期的日号 */
  selectedDay: number;
  /** 当月天数 */
  daysInMonth: number;
  /** 月份进度百分比 */
  monthProgress: number;
  /** 相对今天的人类可读标签 */
  relativeLabel: string;
}
