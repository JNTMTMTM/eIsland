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
 * @file AiSettingsPageDots.tsx
 * @description 设置页面 - AI 设置分页导航组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsPageNavigation } from '../SettingsPageNavigation';
import type { AiSettingsPageKey } from '../../utils/settingsConfig';

/**
 * AI 设置分页导航组件属性
 */
export interface AiSettingsPageDotsProps {
  /**
   * 当前激活的 AI 设置分页
   */
  aiSettingsPage: AiSettingsPageKey;
  expanded: boolean;
  /**
   * 可用的 AI 设置分页列表
   */
  aiSettingsPages: AiSettingsPageKey[];
  /**
   * 分页与展示文案映射
   */
  settingsTabLabels: Record<string, string>;
  /**
   * 切换 AI 设置分页的方法
   */
  setAiSettingsPage: (page: AiSettingsPageKey) => void;
}

/**
 * 渲染 AI 设置分页标签导航
 * @param aiSettingsPage - 当前激活的 AI 设置分页
 * @param aiSettingsPages - 可用的 AI 设置分页列表
 * @param settingsTabLabels - 分页与展示文案映射
 * @param setAiSettingsPage - 切换 AI 设置分页的方法
 * @returns AI 设置分页标签导航区域
 */
export function AiSettingsPageDots({
  aiSettingsPage,
  expanded,
  aiSettingsPages,
  settingsTabLabels,
  setAiSettingsPage,
}: AiSettingsPageDotsProps): ReactElement {
  const { t } = useTranslation();

  return (
    <SettingsPageNavigation
      activePage={aiSettingsPage}
      expanded={expanded}
      pages={aiSettingsPages}
      pageLabels={settingsTabLabels}
      navigationLabel={t('settings.ai.pagination')}
      onSelectPage={setAiSettingsPage}
    />
  );
}
