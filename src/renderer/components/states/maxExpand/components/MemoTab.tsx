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

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../utils/SvgIcon';

/** 单条备忘录 */
interface MemoItem {
  id: number;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  bookmarked: boolean;
}

/** 存储键名（对应 userData/eIsland_store/memos.json） */
const STORE_KEY = 'memos';

/** 规范化旧数据，补全缺失字段 */
function normalizeMemos(items: MemoItem[]): MemoItem[] {
  return items.map((m) => ({
    ...m,
    title: m.title ?? '',
    content: m.content ?? '',
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
  const line = content.split('\n').find((l) => l.trim().length > 0) ?? '';
  return line.length > 60 ? line.slice(0, 60) + '…' : line;
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
  const skipPersistOnceRef = useRef(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

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
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

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

  /** 过滤 & 排序：置顶优先，然后按更新时间倒序 */
  const filteredMemos = memos
    .filter((m) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });

  const selectedMemo = memos.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="memo-tab-container">
      {/* 左侧列表 */}
      <div className="memo-tab-sidebar">
        <div className="memo-tab-sidebar-header">
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
        <div className="memo-tab-list">
          {!loaded && <div className="memo-tab-loading">{t('maxExpand.memo.loading', { defaultValue: '加载中…' })}</div>}
          {loaded && filteredMemos.length === 0 && (
            <div className="memo-tab-empty">{t('maxExpand.memo.empty', { defaultValue: '暂无备忘录' })}</div>
          )}
          {filteredMemos.map((memo) => (
            <button
              key={memo.id}
              className={`memo-tab-item ${selectedId === memo.id ? 'memo-tab-item--active' : ''} ${memo.pinned ? 'memo-tab-item--pinned' : ''}`}
              type="button"
              onClick={() => {
                setSelectedId(memo.id);
                setTimeout(() => editorRef.current?.focus(), 50);
              }}
            >
              <div className="memo-tab-item-title">
                {memo.pinned && <img className="memo-tab-pin-icon" src={SvgIcon.PIN_ON_TOP} alt="pinned" width="12" height="12" draggable={false} title={t('maxExpand.memo.pinned', { defaultValue: '已置顶' })} />}
                {memo.bookmarked && <img className="memo-tab-bookmark-icon" src={SvgIcon.BOOKMARK_ON} alt="bookmarked" width="12" height="12" draggable={false} title={t('maxExpand.memo.bookmarked', { defaultValue: '已标记' })} />}
                {memo.title || t('maxExpand.memo.untitled', { defaultValue: '无标题' })}
              </div>
              <div className="memo-tab-item-summary">{extractSummary(memo.content) || t('maxExpand.memo.noContent', { defaultValue: '无内容' })}</div>
              <div className="memo-tab-item-time">{formatTime(memo.updatedAt)}</div>
            </button>
          ))}
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
            <textarea
              ref={editorRef}
              className="memo-tab-editor-content"
              placeholder={t('maxExpand.memo.contentPlaceholder', { defaultValue: '在这里写点什么…' })}
              value={selectedMemo.content}
              onChange={(e) => handleContentChange(selectedMemo.id, e.target.value)}
            />
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
