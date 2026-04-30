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
 * @file album.ts
 * @description 相册数据解析与配置归一化工具函数。
 * @author 鸡哥
 */

import type { OverviewAlbumCardConfig, OverviewAlbumItem } from './types';

/** 将原始数据解析为相册媒体条目数组，过滤无效条目并去重。 */
export function normalizeOverviewAlbumItems(data: unknown): OverviewAlbumItem[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const result: OverviewAlbumItem[] = [];
  data.forEach((entry) => {
    const row = entry as Partial<OverviewAlbumItem> | null;
    if (!row || typeof row.path !== 'string') return;
    const path = row.path.trim();
    if (!path) return;
    const lowerPath = path.toLowerCase();
    if (seen.has(lowerPath)) return;
    seen.add(lowerPath);
    const mediaType = row.mediaType === 'video' ? 'video' : 'image';
    const ext = typeof row.ext === 'string' ? row.ext.toLowerCase() : '';
    const sepIdx = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
    const fallbackName = sepIdx >= 0 ? path.slice(sepIdx + 1) : path;
    const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : fallbackName;
    const addedAt = typeof row.addedAt === 'number' && Number.isFinite(row.addedAt) ? row.addedAt : Date.now();
    const id = typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : addedAt;
    result.push({ id, path, name, ext, mediaType, addedAt });
  });
  return result;
}

/** 将原始数据解析为相册轮播卡片配置，缺失字段使用默认值。 */
export function normalizeOverviewAlbumCardConfig(data: unknown): OverviewAlbumCardConfig {
  const row = (data ?? {}) as Partial<OverviewAlbumCardConfig>;
  const intervalMs = row.intervalMs === 3000 || row.intervalMs === 5000 || row.intervalMs === 8000
    ? row.intervalMs
    : 5000;
  const orderMode = row.orderMode === 'random' ? 'random' : 'sequential';
  const mediaFilter = row.mediaFilter === 'image' || row.mediaFilter === 'video' ? row.mediaFilter : 'all';
  const clickBehavior = row.clickBehavior === 'none' ? 'none' : 'open-album';

  return {
    intervalMs,
    autoRotate: row.autoRotate !== false,
    orderMode,
    mediaFilter,
    clickBehavior,
    videoAutoPlay: row.videoAutoPlay !== false,
    videoMuted: row.videoMuted !== false,
  };
}

/** 根据文件扩展名返回对应的视频 MIME 类型。 */
export function getOverviewVideoMimeByExt(ext: string): string {
  if (ext === 'mp4' || ext === 'm4v') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'avi') return 'video/x-msvideo';
  if (ext === 'mkv') return 'video/x-matroska';
  return 'video/mp4';
}
