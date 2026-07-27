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
 * @file AlbumTab.tsx
 * @description 最大展开模式相册页主组件：仅负责 hook 调用与组件组合。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_EXTS } from '../config/albumConfig';
import { useAlbumItems } from '../hooks/useAlbumItems';
import { useAlbumViewer } from '../hooks/useAlbumViewer';
import { useAlbumViewerActions } from '../hooks/useAlbumViewerActions';
import { useAlbumSelection } from '../hooks/useAlbumSelection';
import { useAlbumGridConfig } from '../hooks/useAlbumGridConfig';
import { useAlbumDrag } from '../hooks/useAlbumDrag';
import { AlbumHeader } from './AlbumHeader';
import { AlbumOverview } from './AlbumOverview';
import { AlbumViewer } from './AlbumViewer';
import { AlbumSelectionBar } from './AlbumSelectionBar';

/**
 * 相册页主组件：hook 调用 → 组件组合。
 */
export function AlbumTab(): ReactElement {
  const { t } = useTranslation();

  /* ── Hook: 条目管理 ── */
  const {
    items, loaded, metaCache, statusMessage, setStatusMessage,
    fileInputRef, gridVideoRefs, initColumns, initSortMode, initGroupMode,
    loadExifIfNeeded, loadFullImage, handleAddFiles, handleRemove, handleRemoveSelected,
    handleThumbMouseEnter, handleThumbMouseLeave,
    handleFileInputChange, handlePickFiles,
  } = useAlbumItems();

  /* ── Hook: 网格配置 ── */
  const {
    columns, sortMode, filterMode, groupMode, filteredItems, groupedItems,
    handleColumnsChange, handleSortChange, handleFilterModeChange, handleGroupModeChange,
  } = useAlbumGridConfig(items, metaCache, loaded, initColumns, initSortMode, initGroupMode);

  /* ── Hook: 查看器 ── */
  const viewer = useAlbumViewer(items, filteredItems, metaCache, loadExifIfNeeded, loadFullImage);
  const { activeId, setActiveId } = viewer;

  /* ── Hook: 查看器动作 ── */
  const { handleOpenInExplorer, handleSaveAs, handleSetAsIslandBackground, handleOriginalZoom } =
    useAlbumViewerActions(viewer.activeMeta, setStatusMessage, viewer.handleResetZoom);

  /* ── Hook: 多选 ── */
  const {
    selectedIds, selectMode, selectedCount, allVisibleSelected,
    handleToggleItemSelection, handleSelectAllVisible, handleClearSelection, handleToggleSelectMode,
    handleRemoveSelectedItems,
  } = useAlbumSelection(items, filteredItems, activeId, setActiveId, handleRemoveSelected);

  /* ── Hook: 拖拽导入 ── */
  const { dragOverPage, handleDragOver, handleDragLeave, handleDrop } = useAlbumDrag(handleAddFiles);

  return (
    <div
      className={`album-tab${dragOverPage ? ' album-tab--drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <AlbumHeader
        totalCount={items.length}
        sortMode={sortMode}
        filterMode={filterMode}
        groupMode={groupMode}
        columns={columns}
        selectMode={selectMode}
        filteredCount={filteredItems.length}
        onSortChange={handleSortChange}
        onFilterModeChange={handleFilterModeChange}
        onGroupModeChange={handleGroupModeChange}
        onColumnsChange={handleColumnsChange}
        onPickFiles={handlePickFiles}
        onToggleSelectMode={handleToggleSelectMode}
      />

      {statusMessage ? <div className="album-status">{statusMessage}</div> : null}

      <input
        ref={fileInputRef}
        className="album-file-input"
        type="file"
        accept={SUPPORTED_EXTS.map((e) => `.${e}`).join(',')}
        multiple
        onChange={handleFileInputChange}
      />

      {activeId === null ? (
        <AlbumOverview
          totalCount={items.length}
          filteredCount={filteredItems.length}
          columns={columns}
          groupMode={groupMode}
          groupedItems={groupedItems}
          metaCache={metaCache}
          selectedIds={selectedIds}
          selectMode={selectMode}
          onToggleSelection={handleToggleItemSelection}
          onOpen={viewer.handleOpenItem}
          onRemove={handleRemove}
          onMouseEnter={handleThumbMouseEnter}
          onMouseLeave={handleThumbMouseLeave}
          gridVideoRefs={gridVideoRefs}
          onPickFiles={handlePickFiles}
        />
      ) : (
        <AlbumViewer
          viewer={viewer}
          filteredCount={filteredItems.length}
          onBack={() => setActiveId(null)}
          onOriginalZoom={handleOriginalZoom}
          onOpenInExplorer={handleOpenInExplorer}
          onSaveAs={handleSaveAs}
          onSetAsIslandBackground={handleSetAsIslandBackground}
        />
      )}

      <AlbumSelectionBar
        selectMode={selectMode}
        selectedCount={selectedCount}
        filteredCount={filteredItems.length}
        allVisibleSelected={allVisibleSelected}
        onSelectAllVisible={handleSelectAllVisible}
        onClearSelection={handleClearSelection}
        onRemoveSelected={handleRemoveSelectedItems}
        onToggleSelectMode={handleToggleSelectMode}
      />

      {dragOverPage ? (
        <div className="album-drop-mask" aria-hidden="true">
          <span className="album-drop-mask-text">{t('albumTab.dropHint')}</span>
        </div>
      ) : null}
    </div>
  );
}
