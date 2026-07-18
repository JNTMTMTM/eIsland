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
 * @file urlFavoritesTypes.ts
 * @description URL 收藏模块类型定义。
 * @author 鸡哥
 */

/** 单条 URL 收藏 */
export interface UrlFavoriteItem {
  id: number;
  url: string;
  title: string;
  note: string;
  folder: string;
  createdAt: number;
}

/** 导入格式 */
export type UrlFavoritesImportFormat = 'json' | 'html';

/** 导出格式 */
export type UrlFavoritesExportFormat = 'json' | 'html';

/** useUrlFavorites hook 返回值类型 */
export interface UseUrlFavoritesReturn {
  favorites: UrlFavoriteItem[];
  urlInput: string;
  setUrlInput: React.Dispatch<React.SetStateAction<string>>;
  expandedId: number | null;
  focusedId: number | null;
  importFormat: UrlFavoritesImportFormat;
  setImportFormat: React.Dispatch<React.SetStateAction<UrlFavoritesImportFormat>>;
  exportFormat: UrlFavoritesExportFormat;
  setExportFormat: React.Dispatch<React.SetStateAction<UrlFavoritesExportFormat>>;
  folderToolsOpen: boolean;
  setFolderToolsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  importExportOpen: boolean;
  setImportExportOpen: React.Dispatch<React.SetStateAction<boolean>>;
  statusMessage: string;
  draggingId: number | null;
  dragOverId: number | null;
  activeFolder: string;
  setActiveFolder: React.Dispatch<React.SetStateAction<string>>;
  newFolderInput: string;
  setNewFolderInput: React.Dispatch<React.SetStateAction<string>>;
  editUrlInput: string;
  setEditUrlInput: React.Dispatch<React.SetStateAction<string>>;
  editNoteInput: string;
  setEditNoteInput: React.Dispatch<React.SetStateAction<string>>;
  editFolderInput: string;
  setEditFolderInput: React.Dispatch<React.SetStateAction<string>>;
  importInputRef: React.RefObject<HTMLInputElement | null>;
  totalCount: number;
  folders: string[];
  visibleFavorites: UrlFavoriteItem[];
  visibleCount: number;
  placeholder: string;
  handleAdd: () => void;
  handleOpen: (url: string) => void;
  handleToggleExpand: (item: UrlFavoriteItem) => void;
  handleSaveEdit: (id: number) => void;
  handleRemove: (id: number) => void;
  handleImportClick: () => void;
  handleCreateFolder: () => void;
  handleClearFolder: (folder: string) => void;
  handleImportFile: (file: File | null) => void;
  handleExport: () => void;
  dragMovedRef: React.RefObject<boolean>;
  handleDragStart: (e: React.DragEvent<HTMLButtonElement>, id: number) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>, id: number) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>, id: number) => void;
  resetDragState: () => void;
}

/** UrlFavoritesHeader 组件入参 */
export interface UrlFavoritesHeaderProps {
  activeFolder: string;
  visibleCount: number;
  totalCount: number;
}

/** UrlFavoritesInputBar 组件入参 */
export interface UrlFavoritesInputBarProps {
  urlInput: string;
  setUrlInput: React.Dispatch<React.SetStateAction<string>>;
  placeholder: string;
  onAdd: () => void;
  folderToolsOpen: boolean;
  onToggleFolderTools: () => void;
  importExportOpen: boolean;
  onToggleImportExport: () => void;
}

/** UrlFavoritesFolderPanel 组件入参 */
export interface UrlFavoritesFolderPanelProps {
  folderToolsOpen: boolean;
  folders: string[];
  activeFolder: string;
  setActiveFolder: React.Dispatch<React.SetStateAction<string>>;
  newFolderInput: string;
  setNewFolderInput: React.Dispatch<React.SetStateAction<string>>;
  onCreateFolder: () => void;
  onClearFolder: (folder: string) => void;
}

/** UrlFavoritesImportExportPanel 组件入参 */
export interface UrlFavoritesImportExportPanelProps {
  importExportOpen: boolean;
  importInputRef: React.RefObject<HTMLInputElement | null>;
  importFormat: UrlFavoritesImportFormat;
  setImportFormat: React.Dispatch<React.SetStateAction<UrlFavoritesImportFormat>>;
  exportFormat: UrlFavoritesExportFormat;
  setExportFormat: React.Dispatch<React.SetStateAction<UrlFavoritesExportFormat>>;
  onImportClick: () => void;
  onImportFile: (file: File | null) => void;
  onExport: () => void;
  hasFavorites: boolean;
}

/** UrlFavoritesStatus 组件入参 */
export interface UrlFavoritesStatusProps {
  message: string;
}

/** UrlFavoritesItem 组件入参 */
export interface UrlFavoritesItemProps {
  item: UrlFavoriteItem;
  isExpanded: boolean;
  isFocused: boolean;
  isDragOver: boolean;
  isDragging: boolean;
  editUrlInput: string;
  setEditUrlInput: React.Dispatch<React.SetStateAction<string>>;
  editNoteInput: string;
  setEditNoteInput: React.Dispatch<React.SetStateAction<string>>;
  editFolderInput: string;
  setEditFolderInput: React.Dispatch<React.SetStateAction<string>>;
  onToggleExpand: (item: UrlFavoriteItem) => void;
  onOpen: (url: string) => void;
  onSaveEdit: (id: number) => void;
  onRemove: (id: number) => void;
  onDragStart: (e: React.DragEvent<HTMLButtonElement>, id: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, id: number) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, id: number) => void;
  onDragEnd: () => void;
  dragMovedRef: React.RefObject<boolean>;
}
