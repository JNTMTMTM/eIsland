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
 * @file MemoTab.tsx
 * @description 最大展开模式 备忘录 Tab — 多条备忘录管理，支持新建、编辑、删除、搜索
 * @author 鸡哥
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import remarkGfm from 'remark-gfm';
import { SvgIcon } from '../../../../../../utils/SvgIcon';

type MemoViewMode = 'edit' | 'preview' | 'split';
type MemoTagFilter = string | null;

/** 单条备忘录 */
interface MemoItem {
  id: number;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  bookmarked: boolean;
}

/** 存储键名（对应 userData/eIsland_store/memos.json） */
const STORE_KEY = 'memos';

function normalizeTag(value: string): string {
  return value.trim().replace(/^#+/, '').slice(0, 24);
}

function normalizeTagList(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return Array.from(new Set(
    tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map(normalizeTag)
      .filter(Boolean),
  ));
}

/** 规范化旧数据，补全缺失字段 */
function normalizeMemos(items: MemoItem[]): MemoItem[] {
  return items.map((m) => ({
    ...m,
    title: m.title ?? '',
    content: m.content ?? '',
    tags: normalizeTagList((m as Partial<MemoItem>).tags),
    createdAt: m.createdAt ?? Date.now(),
    updatedAt: m.updatedAt ?? m.createdAt ?? Date.now(),
    pinned: m.pinned ?? false,
    bookmarked: m.bookmarked ?? false,
  }));
}

/** 通过 IPC 写入文件 */
function persistMemos(items: MemoItem[]): void {
  window.api.storeWrite(STORE_KEY, items).catch(() => {});
}

/** 格式化时间 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}`;
}

/** 从内容中提取摘要（首行非空文本，截断到 60 字符） */
function extractSummary(content: string): string {
  const plainContent = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#>*_~\-[\]()]/g, ' ');
  const line = plainContent.split('\n').find((l) => l.trim().length > 0)?.trim() ?? '';
  return line.length > 60 ? line.slice(0, 60) + '…' : line;
}

function extractMemoTags(memo: Pick<MemoItem, 'title' | 'content' | 'tags'>): string[] {
  const text = `${memo.title}\n${memo.content}`;
  const inlineTags = Array.from(text.matchAll(/(^|\s)#([\p{L}\p{N}_-]{1,24})/gu))
    .map((match) => match[2]?.trim())
    .filter((tag): tag is string => Boolean(tag));
  return Array.from(new Set([...normalizeTagList(memo.tags), ...inlineTags.map(normalizeTag)].filter(Boolean)));
}

function getMemoSearchText(memo: MemoItem): string {
  return [memo.title, memo.content, ...extractMemoTags(memo)].join('\n').toLowerCase();
}

const MARKDOWN_HIGHLIGHT_PATTERNS = [
  { className: 'memo-tab-markdown-token--code-block', pattern: /(```[\s\S]*?```)/g },
  { className: 'memo-tab-markdown-token--inline-code', pattern: /(`[^`\n]+`)/g },
  { className: 'memo-tab-markdown-token--heading', pattern: /(^|\n)(#{1,6}\s[^\n]*)/g },
  { className: 'memo-tab-markdown-token--strong', pattern: /(\*\*[^*\n]+\*\*|__[^_\n]+__)/g },
  { className: 'memo-tab-markdown-token--emphasis', pattern: /(\*[^*\n]+\*|_[^_\n]+_)/g },
  { className: 'memo-tab-markdown-token--link', pattern: /(\[[^\]\n]+\]\([^\)\n]+\))/g },
  { className: 'memo-tab-markdown-token--quote', pattern: /(^|\n)(>[^\n]*)/g },
  { className: 'memo-tab-markdown-token--list', pattern: /(^|\n)(\s*(?:[-*+]\s|\d+\.\s)[^\n]*)/g },
];

/** 渲染与 textarea 同排版的 Markdown 高亮镜像 */
function renderMarkdownEditorMirror(content: string): React.ReactNode[] {
  const source = content.length > 0 ? content : ' ';
  const ranges = MARKDOWN_HIGHLIGHT_PATTERNS.flatMap(({ className, pattern }) => {
    const regex = new RegExp(pattern.source, pattern.flags);
    return Array.from(source.matchAll(regex)).map((match) => {
      const value = match[2] ?? match[1] ?? match[0];
      const index = match.index ?? 0;
      const start = source.indexOf(value, index);
      return { className, start, end: start + value.length };
    });
  })
    .filter((range) => range.start >= 0 && range.end > range.start)
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .reduce<Array<{ className: string; start: number; end: number }>>((acc, range) => {
      const last = acc[acc.length - 1];
      if (!last || range.start >= last.end) acc.push(range);
      return acc;
    }, []);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (range.start > cursor) nodes.push(source.slice(cursor, range.start));
    nodes.push(
      <span key={`${range.start}-${range.end}-${index}`} className={`memo-tab-markdown-token ${range.className}`}>
        {source.slice(range.start, range.end)}
      </span>,
    );
    cursor = range.end;
  });
  if (cursor < source.length) nodes.push(source.slice(cursor));
  if (source.endsWith('\n')) nodes.push(' ');
  return nodes;
}

function getMarkdownPreviewContent(content: string, placeholder: string): string {
  return content.trim().length > 0 ? content : placeholder;
}

/**
 * Memo Tab
 * @description 最大展开模式下的备忘录面板
 */
export function MemoTab(): React.ReactElement {
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
  const viewModes: Array<{ id: MemoViewMode; label: string }> = [
    { id: 'edit', label: t('maxExpand.memo.editMode', { defaultValue: '编辑' }) },
    { id: 'preview', label: t('maxExpand.memo.previewMode', { defaultValue: '预览' }) },
    { id: 'split', label: t('maxExpand.memo.splitMode', { defaultValue: '分屏' }) },
  ];
  const selectedMemoCount = selectedMemoIds.size;

  return (
    <div className="memo-tab-container">
      {/* 左侧列表 */}
      <div className="memo-tab-sidebar">
        <div className="memo-tab-sidebar-header">
          <button
            className={`memo-tab-bulk-select-toggle ${bulkSelectMode ? 'memo-tab-bulk-select-toggle--active' : ''}`}
            type="button"
            onClick={handleToggleBulkSelect}
            title={bulkSelectMode ? t('maxExpand.memo.cancelSelection', { defaultValue: '取消选择' }) : t('maxExpand.memo.bulkSelect', { defaultValue: '批量选择' })}
            aria-label={bulkSelectMode ? t('maxExpand.memo.cancelSelection', { defaultValue: '取消选择' }) : t('maxExpand.memo.bulkSelect', { defaultValue: '批量选择' })}
          >
            <img className="memo-tab-checked-icon-img" src={SvgIcon.CHECKED} alt="" width="14" height="14" draggable={false} />
          </button>
          <input
            className="memo-tab-search"
            type="text"
            placeholder={t('maxExpand.memo.search', { defaultValue: '搜索备忘录…' })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="memo-tab-add-btn" type="button" onClick={handleAdd} title={t('maxExpand.memo.add', { defaultValue: '新建' })}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="memo-tab-tag-filter-row">
          <button
            className={`memo-tab-bookmark-filter memo-tab-bookmark-filter--tag-row ${bookmarkOnly ? 'memo-tab-bookmark-filter--active' : ''}`}
            type="button"
            onClick={() => setBookmarkOnly((v) => !v)}
            title={bookmarkOnly ? t('maxExpand.memo.showAll', { defaultValue: '显示全部' }) : t('maxExpand.memo.showBookmarked', { defaultValue: '仅显示书签' })}
          >
            <img src={bookmarkOnly ? SvgIcon.BOOKMARK_ON : SvgIcon.BOOKMARK} alt="bookmark-filter" width="14" height="14" draggable={false} />
          </button>
          <div
            ref={tagFilterRef}
            className={`memo-tab-tag-filter ${tagFilterScrollable ? 'memo-tab-tag-filter--scrollable' : ''}`}
            aria-label={t('maxExpand.memo.tagFilter', { defaultValue: '标签筛选' })}
            onWheel={(e) => {
              if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
              e.currentTarget.scrollLeft += e.deltaY;
            }}
          >
            <button
              className={`memo-tab-tag-chip ${activeTag === null ? 'memo-tab-tag-chip--active' : ''}`}
              type="button"
              onClick={() => setActiveTag(null)}
            >
              {t('maxExpand.memo.allTags', { defaultValue: '全部标签' })}
            </button>
            {memoTags.map(([tag, count]) => (
              <button
                key={tag}
                className={`memo-tab-tag-chip ${activeTag === tag ? 'memo-tab-tag-chip--active' : ''}`}
                type="button"
                onClick={() => setActiveTag((current) => (current === tag ? null : tag))}
                title={t('maxExpand.memo.filterByTag', { defaultValue: '按标签筛选' })}
              >
                #{tag}
                <span className="memo-tab-tag-count">{count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={`memo-tab-bulk-actions ${bulkSelectMode ? 'memo-tab-bulk-actions--open' : ''}`} aria-hidden={!bulkSelectMode}>
          <span className="memo-tab-bulk-selected-count">
            {t('maxExpand.memo.selectedCount', { defaultValue: '已选 {{count}} 项', count: selectedMemoCount })}
          </span>
          <button
            className="memo-tab-bulk-delete"
            type="button"
            onClick={handleDeleteSelected}
            disabled={!bulkSelectMode || selectedMemoCount === 0}
            tabIndex={bulkSelectMode ? 0 : -1}
          >
            {t('maxExpand.memo.deleteSelected', { defaultValue: '删除所选' })}
          </button>
          <button className="memo-tab-bulk-cancel" type="button" onClick={handleToggleBulkSelect} tabIndex={bulkSelectMode ? 0 : -1}>
            {t('maxExpand.memo.cancelSelection', { defaultValue: '取消选择' })}
          </button>
        </div>
        <div className="memo-tab-list">
          {!loaded && <div className="memo-tab-loading">{t('maxExpand.memo.loading', { defaultValue: '加载中…' })}</div>}
          {loaded && filteredMemos.length === 0 && (
            <div className="memo-tab-empty">{t('maxExpand.memo.empty', { defaultValue: '暂无备忘录' })}</div>
          )}
          {filteredMemos.map((memo) => {
            const memoSelected = selectedMemoIds.has(memo.id);
            return (
              <button
                key={memo.id}
                className={`memo-tab-item ${selectedId === memo.id ? 'memo-tab-item--active' : ''} ${memo.pinned ? 'memo-tab-item--pinned' : ''} ${bulkSelectMode ? 'memo-tab-item--selectable' : ''} ${memoSelected ? 'memo-tab-item--selected' : ''}`}
                type="button"
                onClick={() => {
                  if (bulkSelectMode) {
                    handleToggleMemoSelection(memo.id);
                    return;
                  }
                  setSelectedId(memo.id);
                  setTimeout(() => editorRef.current?.focus(), 50);
                }}
              >
                <span className={`memo-tab-item-check ${memoSelected ? 'memo-tab-item-check--checked' : ''}`} aria-hidden="true">
                  {memoSelected && <img className="memo-tab-checked-icon-img" src={SvgIcon.CHECKED} alt="" width="10" height="10" draggable={false} />}
                </span>
                <div className="memo-tab-item-title">
                  {memo.pinned && <img className="memo-tab-pin-icon" src={SvgIcon.PIN_ON_TOP} alt="pinned" width="12" height="12" draggable={false} title={t('maxExpand.memo.pinned', { defaultValue: '已置顶' })} />}
                  {memo.bookmarked && <img className="memo-tab-bookmark-icon" src={SvgIcon.BOOKMARK_ON} alt="bookmarked" width="12" height="12" draggable={false} title={t('maxExpand.memo.bookmarked', { defaultValue: '已标记' })} />}
                  {memo.title || t('maxExpand.memo.untitled', { defaultValue: '无标题' })}
                </div>
                <div className="memo-tab-item-summary">{extractSummary(memo.content) || t('maxExpand.memo.noContent', { defaultValue: '无内容' })}</div>
                {extractMemoTags(memo).length > 0 && (
                  <div className="memo-tab-item-tags">
                    {extractMemoTags(memo).slice(0, 3).map((tag) => (
                      <span key={tag} className="memo-tab-item-tag">#{tag}</span>
                    ))}
                  </div>
                )}
                <div className="memo-tab-item-time">{formatTime(memo.updatedAt)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右侧编辑区 */}
      <div className="memo-tab-editor">
        {selectedMemo ? (
          <>
            <div className="memo-tab-editor-toolbar">
              <input
                ref={titleRef}
                className="memo-tab-editor-title"
                type="text"
                placeholder={t('maxExpand.memo.titlePlaceholder', { defaultValue: '标题' })}
                value={selectedMemo.title}
                onChange={(e) => handleTitleChange(selectedMemo.id, e.target.value)}
              />
              <div className="memo-tab-editor-actions">
                <div className="memo-tab-markdown-toolbar" role="group" aria-label={t('maxExpand.memo.markdownModeGroup', { defaultValue: 'Markdown 视图模式' })}>
                  {viewModes.map((mode) => (
                    <button
                      key={mode.id}
                      className={`memo-tab-markdown-mode ${viewMode === mode.id ? 'memo-tab-markdown-mode--active' : ''}`}
                      type="button"
                      onClick={() => setViewMode(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <button
                  className={`memo-tab-editor-tag-toggle ${tagEditorOpen ? 'memo-tab-editor-tag-toggle--active' : ''}`}
                  type="button"
                  onClick={() => setTagEditorOpen((open) => !open)}
                  title={t('maxExpand.memo.editTags', { defaultValue: '编辑标签' })}
                  aria-label={t('maxExpand.memo.editTags', { defaultValue: '编辑标签' })}
                  aria-expanded={tagEditorOpen}
                >
                  #
                </button>
                <button
                  className={`memo-tab-editor-bookmark ${selectedMemo.bookmarked ? 'memo-tab-editor-bookmark--active' : ''}`}
                  type="button"
                  onClick={() => handleToggleBookmark(selectedMemo.id)}
                  title={selectedMemo.bookmarked ? t('maxExpand.memo.unbookmark', { defaultValue: '取消书签' }) : t('maxExpand.memo.bookmark', { defaultValue: '标记书签' })}
                >
                  <img src={selectedMemo.bookmarked ? SvgIcon.BOOKMARK_ON : SvgIcon.BOOKMARK} alt="bookmark" width="14" height="14" draggable={false} />
                </button>
                <button
                  className={`memo-tab-editor-pin ${selectedMemo.pinned ? 'memo-tab-editor-pin--active' : ''}`}
                  type="button"
                  onClick={() => handleTogglePin(selectedMemo.id)}
                  title={selectedMemo.pinned ? t('maxExpand.memo.unpin', { defaultValue: '取消置顶' }) : t('maxExpand.memo.pin', { defaultValue: '置顶' })}
                >
                  <img src={SvgIcon.PIN_ON_TOP} alt="pin" width="14" height="14" draggable={false} />
                </button>
                <button
                  className="memo-tab-editor-delete"
                  type="button"
                  onClick={() => handleDelete(selectedMemo.id)}
                  title={t('maxExpand.memo.delete', { defaultValue: '删除' })}
                >
                  <img src={SvgIcon.DELETE} alt="delete" width="14" height="14" draggable={false} />
                </button>
              </div>
            </div>
            <div className={`memo-tab-editor-tag-panel ${tagEditorOpen ? 'memo-tab-editor-tag-panel--open' : ''}`}>
              <div className="memo-tab-editor-tag-row">
                <div className="memo-tab-editor-tags">
                  {selectedMemo.tags.length === 0 ? (
                    <span className="memo-tab-editor-tag-empty">
                      {t('maxExpand.memo.noTags', { defaultValue: '暂无标签' })}
                    </span>
                  ) : selectedMemo.tags.map((tag) => (
                    <button
                      key={tag}
                      className="memo-tab-editor-tag"
                      type="button"
                      onClick={() => handleRemoveTag(selectedMemo.id, tag)}
                      title={t('maxExpand.memo.removeTag', { defaultValue: '移除标签' })}
                    >
                      #{tag}
                      <span className="memo-tab-editor-tag-remove">×</span>
                    </button>
                  ))}
                </div>
                <div className="memo-tab-tag-input-group">
                  <input
                    className="memo-tab-tag-input"
                    type="text"
                    placeholder={t('maxExpand.memo.tagPlaceholder', { defaultValue: '添加标签' })}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(selectedMemo.id);
                      }
                    }}
                  />
                  <button
                    className="memo-tab-tag-add-btn"
                    type="button"
                    onClick={() => handleAddTag(selectedMemo.id)}
                    title={t('maxExpand.memo.addTag', { defaultValue: '添加标签' })}
                  >
                    #+
                  </button>
                </div>
              </div>
            </div>
            <div className={`memo-tab-markdown-workspace memo-tab-markdown-workspace--${viewMode}`}>
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className="memo-tab-markdown-editor-pane">
                  <div
                    className="memo-tab-markdown-editor-mirror"
                    aria-hidden="true"
                    style={{ transform: `translate(${-editorScroll.left}px, ${-editorScroll.top}px)` }}
                  >
                    {markdownEditorMirror}
                  </div>
                  <textarea
                    ref={editorRef}
                    className="memo-tab-editor-content"
                    placeholder={contentPlaceholder}
                    value={selectedMemo.content}
                    spellCheck={false}
                    onChange={(e) => handleContentChange(selectedMemo.id, e.target.value)}
                    onScroll={(e) => setEditorScroll({ left: e.currentTarget.scrollLeft, top: e.currentTarget.scrollTop })}
                  />
                </div>
              )}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className="memo-tab-markdown-preview-pane">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdownPreviewContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            <div className="memo-tab-editor-footer">
              <span>{t('maxExpand.memo.created', { defaultValue: '创建于' })} {formatTime(selectedMemo.createdAt)}</span>
              <span>{t('maxExpand.memo.updated', { defaultValue: '更新于' })} {formatTime(selectedMemo.updatedAt)}</span>
            </div>
          </>
        ) : (
          <div className="memo-tab-editor-empty">
            <div className="memo-tab-editor-empty-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" strokeWidth="2"/><path d="M16 16h16M16 24h12M16 32h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div className="memo-tab-editor-empty-text">{t('maxExpand.memo.selectHint', { defaultValue: '选择或新建一条备忘录' })}</div>
          </div>
        )}
      </div>
    </div>
  );
}
