/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * @file maxExpandLoading.tsx
 * @description 性能模式下显示目标页面名称和对应加载说明。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import IslandPageLoading from '../../components/islandPageLoading';
import type { ReactElement } from 'react';
import type { MaxExpandTab } from '../../../store/types';

interface MaxExpandLoadingProps {
  activeTab: MaxExpandTab;
  performanceModeEnabled: boolean;
}

/**
 * 渲染性能模式专用加载反馈，普通模式不创建加载动画。
 * @param props - 目标页面和性能模式开关。
 * @param props.activeTab - 正在准备的页面。
 * @param props.performanceModeEnabled - 是否启用性能模式。
 * @returns 加载反馈，普通模式返回 null。
 */
export default function MaxExpandLoading({ activeTab, performanceModeEnabled }: MaxExpandLoadingProps): ReactElement | null {
  const { t } = useTranslation();
  if (!performanceModeEnabled) return null;

  return (
    <IslandPageLoading title={t('maxExpand.loadingPage', { page: t(`maxExpand.nav.${activeTab}`) })}
      description={t(`maxExpand.loadingDescriptions.${activeTab}`)}
      performanceModeEnabled={performanceModeEnabled}
    />
  );
}
