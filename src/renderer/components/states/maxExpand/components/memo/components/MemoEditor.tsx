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
 * @file MemoEditor.tsx
 * @description 备忘录右侧编辑面板 — 标题栏、标签编辑、Markdown 工作区、时间戳
 * @author 鸡哥
 */

import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import remarkGfm from 'remark-gfm';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import type { MemoEditorProps } from '../types/memoTypes';
import { formatTime } from '../utils/memoUtils';

/**
 * 备忘录右侧编辑面板
 * @param props - 组件入参
 */
export function MemoEditor({
  selectedMemo,
  tagInput,
  setTagInput,
  tagEditorOpen,
  setTagEditorOpen,
  viewMode,
  setViewMode,
  editorScroll,
  setEditorScroll,
  editorRef,
  titleRef,
  contentPlaceholder,
  markdownPreviewContent,
  markdownEditorMirror,
  viewModes,
  handleDelete,
  handleToggleBookmark,
  handleTogglePin,
  handleTitleChange,
  handleContentChange,
  handleAddTag,
  handleRemoveTag,
}: MemoEditorProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="memo-tab-editor">
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
    </div>
  );
}
