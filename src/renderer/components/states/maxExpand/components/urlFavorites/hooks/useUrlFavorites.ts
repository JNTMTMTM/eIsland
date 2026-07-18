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
 * @description URL 收藏模块主 hook，组合持久化、导入导出、拖拽子 hook。
 * @author 鸡哥
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUrlFavoritesPersistence } from './useUrlFavoritesPersistence';
import { useUrlFavoritesImportExport } from './useUrlFavoritesImportExport';
import { useUrlFavoritesDnd } from './useUrlFavoritesDnd';
import type { UrlFavoriteItem, UseUrlFavoritesReturn } from '../types/urlFavoritesTypes';
import { normalizeUrl, normalizeFolder } from '../utils/urlFavoritesUtils';

/**
 * URL 收藏模块主 hook
 * @returns UseUrlFavoritesReturn
 */
export function useUrlFavorites(): UseUrlFavoritesReturn {
  const { t } = useTranslation();
  /* UI 状态 */
  const [urlInput, setUrlInput] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [folderToolsOpen, setFolderToolsOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [activeFolder, setActiveFolder] = useState('');
  const [newFolderInput, setNewFolderInput] = useState('');
  const [editUrlInput, setEditUrlInput] = useState('');
  const [editNoteInput, setEditNoteInput] = useState('');
  const [editFolderInput, setEditFolderInput] = useState('');
  const statusTimerRef = useRef<number | null>(null);

  /* 状态消息（带自动清除） */
  const showStatusMessage = (message: string): void => {
    if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
    setStatusMessage(message);
    statusTimerRef.current = window.setTimeout(() => {
      statusTimerRef.current = null;
      setStatusMessage((current) => (current === message ? '' : current));
    }, 2400);
  };

  useEffect(() => () => {
    if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
  }, []);

  /* 焦点恢复回调（传给持久化 hook） */
  const handleExpandForFocus = (item: UrlFavoriteItem): void => {
    setExpandedId(item.id);
    setEditUrlInput(item.url);
    setEditNoteInput(item.note);
    setEditFolderInput(item.folder);
  };

  const handleFocusedForFocus = (id: number): void => {
    setFocusedId(id);
    window.setTimeout(() => {
      setFocusedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  /* 子 hooks */
  const { favorites, setFavorites, loaded } = useUrlFavoritesPersistence(
    handleExpandForFocus,
    handleFocusedForFocus,
  );

  const importExport = useUrlFavoritesImportExport(favorites, setFavorites, showStatusMessage);
  const dnd = useUrlFavoritesDnd(setFavorites);

  /* 收藏操作 */
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

  /* 派生数据 */
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
    importFormat: importExport.importFormat,
    setImportFormat: importExport.setImportFormat,
    exportFormat: importExport.exportFormat,
    setExportFormat: importExport.setExportFormat,
    folderToolsOpen,
    setFolderToolsOpen,
    importExportOpen,
    setImportExportOpen,
    statusMessage,
    draggingId: dnd.draggingId,
    dragOverId: dnd.dragOverId,
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
    importInputRef: importExport.importInputRef,
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
    handleImportClick: importExport.handleImportClick,
    handleCreateFolder,
    handleClearFolder,
    handleImportFile: importExport.handleImportFile,
    handleExport: importExport.handleExport,
    dragMovedRef: dnd.dragMovedRef,
    handleDragStart: dnd.handleDragStart,
    handleDragOver: dnd.handleDragOver,
    handleDrop: dnd.handleDrop,
    resetDragState: dnd.resetDragState,
  };
}
