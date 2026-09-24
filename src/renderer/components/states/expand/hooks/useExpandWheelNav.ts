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
 * @file useExpandWheelNav.ts
 * @description 展开面板滚轮切换 Tab 导航 Hook
 * @author 鸡哥
 */

import { type RefObject, useEffect, useRef } from 'react';
import { useIslandContentActive } from '../../../hooks/islandContentActivity';
import type { ExpandTab } from '../../../../store/types';
import type { NavDotId } from '../config/types';

interface UseExpandWheelNavOptions {
  contentRef: RefObject<HTMLDivElement | null>;
  expandTabRef: RefObject<ExpandTab>;
  navDotsRef: RefObject<NavDotId[]>;
  setExpandTab: (tab: ExpandTab) => void;
  setHover: () => void;
  handleSetMaxExpand: () => void;
  setSlideDir: (dir: 'left' | 'right') => void;
}

/**
 * 处理展开面板的滚轮切换 Tab 逻辑
 */
export function useExpandWheelNav({
  contentRef,
  expandTabRef,
  navDotsRef,
  setExpandTab,
  setHover,
  handleSetMaxExpand,
  setSlideDir,
}: UseExpandWheelNavOptions): void {
  const active = useIslandContentActive();
  const handleSetMaxExpandRef = useRef(handleSetMaxExpand);
  handleSetMaxExpandRef.current = handleSetMaxExpand;

  useEffect(() => {
    if (!active) return;
    const el = contentRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      if (target.closest('.ov-dash-todo-list')) return;
      if (target.closest('.ov-dash-apps')) return;
      if (target.closest('.ov-dash-url-favorites-list')) return;
      if (target.closest('.ov-dash-break-reminder-list')) return;
      if (target.closest('.tools-app-list-body')) return;
      if (target.closest('.translation-editor-textarea')) return;
      e.preventDefault();
      const cur = expandTabRef.current;
      const dots = navDotsRef.current;
      const currentIndex = dots.findIndex((d) => d === cur);
      if (currentIndex < 0) return;
      let nextId: NavDotId;
      if (e.deltaY > 0) {
        nextId = dots[(currentIndex + 1) % dots.length];
      } else {
        nextId = dots[(currentIndex - 1 + dots.length) % dots.length];
      }
      if (nextId === 'hover') { setHover(); return; }
      if (nextId === 'maxExpand') { handleSetMaxExpandRef.current(); return; }
      const curIdx = dots.indexOf(expandTabRef.current);
      const nextIdx = dots.indexOf(nextId);
      setSlideDir(nextIdx >= curIdx ? 'right' : 'left');
      setExpandTab(nextId);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [active, contentRef, expandTabRef, navDotsRef, setExpandTab, setHover, setSlideDir]);
}
