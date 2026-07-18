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
 * @file useUrlFavorites.ts
 * @description URL 收藏模块状态管理 hook，包含所有 useEffect、事件处理逻辑。
 * @author 鸡哥
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchWebsiteTitle } from '../../../../../../api/site/siteMetaApi';
import { STORE_KEY, FOCUS_KEY, LOCAL_STORAGE_KEY } from '../config/urlFavoritesConfig';
import type { UrlFavoriteItem, UrlFavoritesImportFormat, UrlFavoritesExportFormat, UseUrlFavoritesReturn } from '../types/urlFavoritesTypes';
import {
  normalizeUrl,
  normalizeFolder,
  sanitizeFavorites,
  parseImportedFavorites,
  mergeFavorites,
  serializeFavoritesToJson,
  serializeFavoritesToHtml,
  persistFavorites,
} from '../utils/urlFavoritesUtils';

/**
 * URL 收藏状态管理 hook
 * @returns UseUrlFavoritesReturn
 */
export function useUrlFavorites(): UseUrlFavoritesReturn {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<UrlFavoriteItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [importFormat, setImportFormat] = useState<UrlFavoritesImportFormat>('json');
  const [exportFormat, setExportFormat] = useState<UrlFavoritesExportFormat>('json');
  const [folderToolsOpen, setFolderToolsOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [activeFolder, setActiveFolder] = useState('');
  const [newFolderInput, setNewFolderInput] = useState('');
  const [editUrlInput, setEditUrlInput] = useState('');
  const [editNoteInput, setEditNoteInput] = useState('');
  const [editFolderInput, setEditFolderInput] = useState('');
  const titleResolvingIdsRef = useRef<Set<number>>(new Set());
  const dragFromIdRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);
  const skipPersistOnceRef = useRef(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const showStatusMessage = (message: string): void => {
    setStatusMessage(message);
    window.setTimeout(() => {
      setStatusMessage((current) => (current === message ? '' : current));
    }, 2400);
  };

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
        setFavorites(sanitizeFavorites(data));
      } else {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
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
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) setFavorites(sanitizeFavorites(JSON.parse(raw) as unknown[]));
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

  useEffect(() => {
    if (!loaded) return;
    if (skipPersistOnceRef.current) {
      skipPersistOnceRef.current = false;
      return;
    }
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
    setEditFolderInput(matched.folder);
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
      return [{ id: now, url: normalizedUrl, title: normalizedUrl, note: '', folder: activeFolder, createdAt: now }, ...prev];
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
      setEditFolderInput('');
      return;
    }
    setExpandedId(item.id);
    setEditUrlInput(item.url);
    setEditNoteInput(item.note);
    setEditFolderInput(item.folder);
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
      const nextFolder = normalizeFolder(editFolderInput);
      return prev.map((item) => (
        item.id === id
          ? { ...item, url: normalizedUrl, title: normalizedUrl, note: nextNote, folder: nextFolder }
          : item
      ));
    });
    setExpandedId(null);
    setEditUrlInput('');
    setEditNoteInput('');
    setEditFolderInput('');
  };

  const handleRemove = (id: number): void => {
    setFavorites((prev) => prev.filter((item) => item.id !== id));
    if (expandedId === id) {
      setExpandedId(null);
      setEditUrlInput('');
      setEditNoteInput('');
      setEditFolderInput('');
    }
  };

  const handleImportClick = (): void => {
    importInputRef.current?.click();
  };

  const handleCreateFolder = (): void => {
    const folder = normalizeFolder(newFolderInput);
    if (!folder) return;
    setActiveFolder(folder);
    setNewFolderInput('');
  };

  const handleClearFolder = (folder: string): void => {
    setFavorites((prev) => prev.map((item) => (
      item.folder === folder ? { ...item, folder: '' } : item
    )));
    if (activeFolder === folder) setActiveFolder('');
  };

  const handleImportFile = (file: File | null): void => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = typeof reader.result === 'string' ? reader.result : '';
        const imported = parseImportedFavorites(content, importFormat);
        if (imported.length === 0) {
          showStatusMessage(t('urlFavoritesTab.messages.importEmpty', { defaultValue: '未识别到可导入的收藏' }));
          return;
        }
        const next = mergeFavorites(favorites, imported);
        const addedCount = next.length - favorites.length;
        if (addedCount === 0) {
          showStatusMessage(t('urlFavoritesTab.messages.importEmpty', { defaultValue: '未识别到可导入的收藏' }));
          return;
        }
        setFavorites(next);
        showStatusMessage(t('urlFavoritesTab.messages.importSuccess', { defaultValue: '已导入 {{count}} 条收藏', count: addedCount }));
      } catch {
        showStatusMessage(t('urlFavoritesTab.messages.importFailed', { defaultValue: '导入失败，请检查文件格式' }));
      } finally {
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      showStatusMessage(t('urlFavoritesTab.messages.importFailed', { defaultValue: '导入失败，请检查文件格式' }));
      if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleExport = (): void => {
    const isJson = exportFormat === 'json';
    const content = isJson
      ? serializeFavoritesToJson(favorites)
      : serializeFavoritesToHtml(favorites, t('urlFavoritesTab.folders.uncategorized', { defaultValue: '未分类' }));
    const date = new Date().toISOString().slice(0, 10);
    window.api.saveTextFile({
      defaultPath: `eIsland-url-favorites-${date}.${isJson ? 'json' : 'html'}`,
      content,
      filters: isJson
        ? [{ name: 'JSON', extensions: ['json'] }]
        : [{ name: 'HTML', extensions: ['html', 'htm'] }],
    }).then((result) => {
      if (result.ok) {
        showStatusMessage(t('urlFavoritesTab.messages.exportSuccess', { defaultValue: '已导出 {{count}} 条收藏', count: favorites.length }));
        return;
      }
      if (!result.canceled) {
        showStatusMessage(t('urlFavoritesTab.messages.exportFailed', { defaultValue: '导出失败，请稍后重试' }));
      }
    }).catch(() => {
      showStatusMessage(t('urlFavoritesTab.messages.exportFailed', { defaultValue: '导出失败，请稍后重试' }));
    });
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
  const folders = useMemo(
    () => Array.from(new Set(favorites.map((item) => item.folder).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [favorites],
  );
  const visibleFavorites = useMemo(
    () => (activeFolder ? favorites.filter((item) => item.folder === activeFolder) : favorites),
    [activeFolder, favorites],
  );
  const visibleCount = visibleFavorites.length;

  const placeholder = useMemo(
    () => (totalCount > 0
      ? t('urlFavoritesTab.input.placeholderWithItems', { defaultValue: '输入并添加新的 URL 收藏' })
      : t('urlFavoritesTab.input.placeholderEmpty', { defaultValue: '输入 URL，例如 github.com' })),
    [totalCount, t],
  );

  return {
    favorites,
    urlInput,
    setUrlInput,
    expandedId,
    focusedId,
    importFormat,
    setImportFormat,
    exportFormat,
    setExportFormat,
    folderToolsOpen,
    setFolderToolsOpen,
    importExportOpen,
    setImportExportOpen,
    statusMessage,
    draggingId,
    dragOverId,
    activeFolder,
    setActiveFolder,
    newFolderInput,
    setNewFolderInput,
    editUrlInput,
    setEditUrlInput,
    editNoteInput,
    setEditNoteInput,
    editFolderInput,
    setEditFolderInput,
    importInputRef,
    totalCount,
    folders,
    visibleFavorites,
    visibleCount,
    placeholder,
    handleAdd,
    handleOpen,
    handleToggleExpand,
    handleSaveEdit,
    handleRemove,
    handleImportClick,
    handleCreateFolder,
    handleClearFolder,
    handleImportFile,
    handleExport,
    dragMovedRef,
    handleDragStart,
    handleDragOver,
    handleDrop,
    resetDragState,
  };
}
