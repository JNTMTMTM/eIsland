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
 * @file ExpandedContent.tsx
 * @description Expanded 状态内容组件，单击灵动岛后展开的快捷操作面板
 * @author 鸡哥
 */

import React, { useEffect, useRef } from 'react';
import useIslandStore from '../../../store/slices';
import type { ExpandTab } from '../../../store/types';
import '../../../styles/expanded/expanded.css';
import { OverviewTab } from './components/OverviewTab';
import { SongTab } from './components/SongTab';
import { ToolsTab } from './components/ToolsTab';

/** 导航点标识 — 含特殊动作：hover 返回、settings 切换独立状态 */
type NavDotId = ExpandTab | 'maxExpand';

/** 导航点配置 */
const EXPAND_NAV_DOTS: { tab: NavDotId; label: string }[] = [
  { tab: 'hover', label: '返回' },
  { tab: 'overview', label: '总览' },
  { tab: 'song', label: '歌曲' },
  { tab: 'tools', label: '工具' },
  { tab: 'maxExpand', label: '最大展开' },
];

/**
 * Expanded 状态内容组件
 * @description 扩展状态下的完整功能面板，底部正中间导航点切换 Tab
 */
export function ExpandedContent(): React.ReactElement {
  const { expandTab, setExpandTab, setHover, setMaxExpand } = useIslandStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const expandTabRef = useRef(expandTab);
  expandTabRef.current = expandTab;

  /** 滚轮切换 Tab */
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      if (target.closest('.ov-dash-todo-list')) return;
      if (target.closest('.ov-dash-apps')) return;
      if (target.closest('.tools-app-list-body')) return;
      e.preventDefault();
      const cur = expandTabRef.current;
      const currentIndex = EXPAND_NAV_DOTS.findIndex(d => d.tab === cur);
      let nextId: NavDotId;
      if (e.deltaY > 0) {
        nextId = EXPAND_NAV_DOTS[(currentIndex + 1) % EXPAND_NAV_DOTS.length].tab;
      } else {
        nextId = EXPAND_NAV_DOTS[(currentIndex - 1 + EXPAND_NAV_DOTS.length) % EXPAND_NAV_DOTS.length].tab;
      }
      if (nextId === 'hover') { setHover(); return; }
      if (nextId === 'maxExpand') { setMaxExpand(); return; }
      setExpandTab(nextId);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [setExpandTab, setHover, setMaxExpand]);

  return (
    <div className="expanded-content" ref={contentRef}>
      {/* Tab 内容区域 */}
      <div className="expand-tab-content" onClick={(e) => e.stopPropagation()}>
        {expandTab === 'overview' && <OverviewTab />}
        {expandTab === 'song' && <SongTab />}
        {expandTab === 'tools' && <ToolsTab />}
      </div>

      {/* 底部导航点 */}
      <div className="expand-nav-dots" onClick={(e) => e.stopPropagation()}>
        {EXPAND_NAV_DOTS.map(({ tab, label }) => (
          <button
            key={tab}
            className={`expand-nav-dot ${expandTab === tab ? 'active' : ''}`}
            onClick={() => {
              if (tab === 'hover') { setHover(); }
              else if (tab === 'maxExpand') { setMaxExpand(); }
              else { setExpandTab(tab); }
            }}
            title={label}
            aria-label={`切换到${label}页面`}
          />
        ))}
      </div>
    </div>
  );
}
