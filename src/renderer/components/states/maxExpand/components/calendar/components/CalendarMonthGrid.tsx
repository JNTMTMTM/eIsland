/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file CalendarMonthGrid.tsx
 * @description 按月份缓存日期文案和网格，避免滚动与日期选择重复格式化农历。
 * @author 鸡哥
 */

import { memo, useMemo, type CSSProperties, type ReactElement } from 'react';
import { Lunar } from 'lunar-javascript';
import { getCalendarDateKey } from '../utils/calendarHolidayUtils';
import type { CalendarMonthGridProps } from '../types/calendarTypes';
import { CalendarEventBars } from './CalendarEventBars';

const MemoizedCalendarEventBars = memo(CalendarEventBars);

/**
 * 渲染并复用一个月份，保留日期焦点和假日、待办时间条。
 * @param props - 月份布局、本地化格式、日期状态和交互回调。
 * @returns 月份网格。
 */
export const CalendarMonthGrid = memo(function CalendarMonthGrid({
  month,
  selectedDay,
  todayDay,
  holidays,
  locale,
  formats,
  shortMonthFormat,
  selectedButtonRef,
  onSelectDate,
  onDateKeyDown,
}: CalendarMonthGridProps): ReactElement {
  const year = month.date.getFullYear();
  const monthIndex = month.date.getMonth();
  const showLunar = !locale.startsWith('en');
  // 缓存仅跟随月份与语言变化，异步事件更新和选中日期变化不触发农历计算。
  const days = useMemo(() => Array.from({ length: new Date(year, monthIndex + 1, 0).getDate() }, (_, index) => {
    const date = new Date(year, monthIndex, index + 1, 12);
    return {
      key: getCalendarDateKey(date),
      full: formats.full.format(date),
      lunar: showLunar ? formats.lunar.format(date) : '',
      lunarDay: !showLunar ? undefined : locale.startsWith('zh')
        ? Lunar.fromDate(date).getDayInChinese()
        : formats.lunarDay.formatToParts(date).find((part) => part.type === 'day')?.value,
    };
  }), [year, monthIndex, locale, formats, showLunar]);

  return (
    <div
      className="calendar-month"
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
              if (date.getMonth() !== monthIndex) return <div key={date.getTime()} aria-hidden="true" />;
              const day = date.getDate();
              const selected = day === selectedDay;
              const metadata = days[day - 1];
              const holidayNames = holidays.get(metadata.key);
              const dateTitle = [metadata.lunar, ...(holidayNames ?? [])].filter(Boolean).join('\n');
              return (
                <div className="calendar-day-cell" key={date.getTime()}>
                  <button
                    className="calendar-day-button"
                    data-weekend={date.getDay() === 0 || date.getDay() === 6}
                    ref={selected ? selectedButtonRef : undefined}
                    type="button"
                    title={dateTitle || undefined}
                    aria-label={[metadata.full, ...(holidayNames ?? [])].join(', ')}
                    aria-pressed={selected}
                    aria-current={day === todayDay ? 'date' : undefined}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => onSelectDate(date)}
                    onKeyDown={(event) => onDateKeyDown(event, date)}
                  >
                    <span className="calendar-day-number">{day}</span>
                    {showLunar && <span className="calendar-day-lunar" aria-hidden="true">{metadata.lunarDay}</span>}
                  </button>
                </div>
              );
            })}
          </div>
          <MemoizedCalendarEventBars segments={segments} lanes={lanes} onSelectDate={onSelectDate} />
        </div>
      ))}
    </div>
  );
});
