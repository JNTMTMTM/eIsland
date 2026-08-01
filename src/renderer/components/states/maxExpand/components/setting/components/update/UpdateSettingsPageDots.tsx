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
 * @file UpdateSettingsPageDots.tsx
 * @description 设置页面 - 更新设置分页导航组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsPageNavigation } from '../SettingsPageNavigation';
import type { UpdateSettingsPageKey } from '../../utils/settingsConfig';

/**
 * 更新设置分页导航组件属性
 */
export interface UpdateSettingsPageDotsProps {
  /**
   * 当前激活的更新设置分页
   */
  updateSettingsPage: UpdateSettingsPageKey;
  expanded: boolean;
  /**
   * 可用的更新设置分页列表
   */
  updateSettingsPages: UpdateSettingsPageKey[];
  /**
   * 分页与展示文案映射
   */
  settingsTabLabels: Record<string, string>;
  /**
   * 切换更新设置分页的方法
   */
  setUpdateSettingsPage: (page: UpdateSettingsPageKey) => void;
}

/**
 * 渲染更新设置分页标签导航
 * @param updateSettingsPage - 当前激活的更新设置分页
 * @param updateSettingsPages - 可用的更新设置分页列表
 * @param settingsTabLabels - 分页与展示文案映射
 * @param setUpdateSettingsPage - 切换更新设置分页的方法
 * @returns 更新设置分页标签导航区域
 */
export function UpdateSettingsPageDots({
  updateSettingsPage,
  expanded,
  updateSettingsPages,
  settingsTabLabels,
  setUpdateSettingsPage,
}: UpdateSettingsPageDotsProps): ReactElement {
  const { t } = useTranslation();

  return (
    <SettingsPageNavigation
      activePage={updateSettingsPage}
      expanded={expanded}
      pages={updateSettingsPages}
      pageLabels={settingsTabLabels}
      navigationLabel={t('settings.update.pagination')}
      onSelectPage={setUpdateSettingsPage}
    />
  );
}
