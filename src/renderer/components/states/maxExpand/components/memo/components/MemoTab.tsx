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
 * @description 最大展开模式 备忘录 Tab — 薄组合层，由 useMemoTab hook 驱动
 * @author 鸡哥
 */

import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import remarkGfm from 'remark-gfm';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { useMemoTab } from '../hooks/useMemoTab';
import { extractSummary, extractMemoTags, formatTime } from '../utils/memoUtils';

/**
 * Memo Tab — 最大展开模式下的备忘录面板
 */
export function MemoTab(): React.ReactElement {
  const { t } = useTranslation();
  const {
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
  } = useMemoTab();

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
