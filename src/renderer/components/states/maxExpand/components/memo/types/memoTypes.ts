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
 * @file memoTypes.ts
 * @description 备忘录模块类型定义
 * @author 鸡哥
 */

/** 编辑器视图模式 */
export type MemoViewMode = 'edit' | 'preview' | 'split';

/** 标签筛选值 */
export type MemoTagFilter = string | null;

/** 单条备忘录 */
export interface MemoItem {
  id: number;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  bookmarked: boolean;
}

/** useMemoTab hook 返回值类型 */
export interface UseMemoTabReturn {
  memos: MemoItem[];
  loaded: boolean;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  search: string;
  setSearch: (value: string) => void;
  activeTag: MemoTagFilter;
  setActiveTag: (tag: MemoTagFilter | ((prev: MemoTagFilter) => MemoTagFilter)) => void;
  tagInput: string;
  setTagInput: (value: string) => void;
  tagEditorOpen: boolean;
  setTagEditorOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  bookmarkOnly: boolean;
  setBookmarkOnly: (value: boolean | ((prev: boolean) => boolean)) => void;
  bulkSelectMode: boolean;
  selectedMemoIds: Set<number>;
  tagFilterScrollable: boolean;
  viewMode: MemoViewMode;
  setViewMode: (mode: MemoViewMode) => void;
  editorScroll: { left: number; top: number };
  setEditorScroll: (scroll: { left: number; top: number }) => void;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  titleRef: React.RefObject<HTMLInputElement | null>;
  tagFilterRef: React.RefObject<HTMLDivElement | null>;
  memoTags: Array<[string, number]>;
  filteredMemos: MemoItem[];
  selectedMemo: MemoItem | null;
  contentPlaceholder: string;
  markdownPreviewContent: string;
  markdownEditorMirror: React.ReactNode[];
  viewModes: Array<{ id: MemoViewMode; label: string }>;
  selectedMemoCount: number;
  handleAdd: () => void;
  handleDelete: (id: number) => void;
  handleToggleBulkSelect: () => void;
  handleToggleMemoSelection: (id: number) => void;
  handleDeleteSelected: () => void;
  handleToggleBookmark: (id: number) => void;
  handleTogglePin: (id: number) => void;
  handleTitleChange: (id: number, title: string) => void;
  handleContentChange: (id: number, content: string) => void;
  handleAddTag: (id: number) => void;
  handleRemoveTag: (id: number, tag: string) => void;
}

/** MemoSidebar 组件入参 */
export interface MemoSidebarProps {
  loaded: boolean;
  filteredMemos: MemoItem[];
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  search: string;
  setSearch: (value: string) => void;
  activeTag: MemoTagFilter;
  setActiveTag: (tag: MemoTagFilter | ((prev: MemoTagFilter) => MemoTagFilter)) => void;
  bookmarkOnly: boolean;
  setBookmarkOnly: (value: boolean | ((prev: boolean) => boolean)) => void;
  bulkSelectMode: boolean;
  selectedMemoIds: Set<number>;
  tagFilterScrollable: boolean;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  tagFilterRef: React.RefObject<HTMLDivElement | null>;
  memoTags: Array<[string, number]>;
  selectedMemoCount: number;
  handleAdd: () => void;
  handleToggleBulkSelect: () => void;
  handleToggleMemoSelection: (id: number) => void;
  handleDeleteSelected: () => void;
}

/** MemoEditor 组件入参 */
export interface MemoEditorProps {
  selectedMemo: MemoItem;
  tagInput: string;
  setTagInput: (value: string) => void;
  tagEditorOpen: boolean;
  setTagEditorOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  viewMode: MemoViewMode;
  setViewMode: (mode: MemoViewMode) => void;
  editorScroll: { left: number; top: number };
  setEditorScroll: (scroll: { left: number; top: number }) => void;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  titleRef: React.RefObject<HTMLInputElement | null>;
  contentPlaceholder: string;
  markdownPreviewContent: string;
  markdownEditorMirror: React.ReactNode[];
  viewModes: Array<{ id: MemoViewMode; label: string }>;
  handleDelete: (id: number) => void;
  handleToggleBookmark: (id: number) => void;
  handleTogglePin: (id: number) => void;
  handleTitleChange: (id: number, title: string) => void;
  handleContentChange: (id: number, content: string) => void;
  handleAddTag: (id: number) => void;
  handleRemoveTag: (id: number, tag: string) => void;
}
