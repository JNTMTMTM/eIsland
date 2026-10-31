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
 * @file useExpandedContent.ts
 * @description 展开面板的导航点序列、启动模式解析、最大展开入口、隐藏页校正与切换方向状态。
 * @author 鸡哥
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useIslandStore from '../../../../store/slices';
import { useIslandContentActive } from '../../../hooks/islandContentActivity';
import { getStartupMode, getStartupModeReady, isStartupModeResolved } from '../../maxExpand/config/shellConstants';
import { useAppMode } from '../../maxExpand/hooks/useAppMode';
import { FALLBACK_MAX_EXPAND_TAB } from '../config/expandConfig';
import { buildNavDots, getVisibleExpandTabs, resolveSlideDirection } from '../utils/expandUtils';
import { useExpandNavLayout } from './useExpandNavLayout';
import { useExpandTabAnimation } from './useExpandTabAnimation';
import { useExpandWheelNav } from './useExpandWheelNav';
import type { MaxExpandTab } from '../../../../store/types';
import type {
  ExpandSlideDirection,
  ExpandStartupMode,
  NavDotId,
  UseExpandedContentReturn,
} from '../types/expandTypes';

/**
 * 管理展开面板的导航与页面切换。
 * @returns 当前页、容器引用、切换动画状态、导航点与点击回调
 */
export function useExpandedContent(): UseExpandedContentReturn {
  const active = useIslandContentActive();
  const { expandTab, setExpandTab, setHover, setMaxExpand, maxExpandTab, setMaxExpandTab, showMaxExpandLauncher } = useIslandStore(useShallow((state) => ({
    expandTab: state.expandTab,
    setExpandTab: state.setExpandTab,
    setHover: state.setHover,
    setMaxExpand: state.setMaxExpand,
    maxExpandTab: state.maxExpandTab,
    setMaxExpandTab: state.setMaxExpandTab,
    showMaxExpandLauncher: state.showMaxExpandLauncher,
  })));
  const contentRef = useRef<HTMLDivElement>(null);
  const expandTabRef = useRef(expandTab);
  expandTabRef.current = expandTab;

  // 首次挂载只播放容器淡入，用户切换标签后才启用方向动画。
  const [slideDir, setSlideDir] = useState<ExpandSlideDirection>(null);
  const [startupMode, setStartupMode] = useState<ExpandStartupMode>(isStartupModeResolved() ? getStartupMode() : 'integrated');

  const { navLayoutConfig, maxExpandNavLayoutConfig, preloadEagerWhenPerformanceModeDisabled } = useExpandNavLayout();
  const tabAnimation = useExpandTabAnimation();
  const { appModeEnabled, appModeLoaded } = useAppMode();

  const firstVisibleMaxExpandTab = maxExpandNavLayoutConfig.find((item) => item.visible)?.id as MaxExpandTab | undefined;
  const hasAvailableMaxExpandTab = appModeLoaded && (
    appModeEnabled || startupMode !== 'standalone' || firstVisibleMaxExpandTab !== undefined
  );

  useEffect(() => {
    let cancelled = false;
    getStartupModeReady().then(() => {
      if (!cancelled) setStartupMode(getStartupMode());
    });
    return () => { cancelled = true; };
  }, []);

  const navDots: NavDotId[] = useMemo(
    () => buildNavDots(navLayoutConfig, hasAvailableMaxExpandTab),
    [hasAvailableMaxExpandTab, navLayoutConfig],
  );

  const navDotsRef = useRef(navDots);
  navDotsRef.current = navDots;

  const handleSetMaxExpand = useCallback((): void => {
    if (!active || !hasAvailableMaxExpandTab) return;
    if (appModeEnabled) {
      showMaxExpandLauncher();
      preloadEagerWhenPerformanceModeDisabled();
      setMaxExpand();
      return;
    }
    const targetMaxExpandTab = firstVisibleMaxExpandTab ?? FALLBACK_MAX_EXPAND_TAB;
    if (!targetMaxExpandTab) return;
    const activeTabVisible = maxExpandTab === 'settings'
      ? startupMode !== 'standalone'
      : maxExpandNavLayoutConfig.some((item) => item.id === maxExpandTab && item.visible);
    if (!activeTabVisible) {
      setMaxExpandTab(targetMaxExpandTab);
    }
    preloadEagerWhenPerformanceModeDisabled();
    setMaxExpand();
  }, [active, appModeEnabled, showMaxExpandLauncher, firstVisibleMaxExpandTab, hasAvailableMaxExpandTab, maxExpandNavLayoutConfig, maxExpandTab, preloadEagerWhenPerformanceModeDisabled, setMaxExpand, setMaxExpandTab, startupMode]);

  useEffect(() => {
    if (!active) return;
    const visibleExpandTabs = getVisibleExpandTabs(navDots);
    const isVisible = navDots.includes(expandTab);
    if (!isVisible && visibleExpandTabs.length > 0) {
      setExpandTab(visibleExpandTabs[0]);
    }
  }, [active, navDots, expandTab, setExpandTab]);

  useExpandWheelNav({
    contentRef,
    expandTabRef,
    navDotsRef,
    setExpandTab,
    setHover,
    handleSetMaxExpand,
    setSlideDir,
  });

  const handleNavDotClick = (tab: NavDotId): void => {
    if (!active) return;
    if (tab === 'hover') { setHover(); }
    else if (tab === 'maxExpand') { handleSetMaxExpand(); }
    else {
      setSlideDir(resolveSlideDirection(navDotsRef.current, expandTabRef.current, tab));
      setExpandTab(tab);
    }
  };

  return { expandTab, contentRef, slideDir, tabAnimation, navDots, handleNavDotClick };
}
