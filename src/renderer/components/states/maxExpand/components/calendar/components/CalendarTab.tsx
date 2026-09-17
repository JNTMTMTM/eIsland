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
 * @file CalendarTab.tsx
 * @description 最大展开日历面板 — 仅负责 hook 调用与组件组合。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useCalendar } from '../hooks/useCalendar';
import { CalendarGrid } from './CalendarGrid';
import { CalendarDetailPanel } from './CalendarDetailPanel';
import '../styles/calendar.css';

/**
 * 最大展开日历面板
 * @description 月视图与选中日期详情，支持鼠标和键盘浏览。
 * @returns 随应用主题和语言更新的日历面板。
 */
export function CalendarTab(): ReactElement {
  const {
    today,
    selectedDate,
    selectedButtonRef,
    focusDateRef,
    locale,
    formats,
    daysInMonth,
    selectedDay,
    monthProgress,
    relativeLabel,
    selectDate,
    handleDateKeyDown,
  } = useCalendar();

  return (
    <div
      className="max-expand-tab-panel calendar-panel"
      onKeyDown={(event) => { if (event.key === 'Tab') event.stopPropagation(); }}
    >
      <div className="calendar-layout">
        <CalendarGrid
          selectedDate={selectedDate}
          today={today}
          locale={locale}
          formats={formats}
          selectedButtonRef={selectedButtonRef}
          focusDateRef={focusDateRef}
          onSelectDate={selectDate}
          onDateKeyDown={handleDateKeyDown}
        />
        <CalendarDetailPanel
          selectedDate={selectedDate}
          locale={locale}
          formats={formats}
          selectedDay={selectedDay}
          daysInMonth={daysInMonth}
          monthProgress={monthProgress}
          relativeLabel={relativeLabel}
        />
      </div>
    </div>
  );
}
