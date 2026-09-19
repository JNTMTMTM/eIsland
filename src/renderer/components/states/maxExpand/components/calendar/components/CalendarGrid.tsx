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
import { Lunar } from 'lunar-javascript';
import { getCalendarDayDifference } from '../utils/calendarUtils';
import { getCalendarDateKey } from '../utils/calendarHolidayUtils';
import { useCalendarScroll } from '../hooks/useCalendarScroll';
import { CALENDAR_EVENT_BOTTOM_GAP, CALENDAR_EVENT_LANE_HEIGHT } from '../config/calendarConfig';
import { CalendarEventBars } from './CalendarEventBars';
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
  const showLunar = !locale.startsWith('en');
  const monthFormat = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'long' }), [locale]);
  const shortMonthFormat = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short' }), [locale]);
  const yearFormat = useMemo(() => new Intl.DateTimeFormat(locale, { year: 'numeric' }), [locale]);
  const { scrollRef, onScroll, months, visibleDate, weekHeight, headerHeight, monthGap, monthLabelHeight, paddingTop, paddingBottom } = useCalendarScroll(selectedDate, events);
  const visibleYear = visibleDate.getFullYear();
  useEffect(() => { onVisibleYearChange(visibleYear); }, [visibleYear, onVisibleYearChange]);
  // 像素级滚动不重复计算农历，只在可见周或语言变化时更新。
  const lunarDays = useMemo(() => new Map((showLunar ? months : []).flatMap((month) => month.weeks.flat().filter((date) => date.getMonth() === month.date.getMonth())).map((date) => [
    date.getTime(),
    locale.startsWith('zh')
      ? Lunar.fromDate(date).getDayInChinese()
      : formats.lunarDay.formatToParts(date).find((part) => part.type === 'day')?.value,
  ])), [months, locale, formats, showLunar]);

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
            <div
              className="calendar-month"
              key={month.date.getTime()}
              style={{ '--calendar-month-start-column': month.date.getDay() + 1 } as CSSProperties}
              role="group"
              aria-label={formats.month.format(month.date)}
            >
              <div className="calendar-month-gap" aria-hidden="true">
                <div className="calendar-month-label">{shortMonthFormat.format(month.date)}</div>
              </div>
              {month.weekLayouts.map(({ dates: week, height, segments, lanes }) => (
                <div className="calendar-week" key={week[0].getTime()} style={{ '--calendar-row-height': `${height}px` } as CSSProperties}>
                  <div className="calendar-week-days">
                    {week.map((date) => {
                      if (date.getMonth() !== month.date.getMonth()) return <div key={date.getTime()} aria-hidden="true" />;
                      const selected = getCalendarDayDifference(date, selectedDate) === 0;
                      const isToday = getCalendarDayDifference(date, today) === 0;
                      const weekend = date.getDay() === 0 || date.getDay() === 6;
                      const lunarDay = lunarDays.get(date.getTime());
                      const holidayNames = holidays.get(getCalendarDateKey(date));
                      const dateTitle = [showLunar ? formats.lunar.format(date) : '', ...(holidayNames ?? [])].filter(Boolean).join('\n');
                      return (
                        <div className="calendar-day-cell" key={date.getTime()}>
                          <button
                            className="calendar-day-button"
                            data-weekend={weekend}
                            ref={selected ? selectedButtonRef : undefined}
                            type="button"
                            title={dateTitle || undefined}
                            aria-label={[formats.full.format(date), ...(holidayNames ?? [])].join(', ')}
                            aria-pressed={selected}
                            aria-current={isToday ? 'date' : undefined}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => onSelectDate(date)}
                            onKeyDown={(event) => onDateKeyDown(event, date)}
                          >
                            <span className="calendar-day-number">{date.getDate()}</span>
                            {showLunar && <span className="calendar-day-lunar" aria-hidden="true">{lunarDay}</span>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <CalendarEventBars segments={segments} lanes={lanes} onSelectDate={onSelectDate} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
