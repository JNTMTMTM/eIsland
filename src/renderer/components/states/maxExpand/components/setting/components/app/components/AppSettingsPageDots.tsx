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
 * @file AppSettingsPageDots.tsx
 * @description 设置页面 - 软件设置分页圆点组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettingsPageKey } from '../../../utils/settingsConfig';

/**
 * 软件设置分页圆点组件属性
 */
export interface AppSettingsPageDotsProps {
  /**
   * 当前激活的软件设置分页
   */
  appSettingsPage: AppSettingsPageKey;
  /**
   * 可用的软件设置分页列表
   */
  appSettingsPages: AppSettingsPageKey[];
  /**
   * 分页与展示文案映射
   */
  settingsTabLabels: Record<string, string>;
  /**
   * 切换软件设置分页的方法
   */
  setAppSettingsPage: (page: AppSettingsPageKey) => void;
}

/**
 * 渲染软件设置分页切换圆点
 * @param appSettingsPage - 当前激活的软件设置分页
 * @param appSettingsPages - 可用的软件设置分页列表
 * @param settingsTabLabels - 分页与展示文案映射
 * @param setAppSettingsPage - 切换软件设置分页的方法
 * @returns 软件设置分页圆点区域
 */
export function AppSettingsPageDots({
  appSettingsPage,
  appSettingsPages,
  settingsTabLabels,
  setAppSettingsPage,
}: AppSettingsPageDotsProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="settings-app-page-dots" aria-label={t('settings.app.pagination', { defaultValue: '软件设置分页' })}>
      {appSettingsPages.map((page) => (
        <button
          key={page}
          className={`settings-app-page-dot ${appSettingsPage === page ? 'active' : ''}`}
          data-label={settingsTabLabels[page]}
          type="button"
          onClick={() => setAppSettingsPage(page)}
          title={settingsTabLabels[page]}
          aria-label={settingsTabLabels[page]}
        />
      ))}
    </div>
  );
}
