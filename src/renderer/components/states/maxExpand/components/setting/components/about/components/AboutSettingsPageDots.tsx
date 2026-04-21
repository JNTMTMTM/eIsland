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
 * @description 设置页面 - 关于软件分页圆点组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

export type AboutSettingsPageKey = 'development' | 'feedback';

interface AboutSettingsPageDotsProps {
  aboutPage: AboutSettingsPageKey;
  aboutPages: AboutSettingsPageKey[];
  pageLabels: Record<AboutSettingsPageKey, string>;
  setAboutPage: (page: AboutSettingsPageKey) => void;
}

export function AboutSettingsPageDots({
  aboutPage,
  aboutPages,
  pageLabels,
  setAboutPage,
}: AboutSettingsPageDotsProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="settings-about-page-dots" aria-label={t('settings.about.pagination', { defaultValue: '关于软件分页' })}>
      {aboutPages.map((page) => (
        <button
          key={page}
          className={`settings-about-page-dot ${aboutPage === page ? 'active' : ''}`}
          data-label={pageLabels[page]}
          type="button"
          onClick={() => setAboutPage(page)}
          title={pageLabels[page]}
          aria-label={pageLabels[page]}
        />
      ))}
    </div>
  );
}
