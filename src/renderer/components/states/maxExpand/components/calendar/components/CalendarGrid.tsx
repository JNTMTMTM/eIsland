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
 * @description 连续月历：月份以留白、分隔线和标题分组，使用原生滚动。
 * @author 鸡哥
 */

import { useId, useLayoutEffect, useMemo, type ReactElement } from 'react';
import { Lunar } from 'lunar-javascript';
import { getCalendarDayDifference } from '../utils/calendarUtils';
import { useCalendarScroll } from '../hooks/useCalendarScroll';
import type { CalendarGridProps } from '../types/calendarTypes';

/**
 * 日历月视图网格
 * @description 月份之间保留清晰间隔，滚动浏览与日期选择独立。
 * @param props - 组件入参
 * @returns 月视图 JSX
 */
export function CalendarGrid({
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
  const { scrollRef, onScroll, months, visibleDate, weekHeight, headerHeight, monthGap, paddingTop, paddingBottom } = useCalendarScroll(selectedDate);
  // 像素级滚动不重复计算农历，只在可见周或语言变化时更新。
  const lunarDays = useMemo(() => new Map(months.flatMap((month) => month.weeks.flat().filter((date) => date.getMonth() === month.date.getMonth())).map((date) => [
    date.getTime(),
    locale.startsWith('zh')
      ? Lunar.fromDate(date).getDayInChinese()
      : formats.lunarDay.formatToParts(date).find((part) => part.type === 'day')?.value,
  ])), [months, locale, formats]);

  // 等待虚拟周行挂载后聚焦，避免键盘跨越可视区时丢失焦点。
  useLayoutEffect(() => {
    if (focusDateRef.current && selectedButtonRef.current) {
      selectedButtonRef.current.focus({ preventScroll: true });
      focusDateRef.current = false;
    }
  });

  return (
    <section className="flex h-80 min-h-0 min-w-0 flex-col @[560px]:h-full" aria-labelledby={monthId}>
      <h2 className="sr-only" id={monthId} aria-live="polite">
        {formats.month.format(visibleDate)}
      </h2>
      <div className="grid shrink-0 grid-cols-7 pb-1 text-center" aria-hidden="true">
        {months[0].weeks[0].map((date) => (
          <span className="text-[10px] font-medium text-[rgba(var(--color-text-rgb),.4)]" key={date.getDay()}>
            {formats.weekday.format(date)}
          </span>
        ))}
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [overflow-anchor:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-[rgba(var(--color-accent-rgb,59,130,246),.5)]"
        ref={scrollRef}
        role="region"
        aria-labelledby={monthId}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget) onDateKeyDown(event, visibleDate);
        }}
      >
        <div style={{ paddingTop, paddingBottom }}>
          {months.map((month) => (
            <div key={month.date.getTime()} style={{ height: month.height }}>
              <div style={{ height: monthGap }} aria-hidden="true" />
              <h3 className="m-0 flex items-center border-t border-[rgba(var(--color-text-rgb),.16)] px-1 text-sm font-semibold tabular-nums" style={{ height: headerHeight }}>
                {formats.month.format(month.date)}
              </h3>
              {month.weeks.map((week) => (
                <div className="grid grid-cols-7" key={week[0].getTime()} style={{ height: weekHeight }}>
                  {week.map((date) => {
                    if (date.getMonth() !== month.date.getMonth()) return <div key={date.getTime()} aria-hidden="true" />;
                    const selected = getCalendarDayDifference(date, selectedDate) === 0;
                    const isToday = getCalendarDayDifference(date, today) === 0;
                    const weekend = date.getDay() === 0 || date.getDay() === 6;
                    let colors = 'text-[rgba(var(--color-text-rgb),.85)] hover:bg-[rgba(var(--color-text-rgb),.07)]';
                    if (weekend) colors = 'text-[rgba(var(--color-text-rgb),.5)] hover:bg-[rgba(var(--color-text-rgb),.07)]';
                    if (selected) colors = 'bg-[rgba(var(--color-accent-rgb,59,130,246),.24)] text-[rgba(var(--color-text-rgb),.9)] hover:bg-[rgba(var(--color-accent-rgb,59,130,246),.32)]';
                    const lunarDay = lunarDays.get(date.getTime());
                    return (
                      <div className="min-w-0 px-0.5 py-0.5" key={date.getTime()}>
                        <button
                          className={`relative flex h-full w-full flex-col items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-current ${colors} ${isToday && !selected ? 'ring-1 ring-inset ring-[rgba(var(--color-text-rgb),.3)]' : ''}`}
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
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
