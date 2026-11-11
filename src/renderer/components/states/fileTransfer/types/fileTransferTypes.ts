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
 * @file fileTransferTypes.ts
 * @description 文件中转站的组件参数与交互 Hook 类型。
 * @author 鸡哥
 */

import type { MouseEvent, PointerEvent, Ref, RefObject } from 'react';
import type { FileTransferItem } from '../../../../store/types/fileTransfer';

/** 中转站标题栏的参数。 */
export interface FileTransferHeaderProps {
  count: number;
}

/** 中转文件列表的参数。 */
export interface FileTransferListProps {
  items: FileTransferItem[];
}

/** 单个文件卡片的参数。 */
export interface FileTransferItemCardProps {
  item: FileTransferItem;
}

/** 空状态拖入区域的引用与高亮状态。 */
export interface FileTransferDropZoneProps {
  dropZoneRef: Ref<HTMLDivElement>;
  active: boolean;
}

/** 系统文件拖入监听所需的岛屿状态与切换入口。 */
export interface UseFileTransferDropOptions {
  state: string;
  setFileTransfer: () => void;
}

/** 文件卡片的图标状态和打开、拖出事件处理器。 */
export interface UseFileTransferItemReturn {
  iconBase64: string | null;
  onIconError: () => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
}

/** 中转站面板的列表、拖入区域和收起交互。 */
export interface UseFileTransferPanelReturn {
  items: FileTransferItem[];
  dropZoneRef: RefObject<HTMLDivElement | null>;
  dropZoneActive: boolean;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handleClick: (event: MouseEvent<HTMLDivElement>) => void;
}
