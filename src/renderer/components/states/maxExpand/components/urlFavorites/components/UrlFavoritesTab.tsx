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
 * @description 最大展开模式 URL 收藏 Tab 组合层。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useUrlFavorites } from '../hooks/useUrlFavorites';
import { UrlFavoritesHeader } from './UrlFavoritesHeader';
import { UrlFavoritesInputBar } from './UrlFavoritesInputBar';
import { UrlFavoritesFolderPanel } from './UrlFavoritesFolderPanel';
import { UrlFavoritesImportExportPanel } from './UrlFavoritesImportExportPanel';
import { UrlFavoritesStatus } from './UrlFavoritesStatus';
import { UrlFavoritesItem } from './UrlFavoritesItem';

/**
 * URL 收藏页
 * @description 最大展开状态下的 URL 收藏管理与编辑面板
 * @returns ReactElement
 */
export function UrlFavoritesTab(): ReactElement {
  const { t } = useTranslation();
  const hook = useUrlFavorites();

  return (
    <div className="url-favorites">
      <UrlFavoritesHeader
        activeFolder={hook.activeFolder}
        visibleCount={hook.visibleCount}
        totalCount={hook.totalCount}
      />

      <UrlFavoritesInputBar
        urlInput={hook.urlInput}
        setUrlInput={hook.setUrlInput}
        placeholder={hook.placeholder}
        onAdd={hook.handleAdd}
        folderToolsOpen={hook.folderToolsOpen}
        onToggleFolderTools={() => hook.setFolderToolsOpen((open) => !open)}
        importExportOpen={hook.importExportOpen}
        onToggleImportExport={() => hook.setImportExportOpen((open) => !open)}
      />

      <UrlFavoritesFolderPanel
        folderToolsOpen={hook.folderToolsOpen}
        folders={hook.folders}
        activeFolder={hook.activeFolder}
        setActiveFolder={hook.setActiveFolder}
        newFolderInput={hook.newFolderInput}
        setNewFolderInput={hook.setNewFolderInput}
        onCreateFolder={hook.handleCreateFolder}
        onClearFolder={hook.handleClearFolder}
      />

      <UrlFavoritesImportExportPanel
        importExportOpen={hook.importExportOpen}
        importInputRef={hook.importInputRef}
        importFormat={hook.importFormat}
        setImportFormat={hook.setImportFormat}
        exportFormat={hook.exportFormat}
        setExportFormat={hook.setExportFormat}
        onImportClick={hook.handleImportClick}
        onImportFile={hook.handleImportFile}
        onExport={hook.handleExport}
        hasFavorites={hook.favorites.length > 0}
      />

      <UrlFavoritesStatus message={hook.statusMessage} />

      <div
        className="url-favorites-list"
        onWheelCapture={(e) => {
          e.stopPropagation();
        }}
      >
        {hook.visibleFavorites.length === 0 ? (
          <div className="url-favorites-empty">
            {hook.favorites.length === 0
              ? t('urlFavoritesTab.empty', { defaultValue: '还没有收藏，先添加一个 URL 吧。' })
              : t('urlFavoritesTab.folders.emptyFiltered', { defaultValue: '当前文件夹还没有收藏。' })}
          </div>
        ) : hook.visibleFavorites.map((item) => (
          <UrlFavoritesItem
            key={item.id}
            item={item}
            isExpanded={hook.expandedId === item.id}
            isFocused={hook.focusedId === item.id}
            isDragOver={hook.dragOverId === item.id}
            isDragging={hook.draggingId === item.id}
            editUrlInput={hook.editUrlInput}
            setEditUrlInput={hook.setEditUrlInput}
            editNoteInput={hook.editNoteInput}
            setEditNoteInput={hook.setEditNoteInput}
            editFolderInput={hook.editFolderInput}
            setEditFolderInput={hook.setEditFolderInput}
            onToggleExpand={hook.handleToggleExpand}
            onOpen={hook.handleOpen}
            onSaveEdit={hook.handleSaveEdit}
            onRemove={hook.handleRemove}
            onDragStart={hook.handleDragStart}
            onDragOver={hook.handleDragOver}
            onDrop={hook.handleDrop}
            onDragEnd={hook.resetDragState}
            dragMovedRef={hook.dragMovedRef}
          />
        ))}
      </div>
    </div>
  );
}
