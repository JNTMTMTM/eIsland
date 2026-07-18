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
 * @file useMemoTab.ts
 * @description 备忘录 Tab 状态管理 hook，包含加载、持久化、增删改查、筛选等全部逻辑
 * @author 鸡哥
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { MemoItem, MemoViewMode, MemoTagFilter, UseMemoTabReturn } from '../types/memoTypes';
import { STORE_KEY, VIEW_MODE_CONFIGS } from '../config/memoConfig';
import {
  normalizeTag,
  normalizeTagList,
  normalizeMemos,
  persistMemos,
  extractMemoTags,
  getMemoSearchText,
  renderMarkdownEditorMirror,
  getMarkdownPreviewContent,
} from '../utils/memoUtils';

/**
 * 备忘录 Tab 状态管理 hook
 * @returns 备忘录模块全部状态与操作方法
 */
export function useMemoTab(): UseMemoTabReturn {
  const { t } = useTranslation();
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<MemoTagFilter>(null);
  const [tagInput, setTagInput] = useState('');
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [bookmarkOnly, setBookmarkOnly] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedMemoIds, setSelectedMemoIds] = useState<Set<number>>(() => new Set());
  const [tagFilterScrollable, setTagFilterScrollable] = useState(false);
  const [viewMode, setViewMode] = useState<MemoViewMode>('edit');
  const [editorScroll, setEditorScroll] = useState({ left: 0, top: 0 });
  const skipPersistOnceRef = useRef(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const tagFilterRef = useRef<HTMLDivElement>(null);

  /** 启动时从文件加载 */
  useEffect(() => {
    let cancelled = false;
    const applyMemos = (data: unknown): void => {
      if (!Array.isArray(data)) return;
      skipPersistOnceRef.current = true;
      setMemos(normalizeMemos(data as MemoItem[]));
    };

    window.api.storeRead(STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data) && data.length > 0) {
        setMemos(normalizeMemos(data as MemoItem[]));
      }
      setLoaded(true);
    }).catch(() => {
      if (!cancelled) setLoaded(true);
    });

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${STORE_KEY}`) {
        applyMemos(value);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  /** 当 memos 变化时持久化 */
  useEffect(() => {
    if (!loaded) return;
    if (skipPersistOnceRef.current) {
      skipPersistOnceRef.current = false;
      return;
    }
    persistMemos(memos);
  }, [memos, loaded]);

  /** 新建备忘录 */
  const handleAdd = useCallback((): void => {
    const now = Date.now();
    const newMemo: MemoItem = {
      id: now,
      title: '',
      content: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
      pinned: false,
      bookmarked: false,
    };
    setMemos((prev) => [newMemo, ...prev]);
    setSelectedId(now);
    setTimeout(() => titleRef.current?.focus(), 50);
  }, []);

  /** 删除备忘录 */
  const handleDelete = useCallback((id: number): void => {
    setMemos((prev) => prev.filter((m) => m.id !== id));
    setSelectedMemoIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const handleToggleBulkSelect = useCallback((): void => {
    setBulkSelectMode((enabled) => {
      if (enabled) setSelectedMemoIds(new Set());
      return !enabled;
    });
  }, []);

  const handleToggleMemoSelection = useCallback((id: number): void => {
    setSelectedMemoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback((): void => {
    if (selectedMemoIds.size === 0) return;
    setMemos((prev) => prev.filter((m) => !selectedMemoIds.has(m.id)));
    if (selectedId !== null && selectedMemoIds.has(selectedId)) setSelectedId(null);
    setSelectedMemoIds(new Set());
    setBulkSelectMode(false);
  }, [selectedMemoIds, selectedId]);

  /** 标记/取消书签 */
  const handleToggleBookmark = useCallback((id: number): void => {
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, bookmarked: !m.bookmarked, updatedAt: Date.now() } : m)),
    );
  }, []);

  /** 置顶/取消置顶 */
  const handleTogglePin = useCallback((id: number): void => {
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, pinned: !m.pinned, updatedAt: Date.now() } : m)),
    );
  }, []);

  /** 更新标题 */
  const handleTitleChange = useCallback((id: number, title: string): void => {
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, title, updatedAt: Date.now() } : m)),
    );
  }, []);

  /** 更新内容 */
  const handleContentChange = useCallback((id: number, content: string): void => {
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content, updatedAt: Date.now() } : m)),
    );
  }, []);

  const handleAddTag = useCallback((id: number): void => {
    const tag = normalizeTag(tagInput);
    if (!tag) return;
    setMemos((prev) => prev.map((m) => {
      if (m.id !== id) return m;
      const tags = normalizeTagList([...m.tags, tag]);
      return { ...m, tags, updatedAt: Date.now() };
    }));
    setActiveTag(tag);
    setTagInput('');
  }, [tagInput]);

  const handleRemoveTag = useCallback((id: number, tag: string): void => {
    setMemos((prev) => prev.map((m) => {
      if (m.id !== id) return m;
      return { ...m, tags: m.tags.filter((item) => item !== tag), updatedAt: Date.now() };
    }));
  }, []);

  const memoTags = useMemo(() => {
    const counts = new Map<string, number>();
    memos.forEach((memo) => {
      extractMemoTags(memo).forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [memos]);

  useEffect(() => {
    if (activeTag && !memoTags.some(([tag]) => tag === activeTag)) {
      setActiveTag(null);
    }
  }, [activeTag, memoTags]);

  useEffect(() => {
    const memoIds = new Set(memos.map((memo) => memo.id));
    setSelectedMemoIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => memoIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
    if (memos.length === 0) setBulkSelectMode(false);
  }, [memos]);

  useEffect(() => {
    const tagFilter = tagFilterRef.current;
    if (!tagFilter) return;

    const updateScrollable = (): void => {
      setTagFilterScrollable(tagFilter.scrollWidth > tagFilter.clientWidth + 1);
    };

    updateScrollable();
    const resizeObserver = new ResizeObserver(updateScrollable);
    resizeObserver.observe(tagFilter);
    return () => resizeObserver.disconnect();
  }, [memoTags]);

  /** 过滤 & 排序：标签/书签/全文搜索后，置顶优先，然后按更新时间倒序 */
  const filteredMemos = memos
    .filter((m) => {
      if (bookmarkOnly && !m.bookmarked) return false;
      const tags = extractMemoTags(m);
      if (activeTag && !tags.includes(activeTag)) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return getMemoSearchText(m).includes(q);
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });

  const selectedMemo = memos.find((m) => m.id === selectedId) ?? null;
  const contentPlaceholder = t('maxExpand.memo.contentPlaceholder', { defaultValue: '在这里写点什么…' });
  const markdownPreviewContent = selectedMemo ? getMarkdownPreviewContent(selectedMemo.content, contentPlaceholder) : '';
  const markdownEditorMirror = useMemo(
    () => renderMarkdownEditorMirror(selectedMemo?.content ?? ''),
    [selectedMemo?.content],
  );
  const viewModes = VIEW_MODE_CONFIGS.map((cfg) => ({
    id: cfg.id,
    label: t(cfg.key, { defaultValue: cfg.defaultValue }),
  }));
  const selectedMemoCount = selectedMemoIds.size;

  return {
    memos,
    loaded,
    selectedId,
    setSelectedId,
    search,
    setSearch,
    activeTag,
    setActiveTag,
    tagInput,
    setTagInput,
    tagEditorOpen,
    setTagEditorOpen,
    bookmarkOnly,
    setBookmarkOnly,
    bulkSelectMode,
    selectedMemoIds,
    tagFilterScrollable,
    viewMode,
    setViewMode,
    editorScroll,
    setEditorScroll,
    editorRef,
    titleRef,
    tagFilterRef,
    memoTags,
    filteredMemos,
    selectedMemo,
    contentPlaceholder,
    markdownPreviewContent,
    markdownEditorMirror,
    viewModes,
    selectedMemoCount,
    handleAdd,
    handleDelete,
    handleToggleBulkSelect,
    handleToggleMemoSelection,
    handleDeleteSelected,
    handleToggleBookmark,
    handleTogglePin,
    handleTitleChange,
    handleContentChange,
    handleAddTag,
    handleRemoveTag,
  };
}
