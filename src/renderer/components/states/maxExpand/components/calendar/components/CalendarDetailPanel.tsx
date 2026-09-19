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
 * @file CalendarDetailPanel.tsx
 * @description 分层展示选中日期、农历、待办与假日。
 * @author 鸡哥
 */

import type { CSSProperties, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { getLunarDate } from '../../../../../../utils/timeUtils';
import { CalendarHolidayDetails } from './CalendarHolidayDetails';
import { getCalendarDateKey } from '../utils/calendarHolidayUtils';
import type { CalendarDetailPanelProps } from '../types/calendarTypes';

/**
 * 选中日期详情面板
 * @description 展示选中日期的大号数字、完整日期、农历、待办和假日信息。
 * @param props - 组件入参
 * @returns 日期详情 JSX
 */
export function CalendarDetailPanel({
  events,
  holidayInfo,
  selectedDate,
  locale,
  formats,
  selectedDay,
  relativeLabel,
}: CalendarDetailPanelProps): ReactElement {
  const { t } = useTranslation();
  const selectedKey = getCalendarDateKey(selectedDate);
  const todos = events.filter((event) => event.kind === 'todo' && event.start <= selectedKey && event.end >= selectedKey);

  return (
    <aside
      className="calendar-details"
      aria-label={t('maxExpand.calendar.details')}
      aria-live="polite"
      aria-atomic="true"
    >
      <header className="calendar-details-header">
        <div className="calendar-details-heading">
          <span>{t('maxExpand.calendar.selectedDate')}</span>
          <span className="calendar-relative-date">{relativeLabel}</span>
        </div>
        <div className="calendar-date-summary">
          <div className="calendar-selected-day">
            {String(selectedDay).padStart(2, '0')}
          </div>
          <div className="calendar-full-date">
            {formats.full.format(selectedDate)}
          </div>
        </div>
        {!locale.startsWith('en') && (
          <div className="calendar-lunar-details">
            <div className="calendar-lunar-label">
              {t('maxExpand.calendar.lunarDate')}
            </div>
            <div className="calendar-lunar-value">
              {locale.startsWith('zh') ? getLunarDate(selectedDate) : formats.lunar.format(selectedDate)}
            </div>
          </div>
        )}
      </header>
      <div className="calendar-details-content">
        {todos.length > 0 && (
          <section className="calendar-todo-details" aria-label={t('maxExpand.calendar.scheduledTodos')}>
            <h3 className="calendar-todo-heading">
              {t('maxExpand.calendar.scheduledTodos')}
              <span className="calendar-todo-count">{todos.length}</span>
            </h3>
            <ul className="calendar-todo-list">
              {todos.map((event) => (
                <li className="calendar-todo-item" key={event.id} data-done={event.done || undefined} style={{ '--calendar-event-color': event.color } as CSSProperties}>
                  <span>{event.label}{event.done ? ` · ${t('maxExpand.calendar.eventCompleted')}` : ''}</span>
                  <span className="calendar-todo-period">{event.start} → {event.end}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <CalendarHolidayDetails selectedDate={selectedDate} locale={locale} info={holidayInfo} />
      </div>
    </aside>
  );
}
