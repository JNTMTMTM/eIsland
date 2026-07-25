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
 * @file useHover.ts
 * @description Hover 状态交互逻辑 Hook
 * @author 鸡哥
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import type { HoverTab } from '../../../../store/types';
import { NAV_DOTS } from '../config/hoverConfig';
import type { HoverContentProps } from '../types';

/** Hover 状态交互逻辑 Hook */
export function useHover(props: HoverContentProps) {
  const { t } = useTranslation();
  const { hoverTab, setHoverTab, setExpanded } = useIslandStore();
  const contentRef = useRef<HTMLDivElement>(null);

  const getDotLabel = (tab: HoverTab): string => t(`hover.nav.${tab}`, {
    defaultValue: tab === 'time' ? '工具' : tab === 'lyrics' ? '歌曲' : tab === 'weather' ? '天气' : '展开',
  });

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      if (hoverTab === 'time' && target.closest('.timer-inputs')) return;
      e.preventDefault();
      const currentIndex = NAV_DOTS.findIndex(d => d === hoverTab);
      let nextTab: HoverTab;
      if (e.deltaY > 0) {
        nextTab = NAV_DOTS[(currentIndex + 1) % NAV_DOTS.length];
      } else {
        nextTab = NAV_DOTS[(currentIndex - 1 + NAV_DOTS.length) % NAV_DOTS.length];
      }
      if (nextTab === 'expand') {
        setExpanded();
        return;
      }
      setHoverTab(nextTab);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [hoverTab, setHoverTab]);

  return {
    ...props,
    t,
    hoverTab,
    setHoverTab,
    setExpanded,
    contentRef,
    getDotLabel,
  };
}
