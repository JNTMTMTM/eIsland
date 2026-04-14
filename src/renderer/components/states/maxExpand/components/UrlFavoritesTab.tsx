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
 * @file UrlFavoritesTab.tsx
 * @description 最大展开模式 URL 收藏 Tab
 * @author 鸡哥
 */

import React, { useEffect, useMemo, useState } from 'react';

interface UrlFavoriteItem {
  id: number;
  url: string;
  title: string;
  createdAt: number;
}

const STORE_KEY = 'url-favorites';

function normalizeUrl(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text}`;
}

function sanitizeFavorites(data: unknown): UrlFavoriteItem[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const row = item as Partial<UrlFavoriteItem>;
      const url = typeof row.url === 'string' ? normalizeUrl(row.url) : '';
      if (!url) return null;
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      const createdAt = typeof row.createdAt === 'number' && Number.isFinite(row.createdAt) ? row.createdAt : Date.now();
      const id = typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : createdAt;
      return {
        id,
        url,
        title: title || url,
        createdAt,
      };
    })
    .filter((item): item is UrlFavoriteItem => Boolean(item));
}

function persistFavorites(items: UrlFavoriteItem[]): void {
  try { localStorage.setItem('eIsland_url_favorites', JSON.stringify(items)); } catch { /* noop */ }
  window.api.storeWrite(STORE_KEY, items).catch(() => {});
}

export function UrlFavoritesTab(): React.ReactElement {
  const [favorites, setFavorites] = useState<UrlFavoriteItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data) && data.length > 0) {
        setFavorites(sanitizeFavorites(data));
      } else {
        try {
          const raw = localStorage.getItem('eIsland_url_favorites');
          if (raw) {
            const items = sanitizeFavorites(JSON.parse(raw) as unknown[]);
            setFavorites(items);
            window.api.storeWrite(STORE_KEY, items).catch(() => {});
          }
        } catch { /* noop */ }
      }
      setLoaded(true);
    }).catch(() => {
      try {
        const raw = localStorage.getItem('eIsland_url_favorites');
        if (raw) setFavorites(sanitizeFavorites(JSON.parse(raw) as unknown[]));
      } catch { /* noop */ }
      if (!cancelled) setLoaded(true);
    });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    persistFavorites(favorites);
  }, [favorites, loaded]);

  const handleAdd = (): void => {
    const normalizedUrl = normalizeUrl(urlInput);
    if (!normalizedUrl) return;

    try {
      const parsed = new URL(normalizedUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
    } catch {
      return;
    }

    setFavorites((prev) => {
      const exists = prev.some((item) => item.url.toLowerCase() === normalizedUrl.toLowerCase());
      if (exists) return prev;
      const now = Date.now();
      return [{ id: now, url: normalizedUrl, title: normalizedUrl, createdAt: now }, ...prev];
    });
    setUrlInput('');
  };

  const handleOpen = (url: string): void => {
    window.api.clipboardOpenUrl(url).catch(() => {});
  };

  const handleRemove = (id: number): void => {
    setFavorites((prev) => prev.filter((item) => item.id !== id));
  };

  const totalCount = favorites.length;

  const placeholder = useMemo(
    () => (totalCount > 0 ? '输入并添加新的 URL 收藏' : '输入 URL，例如 github.com'),
    [totalCount],
  );

  return (
    <div className="url-favorites">
      <div className="url-favorites-header">
        <span className="url-favorites-title">URL 收藏</span>
        <span className="url-favorites-count">{totalCount} 条</span>
      </div>

      <div className="url-favorites-input-bar">
        <input
          className="url-favorites-input"
          type="text"
          placeholder={placeholder}
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button className="url-favorites-add" type="button" onClick={handleAdd}>添加</button>
      </div>

      <div className="url-favorites-list">
        {favorites.length === 0 ? (
          <div className="url-favorites-empty">还没有收藏，先添加一个 URL 吧。</div>
        ) : favorites.map((item) => (
          <div key={item.id} className="url-favorites-item">
            <button className="url-favorites-link" type="button" onClick={() => handleOpen(item.url)} title={item.url}>
              {item.title}
            </button>
            <button className="url-favorites-remove" type="button" onClick={() => handleRemove(item.id)} aria-label="删除 URL 收藏">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
