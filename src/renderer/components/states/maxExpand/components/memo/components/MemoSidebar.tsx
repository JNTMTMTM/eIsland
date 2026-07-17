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
 * @file MemoSidebar.tsx
 * @description 备忘录左侧面板 — 搜索、标签筛选、批量操作、备忘录列表
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import type { MemoSidebarProps } from '../types/memoTypes';
import { extractSummary, extractMemoTags, formatTime } from '../utils/memoUtils';

/**
 * 备忘录左侧面板
 * @param props - 组件入参
 */
export function MemoSidebar({
  loaded,
  filteredMemos,
  selectedId,
  setSelectedId,
  search,
  setSearch,
  activeTag,
  setActiveTag,
  bookmarkOnly,
  setBookmarkOnly,
  bulkSelectMode,
  selectedMemoIds,
  tagFilterScrollable,
  editorRef,
  tagFilterRef,
  memoTags,
  selectedMemoCount,
  handleAdd,
  handleToggleBulkSelect,
  handleToggleMemoSelection,
  handleDeleteSelected,
}: MemoSidebarProps): React.ReactElement {
  const { t } = useTranslation();

  return (
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
  );
}
