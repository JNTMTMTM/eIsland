/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file useCalendarScroll.ts
 * @description 连续周历的原生滚动、可视区域渲染和双向日期范围扩展。
 * @author 鸡哥
 */

import { useLayoutEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { getCalendarDayDifference, getCalendarWeek, getCalendarWeeks } from '../utils/calendarUtils';

const WEEK_HEIGHT = 48;
const BUFFER_WEEKS = 52;
const OVERSCAN_WEEKS = 3;

/**
 * 以连续周行承载月份，原生滚动不改变选中日期。
 * @param selectedDate - 点击或键盘选中的日期。
 * @returns 滚动容器引用、事件、可见周和上下占位高度。
 */
export function useCalendarScroll(selectedDate: Date) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [anchor] = useState(() => getCalendarWeeks(selectedDate)[0][0]);
  const [viewport, setViewport] = useState({
    start: -BUFFER_WEEKS,
    end: BUFFER_WEEKS * 2,
    top: BUFFER_WEEKS * WEEK_HEIGHT,
    height: WEEK_HEIGHT * 6,
  });
  const pendingTopRef = useRef<number | null>(viewport.top);

  // 扩展上方日期时补偿等量高度，确保屏幕上的周行保持原位。
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

  // 仅选择发生变化时确保日期可见；浏览月份本身不会移动选择或详情。
  useLayoutEffect(() => {
    const index = Math.floor(getCalendarDayDifference(selectedDate, anchor) / 7);
    setViewport((current) => {
      const start = Math.min(current.start, index - BUFFER_WEEKS);
      const end = Math.max(current.end, index + BUFFER_WEEKS);
      const compensatedTop = current.top + (current.start - start) * WEEK_HEIGHT;
      const rowTop = (index - start) * WEEK_HEIGHT;
      let top = compensatedTop;
      if (rowTop < top) top = rowTop;
      if (rowTop + WEEK_HEIGHT > top + current.height) top = rowTop + WEEK_HEIGHT - current.height;
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
        start -= BUFFER_WEEKS;
        top += BUFFER_WEEKS * WEEK_HEIGHT;
        pendingTopRef.current = top;
      }
      if ((end - start) * WEEK_HEIGHT - top - current.height < current.height * 2) {
        end += BUFFER_WEEKS;
      }
      if (top === current.top && start === current.start && end === current.end) return current;
      return { ...current, start, end, top };
    });
  };

  const firstVisible = viewport.start + Math.floor(viewport.top / WEEK_HEIGHT);
  const first = Math.max(viewport.start, firstVisible - OVERSCAN_WEEKS);
  const last = Math.min(viewport.end, viewport.start + Math.ceil((viewport.top + viewport.height) / WEEK_HEIGHT) + OVERSCAN_WEEKS);
  const weeks = useMemo(() => Array.from({ length: last - first }, (_, index) =>
    getCalendarWeek(anchor, first + index)
  ), [anchor, first, last]);
  const visibleWeek = getCalendarWeek(anchor, firstVisible);

  return {
    scrollRef,
    onScroll,
    weeks,
    visibleDate: visibleWeek[3],
    weekHeight: WEEK_HEIGHT,
    paddingTop: (first - viewport.start) * WEEK_HEIGHT,
    paddingBottom: (viewport.end - last) * WEEK_HEIGHT,
  };
}
