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
 * @file UrlFavoritesItem.tsx
 * @description URL 收藏模块单条收藏项，包含摘要按钮与展开编辑器。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { getWebsiteFaviconUrl } from '../../../../../../api/site/siteMetaApi';
import type { UrlFavoritesItemProps } from '../types/urlFavoritesTypes';

/**
 * 单条 URL 收藏项
 * @param props - 组件入参
 * @returns ReactElement
 */
export function UrlFavoritesItem({
  item,
  isExpanded,
  isFocused,
  isDragOver,
  isDragging,
  editUrlInput,
  setEditUrlInput,
  editNoteInput,
  setEditNoteInput,
  editFolderInput,
  setEditFolderInput,
  onToggleExpand,
  onOpen,
  onSaveEdit,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragMovedRef,
}: UrlFavoritesItemProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div
      className={`url-favorites-item${isFocused ? ' url-favorites-item--focused' : ''}${isDragOver ? ' url-favorites-item--drag-over' : ''}${isDragging ? ' url-favorites-item--dragging' : ''}`}
      data-url-favorite-id={item.id}
      onDragOver={(e) => onDragOver(e, item.id)}
      onDrop={(e) => onDrop(e, item.id)}
    >
      <button
        className="url-favorites-summary"
        type="button"
        draggable
        onDragStart={(e) => onDragStart(e, item.id)}
        onDragEnd={onDragEnd}
        onClick={() => {
          if (dragMovedRef.current) return;
          onToggleExpand(item);
        }}
        title={item.url}
      >
        <img className="url-favorites-favicon" src={getWebsiteFaviconUrl(item.url)} alt="" aria-hidden="true" onError={(e) => { (e.target as HTMLImageElement).src = SvgIcon.LINK; }} />
        <span
          className="url-favorites-site-name"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpen(item.url);
          }}
          title={t('urlFavoritesTab.openWebsiteTitle', { defaultValue: '点击打开网站' })}
        >
          {item.title && item.title !== item.url ? item.title : t('urlFavoritesTab.resolvingTitle', { defaultValue: '读取网页名称中…' })}
        </span>
        <span className="url-favorites-note" title={item.note || t('urlFavoritesTab.noNote', { defaultValue: '未备注' })}>{item.note || t('urlFavoritesTab.noNote', { defaultValue: '未备注' })}</span>
        <span className="url-favorites-folder-label" title={item.folder || t('urlFavoritesTab.folders.uncategorized', { defaultValue: '未分类' })}>
          {item.folder || t('urlFavoritesTab.folders.uncategorized', { defaultValue: '未分类' })}
        </span>
        <span className="url-favorites-expand-indicator">
          {isExpanded
            ? t('urlFavoritesTab.actions.collapse', { defaultValue: '收起' })
            : t('urlFavoritesTab.actions.expand', { defaultValue: '展开' })}
        </span>
      </button>

      <div className={`url-favorites-editor-wrapper${isExpanded ? ' url-favorites-editor-wrapper--open' : ''}`}>
        <div className="url-favorites-editor-inner">
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
                    onSaveEdit(item.id);
                  }
                }}
                placeholder={t('urlFavoritesTab.editor.notePlaceholder', { defaultValue: '输入备注' })}
              />
            </div>
            <div className="url-favorites-editor-row">
              <span className="url-favorites-editor-label">{t('urlFavoritesTab.editor.folderLabel', { defaultValue: '文件夹' })}</span>
              <input
                className="url-favorites-folder-edit-input"
                type="text"
                value={editFolderInput}
                onChange={(e) => setEditFolderInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSaveEdit(item.id);
                  }
                }}
                placeholder={t('urlFavoritesTab.editor.folderPlaceholder', { defaultValue: '输入文件夹名称，留空为未分类' })}
                list="url-favorites-folder-options"
              />
            </div>
            <div className="url-favorites-editor-actions">
              <button className="url-favorites-save" type="button" onClick={() => onSaveEdit(item.id)}>
                {t('urlFavoritesTab.actions.save', { defaultValue: '保存' })}
              </button>
              <button
                className="url-favorites-remove"
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={t('urlFavoritesTab.actions.removeAria', { defaultValue: '删除 URL 收藏' })}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
