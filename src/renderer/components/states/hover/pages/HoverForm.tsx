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
 * @file HoverForm.tsx
 * @description Hover 状态表单组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { useHover } from '../hooks/useHover';
import { NAV_DOTS } from '../config/hoverConfig';
import { TimeTab } from './TimeTab';
import { LyricsTab } from './LrcTab';
import { WeatherTab } from './WeatherTab';

type HoverFormProps = ReturnType<typeof useHover>;

/** Hover 状态表单组件 */
export function HoverForm(props: HoverFormProps): ReactElement {
  const {
    fullTimeStr,
    lunarStr,
    t,
    hoverTab,
    setHoverTab,
    setExpanded,
    contentRef,
    getDotLabel,
  } = props;

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
        {hoverTab === 'lyrics' && <LyricsTab />}
        {hoverTab === 'weather' && <WeatherTab />}
      </div>
    </div>
  );
}
