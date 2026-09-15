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
 * @description 最大展开日历面板，提供月视图、键盘导航与农历日期详情。
 * @author 鸡哥
 */

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Lunar } from 'lunar-javascript';
import { getLunarDate } from '../../../../../../utils/timeUtils';
import { getCalendarDayDifference, getCalendarWeeks, shiftCalendarMonth } from '../utils/calendarUtils';

const NAV_BUTTON_CLASS = 'flex shrink-0 items-center justify-center size-7 rounded-full bg-[rgba(var(--color-text-rgb),.07)] transition-colors hover:bg-[rgba(var(--color-text-rgb),.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current';

/**
 * 最大展开日历：月视图与选中日期详情，支持鼠标和键盘浏览。
 * @returns 随应用主题和语言更新的日历面板。
 */
export function CalendarTab(): ReactElement {
  const { t, i18n } = useTranslation();
  const monthId = useId();
  const [today, setToday] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const selectedButtonRef = useRef<HTMLButtonElement>(null);
  const focusDateRef = useRef(false);
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const weeks = useMemo(() => getCalendarWeeks(new Date(year, month, 1)), [year, month]);
  const formats = useMemo(() => ({
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

  useEffect(() => {
    // 午夜与休眠恢复时刷新今日标记，不打断用户正在浏览的日期。
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

  useEffect(() => {
    if (focusDateRef.current) {
      selectedButtonRef.current?.focus();
      focusDateRef.current = false;
    }
  }, [selectedDate]);

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

  return (
    <div className="max-expand-tab-panel calendar-panel @container flex size-full min-h-0 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[rgba(var(--color-text-rgb),.88)]" onKeyDown={(event) => { if (event.key === 'Tab') event.stopPropagation(); }}>
      <div className="grid flex-1 grid-cols-1 gap-4 px-4 pb-2 @[560px]:grid-cols-[minmax(0,1.8fr)_minmax(190px,1fr)]">
        <section className="flex min-w-0 flex-col" aria-labelledby={monthId}>
          <div className="flex items-center justify-between gap-3 pb-2">
            <h2 className="m-0 text-sm font-semibold tabular-nums" id={monthId} aria-live="polite">{formats.month.format(selectedDate)}</h2>
            <div className="flex gap-1.5">
              <button className={NAV_BUTTON_CLASS} type="button" title={t('maxExpand.calendar.previousMonth')} aria-label={t('maxExpand.calendar.previousMonth')} onClick={() => setSelectedDate((date) => shiftCalendarMonth(date, -1))}>
                <span className="text-xl leading-none" aria-hidden="true">‹</span>
              </button>
              <button className={NAV_BUTTON_CLASS} type="button" title={t('maxExpand.calendar.nextMonth')} aria-label={t('maxExpand.calendar.nextMonth')} onClick={() => setSelectedDate((date) => shiftCalendarMonth(date, 1))}>
                <span className="text-xl leading-none" aria-hidden="true">›</span>
              </button>
            </div>
          </div>
          <table className="w-full flex-1 table-fixed border-separate border-spacing-1 text-center" aria-labelledby={monthId}>
            <thead>
              <tr>
                {weeks[0].map((date) => (
                  <th className="h-5 text-[10px] font-medium text-[rgba(var(--color-text-rgb),.4)]" key={date.getDay()} scope="col">{formats.weekday.format(date)}</th>
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
                          onClick={() => setSelectedDate(date)}
                          onKeyDown={(event) => handleDateKeyDown(event, date)}
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

        <aside className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[rgba(var(--color-text-rgb),.06)] bg-[rgba(var(--color-text-rgb),.035)] p-4" aria-label={t('maxExpand.calendar.details')} aria-live="polite" aria-atomic="true">
          <div className="flex items-center justify-between gap-2 text-[11px] text-[rgba(var(--color-text-rgb),.5)]">
            <span>{t('maxExpand.calendar.selectedDate')}</span>
            <span className="rounded-full bg-[rgba(var(--color-text-rgb),.07)] px-2 py-1">{relativeLabel}</span>
          </div>
          <div>
            <div className="text-[64px] leading-none font-light tracking-[-.06em] tabular-nums">{String(selectedDay).padStart(2, '0')}</div>
            <div className="mt-2 text-xs text-[rgba(var(--color-text-rgb),.6)]">{formats.full.format(selectedDate)}</div>
          </div>
          <div className="border-t border-[rgba(var(--color-text-rgb),.08)] pt-3">
            <div className="mb-1.5 text-[10px] text-[rgba(var(--color-text-rgb),.4)]">{t('maxExpand.calendar.lunarDate')}</div>
            <div className="text-xs leading-relaxed">{locale.startsWith('zh') ? getLunarDate(selectedDate) : formats.lunar.format(selectedDate)}</div>
          </div>
          <div className="mt-auto pt-1">
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-[rgba(var(--color-text-rgb),.5)]">
              <span>{t('maxExpand.calendar.dayOfMonth', { day: selectedDay, total: daysInMonth })}</span>
              <span className="tabular-nums">{monthProgress}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[rgba(var(--color-text-rgb),.07)]" aria-hidden="true">
              <div className="h-full rounded-full bg-[rgba(var(--color-text-rgb),.45)]" style={{ width: `${monthProgress}%` }} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
