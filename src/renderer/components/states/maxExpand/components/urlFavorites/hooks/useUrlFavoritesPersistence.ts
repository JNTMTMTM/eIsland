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
 * @file useUrlFavoritesPersistence.ts
 * @description URL 收藏持久化 hook：store 读写、settings 监听、标题自动解析、焦点恢复。
 * @author 鸡哥
 */

import { useEffect, useRef, useState } from 'react';
import { fetchWebsiteTitle } from '../../../../../../api/site/siteMetaApi';
import { STORE_KEY, FOCUS_KEY, LOCAL_STORAGE_KEY } from '../config/urlFavoritesConfig';
import type { UrlFavoriteItem } from '../types/urlFavoritesTypes';
import { normalizeUrl, sanitizeFavorites, persistFavorites } from '../utils/urlFavoritesUtils';

/** useUrlFavoritesPersistence 返回值 */
export interface UseUrlFavoritesPersistenceReturn {
  favorites: UrlFavoriteItem[];
  setFavorites: React.Dispatch<React.SetStateAction<UrlFavoriteItem[]>>;
  loaded: boolean;
}

/**
 * URL 收藏持久化 hook
 * @param onExpand - 展开某项回调（焦点恢复用）
 * @param onFocused - 设置焦点回调（焦点恢复用）
 * @returns favorites、setFavorites、loaded
 */
export function useUrlFavoritesPersistence(
  onExpand: (item: UrlFavoriteItem) => void,
  onFocused: (id: number) => void,
): UseUrlFavoritesPersistenceReturn {
  const [favorites, setFavorites] = useState<UrlFavoriteItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const titleResolvingIdsRef = useRef<Set<number>>(new Set());
  const skipPersistOnceRef = useRef(false);

  /* 首次加载：从 store 或 localStorage 读取 */
  useEffect(() => {
    let cancelled = false;

    const applyFavorites = (data: unknown): void => {
      if (!Array.isArray(data)) return;
      skipPersistOnceRef.current = true;
      setFavorites(sanitizeFavorites(data));
    };

    window.api.storeRead(STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data) && data.length > 0) {
        applyFavorites(data);
      } else {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (raw) {
            const items = sanitizeFavorites(JSON.parse(raw) as unknown[]);
            applyFavorites(items);
            window.api.storeWrite(STORE_KEY, items).catch(() => {});
          }
        } catch { /* noop */ }
      }
      setLoaded(true);
    }).catch(() => {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) applyFavorites(JSON.parse(raw) as unknown[]);
      } catch { /* noop */ }
      if (!cancelled) setLoaded(true);
    });

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${STORE_KEY}`) {
        applyFavorites(value);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  /* favorites 变化时持久化（跳过首次从 store 加载触发的那次） */
  useEffect(() => {
    if (!loaded) return;
    if (skipPersistOnceRef.current) {
      skipPersistOnceRef.current = false;
      return;
    }
    persistFavorites(favorites);
  }, [favorites, loaded]);

  /* 标题自动解析：获取缺少标题的收藏项 */
  useEffect(() => {
    if (!loaded || favorites.length === 0) return;

    const pendingItems = favorites.filter((item) => {
      const hasResolvedTitle = item.title.trim() && item.title.trim() !== item.url;
      return !hasResolvedTitle && !titleResolvingIdsRef.current.has(item.id);
    });

    if (pendingItems.length === 0) return;

    pendingItems.forEach((item) => {
      titleResolvingIdsRef.current.add(item.id);
      fetchWebsiteTitle(item.url)
        .then((title) => {
          const nextTitle = title.trim();
          if (!nextTitle) return;
          setFavorites((prev) => prev.map((row) => (
            row.id === item.id
              ? { ...row, title: nextTitle }
              : row
          )));
        })
        .finally(() => {
          titleResolvingIdsRef.current.delete(item.id);
        });
    });
  }, [favorites, loaded]);

  /* 焦点恢复：从 localStorage 读取焦点 URL 并滚动到对应项 */
  useEffect(() => {
    if (!loaded || favorites.length === 0) return;
    let targetUrl = '';
    try {
      const raw = localStorage.getItem(FOCUS_KEY) ?? '';
      targetUrl = normalizeUrl(raw);
    } catch {
      targetUrl = '';
    }
    if (!targetUrl) return;

    const matched = favorites.find((item) => item.url.toLowerCase() === targetUrl.toLowerCase());
    if (!matched) return;

    onExpand(matched);
    onFocused(matched.id);

    try {
      localStorage.removeItem(FOCUS_KEY);
    } catch { /* noop */ }

    window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-url-favorite-id="${matched.id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [loaded, favorites]);

  return { favorites, setFavorites, loaded };
}
