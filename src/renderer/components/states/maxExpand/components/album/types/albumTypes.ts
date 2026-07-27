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

import type { ChangeEvent, DragEvent, MouseEvent, RefObject, WheelEvent } from 'react';

/**
 * @file albumTypes.ts
 * @description 相册模块类型定义。
 * @author 鸡哥
 */

/** 相册条目排序模式 */
export type AlbumSortMode = 'addedDesc' | 'addedAsc' | 'nameAsc' | 'nameDesc' | 'durationDesc' | 'durationAsc';
export type AlbumFilterMode = 'all' | 'image' | 'video';
export type AlbumGroupMode = 'none' | 'folder' | 'date';
export type AlbumMediaType = 'image' | 'video';

/** 相册条目（持久化结构） */
export interface AlbumItem {
  /** 唯一 ID（一般取首次添加时的时间戳） */
  id: number;
  /** 文件绝对路径 */
  path: string;
  /** 文件名（含扩展名） */
  name: string;
  /** 小写扩展名（不含点） */
  ext: string;
  /** 媒体类型 */
  mediaType: AlbumMediaType;
  /** 添加到相册的时间戳（ms） */
  addedAt: number;
}

/** 灵动岛背景媒体配置 */
export interface IslandBgMediaConfig {
  type: 'image' | 'video';
  source: string;
}

/** 相册条目运行时元数据（不持久化） */
export interface AlbumMeta {
  /** 缩略图 data URL，用于网格预览 */
  thumbnailUrl?: string;
  /** 原图 data URL，仅在单图查看时保留 */
  dataUrl?: string;
  /** 视频预览地址 */
  videoUrl?: string;
  /** 图片像素宽度 */
  width?: number;
  /** 图片像素高度 */
  height?: number;
  /** 视频时长（秒） */
  durationSec?: number;
  /** 视频编码（尽力识别） */
  videoCodec?: string;
  /** 视频帧率（受浏览器能力限制，可能无法读取） */
  fps?: number;
  /** 估算的文件大小（字节） */
  sizeBytes?: number;
  /** 是否正在加载 */
  loading?: boolean;
  /** 加载是否失败 */
  loadFailed?: boolean;
  /** 简易 EXIF 信息（仅 JPEG 尝试解析） */
  exif?: AlbumExifData;
}

/** 简易 EXIF 信息 */
export interface AlbumExifData {
  /** 厂商，如 Canon */
  make?: string;
  /** 机型，如 EOS R5 */
  model?: string;
  /** 拍摄时间，原始字符串（YYYY:MM:DD HH:MM:SS） */
  dateTimeOriginal?: string;
  /** 曝光时间，文本，如 1/250s */
  exposureTime?: string;
  /** 光圈值，如 2.8 */
  fNumber?: number;
  /** 感光度，如 100 */
  iso?: number;
  /** 焦距（mm） */
  focalLength?: number;
}

export interface AlbumViewerProps {
  /** useAlbumViewer hook 返回值 */
  viewer: UseAlbumViewerReturn;
  /** 筛选后条目数（导航按钮禁用判断） */
  filteredCount: number;
  /** 返回总览 */
  onBack: () => void;
  /** 原始缩放 */
  onOriginalZoom: () => void;
  /** 资源管理器定位 */
  onOpenInExplorer: (item: AlbumItem) => void;
  /** 另存为 */
  onSaveAs: (item: AlbumItem) => void;
  /** 设为灵动岛背景 */
  onSetAsIslandBackground: (item: AlbumItem) => void;
}

/** AlbumGridItem 组件入参 */
export interface AlbumGridItemProps {
  item: AlbumItem;
  meta: AlbumMeta | undefined;
  selected: boolean;
  selectMode: boolean;
  onToggleSelection: (id: number) => void;
  onOpen: (item: AlbumItem) => void;
  onRemove: (id: number) => void;
  onMouseEnter: (item: AlbumItem) => void;
  onMouseLeave: (item: AlbumItem) => void;
  gridVideoRefs: RefObject<Record<number, HTMLVideoElement | null>>;
}

/** 分组数据结构 */
export interface AlbumGroup {
  key: string;
  title: string;
  subtitle?: string;
  items: AlbumItem[];
}

/** AlbumOverview 组件入参 */
export interface AlbumOverviewProps {
  totalCount: number;
  filteredCount: number;
  columns: number;
  groupMode: AlbumGroupMode;
  groupedItems: AlbumGroup[];
  metaCache: Record<number, AlbumMeta>;
  selectedIds: Set<number>;
  selectMode: boolean;
  onToggleSelection: (id: number) => void;
  onOpen: (item: AlbumItem) => void;
  onRemove: (id: number) => void;
  onMouseEnter: (item: AlbumItem) => void;
  onMouseLeave: (item: AlbumItem) => void;
  gridVideoRefs: RefObject<Record<number, HTMLVideoElement | null>>;
  onPickFiles: () => void;
}

/** AlbumHeader 组件入参 */
export interface AlbumHeaderProps {
  totalCount: number;
  sortMode: AlbumSortMode;
  filterMode: AlbumFilterMode;
  groupMode: AlbumGroupMode;
  columns: number;
  selectMode: boolean;
  filteredCount: number;
  onSortChange: (mode: string) => void;
  onFilterModeChange: (mode: AlbumFilterMode) => void;
  onGroupModeChange: (mode: AlbumGroupMode) => void;
  onColumnsChange: (delta: number) => void;
  onPickFiles: () => void;
  onToggleSelectMode: () => void;
}

