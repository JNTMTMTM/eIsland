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
 * @file CalendarGrid.tsx
 * @description Apple 风格连续月历：大号月份、细周分隔线和主题蓝色圆形日期。
 * @author 鸡哥
 */

import { useEffect, useId, useLayoutEffect, useMemo, type CSSProperties, type ReactElement } from 'react';
import { useCalendarScroll } from '../hooks/useCalendarScroll';
import { CALENDAR_EVENT_BOTTOM_GAP, CALENDAR_EVENT_LANE_HEIGHT } from '../config/calendarConfig';
import { CalendarMonthGrid } from './CalendarMonthGrid';
import type { CalendarGridProps } from '../types/calendarTypes';

/**
 * 日历月视图网格
 * @description 月份之间保留清晰间隔，滚动浏览与日期选择独立。
 * @param props - 组件入参
 * @returns 月视图 JSX
 */
export function CalendarGrid({
  events,
  holidays,
  onVisibleYearChange,
  selectedDate,
  today,
  locale,
  formats,
  selectedButtonRef,
  focusDateRef,
  onSelectDate,
  onDateKeyDown,
}: CalendarGridProps): ReactElement {
  const monthId = useId();
  const monthFormat = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'long' }), [locale]);
  const shortMonthFormat = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short' }), [locale]);
  const yearFormat = useMemo(() => new Intl.DateTimeFormat(locale, { year: 'numeric' }), [locale]);
  const { scrollRef, onScroll, months, visibleDate, weekHeight, headerHeight, monthGap, monthLabelHeight, paddingTop, paddingBottom } = useCalendarScroll(selectedDate, events);
  const visibleYear = visibleDate.getFullYear();
  useEffect(() => { onVisibleYearChange(visibleYear); }, [visibleYear, onVisibleYearChange]);

  // 等待虚拟周行挂载后聚焦，避免键盘跨越可视区时丢失焦点。
  useLayoutEffect(() => {
    if (focusDateRef.current && selectedButtonRef.current) {
      selectedButtonRef.current.focus({ preventScroll: true });
      focusDateRef.current = false;
    }
  });

  return (
    <section
      className="calendar-grid"
      style={{
        '--calendar-week-height': `${weekHeight}px`,
        '--calendar-event-lane-height': `${CALENDAR_EVENT_LANE_HEIGHT}px`,
        '--calendar-event-bottom-gap': `${CALENDAR_EVENT_BOTTOM_GAP}px`,
        '--calendar-header-height': `${headerHeight}px`,
        '--calendar-month-gap': `${monthGap}px`,
        '--calendar-month-label-height': `${monthLabelHeight}px`,
        '--calendar-padding-top': `${paddingTop}px`,
        '--calendar-padding-bottom': `${paddingBottom}px`,
      } as CSSProperties}
      aria-labelledby={monthId}
    >
      <h2 className="calendar-month-heading" id={monthId} aria-label={formats.month.format(visibleDate)} aria-live="polite">
        <span className="calendar-month-name" data-current-month={visibleDate.getFullYear() === today.getFullYear() && visibleDate.getMonth() === today.getMonth()}>
          {monthFormat.format(visibleDate)}
        </span> 
        <span className="calendar-year">{yearFormat.format(visibleDate)}</span>
      </h2>
      <div className="calendar-weekdays" aria-hidden="true">
        {months[0].weeks[0].map((date) => (
          <span className="calendar-weekday" key={date.getDay()}>
            {formats.weekday.format(date)}
          </span>
        ))}
      </div>
      <div
        className="calendar-scroll"
        ref={scrollRef}
        role="region"
        aria-labelledby={monthId}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget) onDateKeyDown(event, visibleDate);
        }}
      >
        <div className="calendar-months">
          {months.map((month) => (
            <CalendarMonthGrid
              key={month.date.getTime()}
              month={month}
              selectedDay={selectedDate.getFullYear() === month.date.getFullYear() && selectedDate.getMonth() === month.date.getMonth() ? selectedDate.getDate() : null}
              todayDay={today.getFullYear() === month.date.getFullYear() && today.getMonth() === month.date.getMonth() ? today.getDate() : null}
              holidays={holidays}
              locale={locale}
              formats={formats}
              shortMonthFormat={shortMonthFormat}
              selectedButtonRef={selectedButtonRef}
              onSelectDate={onSelectDate}
              onDateKeyDown={onDateKeyDown}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
