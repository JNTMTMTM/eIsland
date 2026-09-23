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
 * @file MaxExpandContentShell.tsx
 * @description MaxExpand 内容壳组件，承载导航、滚轮切换与通用加载态。
 * @author 鸡哥
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useIslandContentActive } from '../../hooks/islandContentActivity';
import useIslandStore from '../../../store/slices';
import type { MaxExpandTab } from '../../../store/types';
import {
  getStartupMode,
  getStartupModeReady,
  isStartupModeResolved,
  type NavDotId,
} from './config/shellConstants';
import { useNavLayout } from './hooks/useNavLayout';
import { useTabAnimation } from './hooks/useTabAnimation';
import { useContentReady } from './hooks/useContentReady';
import { shouldIgnoreWheelEvent } from './hooks/useWheelNavigation';
import { getDefaultNavLabel } from './utils/getNavLabel';
import { getAdjacentNavDotId } from './utils/tabNavigation';
import MaxExpandLoading from './maxExpandLoading';
import '../../../styles/settings/settings.css';

export interface MaxExpandContentShellProps {
  renderActiveTab: (activeTab: MaxExpandTab, loadingFallback: React.ReactElement, contentReady: boolean) => React.ReactElement | null;
  deferContent?: boolean;
  performanceModeEnabled?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

/**
 * 渲染 MaxExpand 通用壳层，负责导航与内容切换控制。
 */
export function MaxExpandContentShell({ renderActiveTab, deferContent = true, performanceModeEnabled = false }: MaxExpandContentShellProps): React.ReactElement {
  const { t } = useTranslation();
  const { setExpanded, maxExpandTab: activeTab, setMaxExpandTab: setActiveTab } = useIslandStore(useShallow((store) => ({
    setExpanded: store.setExpanded,
    maxExpandTab: store.maxExpandTab,
    setMaxExpandTab: store.setMaxExpandTab,
  })));
  const contentActive = useIslandContentActive();
  const contentRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');
  const [startupMode, setStartupMode] = useState<'integrated' | 'standalone'>(isStartupModeResolved() ? getStartupMode() : 'integrated');
  const { navLayoutConfig, navLayoutLoaded } = useNavLayout();
  const tabAnimation = useTabAnimation();
  const contentReady = useContentReady(deferContent);

  useEffect(() => {
    let cancelled = false;
    getStartupModeReady().then(() => {
      if (!cancelled) setStartupMode(getStartupMode());
    });
    return () => { cancelled = true; };
  }, []);

  const NAV_DOTS: NavDotId[] = useMemo(() => {
    const visibleTabs = navLayoutConfig
      .filter((item: { visible: boolean }) => item.visible)
      .map((item: { id: string }) => item.id as NavDotId);
    return startupMode === 'standalone'
      ? ['expanded' as NavDotId, ...visibleTabs]
      : ['expanded' as NavDotId, ...visibleTabs, 'settings' as NavDotId];
  }, [navLayoutConfig, startupMode]);
  const navDotsRef = useRef(NAV_DOTS);
  navDotsRef.current = NAV_DOTS;

  useEffect(() => {
    // 导航配置加载前不能判定目标页不可见，否则会覆盖入口指定的标签。
    if (!navLayoutLoaded || !contentActive) return;

    if (startupMode === 'standalone' && navLayoutLoaded && NAV_DOTS.length === 1) {
      setExpanded();
      return;
    }

    const isVisible = NAV_DOTS.includes(activeTab);
    if (!isVisible && NAV_DOTS.length > 1) {
      setActiveTab(NAV_DOTS[1] as MaxExpandTab);
    }
  }, [NAV_DOTS, activeTab, navLayoutLoaded, setActiveTab, setExpanded, startupMode, contentActive]);

  const filteredNavDots = useMemo(() => {
    const getNavLabel = (id: NavDotId): string => t(`maxExpand.nav.${id}`, {
      defaultValue: getDefaultNavLabel(id),
    });
    return NAV_DOTS.map((id) => ({ id, label: getNavLabel(id) }));
  }, [t, NAV_DOTS]);
  const filteredNavDotsRef = useRef(filteredNavDots);
  filteredNavDotsRef.current = filteredNavDots;

  const navigateTab = useCallback((id: NavDotId): void => {
    if (id === 'expanded') { setExpanded(); return; }
    const dots = navDotsRef.current;
    const curIdx = dots.indexOf(activeTabRef.current);
    const nextIdx = dots.indexOf(id as NavDotId);
    setSlideDir(nextIdx >= curIdx ? 'right' : 'left');
    setActiveTab(id);
  }, [setExpanded, setActiveTab]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || !contentActive) return;

    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      if (shouldIgnoreWheelEvent(target)) return;
      e.preventDefault();

      const dots = filteredNavDotsRef.current;
      const cur = activeTabRef.current;
      const currentIndex = dots.findIndex(d => d.id === cur);
      let nextId: NavDotId;
      if (e.deltaY > 0) {
        nextId = dots[(currentIndex + 1) % dots.length].id;
      } else {
        nextId = dots[(currentIndex - 1 + dots.length) % dots.length].id;
      }
      navigateTab(nextId);
    };

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab' || e.repeat || e.defaultPrevented) return;
      if (isEditableTarget(e.target)) return;

      const tabIds = filteredNavDotsRef.current
        .map((dot) => dot.id)
        .filter((id): id is MaxExpandTab => id !== 'expanded');
      const nextId = getAdjacentNavDotId(tabIds, activeTabRef.current, e.shiftKey ? -1 : 1);
      if (nextId === null) return;

      e.preventDefault();
      navigateTab(nextId);
    };

    window.addEventListener('keydown', handleKeyDown);
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigateTab, contentActive]);

  const handleNavClick = (id: NavDotId): void => {
    navigateTab(id);
  };

  const loadingFallback = (
    <MaxExpandLoading activeTab={activeTab} performanceModeEnabled={performanceModeEnabled} />
  );

  return (
    <div className="settings-content" ref={contentRef}>
      <div className="max-expand-tab-content" onClick={(e) => e.stopPropagation()}>
        <div className={`max-expand-tab-transition${tabAnimation ? ` max-expand-tab-slide-${slideDir}` : ''}`} key={activeTab}>
          {renderActiveTab(activeTab, loadingFallback, contentReady)}
        </div>
      </div>

      <div className="settings-nav-dots" onClick={(e) => e.stopPropagation()} style={navLayoutLoaded ? undefined : { visibility: 'hidden' }}>
        {filteredNavDots.map(({ id, label }) => (
          <button
            key={id}
            className={`settings-nav-dot ${activeTab === id ? 'active' : ''}`}
            onClick={() => handleNavClick(id)}
            title={label}
            aria-label={t('maxExpand.nav.switchTo', { defaultValue: '切换到{{label}}', label })}
          />
        ))}
      </div>
    </div>
  );
}
