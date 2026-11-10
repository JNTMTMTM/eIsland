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
 * @file fileTransferUtils.ts
 * @description 文件中转站列表解析与合并工具
 * @author 鸡哥
 */

import { FILE_TRANSFER_MAX_ITEMS } from '../config/fileTransferConfig';
import type { FileTransferItem } from '../types';

/**
 * 从本机路径中提取文件名，兼容 Windows 与 POSIX 分隔符。
 * @param path - 本机绝对路径。
 * @returns 文件名；无法提取时返回原路径。
 */
export function getFileNameFromPath(path: string): string {
  return path.replace(/[\\/]+$/, '').split(/[\\/]/).at(-1) || path;
}

/**
 * 校验并规整持久化数据，丢弃结构不完整的条目。
 * @param data - storeRead 返回的原始数据。
 * @returns 合法的中转文件列表。
 */
export function parseFileTransferItems(data: unknown): FileTransferItem[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item): item is FileTransferItem => typeof item === 'object' && item !== null
      && typeof (item as FileTransferItem).path === 'string' && (item as FileTransferItem).path !== ''
      && typeof (item as FileTransferItem).addedAt === 'number')
    .map((item) => ({ path: item.path, name: typeof item.name === 'string' && item.name ? item.name : getFileNameFromPath(item.path), addedAt: item.addedAt }))
    .slice(0, FILE_TRANSFER_MAX_ITEMS);
}

/**
 * 将新拖入的路径合并到列表头部；重复路径移到最前，总数受上限约束。
 * @param items - 现有中转文件列表。
 * @param paths - 新拖入的本机路径。
 * @param now - 加入时间戳。
 * @returns 合并后的新列表。
 */
export function mergeFileTransferPaths(items: FileTransferItem[], paths: string[], now: number): FileTransferItem[] {
  const incoming = [...new Set(paths.filter(Boolean))];
  const added = incoming.map((path) => ({ path, name: getFileNameFromPath(path), addedAt: now }));
  const kept = items.filter((item) => !incoming.includes(item.path));
  return [...added, ...kept].slice(0, FILE_TRANSFER_MAX_ITEMS);
}
