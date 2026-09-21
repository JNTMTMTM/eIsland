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
 * @description 最大展开日历面板 — 仅负责 hook 调用与组件组合。
 * @author 鸡哥
 */

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { useCalendar } from '../hooks/useCalendar';
import { useCalendarHolidays } from '../hooks/useCalendarHolidays';
import { useCalendarTodos } from '../hooks/useCalendarTodos';
import { useCountdownItems } from '../../countdown/hooks/useCountdownItems';
import { getCalendarTimelineEvents } from '../utils/calendarTimelineUtils';
import { getCalendarDateKey } from '../utils/calendarHolidayUtils';
import { CalendarGrid } from './CalendarGrid';
import { CalendarYearOverview } from './CalendarYearOverview';
import { CalendarDetailPanel } from './CalendarDetailPanel';
import '../styles/calendar.css';

/**
 * 最大展开日历面板
 * @description 月视图与选中日期详情，支持鼠标和键盘浏览。
 * @returns 随应用主题和语言更新的日历面板。
 */
export function CalendarTab(): ReactElement {
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [overviewYear, setOverviewYear] = useState<number | null>(null);
  const [viewPhase, setViewPhase] = useState<'idle' | 'exit' | 'prepare' | 'enter'>('idle');
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%');
  const zoomDate = useRef(new Date());
  const pendingOverviewYear = useRef<number | null>(null);
  const viewStageRef = useRef<HTMLDivElement>(null);
  const restoreViewFocus = useRef(false);
  const detailsId = useId();
  const {
    today,
    selectedDate,
    selectedButtonRef,
    focusDateRef,
    locale,
    formats,
    selectedDay,
    relativeLabel,
    selectDate,
    handleDateKeyDown,
  } = useCalendar();
  const holidayInfo = useCalendarHolidays(selectedDate.getFullYear());
  const todos = useCalendarTodos();
  const { items: countdowns } = useCountdownItems();
  const events = useMemo(() => getCalendarTimelineEvents(holidayInfo.holidays, todos, countdowns, today), [holidayInfo.holidays, todos, countdowns, today]);
  const CalendarView = overviewYear === null ? CalendarGrid : CalendarYearOverview;
  const updateZoomOrigin = useCallback((date: Date) => {
    const stage = viewStageRef.current;
    if (!stage) return;
    const month = stage.querySelector<HTMLElement>(`[data-month="${getCalendarDateKey(date).slice(0, 7)}"]`);
    const bounds = stage.getBoundingClientRect();
    const target = month?.getBoundingClientRect();
    if (!target || !bounds.width || !bounds.height || target.bottom <= bounds.top || target.top >= bounds.bottom) {
      setZoomOrigin('50% 50%');
      return;
    }
    const x = (Math.max(bounds.left, target.left) + Math.min(bounds.right, target.right)) / 2;
    const y = (Math.max(bounds.top, target.top) + Math.min(bounds.bottom, target.bottom)) / 2;
    setZoomOrigin(`${(x - bounds.left) / bounds.width * 100}% ${(y - bounds.top) / bounds.height * 100}%`);
  }, []);
  useLayoutEffect(() => {
    if (viewPhase === 'prepare') updateZoomOrigin(zoomDate.current);
  }, [viewPhase, updateZoomOrigin]);
  useEffect(() => {
    if (viewPhase !== 'prepare') return;
    // 新视图先以正常尺寸完成虚拟日历定位，再开始缩放，避免缩放坐标干扰滚动测量。
    const frame = requestAnimationFrame(() => setViewPhase('enter'));
    return () => cancelAnimationFrame(frame);
  }, [viewPhase]);
  useEffect(() => {
    if (viewPhase !== 'idle' || !restoreViewFocus.current) return;
    restoreViewFocus.current = false;
    viewStageRef.current?.querySelector<HTMLButtonElement>('.calendar-view-toggle')?.focus({ preventScroll: true });
  }, [viewPhase]);

  return (
    <div
      className="max-expand-tab-panel calendar-panel"
      onKeyDown={(event) => { if (event.key === 'Tab') event.stopPropagation(); }}
    >
      <div className="calendar-layout" data-details-expanded={detailsExpanded}>
        <div
          className="calendar-view-stage"
          ref={viewStageRef}
          style={{ '--calendar-zoom-origin': zoomOrigin } as CSSProperties}
          data-phase={viewPhase}
          data-direction={(viewPhase === 'exit' ? pendingOverviewYear.current : overviewYear) === null ? 'month' : 'year'}
          inert={viewPhase !== 'idle'}
          onAnimationEnd={(event) => {
            if (event.target !== event.currentTarget.firstElementChild) return;
            if (viewPhase === 'exit') {
              setOverviewYear(pendingOverviewYear.current);
              setViewPhase('prepare');
            } else if (viewPhase === 'enter') setViewPhase('idle');
          }}
        >
          <CalendarView
            overviewYear={overviewYear ?? undefined}
            onToggleOverview={(date) => {
              if (viewPhase !== 'idle') return;
              zoomDate.current = overviewYear !== null && selectedDate.getFullYear() === date.getFullYear() ? selectedDate : date;
              updateZoomOrigin(zoomDate.current);
              pendingOverviewYear.current = overviewYear === null ? date.getFullYear() : null;
              restoreViewFocus.current = document.activeElement === viewStageRef.current?.querySelector('.calendar-view-toggle');
              setViewPhase('exit');
            }}
            detailsExpanded={detailsExpanded}
            detailsId={detailsId}
            onToggleDetails={() => setDetailsExpanded((expanded) => !expanded)}
            events={events}
            holidays={holidayInfo.holidays}
            onVisibleYearChange={holidayInfo.setVisibleYear}
            selectedDate={selectedDate}
            today={today}
            locale={locale}
            formats={formats}
            selectedButtonRef={selectedButtonRef}
            focusDateRef={focusDateRef}
            onSelectDate={selectDate}
            onDateKeyDown={handleDateKeyDown}
          />
        </div>
        <div className="calendar-details-shell" id={detailsId} inert={!detailsExpanded} aria-hidden={!detailsExpanded}>
          <div className="calendar-details-clip">
            <CalendarDetailPanel
              events={events}
              holidayInfo={holidayInfo}
              selectedDate={selectedDate}
              locale={locale}
              formats={formats}
              selectedDay={selectedDay}
              relativeLabel={relativeLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
