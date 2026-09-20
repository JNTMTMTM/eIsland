/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file CalendarEventBars.tsx
 * @description 按七列网格与独立轨道显示假日和待办周期。
 * @author 鸡哥
 */

import type { CSSProperties, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarTimelineSegment } from '../types/calendarTimelineTypes';

/**
 * 渲染周内事件条，点击后查看片段起始日期详情。
 * @param props - 轨道布局、日期格式及日期选择回调
 * @returns 事件区，无事件时为空
 */
export function CalendarEventBars({ segments, lanes, onSelectDate }: {
  segments: CalendarTimelineSegment[];
  lanes: number;
  onSelectDate: (date: Date) => void;
}): ReactElement | null {
  const { t } = useTranslation();
  if (!lanes) return null;
  return (
    <div className="calendar-week-events" style={{ '--calendar-event-lanes': lanes } as CSSProperties}>
      {segments.map(({ event, column, span, lane, start, continuesBefore, continuesAfter }) => {
        const label = t('maxExpand.calendar.eventPeriod', { name: event.label, start: event.start, end: event.end });
        const title = event.done ? `${label} · ${t('maxExpand.calendar.eventCompleted')}` : label;
        return (
          <button
            className="calendar-event-bar"
            key={event.id}
            data-kind={event.kind}
            data-done={event.done || undefined}
            data-continues-before={continuesBefore}
            data-continues-after={continuesAfter}
            style={{ '--calendar-event-column': column, '--calendar-event-span': span, '--calendar-event-lane': lane + 1, '--calendar-event-color': event.color } as CSSProperties}
            type="button"
            title={title}
            aria-label={title}
            onClick={() => onSelectDate(start)}
          >
            {event.kind === 'todo' && <span>{event.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
