/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file useCalendarScroll.ts
 * @description 分组月历的原生滚动、可视区域渲染和双向日期范围扩展。
 * @author 鸡哥
 */

import { useLayoutEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { CALENDAR_MONTH_GAP, CALENDAR_MONTH_HEADER_HEIGHT, CALENDAR_WEEK_HEIGHT, getCalendarMonthLayouts } from '../utils/calendarUtils';
import { attachCalendarScrollDamping } from '../utils/calendarScrollDamping';

const BUFFER_MONTHS = 12;

/**
 * 以有明确间隔的月份分组连续滚动，浏览位置与日期选择独立。
 * @param selectedDate - 点击或键盘选中的日期。
 * @returns 可见月份、滚动容器引用、事件和上下占位高度。
 */
export function useCalendarScroll(selectedDate: Date) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [anchor] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12));
  const [viewport, setViewport] = useState(() => {
    const months = getCalendarMonthLayouts(anchor, -BUFFER_MONTHS, BUFFER_MONTHS * 2);
    return {
      start: -BUFFER_MONTHS,
      end: BUFFER_MONTHS * 2,
      top: months[BUFFER_MONTHS].top + CALENDAR_MONTH_GAP,
      height: CALENDAR_WEEK_HEIGHT * 6,
    };
  });
  const pendingTopRef = useRef<number | null>(viewport.top);
  const layouts = useMemo(() => getCalendarMonthLayouts(anchor, viewport.start, viewport.end), [anchor, viewport.start, viewport.end]);
  const lastLayout = layouts[layouts.length - 1];
  const totalHeight = lastLayout.top + lastLayout.height;

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    return attachCalendarScrollDamping(element);
  }, []);

  // 按实际月份高度补偿上方新增内容，避免长短月份交界处跳动。
  useLayoutEffect(() => {
    if (scrollRef.current && pendingTopRef.current !== null) {
      scrollRef.current.scrollTop = pendingTopRef.current;
      pendingTopRef.current = null;
    }
  }, [viewport]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setViewport((current) => current.height === element.clientHeight
        ? current
        : { ...current, height: element.clientHeight });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const index = (selectedDate.getFullYear() - anchor.getFullYear()) * 12 + selectedDate.getMonth() - anchor.getMonth();
    setViewport((current) => {
      const start = Math.min(current.start, index - BUFFER_MONTHS);
      const end = Math.max(current.end, index + BUFFER_MONTHS + 1);
      const months = getCalendarMonthLayouts(anchor, start, end);
      const month = months[index - start];
      const compensatedTop = current.top + months[current.start - start].top;
      const week = Math.floor((month.date.getDay() + selectedDate.getDate() - 1) / 7);
      const rowTop = month.top + CALENDAR_MONTH_GAP + week * CALENDAR_WEEK_HEIGHT;
      let top = compensatedTop;
      if (rowTop < top) top = rowTop;
      if (rowTop + CALENDAR_WEEK_HEIGHT > top + current.height) top = rowTop + CALENDAR_WEEK_HEIGHT - current.height;
      if (start === current.start && end === current.end && top === current.top) return current;
      pendingTopRef.current = top;
      return { ...current, start, end, top };
    });
  }, [selectedDate, anchor]);

  const onScroll = (event: UIEvent<HTMLDivElement>): void => {
    const scrollTop = event.currentTarget.scrollTop;
    setViewport((current) => {
      let { start, end } = current;
      let top = Math.max(0, scrollTop);
      if (top < current.height * 2) {
        const preceding = getCalendarMonthLayouts(anchor, start - BUFFER_MONTHS, start);
        const last = preceding[preceding.length - 1];
        start -= BUFFER_MONTHS;
        top += last.top + last.height;
        pendingTopRef.current = top;
      }
      if (totalHeight - scrollTop - current.height < current.height * 2) end += BUFFER_MONTHS;
      if (top === current.top && start === current.start && end === current.end) return current;
      return { ...current, start, end, top };
    });
  };

  const visibleIndex = Math.max(0, layouts.findIndex((month) => month.top + month.height > viewport.top));
  const lastVisible = layouts.findIndex((month) => month.top >= viewport.top + viewport.height);
  const first = Math.max(0, visibleIndex - 1);
  const last = lastVisible < 0 ? layouts.length : Math.min(layouts.length, lastVisible + 1);
  const months = useMemo(() => layouts.slice(first, last), [layouts, first, last]);
  const lastMonth = months[months.length - 1];

  return {
    scrollRef,
    onScroll,
    months,
    visibleDate: layouts[visibleIndex].date,
    weekHeight: CALENDAR_WEEK_HEIGHT,
    headerHeight: CALENDAR_MONTH_HEADER_HEIGHT,
    monthGap: CALENDAR_MONTH_GAP,
    paddingTop: months[0].top,
    paddingBottom: totalHeight - lastMonth.top - lastMonth.height,
  };
}
