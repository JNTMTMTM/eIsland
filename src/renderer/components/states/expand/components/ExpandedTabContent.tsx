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
 * @file ExpandedTabContent.tsx
 * @description 展开面板 Tab 内容区域，按当前页渲染对应页面并播放方向切换动画。
 * @author 鸡哥
 */

import { AgentUsageTab } from '../pages/AgentUsageTab';
import { OverviewTab } from '../pages/OverviewTab';
import { PerformanceMonitorTab } from '../pages/PerformanceMonitorTab';
import { SongTab } from '../pages/SongTab';
import { ToolsTab } from '../pages/ToolsTab';
import { TranslationTab } from '../pages/TranslationTab';
import type { ReactElement } from 'react';
import type { ExpandedTabContentProps } from '../types/expandTypes';

/**
 * 渲染当前展开页。
 * @param props - 组件入参
 * @param props.expandTab - 当前页
 * @param props.slideDir - 切换方向
 * @param props.tabAnimation - 是否启用切换动画
 * @returns Tab 内容区域
 */
export function ExpandedTabContent({ expandTab, slideDir, tabAnimation }: ExpandedTabContentProps): ReactElement {
  return (
    <div className="expand-tab-content" onClick={(e) => e.stopPropagation()}>
      <div className={`expand-tab-transition${tabAnimation && slideDir ? ` expand-tab-slide-${slideDir}` : ''}`} key={expandTab}>
        {expandTab === 'overview' && <OverviewTab />}
        {expandTab === 'song' && <SongTab />}
        {expandTab === 'tools' && <ToolsTab />}
        {expandTab === 'translation' && <TranslationTab />}
        {expandTab === 'performanceMonitor' && <PerformanceMonitorTab />}
        {expandTab === 'agentUsage' && <AgentUsageTab />}
      </div>
    </div>
  );
}
