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
 * @file LocalFileSearchOptions.ts
 * @description 本地文件搜索选项类型定义
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

/** 本地文件搜索选项 */
export interface LocalFileSearchOptions {
  /** 最大返回数量 */
  limit?: number;
  /** 最大搜索深度 */
  maxDepth?: number;
  /** 是否包含目录 */
  includeDirectories?: boolean;
  /** 是否包含文件 */
  includeFiles?: boolean;
  /** 是否包含隐藏文件 */
  includeHidden?: boolean;
  /** 是否区分大小写 */
  caseSensitive?: boolean;
  /** 匹配模式 */
  matchMode?: 'contains' | 'startsWith' | 'endsWith' | 'exact';
  /** 匹配范围 */
  matchScope?: 'name' | 'path';
  /** 文件扩展名过滤 */
  extensions?: string[];
  /** 排除目录 */
  excludeDirs?: string[];
}
