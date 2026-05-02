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
 * @file UrlFavoritesWidget.tsx
 * @description Overview URL 收藏小组件，展示用户收藏的网址快捷方式。
 * @author 鸡哥
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getWebsiteFaviconUrl } from '../../../../../../../api/site/siteMetaApi';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
import { URL_FAVORITES_STORE_KEY, type UrlFavoriteItem } from '../../utils/overviewUtils';

interface UrlFavoritesWidgetProps {
  openUrlFavoritesPage: () => void;
}

/** URL 收藏小组件，展示用户收藏的网址快捷方式。 */
export function UrlFavoritesWidget({ openUrlFavoritesPage }: UrlFavoritesWidgetProps): React.ReactElement {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<UrlFavoriteItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(URL_FAVORITES_STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data)) setFavorites(data as UrlFavoriteItem[]);
    }).catch(() => {
      try {
        const raw = localStorage.getItem('eIsland_url_favorites');
        if (raw && !cancelled) setFavorites(JSON.parse(raw) as UrlFavoriteItem[]);
      } catch {
        // noop
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const goToUrlFavorites = (): void => {
    openUrlFavoritesPage();
  };

  const handleOpen = (url: string): void => {
    window.api.clipboardOpenUrl(url).catch(() => {});
  };

  const shown = favorites.slice(0, 5);

  return (
    <div className="ov-dash-widget ov-dash-url-favorites-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link" onClick={goToUrlFavorites}>{t('overview.urlFavorites.title', { defaultValue: 'URL 收藏' })}</span>
        <span className="ov-dash-url-favorites-count">{t('overview.urlFavorites.count', { defaultValue: '{{count}} 条', count: favorites.length })}</span>
      </div>
      {shown.length === 0 ? (
        <div className="ov-dash-url-favorites-empty">{t('overview.urlFavorites.empty', { defaultValue: '暂无收藏' })}</div>
      ) : (
        <div className="ov-dash-url-favorites-list">
          {shown.map((item) => (
            <div
              key={item.id}
              className="ov-dash-url-favorites-item"
              onClick={() => handleOpen(item.url)}
              title={item.url}
            >
              <img className="ov-dash-url-favorites-favicon" src={getWebsiteFaviconUrl(item.url)} alt="" onError={(e) => { (e.target as HTMLImageElement).src = SvgIcon.LINK; }} />
              <span className="ov-dash-url-favorites-name">
                {item.title && item.title !== item.url ? item.title : item.url}
              </span>
              {item.note && <span className="ov-dash-url-favorites-note">{item.note}</span>}
            </div>
          ))}
          {favorites.length > 5 && (
            <div className="ov-dash-url-favorites-more" onClick={goToUrlFavorites}>
              {t('overview.urlFavorites.viewAll', { defaultValue: '查看全部 {{count}} 条收藏', count: favorites.length })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
