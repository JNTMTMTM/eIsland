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
 * @file fileTransferConfig.ts
 * @description 文件中转站常量配置
 * @author 鸡哥
 */

/** 中转文件列表的持久化存储键 */
export const FILE_TRANSFER_STORE_KEY = 'file-transfer-items';

/** 中转站最多保留的文件数，超出时丢弃最早加入的文件 */
export const FILE_TRANSFER_MAX_ITEMS = 50;

/** 允许系统文件拖入并进入中转站的岛屿状态 */
export const FILE_TRANSFER_DROP_STATES: ReadonlySet<string> = new Set(['idle', 'hover', 'lyrics', 'lyricsTranslation', 'fileTransfer']);

/** 指针移动超过该像素数才视为拖出文件，避免与点击打开冲突 */
export const FILE_TRANSFER_DRAG_THRESHOLD = 4;
