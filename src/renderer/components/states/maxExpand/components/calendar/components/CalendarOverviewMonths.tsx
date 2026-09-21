/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file CalendarOverviewMonths.tsx
 * @description 缓存全年日期元数据及小月历，日期选择仅重绘受影响的月份。
 * @author 鸡哥
 */

import { memo, useMemo, type CSSProperties, type ReactElement } from 'react';
import type { CalendarGridProps } from '../types/calendarTypes';
import { getCalendarYearMonths } from '../utils/calendarYearUtils';

type OverviewMonthsProps = Pick<CalendarGridProps, 'events' | 'formats' | 'selectedButtonRef' | 'onSelectDate' | 'onDateKeyDown' | 'onOpenMonth'> & {
  year: number;
  selectedKey: string | null;
  todayKey: string | null;
  shortMonthFormat: Intl.DateTimeFormat;
};

type OverviewMonthProps = Pick<OverviewMonthsProps, 'selectedButtonRef' | 'onSelectDate' | 'onDateKeyDown' | 'onOpenMonth'> & {
  month: ReturnType<typeof getCalendarYearMonths>[number];
  selectedKey: string | null;
  todayKey: string | null;
  formats: CalendarGridProps['formats'];
  shortMonthFormat: Intl.DateTimeFormat;
};

/**
 * 缓存月份日期文案，避免选择及浏览时反复调用 Intl 格式化器。
 * @param props - 当前月份数据、状态及稳定的导航回调
 * @returns 小月历
 */
const CalendarOverviewMonth = memo(function CalendarOverviewMonth(props: OverviewMonthProps): ReactElement {
  const { month, formats } = props;
  const days = useMemo(() => month.days.map((day) => ({
    ...day, label: [formats.full.format(day.date), ...day.names].join(', '),
  })), [month, formats]);
  return (
    <div className="calendar-overview-month" data-month={month.days[0].key.slice(0, 7)} role="group" aria-label={formats.month.format(month.date)}>
      <h4 className="calendar-overview-month-heading" data-current={props.todayKey !== null}>
        <button className="calendar-overview-month-link" type="button" aria-label={formats.month.format(month.date)} onClick={() => props.onOpenMonth(month.date)}>
          {props.shortMonthFormat.format(month.date)}
        </button>
      </h4>
      <div className="calendar-overview-days">
        {days.map((day, index) => (
          <button className="calendar-overview-day" key={day.key} type="button" data-events={day.names.length > 0} data-weekend={day.date.getDay() === 0 || day.date.getDay() === 6}
            style={{ gridColumnStart: index === 0 ? month.firstColumn : undefined, '--calendar-event-color': day.color } as CSSProperties}
            ref={day.key === props.selectedKey ? props.selectedButtonRef : undefined} tabIndex={day.key === props.selectedKey ? 0 : -1}
            aria-pressed={day.key === props.selectedKey} aria-current={day.key === props.todayKey ? 'date' : undefined}
            aria-label={day.label} title={day.label}
            onClick={() => props.onSelectDate(day.date)} onKeyDown={(event) => props.onDateKeyDown(event, day.date)}
            onDoubleClick={() => props.onOpenMonth(day.date)}
          >{day.date.getDate()}</button>
        ))}
      </div>
    </div>
  );
});

/**
 * 渲染一个可视年份，非选中月份收到稳定的空状态，避免整年重绘。
 * @param props - 年份、共享事件及日期状态
 * @returns 十二个按月缓存的小月历
 */
export const CalendarOverviewMonths = memo(function CalendarOverviewMonths(props: OverviewMonthsProps): ReactElement {
  const months = useMemo(() => getCalendarYearMonths(props.year, props.events), [props.year, props.events]);
  return (
    <div className="calendar-overview-months">
      {months.map((month) => {
        const prefix = month.days[0].key.slice(0, 7);
        return <CalendarOverviewMonth key={prefix} month={month}
          selectedKey={props.selectedKey?.startsWith(prefix) ? props.selectedKey : null}
          todayKey={props.todayKey?.startsWith(prefix) ? props.todayKey : null}
          formats={props.formats} shortMonthFormat={props.shortMonthFormat}
          selectedButtonRef={props.selectedButtonRef} onSelectDate={props.onSelectDate} onDateKeyDown={props.onDateKeyDown}
          onOpenMonth={props.onOpenMonth}
        />;
      })}
    </div>
  );
});
