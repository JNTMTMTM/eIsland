/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * @file maxExpandTransitionLoading.tsx
 * @description 展开期间同步目标页面与性能模式，复用页面加载反馈。
 * @author 鸡哥
 */

import useIslandStore from '../../../store/isLandStore';
import { usePerformanceMode } from './hooks/usePerformanceMode';
import MaxExpandLoading from './maxExpandLoading';
import type { ReactElement } from 'react';

/**
 * 在重页面尚未挂载时获取加载反馈所需的最小状态。
 * @returns 随性能模式和目标页面更新的加载反馈。
 */
export default function MaxExpandTransitionLoading(): ReactElement {
  const activeTab = useIslandStore((store) => store.maxExpandTab);
  const performanceModeEnabled = usePerformanceMode();
  return <MaxExpandLoading activeTab={activeTab} performanceModeEnabled={performanceModeEnabled} />;
}
