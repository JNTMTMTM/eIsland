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
 * @file useExpandedTransitionLoading.ts
 * @description 读取展开页加载反馈所需的目标页与性能模式开关。
 * @author 鸡哥
 */

import useIslandStore from '../../../../store/isLandStore';
import { usePerformanceMode } from '../../maxExpand/hooks/usePerformanceMode';
import { resolveLoadingTab } from '../utils/expandUtils';
import type { UseExpandedTransitionLoadingReturn } from '../types/expandTypes';

/**
 * 读取当前展开页，复用最大展开页的性能模式开关。
 * @returns 加载页与性能模式开关
 */
export function useExpandedTransitionLoading(): UseExpandedTransitionLoadingReturn {
  const expandTab = useIslandStore((store) => store.expandTab);
  const performanceModeEnabled = usePerformanceMode();
  return { performanceModeEnabled, activeTab: resolveLoadingTab(expandTab) };
}
