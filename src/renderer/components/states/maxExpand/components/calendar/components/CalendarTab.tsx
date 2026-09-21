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

import { useId, useMemo, useState, type ReactElement } from 'react';
import { useCalendar } from '../hooks/useCalendar';
import { useCalendarHolidays } from '../hooks/useCalendarHolidays';
import { useCalendarTodos } from '../hooks/useCalendarTodos';
import { useCountdownItems } from '../../countdown/hooks/useCountdownItems';
import { getCalendarTimelineEvents } from '../utils/calendarTimelineUtils';
import { CalendarGrid } from './CalendarGrid';
import { CalendarDetailPanel } from './CalendarDetailPanel';
import '../styles/calendar.css';

/**
 * 最大展开日历面板
 * @description 月视图与选中日期详情，支持鼠标和键盘浏览。
 * @returns 随应用主题和语言更新的日历面板。
 */
export function CalendarTab(): ReactElement {
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const detailsId = useId();
  const {
    today,
    selectedDate,
    selectedButtonRef,
    focusDateRef,
    locale,
    formats,
    selectedDay,
    relativeLabel,
    selectDate,
    handleDateKeyDown,
  } = useCalendar();
  const holidayInfo = useCalendarHolidays(selectedDate.getFullYear());
  const todos = useCalendarTodos();
  const { items: countdowns } = useCountdownItems();
  const events = useMemo(() => getCalendarTimelineEvents(holidayInfo.holidays, todos, countdowns, today), [holidayInfo.holidays, todos, countdowns, today]);

  return (
    <div
      className="max-expand-tab-panel calendar-panel"
      onKeyDown={(event) => { if (event.key === 'Tab') event.stopPropagation(); }}
    >
      <div className="calendar-layout" data-details-expanded={detailsExpanded}>
        <CalendarGrid
          detailsExpanded={detailsExpanded}
          detailsId={detailsId}
          onToggleDetails={() => setDetailsExpanded((expanded) => !expanded)}
          events={events}
          holidays={holidayInfo.holidays}
          onVisibleYearChange={holidayInfo.setVisibleYear}
          selectedDate={selectedDate}
          today={today}
          locale={locale}
          formats={formats}
          selectedButtonRef={selectedButtonRef}
          focusDateRef={focusDateRef}
          onSelectDate={selectDate}
          onDateKeyDown={handleDateKeyDown}
        />
        <div className="calendar-details-shell" id={detailsId} inert={!detailsExpanded} aria-hidden={!detailsExpanded}>
          <div className="calendar-details-clip">
            <CalendarDetailPanel
              events={events}
              holidayInfo={holidayInfo}
              selectedDate={selectedDate}
              locale={locale}
              formats={formats}
              selectedDay={selectedDay}
              relativeLabel={relativeLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
