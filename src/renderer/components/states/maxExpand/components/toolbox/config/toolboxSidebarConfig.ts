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
 * @file toolboxSidebarConfig.ts
 * @description 工具箱侧栏入口及标题翻译键配置。
 * @author 鸡哥
 */

import type { ToolboxSidebarItem } from '../types';

export const TOOLBOX_SIDEBAR_ITEMS: ToolboxSidebarItem[] = [
  { key: 'index', labelKey: 'maxExpand.toolbox.sidebar.index' },
  { key: 'download', labelKey: 'maxExpand.toolbox.sidebar.download' },
  { key: 'software', labelKey: 'maxExpand.toolbox.sidebar.software' },
  { key: 'translate', labelKey: 'maxExpand.toolbox.sidebar.translate' },
  { key: 'fileService', labelKey: 'maxExpand.toolbox.sidebar.fileService' },
  { key: 'encodingService', labelKey: 'maxExpand.toolbox.sidebar.encodingService' },
  { key: 'networkService', labelKey: 'maxExpand.toolbox.sidebar.networkService' },
  {
    key: 'fileCompression',
    labelKey: 'maxExpand.toolbox.sidebar.fileCompression',
    sidebarLabelKey: 'maxExpand.toolbox.sidebar.fileCompressionShort',
  },
  { key: 'formatFactory', labelKey: 'maxExpand.toolbox.sidebar.formatFactory' },
];
