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
 * @file toolboxTypes.ts
 * @description 工具箱导航状态、侧栏入口与搜索结果的独立类型。
 * @author 鸡哥
 */

import type { Dispatch, DragEvent, SetStateAction } from 'react';
import type { DownloadPageKey } from '../../tools/config/downloadToolConfig';
import type { FileCompressionPageKey } from '../../tools/config/fileCompressionToolConfig';
import type { FormatFactoryPageKey } from '../../tools/config/formatFactoryToolConfig';
import type { ToolboxIndexCardId, ToolboxNavCardDef, ToolboxSidebarKey } from '../../tools/config/commonToolboxConfig';

export type { ToolboxIndexCardId, ToolboxNavCardDef, ToolboxSidebarKey } from '../../tools/config/commonToolboxConfig';

/** 工具箱侧栏入口及其翻译键。 */
export interface ToolboxSidebarItem {
  key: ToolboxSidebarKey;
  labelKey: string;
  sidebarLabelKey?: string;
}

/** 本地化后的搜索卡片。 */
export interface ToolboxSearchResult extends ToolboxNavCardDef {
  localizedLabel: string;
  localizedDesc: string;
}

/** 工具箱页面与导航编辑状态，展示组件无需依赖 Hook 实现。 */
export interface ToolboxNavigationState {
  activeSidebar: ToolboxSidebarKey;
  setActiveSidebar: Dispatch<SetStateAction<ToolboxSidebarKey>>;
  downloadPage: DownloadPageKey;
  setDownloadPage: Dispatch<SetStateAction<DownloadPageKey>>;
  fileCompressionPage: FileCompressionPageKey;
  setFileCompressionPage: Dispatch<SetStateAction<FileCompressionPageKey>>;
  formatFactoryPage: FormatFactoryPageKey;
  setFormatFactoryPage: Dispatch<SetStateAction<FormatFactoryPageKey>>;
  navEditMode: boolean;
  dragOverIdx: number | null;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  visibleCards: ToolboxNavCardDef[];
  hiddenCards: ToolboxNavCardDef[];
  searchResults: ToolboxSearchResult[] | null;
  resetToolboxNavConfig: () => void;
  navigateByCard: (cardId: ToolboxIndexCardId) => void;
  toggleNavEditMode: () => void;
  removeCard: (cardId: ToolboxIndexCardId) => void;
  addCard: (cardId: ToolboxIndexCardId) => void;
  handleDragStart: (event: DragEvent<HTMLDivElement>, index: number) => void;
  handleDragOver: (event: DragEvent<HTMLDivElement>, index: number) => void;
  handleDragLeave: () => void;
  handleDrop: (event: DragEvent<HTMLDivElement>, index: number) => void;
  handleDragEnd: () => void;
}
