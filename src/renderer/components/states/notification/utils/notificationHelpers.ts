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
 * @file notificationHelpers.ts
 * @description 通知组件纯工具函数
 * @author 鸡哥
 */

import { normalizeSvgIconPath } from '../../../../utils/SvgIcon';
import { URL_FAVORITES_STORE_KEY } from '../config/notificationConstants';
import type { UpdateSourceKey, UrlFavoriteItem } from '../config/notificationTypes';

/**
 * 将字节数格式化为可读字符串（B/KB/MB/GB）。
 * @param bytes - 字节数。
 * @returns 格式化后的字符串。
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 100 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

/**
 * 将秒数格式化为 ETA 字符串（HH:MM:SS 或 MM:SS）。
 * @param seconds - 剩余秒数。
 * @returns 格式化后的 ETA。
 */
export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
  const rounded = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * 将原始 URL 文本标准化为完整 https URL。
 * @param raw - 原始 URL 文本。
 * @returns 标准化后的 URL，空输入返回空字符串。
 */
export function normalizeUrl(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text}`;
}

/**
 * 解析通知图标值为可渲染的 URL。
 * @param iconValue - 图标字符串（URL、data URI 或相对路径）。
 * @returns 可直接用于 img src 的 URL。
 */
export function resolveNotificationIconUrl(iconValue: string | null | undefined): string {
  if (!iconValue) return '';
  const normalized = normalizeSvgIconPath(iconValue.trim());
  if (!normalized) return '';
  const lowered = normalized.toLowerCase();
  if (
    lowered.startsWith('http://')
    || lowered.startsWith('https://')
    || lowered.startsWith('data:')
    || lowered.startsWith('blob:')
    || lowered.startsWith('file:')
    || lowered.startsWith('app:')
    || lowered.startsWith('chrome:')
    || lowered.startsWith('//')
  ) {
    return normalized;
  }
  try {
    return new URL(normalized, window.location.href).toString();
  } catch {
    return normalized;
  }
}

/**
 * 标准化更新源值为合法的 UpdateSourceKey。
 * @param value - 原始值。
 * @returns 合法的更新源键。
 */
export function normalizeUpdateSource(value: unknown): UpdateSourceKey {
  if (value === 'github') return 'github';
  if (value === 'tencent-cos') return 'tencent-cos';
  if (value === 'aliyun-oss') return 'aliyun-oss';
  if (value === 'esa-cdn') return 'esa-cdn';
  return 'cloudflare-r2';
}

/**
 * 判断更新源是否为 PRO 专属。
 * @param source - 更新源键。
 * @returns 是否为 PRO 专属源。
 */
export function isProOnlySource(source: UpdateSourceKey): boolean {
  return source === 'tencent-cos' || source === 'aliyun-oss';
}

/**
 * 清洗并验证收藏数据数组。
 * @param data - 原始数据。
 * @returns 清洗后的 UrlFavoriteItem 数组。
 */
export function sanitizeFavorites(data: unknown): UrlFavoriteItem[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const row = item as Partial<UrlFavoriteItem>;
      const url = typeof row.url === 'string' ? normalizeUrl(row.url) : '';
      if (!url) return null;
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      const note = typeof row.note === 'string' ? row.note.trim() : '';
      const createdAt = typeof row.createdAt === 'number' && Number.isFinite(row.createdAt) ? row.createdAt : Date.now();
      const id = typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : createdAt;
      return {
        id,
        url,
        title: title || url,
        note,
        createdAt,
      };
    })
    .filter((item): item is UrlFavoriteItem => Boolean(item));
}

/**
 * 持久化收藏列表到 localStorage 和 store。
 * @param items - 收藏项数组。
 */
export function persistFavorites(items: UrlFavoriteItem[]): void {
  try { localStorage.setItem('eIsland_url_favorites', JSON.stringify(items)); } catch { /* noop */ }
  window.api.storeWrite(URL_FAVORITES_STORE_KEY, items).catch(() => {});
}
