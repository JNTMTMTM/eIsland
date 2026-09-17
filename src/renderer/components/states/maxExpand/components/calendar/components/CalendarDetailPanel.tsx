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

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { getLunarDate } from '../../../../../../utils/timeUtils';
import type { CalendarDetailPanelProps } from '../types/calendarTypes';

/**
 * 选中日期详情面板
 * @description 展示选中日期的大号数字、完整日期、农历信息和月份进度。
 * @param props - 组件入参
 * @returns 日期详情 JSX
 */
export function CalendarDetailPanel({
  selectedDate,
  locale,
  formats,
  selectedDay,
  daysInMonth,
  monthProgress,
  relativeLabel,
}: CalendarDetailPanelProps): ReactElement {
  const { t } = useTranslation();

  return (
    <aside
      className="flex min-w-0 flex-col gap-4 border-t border-[rgba(var(--color-text-rgb),.12)] px-3 py-4 @[560px]:border-t-0 @[560px]:border-l @[560px]:pl-6"
      aria-label={t('maxExpand.calendar.details')}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center justify-between gap-2 text-[11px] text-[rgba(var(--color-text-rgb),.5)]">
        <span>{t('maxExpand.calendar.selectedDate')}</span>
        <span className="rounded-full bg-[rgba(var(--color-accent-rgb,59,130,246),.12)] px-2.5 py-1 text-[rgb(var(--color-accent-rgb,59,130,246))]">{relativeLabel}</span>
      </div>
      <div>
        <div className="text-[72px] leading-none font-semibold tracking-[-.06em] text-[rgba(var(--color-text-rgb),.95)] tabular-nums">
          {String(selectedDay).padStart(2, '0')}
        </div>
        <div className="mt-2 text-xs text-[rgba(var(--color-text-rgb),.6)]">
          {formats.full.format(selectedDate)}
        </div>
      </div>
      <div className="border-t border-[rgba(var(--color-text-rgb),.08)] pt-3">
        <div className="mb-1.5 text-[10px] text-[rgba(var(--color-text-rgb),.4)]">
          {t('maxExpand.calendar.lunarDate')}
        </div>
        <div className="text-xs leading-relaxed">
          {locale.startsWith('zh') ? getLunarDate(selectedDate) : formats.lunar.format(selectedDate)}
        </div>
      </div>
      <div className="mt-auto pt-1">
        <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-[rgba(var(--color-text-rgb),.5)]">
          <span>{t('maxExpand.calendar.dayOfMonth', { day: selectedDay, total: daysInMonth })}</span>
          <span className="tabular-nums">{monthProgress}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[rgba(var(--color-text-rgb),.07)]" aria-hidden="true">
          <div className="h-full rounded-full bg-[rgb(var(--color-accent-rgb,59,130,246))]" style={{ width: `${monthProgress}%` }} />
        </div>
      </div>
    </aside>
  );
}
