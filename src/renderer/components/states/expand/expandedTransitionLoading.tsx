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
 * @file expandedTransitionLoading.tsx
 * @description 展开面板在形变等待期间显示性能模式加载动画及目标页面说明。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/isLandStore';
import IslandPageLoading from '../../components/islandPageLoading';
import { usePerformanceMode } from '../maxExpand/hooks/usePerformanceMode';
import type { ReactElement } from 'react';

/**
 * 读取当前展开页，复用最大展开页的性能模式开关与加载样式。
 * @returns 展开页加载反馈。
 */
export default function ExpandedTransitionLoading(): ReactElement {
  const { t } = useTranslation();
  const expandTab = useIslandStore((store) => store.expandTab);
  const performanceModeEnabled = usePerformanceMode();
  const activeTab = expandTab === 'hover' ? 'overview' : expandTab;

  return (
    <IslandPageLoading title={t('expanded.loadingPage', { page: t(`expanded.nav.${activeTab}`) })}
      description={t(`expanded.loadingDescriptions.${activeTab}`)}
      performanceModeEnabled={performanceModeEnabled}
    />
  );
}
