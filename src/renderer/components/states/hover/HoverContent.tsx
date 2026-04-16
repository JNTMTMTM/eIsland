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
 * @file HoverContent.tsx
 * @description Hover 状态内容组件
 * @author 鸡哥
 */

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import type { HoverTab } from '../../../store/types';
import '../../../styles/hover/hover.css';
import { TimeTab } from './components/TimeTab';
import { LyricsTab } from './components/LrcTab';
import { WeatherTab } from './components/WeatherTab';

interface HoverContentProps {
  /** 完整时间字符串 (YY-MM-DD HH:MM:SS) */
  fullTimeStr: string;
  /** 农历日期字符串 */
  lunarStr: string;
}

/** 导航点配置 */
const NAV_DOTS: HoverTab[] = ['time', 'o3ics', 'weather', 'expand'];

/**
 * Hover 状态内容组件
 * @description 左侧有竖向导航点，点击可切换不同的 hover 界面
 */
export function HoverContent({
  fullTimeStr,
  lunarStr
}: HoverContentProps): React.ReactElement {
  const { t } = useTranslation();
  const { hoverTab, setHoverTab, setExpanded } = useIslandStore();
  const contentRef = useRef<HTMLDivElement>(null);

  const getDotLabel = (tab: HoverTab): string => t(`hover.nav.${tab}`, {
    defaultValue: tab === 'time' ? '工具' : tab === 'o3ics' ? '歌曲' : tab === 'weather' ? '天气' : '展开',
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

  return (
    <div className="hover-content" ref={contentRef}>
      <div className="hover-nav-dots">
        {NAV_DOTS.map((tab) => (
          <button
            key={tab}
            className={`hover-nav-dot ${hoverTab === tab ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); if (tab === 'expand') { setExpanded(); } else { setHoverTab(tab); } }}
            title={getDotLabel(tab)}
            aria-label={t('hover.nav.switchToPage', { defaultValue: '切换到{{label}}页面', label: getDotLabel(tab) })}
          />
        ))}
      </div>

      <div className="hover-tab-content" onClick={(e) => e.stopPropagation()}>
        {hoverTab === 'time' && (
          <TimeTab
            fullTimeStr={fullTimeStr}
            lunarStr={lunarStr}
          />
        )}
        {hoverTab === 'o3ics' && <LyricsTab />}
        {hoverTab === 'weather' && <WeatherTab />}
      </div>
    </div>
  );
}
