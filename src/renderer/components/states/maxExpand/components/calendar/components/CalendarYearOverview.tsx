/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file CalendarYearOverview.tsx
 * @description 三列十二月全年概览，连续浏览年份并联动所选日期详情。
 * @author 鸡哥
 */

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { CALENDAR_MONTH_HEADER_HEIGHT } from '../config/calendarConfig';
import type { CalendarGridProps } from '../types/calendarTypes';
import { getCalendarDateKey } from '../utils/calendarHolidayUtils';
import { getCalendarYearMonths } from '../utils/calendarYearUtils';
import { CalendarViewActions } from './CalendarViewActions';

/**
 * 渲染全年概览，保留键盘日期导航、今日定位和详情展开状态。
 * @param props - 日历共享数据与交互回调
 * @returns 可连续滚动的全年概览
 */
export function CalendarYearOverview(props: CalendarGridProps): ReactElement {
  const { t } = useTranslation();
  const headingId = useId();
  const initialYear = props.overviewYear ?? props.selectedDate.getFullYear();
  const [range, setRange] = useState(() => ({ start: initialYear - 1, end: initialYear + 1 }));
  const [visibleYear, setVisibleYear] = useState(initialYear);
  const scrollRef = useRef<HTMLDivElement>(null);
  const yearRefs = useRef(new Map<number, HTMLElement>());
  const pendingScroll = useRef<{ year: number; offset: number } | null>({ year: initialYear, offset: 0 });
  const previousSelection = useRef(props.selectedDate);
  const pendingSelection = useRef(false);
  const shortMonthFormat = useMemo(() => new Intl.DateTimeFormat(props.locale, { month: 'short' }), [props.locale]);
  const yearFormat = useMemo(() => new Intl.DateTimeFormat(props.locale, { year: 'numeric' }), [props.locale]);
  const years = useMemo(() => Array.from({ length: range.end - range.start + 1 }, (_, index) => {
    const year = range.start + index;
    return { year, months: getCalendarYearMonths(year, props.events) };
  }), [range, props.events]);
  const selectedKey = getCalendarDateKey(props.selectedDate);
  const todayKey = getCalendarDateKey(props.today);

  useEffect(() => { props.onVisibleYearChange(visibleYear); }, [visibleYear, props.onVisibleYearChange]);

  useLayoutEffect(() => {
    if (previousSelection.current === props.selectedDate) return;
    previousSelection.current = props.selectedDate;
    const year = props.selectedDate.getFullYear();
    pendingSelection.current = true;
    if (year < range.start || year > range.end) setRange({ start: year - 1, end: year + 1 });
  }, [props.selectedDate, range]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const pending = pendingScroll.current;
    const anchor = pending && yearRefs.current.get(pending.year);
    if (pending && anchor) {
      element.scrollTop += anchor.getBoundingClientRect().top - element.getBoundingClientRect().top - pending.offset;
      pendingScroll.current = null;
    }
    const button = props.selectedButtonRef.current;
    if (pendingSelection.current && button) {
      const bounds = element.getBoundingClientRect();
      const target = button.getBoundingClientRect();
      if (target.top < bounds.top) element.scrollTop += target.top - bounds.top;
      else if (target.bottom > bounds.bottom) element.scrollTop += target.bottom - bounds.bottom;
      pendingSelection.current = false;
      if (props.focusDateRef.current) {
        button.focus({ preventScroll: true });
        props.focusDateRef.current = false;
      }
    }
  }, [years, props.selectedDate, props.selectedButtonRef, props.focusDateRef]);

  return (
    <section className="calendar-grid calendar-year-overview" style={{ '--calendar-header-height': `${CALENDAR_MONTH_HEADER_HEIGHT}px` } as CSSProperties} aria-labelledby={headingId}>
      <h2 className="calendar-month-heading" id={headingId}>
        <span className="calendar-month-name">{t('maxExpand.calendar.yearOverview')}</span>
        <CalendarViewActions overview visibleDate={new Date(visibleYear, 0, 1)} detailsExpanded={props.detailsExpanded} detailsId={props.detailsId} onToggleDetails={props.onToggleDetails} onSelectDate={props.onSelectDate} onToggleOverview={props.onToggleOverview} />
      </h2>
      <div className="calendar-scroll calendar-overview-scroll" ref={scrollRef} role="region" aria-labelledby={headingId} tabIndex={0}
        onKeyDown={(event) => { if (event.target === event.currentTarget) props.onDateKeyDown(event, new Date(visibleYear, 0, 1, 12)); }}
        onScroll={(event) => {
          const element = event.currentTarget;
          const top = element.getBoundingClientRect().top;
          const current = years.find(({ year }) => (yearRefs.current.get(year)?.getBoundingClientRect().bottom ?? 0) > top + 1);
          if (current) setVisibleYear(current.year);
          if (pendingScroll.current) return;
          if (element.scrollTop < 80 && range.start > 1) {
            const first = yearRefs.current.get(range.start);
            if (first) pendingScroll.current = { year: range.start, offset: first.getBoundingClientRect().top - top };
            setRange((value) => ({ start: value.start - 1, end: value.end - value.start >= 4 ? value.end - 1 : value.end }));
          } else if (element.scrollHeight - element.scrollTop - element.clientHeight < 80 && range.end < 9999) {
            const anchorYear = current?.year ?? range.end;
            const anchor = yearRefs.current.get(anchorYear);
            if (anchor) pendingScroll.current = { year: anchorYear, offset: anchor.getBoundingClientRect().top - top };
            setRange((value) => ({ start: value.end - value.start >= 4 ? value.start + 1 : value.start, end: value.end + 1 }));
          }
        }}
      >
        {years.map(({ year, months }) => (
          <section className="calendar-overview-year" key={year} ref={(element) => { if (element) yearRefs.current.set(year, element); else yearRefs.current.delete(year); }} aria-label={yearFormat.format(new Date(year, 0, 1))}>
            <h3 className="calendar-overview-year-heading" data-current={year === props.today.getFullYear()}>{yearFormat.format(new Date(year, 0, 1))}</h3>
            <div className="calendar-overview-months">
              {months.map((month) => (
                <div className="calendar-overview-month" key={month.date.getMonth()} role="group" aria-label={props.formats.month.format(month.date)}>
                  <h4 className="calendar-overview-month-heading" data-current={year === props.today.getFullYear() && month.date.getMonth() === props.today.getMonth()}>{shortMonthFormat.format(month.date)}</h4>
                  <div className="calendar-overview-days">
                    {month.days.map((day, index) => (
                      <button className="calendar-overview-day" key={day.key} type="button" data-events={day.names.length > 0} data-weekend={day.date.getDay() === 0 || day.date.getDay() === 6}
                        style={{ gridColumnStart: index === 0 ? month.firstColumn : undefined, '--calendar-event-color': day.color } as CSSProperties}
                        ref={day.key === selectedKey ? props.selectedButtonRef : undefined} tabIndex={day.key === selectedKey ? 0 : -1}
                        aria-pressed={day.key === selectedKey} aria-current={day.key === todayKey ? 'date' : undefined}
                        aria-label={[props.formats.full.format(day.date), ...day.names].join(', ')} title={[props.formats.full.format(day.date), ...day.names].join(', ')}
                        onClick={() => props.onSelectDate(day.date)} onKeyDown={(event) => props.onDateKeyDown(event, day.date)}
                      >{day.date.getDate()}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
