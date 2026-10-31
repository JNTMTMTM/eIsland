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
 * @file expandTypes.ts
 * @description 展开状态导航点、切换方向、子组件入参与 hook 返回值类型定义
 * @author 鸡哥
 */

import type { RefObject } from 'react';
import type { ExpandTab } from '../../../../store/types';

/** 导航点标识 — 含特殊动作：hover 返回、settings 切换独立状态 */
export type NavDotId = ExpandTab | 'maxExpand';

/** Tab 切换的滑动方向，null 表示首次挂载不播放方向动画 */
export type ExpandSlideDirection = 'left' | 'right' | null;

/** 启动窗口模式 */
export type ExpandStartupMode = 'integrated' | 'standalone';

/** 展开页加载反馈对应的页面，hover 回退为总览 */
export type ExpandLoadingTab = Exclude<ExpandTab, 'hover'>;

/** useExpandedContent hook 返回值类型 */
export interface UseExpandedContentReturn {
  expandTab: ExpandTab;
  contentRef: RefObject<HTMLDivElement | null>;
  slideDir: ExpandSlideDirection;
  tabAnimation: boolean;
  navDots: NavDotId[];
  handleNavDotClick: (tab: NavDotId) => void;
}

/** useExpandedTransitionLoading hook 返回值类型 */
export interface UseExpandedTransitionLoadingReturn {
  activeTab: ExpandLoadingTab;
  performanceModeEnabled: boolean;
}

/** ExpandedTabContent 组件入参 */
export interface ExpandedTabContentProps {
  expandTab: ExpandTab;
  slideDir: ExpandSlideDirection;
  tabAnimation: boolean;
}

/** ExpandedNavDots 组件入参 */
export interface ExpandedNavDotsProps {
  navDots: NavDotId[];
  expandTab: ExpandTab;
  onNavDotClick: (tab: NavDotId) => void;
}
