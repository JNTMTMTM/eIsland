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
 * @file file.ts
 * @description 文件与应用操作相关类型定义
 * @author 鸡哥
 */

/** 本地文件搜索选项 */
export interface SearchLocalFilesOptions {
  limit?: number;
  maxDepth?: number;
  includeDirectories?: boolean;
  includeFiles?: boolean;
  includeHidden?: boolean;
  caseSensitive?: boolean;
  matchMode?: 'contains' | 'startsWith' | 'endsWith' | 'exact';
  matchScope?: 'name' | 'path';
  extensions?: string[];
  excludeDirs?: string[];
}

/** 本地文件搜索结果项 */
export interface SearchLocalFileResult {
  name: string;
  path: string;
  isDirectory: boolean;
}

/** 文件哈希计算结果 */
export interface ComputeFileHashResult {
  hash: string;
  algorithm: string;
  fileName: string;
  fileSize: number;
}

/** 保存文本文件载荷 */
export interface SaveTextFilePayload {
  defaultPath: string;
  content: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

/** 保存文本文件结果 */
export interface SaveTextFileResult {
  ok: boolean;
  canceled: boolean;
  filePath: string | null;
}

/** 保存图片结果 */
export interface SaveImageAsResult {
  ok: boolean;
  canceled: boolean;
  filePath: string | null;
}

/** 快捷方式解析结果 */
export interface ResolveShortcutResult {
  target: string;
  name: string;
}