/** AlbumMetaPanel 组件入参 */
export interface AlbumMetaPanelProps {
  activeItem: AlbumItem;
  activeMeta: AlbumMeta | undefined;
  onSetAsIslandBackground: (item: AlbumItem) => void;
}

/** AlbumSelectionBar 组件入参 */
export interface AlbumSelectionBarProps {
  selectMode: boolean;
  selectedCount: number;
  filteredCount: number;
  allVisibleSelected: boolean;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onRemoveSelected: () => void;
  onToggleSelectMode: () => void;
}

/** useAlbumGridConfig 返回值类型 */
export interface UseAlbumGridConfigReturn {
  columns: number;
  setColumns: React.Dispatch<React.SetStateAction<number>>;
  sortMode: AlbumSortMode;
  setSortMode: React.Dispatch<React.SetStateAction<AlbumSortMode>>;
  filterMode: AlbumFilterMode;
  setFilterMode: React.Dispatch<React.SetStateAction<AlbumFilterMode>>;
  groupMode: AlbumGroupMode;
  setGroupMode: React.Dispatch<React.SetStateAction<AlbumGroupMode>>;
  sortedItems: AlbumItem[];
  filteredItems: AlbumItem[];
  groupedItems: Array<{ key: string; title: string; subtitle: string; items: AlbumItem[] }>;
  handleColumnsChange: (delta: number) => void;
  handleSortChange: (value: string) => void;
  handleFilterModeChange: (mode: AlbumFilterMode) => void;
  handleGroupModeChange: (mode: AlbumGroupMode) => void;
}

/** useAlbumViewer 返回值类型 */
export interface UseAlbumViewerReturn {
  activeId: number | null;
  setActiveId: React.Dispatch<React.SetStateAction<number | null>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isPanning: boolean;
  viewerSlideDir: 'prev' | 'next';
  videoPlaying: boolean;
  videoMuted: boolean;
  videoVolume: number;
  videoCurrentTime: number;
  videoDuration: number;
  videoControlsCollapsed: boolean;
  viewerVideoRef: React.RefObject<HTMLVideoElement | null>;
  activeItem: AlbumItem | null;
  activeMeta: AlbumMeta | undefined;
  activeIsVideo: boolean;
  activeVideoUrl: string | null;
  navigateInViewer: (delta: number) => void;
  handleOpenItem: (item: AlbumItem) => void;
  handleViewerWheel: (event: WheelEvent<HTMLDivElement>) => void;
  handleViewerMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  handleViewerMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
  handleViewerMouseUp: () => void;
  handleVideoLoadedMetadata: () => void;
  handleVideoTimeUpdate: () => void;
  handleToggleVideoPlay: () => void;
  handleVideoSeek: (event: ChangeEvent<HTMLInputElement>) => void;
  handleToggleVideoMute: () => void;
  handleVideoVolumeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleToggleVideoControls: () => void;
  handleZoom: (delta: number) => void;
  handleResetZoom: () => void;
  handleVideoEnded: () => void;
}

/** useAlbumItems 返回值类型 */
export interface UseAlbumItemsReturn {
  items: AlbumItem[];
  setItems: React.Dispatch<React.SetStateAction<AlbumItem[]>>;
  loaded: boolean;
  mediaLoadReady: boolean;
  metaCache: Record<number, AlbumMeta>;
  statusMessage: string;
  setStatusMessage: React.Dispatch<React.SetStateAction<string>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  gridVideoRefs: React.RefObject<Record<number, HTMLVideoElement | null>>;
  initColumns: number;
  initSortMode: AlbumSortMode;
  initGroupMode: AlbumGroupMode;
  loadExifIfNeeded: (item: AlbumItem) => void;
  loadFullImage: (item: AlbumItem) => void;
  handleAddFiles: (files: FileList | File[] | null) => void;
  handleRemove: (id: number) => void;
  handleRemoveSelected: (ids: Set<number>) => void;
  handleThumbMouseEnter: (item: AlbumItem) => void;
  handleThumbMouseLeave: (item: AlbumItem) => void;
  handleFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handlePickFiles: () => void;
}

/** useAlbumViewerActions 返回值类型 */
export interface UseAlbumViewerActionsReturn {
  handleOpenInExplorer: (item: AlbumItem) => void;
  handleSaveAs: (item: AlbumItem) => void;
  handleSetAsIslandBackground: (item: AlbumItem) => void;
  handleOriginalZoom: () => void;
}

/** useAlbumSelection 返回值类型 */
export interface UseAlbumSelectionReturn {
  selectedIds: Set<number>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  selectMode: boolean;
  selectedCount: number;
  visibleSelectedCount: number;
  allVisibleSelected: boolean;
  handleToggleItemSelection: (id: number) => void;
  handleSelectAllVisible: () => void;
  handleClearSelection: () => void;
  handleToggleSelectMode: () => void;
  handleRemoveSelectedItems: () => void;
}

/** useAlbumDrag 返回值类型 */
export interface UseAlbumDragReturn {
  dragOverPage: boolean;
  handleDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  handleDrop: (event: DragEvent<HTMLDivElement>) => void;
}