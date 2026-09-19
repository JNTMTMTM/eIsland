/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarTimelineTypes.ts
 * @description 日历假日和待办时间条、周内分段及轨道布局。
 * @author 鸡哥
 */

/** 包含首尾日期的日历事件。 */
export interface CalendarTimelineEvent {
  id: string;
  kind: 'holiday' | 'todo';
  label: string;
  start: string;
  end: string;
  color?: string;
  done?: boolean;
}

/** 事件在某一周、某一月份中的可见部分。 */
export interface CalendarTimelineSegment {
  event: CalendarTimelineEvent;
  column: number;
  span: number;
  lane: number;
  start: Date;
  continuesBefore: boolean;
  continuesAfter: boolean;
}
