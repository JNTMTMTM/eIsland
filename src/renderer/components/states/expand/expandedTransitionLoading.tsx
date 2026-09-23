/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
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
