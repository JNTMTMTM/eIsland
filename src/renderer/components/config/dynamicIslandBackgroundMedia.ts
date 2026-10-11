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
 * @file dynamicIslandBackgroundMedia.ts
 * @description 灵动岛背景媒体配置与预览 URL 解析工具。
 * @author 鸡哥
 */

export type IslandBgMediaType = 'image' | 'video';

export interface IslandBgMediaConfig {
  type: IslandBgMediaType;
  source: string;
}

function isDirectBgMediaUrl(source: string): boolean {
  return source.startsWith('data:')
    || source.startsWith('http://')
    || source.startsWith('https://')
    || source.startsWith('blob:')
    || source.startsWith('file:')
    || source.startsWith('/')
    || source.startsWith('./')
    || source.startsWith('../')
    || source.startsWith('assets/');
}

function toMediaUrl(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return `eisland-media://local/${encodeURIComponent(normalized)}`;
}

/**
 * @description 归一化背景媒体配置输入。
 * @param value - 待归一化的背景媒体原始值。
 * @returns 归一化后的背景媒体配置；无效输入返回 null。
 */
export function normalizeBgMediaConfig(value: unknown): IslandBgMediaConfig | null {
  if (typeof value === 'string') {
    const source = value.trim();
    return source ? { type: 'image', source } : null;
  }
  if (!value || typeof value !== 'object') return null;

  const candidate = value as { type?: unknown; source?: unknown; image?: unknown; url?: unknown };
  const sourceRaw = typeof candidate.source === 'string'
    ? candidate.source
    : typeof candidate.image === 'string'
      ? candidate.image
      : typeof candidate.url === 'string'
        ? candidate.url
        : null;
  if (!sourceRaw) return null;

  const source = sourceRaw.trim();
  if (!source) return null;

  if (candidate.type === 'video') {
    return { type: 'video', source };
  }
  return { type: 'image', source };
}

/**
 * @description 解析背景媒体的可预览 URL。
 * @param media - 背景媒体配置。
 * @returns 可用于渲染的预览 URL；失败时返回 null。
 */
export async function resolveBgMediaPreviewUrl(media: IslandBgMediaConfig): Promise<string | null> {
  if (media.type === 'image') {
    if (isDirectBgMediaUrl(media.source)) return media.source;
    return window.api?.loadWallpaperFile?.(media.source, true) ?? null;
  }
  if (isDirectBgMediaUrl(media.source)) return media.source;
  return toMediaUrl(media.source);
}
