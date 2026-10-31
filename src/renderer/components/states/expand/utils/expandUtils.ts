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
 * @file expandUtils.ts
 * @description 展开状态导航点序列、可见页筛选、切换方向与加载页推导。
 * @author 鸡哥
 */

import { HOVER_LOADING_TAB } from '../config/expandConfig';
import type { ExpandTab } from '../../../../store/types';
import type { ExpandLoadingTab, NavDotId } from '../types/expandTypes';

/**
 * 生成底部导航点序列：hover 固定在首位，最大展开入口可用时放在末位。
 * @param navLayoutConfig - Expand 导航布局
 * @param hasAvailableMaxExpandTab - 是否存在可进入的最大展开页
 * @returns 导航点序列
 */
export function buildNavDots(
  navLayoutConfig: readonly { id: string; visible: boolean }[],
  hasAvailableMaxExpandTab: boolean,
): NavDotId[] {
  const visibleTabs = navLayoutConfig
    .filter((item) => item.visible)
    .map((item) => item.id as ExpandTab);
  const maxExpandDots = hasAvailableMaxExpandTab ? ['maxExpand' as NavDotId] : [];
  return ['hover', ...visibleTabs, ...maxExpandDots];
}

/**
 * 筛出导航点中真正对应展开页的 Tab。
 * @param navDots - 导航点序列
 * @returns 展开页 Tab 列表
 */
export function getVisibleExpandTabs(navDots: NavDotId[]): ExpandTab[] {
  return navDots.filter((tab): tab is ExpandTab => tab !== 'hover' && tab !== 'maxExpand');
}

/**
 * 按导航点先后顺序决定滑动方向，前进为右、后退为左。
 * @param navDots - 导航点序列
 * @param current - 当前页
 * @param next - 目标页
 * @returns 滑动方向
 */
export function resolveSlideDirection(navDots: NavDotId[], current: NavDotId, next: NavDotId): 'left' | 'right' {
  return navDots.indexOf(next) >= navDots.indexOf(current) ? 'right' : 'left';
}

/**
 * 推导加载反馈展示的页面。
 * @param expandTab - 当前展开页
 * @returns 加载页，hover 回退为总览
 */
export function resolveLoadingTab(expandTab: ExpandTab): ExpandLoadingTab {
  return expandTab === 'hover' ? HOVER_LOADING_TAB : expandTab;
}
