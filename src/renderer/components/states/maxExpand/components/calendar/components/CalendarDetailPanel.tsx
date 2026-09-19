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
 * @description 选中日期的详情面板：大号日期、农历、月份进度条。
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
 * @description 展示选中日期的大号数字、完整日期、农历信息和月份进度。
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
  daysInMonth,
  monthProgress,
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
      <div className="calendar-details-heading">
        <span>{t('maxExpand.calendar.selectedDate')}</span>
        <span className="calendar-relative-date">{relativeLabel}</span>
      </div>
      <div>
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
      <CalendarHolidayDetails selectedDate={selectedDate} locale={locale} info={holidayInfo} />
      {todos.length > 0 && (
        <section aria-label={t('maxExpand.calendar.scheduledTodos')}>
          <h3 className="calendar-todo-heading">{t('maxExpand.calendar.scheduledTodos')}</h3>
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
      <div className="calendar-progress">
        <div className="calendar-progress-label">
          <span>{t('maxExpand.calendar.dayOfMonth', { day: selectedDay, total: daysInMonth })}</span>
          <span className="calendar-progress-percent">{monthProgress}%</span>
        </div>
        <div className="calendar-progress-track" style={{ '--calendar-progress': `${monthProgress}%` } as CSSProperties} aria-hidden="true">
          <div className="calendar-progress-fill" />
        </div>
      </div>
    </aside>
  );
}
