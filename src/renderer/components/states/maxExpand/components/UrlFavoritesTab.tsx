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
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../utils/SvgIcon';
import { fetchWebsiteTitle, getWebsiteFaviconUrl } from '../../../../api/siteMetaApi';

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

/**
 * URL 收藏页
 * @description 最大展开状态下的 URL 收藏管理与编辑面板
 */
export function UrlFavoritesTab(): React.ReactElement {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<UrlFavoriteItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [editUrlInput, setEditUrlInput] = useState('');
  const [editNoteInput, setEditNoteInput] = useState('');
  const titleResolvingIdsRef = useRef<Set<number>>(new Set());
  const dragFromIdRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);

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

  const resetDragState = (): void => {
    dragFromIdRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
    window.setTimeout(() => {
      dragMovedRef.current = false;
    }, 0);
  };

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, id: number): void => {
    dragFromIdRef.current = id;
    dragMovedRef.current = false;
    setDraggingId(id);
    setDragOverId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: number): void => {
    if (dragFromIdRef.current === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragFromIdRef.current !== id) dragMovedRef.current = true;
    setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, id: number): void => {
    e.preventDefault();
    const fromId = dragFromIdRef.current;
    if (fromId === null || fromId === id) {
      resetDragState();
      return;
    }

    setFavorites((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === fromId);
      const toIndex = prev.findIndex((item) => item.id === id);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });

    resetDragState();
  };

  const totalCount = favorites.length;

  const placeholder = useMemo(
    () => (totalCount > 0
      ? t('urlFavoritesTab.input.placeholderWithItems', { defaultValue: '输入并添加新的 URL 收藏' })
      : t('urlFavoritesTab.input.placeholderEmpty', { defaultValue: '输入 URL，例如 github.com' })),
    [totalCount, t],
  );

  return (
    <div className="url-favorites">
      <div className="url-favorites-header">
        <span className="url-favorites-title">{t('urlFavoritesTab.title', { defaultValue: 'URL 收藏' })}</span>
        <span className="url-favorites-count">{t('urlFavoritesTab.count', { defaultValue: '{{count}} 条', count: totalCount })}</span>
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
        <button className="url-favorites-add" type="button" onClick={handleAdd}>
          {t('urlFavoritesTab.actions.add', { defaultValue: '添加' })}
        </button>
      </div>

      <div
        className="url-favorites-list"
        onWheelCapture={(e) => {
          e.stopPropagation();
        }}
      >
        {favorites.length === 0 ? (
          <div className="url-favorites-empty">{t('urlFavoritesTab.empty', { defaultValue: '还没有收藏，先添加一个 URL 吧。' })}</div>
        ) : favorites.map((item) => (
          <div
            key={item.id}
            className={`url-favorites-item${focusedId === item.id ? ' url-favorites-item--focused' : ''}${dragOverId === item.id ? ' url-favorites-item--drag-over' : ''}${draggingId === item.id ? ' url-favorites-item--dragging' : ''}`}
            data-url-favorite-id={item.id}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDrop={(e) => handleDrop(e, item.id)}
          >
            <button
              className="url-favorites-summary"
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragEnd={resetDragState}
              onClick={() => {
                if (dragMovedRef.current) return;
                handleToggleExpand(item);
              }}
              title={item.url}
            >
              <img className="url-favorites-favicon" src={getWebsiteFaviconUrl(item.url)} alt="" aria-hidden="true" onError={(e) => { (e.target as HTMLImageElement).src = SvgIcon.LINK; }} />
              <span
                className="url-favorites-site-name"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOpen(item.url);
                }}
                title={t('urlFavoritesTab.openWebsiteTitle', { defaultValue: '点击打开网站' })}
              >
                {item.title && item.title !== item.url ? item.title : t('urlFavoritesTab.resolvingTitle', { defaultValue: '读取网页名称中…' })}
              </span>
              <span className="url-favorites-note" title={item.note || t('urlFavoritesTab.noNote', { defaultValue: '未备注' })}>{item.note || t('urlFavoritesTab.noNote', { defaultValue: '未备注' })}</span>
              <span className="url-favorites-expand-indicator">
                {expandedId === item.id
                  ? t('urlFavoritesTab.actions.collapse', { defaultValue: '收起' })
                  : t('urlFavoritesTab.actions.expand', { defaultValue: '展开' })}
              </span>
            </button>

            {expandedId === item.id ? (
              <div className="url-favorites-editor">
                <div className="url-favorites-editor-row">
                  <span className="url-favorites-editor-label">{t('urlFavoritesTab.editor.urlLabel', { defaultValue: 'URL' })}</span>
                  <input
                    className="url-favorites-url-input"
                    type="text"
                    value={editUrlInput}
                    onChange={(e) => setEditUrlInput(e.target.value)}
                    placeholder={t('urlFavoritesTab.editor.urlPlaceholder', { defaultValue: '编辑 URL' })}
                  />
                </div>
                <div className="url-favorites-editor-row">
                  <span className="url-favorites-editor-label">{t('urlFavoritesTab.editor.noteLabel', { defaultValue: '备注' })}</span>
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
                    placeholder={t('urlFavoritesTab.editor.notePlaceholder', { defaultValue: '输入备注' })}
                  />
                </div>
                <div className="url-favorites-editor-actions">
                  <button className="url-favorites-save" type="button" onClick={() => handleSaveEdit(item.id)}>
                    {t('urlFavoritesTab.actions.save', { defaultValue: '保存' })}
                  </button>
                  <button
                    className="url-favorites-remove"
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    aria-label={t('urlFavoritesTab.actions.removeAria', { defaultValue: '删除 URL 收藏' })}
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
