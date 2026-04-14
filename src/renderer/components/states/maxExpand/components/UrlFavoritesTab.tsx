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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SvgIcon } from '../../../../utils/SvgIcon';

interface UrlFavoriteItem {
  id: number;
  url: string;
  title: string;
  note: string;
  createdAt: number;
}

const STORE_KEY = 'url-favorites';
const FOCUS_KEY = 'url-favorites-focus-url';

function normalizeUrl(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text}`;
}

function getFaviconUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(parsed.origin)}`;
  } catch {
    return '';
  }
}

function parseHtmlTitle(html: string): string {
  const matched = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!matched || !matched[1]) return '';
  return matched[1]
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

async function resolvePageTitle(url: string): Promise<string> {
  try {
    const resp = await window.api.netFetch(url, {
      method: 'GET',
      timeoutMs: 8000,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!resp.ok || !resp.body) return '';
    return parseHtmlTitle(resp.body);
  } catch {
    return '';
  }
}

function sanitizeFavorites(data: unknown): UrlFavoriteItem[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const row = item as Partial<UrlFavoriteItem>;
      const url = typeof row.url === 'string' ? normalizeUrl(row.url) : '';
      if (!url) return null;
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      const noteValue = typeof row.note === 'string' ? row.note.trim() : '';
      const createdAt = typeof row.createdAt === 'number' && Number.isFinite(row.createdAt) ? row.createdAt : Date.now();
      const id = typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : createdAt;
      return {
        id,
        url,
        title: title || url,
        note: noteValue || (title && title !== url ? title : ''),
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
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [editUrlInput, setEditUrlInput] = useState('');
  const [editNoteInput, setEditNoteInput] = useState('');
  const titleResolvingIdsRef = useRef<Set<number>>(new Set());

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

    setExpandedId(matched.id);
    setEditUrlInput(matched.url);
    setEditNoteInput(matched.note);
    setFocusedId(matched.id);
    window.setTimeout(() => {
      setFocusedId((prev) => (prev === matched.id ? null : prev));
    }, 1800);

    try {
      localStorage.removeItem(FOCUS_KEY);
    } catch { /* noop */ }

    window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-url-favorite-id="${matched.id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [loaded, favorites]);

  useEffect(() => {
    if (!loaded || favorites.length === 0) return;

    const pendingItems = favorites.filter((item) => {
      const hasResolvedTitle = item.title.trim() && item.title.trim() !== item.url;
      return !hasResolvedTitle && !titleResolvingIdsRef.current.has(item.id);
    });

    if (pendingItems.length === 0) return;

    pendingItems.forEach((item) => {
      titleResolvingIdsRef.current.add(item.id);
      resolvePageTitle(item.url)
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
      return [{ id: now, url: normalizedUrl, title: normalizedUrl, note: '', createdAt: now }, ...prev];
    });
    setUrlInput('');
  };

  const handleOpen = (url: string): void => {
    window.api.clipboardOpenUrl(url).catch(() => {});
  };

  const handleToggleExpand = (item: UrlFavoriteItem): void => {
    if (expandedId === item.id) {
      setExpandedId(null);
      setEditUrlInput('');
      setEditNoteInput('');
      return;
    }
    setExpandedId(item.id);
    setEditUrlInput(item.url);
    setEditNoteInput(item.note);
  };

  const handleSaveEdit = (id: number): void => {
    const normalizedUrl = normalizeUrl(editUrlInput);
    if (!normalizedUrl) return;

    try {
      const parsed = new URL(normalizedUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
    } catch {
      return;
    }

    setFavorites((prev) => {
      const duplicated = prev.some((item) => item.id !== id && item.url.toLowerCase() === normalizedUrl.toLowerCase());
      if (duplicated) return prev;
      const nextNote = editNoteInput.trim();
      return prev.map((item) => (
        item.id === id
          ? { ...item, url: normalizedUrl, title: normalizedUrl, note: nextNote }
          : item
      ));
    });
    setExpandedId(null);
    setEditUrlInput('');
    setEditNoteInput('');
  };

  const handleRemove = (id: number): void => {
    setFavorites((prev) => prev.filter((item) => item.id !== id));
    if (expandedId === id) {
      setExpandedId(null);
      setEditUrlInput('');
      setEditNoteInput('');
    }
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

      <div
        className="url-favorites-list"
        onWheelCapture={(e) => {
          e.stopPropagation();
        }}
      >
        {favorites.length === 0 ? (
          <div className="url-favorites-empty">还没有收藏，先添加一个 URL 吧。</div>
        ) : favorites.map((item) => (
          <div
            key={item.id}
            className={`url-favorites-item${focusedId === item.id ? ' url-favorites-item--focused' : ''}`}
            data-url-favorite-id={item.id}
          >
            <button
              className="url-favorites-summary"
              type="button"
              onClick={() => handleToggleExpand(item)}
              title={item.url}
            >
              <img className="url-favorites-favicon" src={getFaviconUrl(item.url)} alt="" aria-hidden="true" onError={(e) => { (e.target as HTMLImageElement).src = SvgIcon.LINK; }} />
              <span
                className="url-favorites-site-name"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOpen(item.url);
                }}
                title="点击打开网站"
              >
                {item.title && item.title !== item.url ? item.title : '读取网页名称中…'}
              </span>
              <span className="url-favorites-note" title={item.note || '未备注'}>{item.note || '未备注'}</span>
              <span className="url-favorites-expand-indicator">{expandedId === item.id ? '收起' : '展开'}</span>
            </button>

            {expandedId === item.id ? (
              <div className="url-favorites-editor">
                <div className="url-favorites-editor-row">
                  <span className="url-favorites-editor-label">URL</span>
                  <input
                    className="url-favorites-url-input"
                    type="text"
                    value={editUrlInput}
                    onChange={(e) => setEditUrlInput(e.target.value)}
                    placeholder="编辑 URL"
                  />
                </div>
                <div className="url-favorites-editor-row">
                  <span className="url-favorites-editor-label">备注</span>
                  <input
                    className="url-favorites-note-input"
                    type="text"
                    value={editNoteInput}
                    onChange={(e) => setEditNoteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveEdit(item.id);
                      }
                    }}
                    placeholder="输入备注"
                  />
                </div>
                <div className="url-favorites-editor-actions">
                  <button className="url-favorites-save" type="button" onClick={() => handleSaveEdit(item.id)}>保存</button>
                  <button className="url-favorites-remove" type="button" onClick={() => handleRemove(item.id)} aria-label="删除 URL 收藏">×</button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
