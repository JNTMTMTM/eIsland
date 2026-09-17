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
 * @description 日历月视图网格：月份导航栏与周一为起始的六周日期表格。
 * @author 鸡哥
 */

import { useId, type ReactElement } from 'react';
import { Lunar } from 'lunar-javascript';
import { getCalendarDayDifference } from '../utils/calendarUtils';
import type { CalendarGridProps } from '../types/calendarTypes';

/**
 * 日历月视图网格
 * @description 包含可滚动切月的六周日期表格，支持键盘导航与农历显示。
 * @param props - 组件入参
 * @returns 月视图 JSX
 */
export function CalendarGrid({
  weeks,
  selectedDate,
  today,
  month,
  locale,
  formats,
  selectedButtonRef,
  onMonthWheel,
  onSelectDate,
  onDateKeyDown,
}: CalendarGridProps): ReactElement {
  const monthId = useId();

  return (
    <section className="flex min-w-0 flex-col" aria-labelledby={monthId} onWheel={onMonthWheel}>
      <div className="flex items-center justify-between gap-3 pb-2">
        <h2 className="m-0 text-sm font-semibold tabular-nums" id={monthId} aria-live="polite">
          {formats.month.format(selectedDate)}
        </h2>
      </div>
      <table className="w-full flex-1 table-fixed border-separate border-spacing-1 text-center" aria-labelledby={monthId}>
        <thead>
          <tr>
            {weeks[0].map((date) => (
              <th className="h-5 text-[10px] font-medium text-[rgba(var(--color-text-rgb),.4)]" key={date.getDay()} scope="col">
                {formats.weekday.format(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].getTime()}>
              {week.map((date) => {
                const selected = getCalendarDayDifference(date, selectedDate) === 0;
                const isToday = getCalendarDayDifference(date, today) === 0;
                const outside = date.getMonth() !== month;
                const weekend = date.getDay() === 0 || date.getDay() === 6;
                let colors = 'text-[rgba(var(--color-text-rgb),.85)] hover:bg-[rgba(var(--color-text-rgb),.07)]';
                if (weekend) colors = 'text-[rgba(var(--color-text-rgb),.5)] hover:bg-[rgba(var(--color-text-rgb),.07)]';
                if (outside) colors = 'text-[rgba(var(--color-text-rgb),.25)] hover:bg-[rgba(var(--color-text-rgb),.04)]';
                if (selected) colors = 'bg-[rgba(var(--color-accent-rgb,59,130,246),.24)] text-[rgba(var(--color-text-rgb),.9)] hover:bg-[rgba(var(--color-accent-rgb,59,130,246),.32)]';
                const lunarDay = locale.startsWith('zh')
                  ? Lunar.fromDate(date).getDayInChinese()
                  : formats.lunarDay.formatToParts(date).find((part) => part.type === 'day')?.value;
                return (
                  <td className="p-0" key={date.getTime()}>
                    <button
                      className={`relative flex h-full min-h-8 w-full flex-col items-center justify-center rounded-lg py-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${colors} ${isToday && !selected ? 'ring-1 ring-inset ring-[rgba(var(--color-text-rgb),.3)]' : ''}`}
                      ref={selected ? selectedButtonRef : undefined}
                      type="button"
                      title={formats.lunar.format(date)}
                      aria-label={formats.full.format(date)}
                      aria-pressed={selected}
                      aria-current={isToday ? 'date' : undefined}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => onSelectDate(date)}
                      onKeyDown={(event) => onDateKeyDown(event, date)}
                    >
                      <span className="text-[13px] leading-4 font-medium tabular-nums">{date.getDate()}</span>
                      <span className="text-[9px] leading-3 opacity-60" aria-hidden="true">{lunarDay}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
