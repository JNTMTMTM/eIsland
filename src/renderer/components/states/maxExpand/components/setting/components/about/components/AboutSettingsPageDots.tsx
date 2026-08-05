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
 * @file AboutSettingsPageDots.tsx
 * @description 设置页面 - 关于软件分页导航组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsPageNavigation } from '../../SettingsPageNavigation';

export type AboutSettingsPageKey = 'development' | 'feedback' | 'feedbackHistory';

interface AboutSettingsPageDotsProps {
  aboutPage: AboutSettingsPageKey;
  expanded: boolean;
  aboutPages: AboutSettingsPageKey[];
  pageLabels: Record<AboutSettingsPageKey, string>;
  setAboutPage: (page: AboutSettingsPageKey) => void;
}

/**
 * 关于设置页分页标签导航组件。
 *
 * @param props 组件属性
 * @returns 分页标签按钮组
 */
export function AboutSettingsPageDots({
  aboutPage,
  expanded,
  aboutPages,
  pageLabels,
  setAboutPage,
}: AboutSettingsPageDotsProps): ReactElement {
  const { t } = useTranslation();

  return (
    <SettingsPageNavigation
      activePage={aboutPage}
      expanded={expanded}
      pages={aboutPages}
      pageLabels={pageLabels}
      navigationLabel={t('settings.about.pagination')}
      onSelectPage={setAboutPage}
    />
  );
}
