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

import { useMemoTab } from '../hooks/useMemoTab';
import { MemoSidebar } from './MemoSidebar';
import { MemoEditor } from './MemoEditor';
import { MemoEditorEmpty } from './MemoEditorEmpty';

/**
 * Memo Tab — 最大展开模式下的备忘录面板
 */
export function MemoTab(): React.ReactElement {
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
      <MemoSidebar
        loaded={loaded}
        filteredMemos={filteredMemos}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        search={search}
        setSearch={setSearch}
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        bookmarkOnly={bookmarkOnly}
        setBookmarkOnly={setBookmarkOnly}
        bulkSelectMode={bulkSelectMode}
        selectedMemoIds={selectedMemoIds}
        tagFilterScrollable={tagFilterScrollable}
        editorRef={editorRef}
        tagFilterRef={tagFilterRef}
        memoTags={memoTags}
        selectedMemoCount={selectedMemoCount}
        handleAdd={handleAdd}
        handleToggleBulkSelect={handleToggleBulkSelect}
        handleToggleMemoSelection={handleToggleMemoSelection}
        handleDeleteSelected={handleDeleteSelected}
      />
      {selectedMemo ? (
        <MemoEditor
          selectedMemo={selectedMemo}
          tagInput={tagInput}
          setTagInput={setTagInput}
          tagEditorOpen={tagEditorOpen}
          setTagEditorOpen={setTagEditorOpen}
          viewMode={viewMode}
          setViewMode={setViewMode}
          editorScroll={editorScroll}
          setEditorScroll={setEditorScroll}
          editorRef={editorRef}
          titleRef={titleRef}
          contentPlaceholder={contentPlaceholder}
          markdownPreviewContent={markdownPreviewContent}
          markdownEditorMirror={markdownEditorMirror}
          viewModes={viewModes}
          handleDelete={handleDelete}
          handleToggleBookmark={handleToggleBookmark}
          handleTogglePin={handleTogglePin}
          handleTitleChange={handleTitleChange}
          handleContentChange={handleContentChange}
          handleAddTag={handleAddTag}
          handleRemoveTag={handleRemoveTag}
        />
      ) : (
        <div className="memo-tab-editor">
          <MemoEditorEmpty />
        </div>
      )}
    </div>
  );
}
