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
 * @file UrlFavoritesHeader.tsx
 * @description URL 收藏模块标题栏，显示标题与计数。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { UrlFavoritesHeaderProps } from '../types/urlFavoritesTypes';

/**
 * URL 收藏标题栏
 * @param props - 组件入参
 * @returns ReactElement
 */
export function UrlFavoritesHeader({ activeFolder, visibleCount, totalCount }: UrlFavoritesHeaderProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="url-favorites-header">
      <span className="url-favorites-title">{t('urlFavoritesTab.title', { defaultValue: 'URL 收藏' })}</span>
      <span className="url-favorites-count">
        {activeFolder
          ? t('urlFavoritesTab.filteredCount', { defaultValue: '{{count}} / {{total}} 条', count: visibleCount, total: totalCount })
          : t('urlFavoritesTab.count', { defaultValue: '{{count}} 条', count: totalCount })}
      </span>
    </div>
  );
}
