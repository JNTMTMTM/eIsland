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
 * @file urlFavoritesUtils.ts
 * @description URL 收藏模块纯工具函数：解析、序列化、合并、持久化等。
 * @author 鸡哥
 */

import { STORE_KEY, LOCAL_STORAGE_KEY } from '../config/urlFavoritesConfig';
import type { UrlFavoriteItem, UrlFavoritesFormat } from '../types/urlFavoritesTypes';

/**
 * 标准化文件夹名称
 * @param raw - 原始值
 * @returns 去除空白后的字符串
 */
export function normalizeFolder(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * 标准化 URL，自动补全 https:// 前缀
 * @param raw - 原始输入
 * @returns 标准化后的 URL
 */
export function normalizeUrl(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text}`;
}

/**
 * 清洗并校验原始收藏数据
 * @param data - 原始数据
 * @returns 有效的收藏项列表
 */
export function sanitizeFavorites(data: unknown): UrlFavoriteItem[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const row = item as Partial<UrlFavoriteItem>;
      const url = typeof row.url === 'string' ? normalizeUrl(row.url) : '';
      if (!url) return null;
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      const noteValue = typeof row.note === 'string' ? row.note.trim() : '';
      const folder = normalizeFolder(row.folder);
      const createdAt = typeof row.createdAt === 'number' && Number.isFinite(row.createdAt) ? row.createdAt : Date.now();
      const id = typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : createdAt;
      return {
        id,
        url,
        title: title || url,
        note: noteValue || (title && title !== url ? title : ''),
        folder,
        createdAt,
      };
    })
    .filter((item): item is UrlFavoriteItem => Boolean(item));
}

/**
 * 转义 HTML 特殊字符
 * @param value - 原始字符串
 * @returns 转义后的字符串
 */
export function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 解析 JSON 格式的收藏数据
 * @param content - JSON 字符串
 * @returns 收藏项列表
 */
export function parseJsonFavorites(content: string): UrlFavoriteItem[] {
  const parsed = JSON.parse(content) as unknown;
  if (Array.isArray(parsed)) return sanitizeFavorites(parsed);
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)) {
    return sanitizeFavorites((parsed as { items: unknown[] }).items);
  }
  return [];
}

/**
 * 解析 HTML 书签格式的收藏数据
 * @param content - HTML 字符串
 * @returns 收藏项列表
 */
export function parseHtmlBookmarks(content: string): UrlFavoriteItem[] {
  const doc = new DOMParser().parseFromString(content, 'text/html');
  const anchors = Array.from(doc.querySelectorAll('a[href]'));
  return sanitizeFavorites(anchors.map((anchor, index) => {
    const url = anchor.getAttribute('href') ?? '';
    const title = anchor.textContent?.trim() ?? '';
    const addDateRaw = anchor.getAttribute('add_date') ?? anchor.getAttribute('ADD_DATE') ?? '';
    const createdAt = /^\d+$/.test(addDateRaw) ? Number(addDateRaw) * 1000 : Date.now() + index;
    const folder = normalizeFolder(anchor.closest('dl')?.previousElementSibling?.textContent ?? '');
    return { id: createdAt, url, title, note: '', folder, createdAt };
  }));
}

/**
 * 根据格式解析导入的收藏数据
 * @param content - 文件内容
 * @param format - 导入格式
 * @returns 收藏项列表
 */
export function parseImportedFavorites(content: string, format: UrlFavoritesFormat): UrlFavoriteItem[] {
  return format === 'json' ? parseJsonFavorites(content) : parseHtmlBookmarks(content);
}

/**
 * 合并已有收藏与导入的收藏，去重后追加到前面
 * @param current - 当前收藏列表
 * @param incoming - 导入的收藏列表
 * @returns 合并后的收藏列表
 */
export function mergeFavorites(current: UrlFavoriteItem[], incoming: UrlFavoriteItem[]): UrlFavoriteItem[] {
  const existingUrls = new Set(current.map((item) => item.url.toLowerCase()));
  const now = Date.now();
  const accepted = incoming
    .filter((item) => {
      const key = item.url.toLowerCase();
      if (existingUrls.has(key)) return false;
      existingUrls.add(key);
      return true;
    })
    .map((item, index) => ({ ...item, folder: normalizeFolder(item.folder), id: now + index, createdAt: item.createdAt || now + index }));
  return [...accepted, ...current];
}

/**
 * 将收藏列表序列化为 JSON 字符串
 * @param items - 收藏列表
 * @returns JSON 字符串
 */
export function serializeFavoritesToJson(items: UrlFavoriteItem[]): string {
  return JSON.stringify({
    source: 'eIsland',
    exportedAt: new Date().toISOString(),
    items,
  }, null, 2);
}

/**
 * 将收藏列表序列化为 HTML 书签格式
 * @param items - 收藏列表
 * @param defaultFolderName - 默认文件夹名称
 * @returns HTML 字符串
 */
export function serializeFavoritesToHtml(items: UrlFavoriteItem[], defaultFolderName: string): string {
  const folders = new Map<string, UrlFavoriteItem[]>();
  items.forEach((item) => {
    const folderName = normalizeFolder(item.folder) || defaultFolderName;
    folders.set(folderName, [...(folders.get(folderName) ?? []), item]);
  });

  const rows = Array.from(folders.entries()).map(([folderName, folderItems]) => {
    const links = folderItems.map((item) => {
      const addDate = Math.floor(item.createdAt / 1000);
      const title = escapeHtmlText(item.title && item.title !== item.url ? item.title : item.url);
      const note = item.note ? ` ${escapeHtmlText(item.note)}` : '';
      return `        <DT><A HREF="${escapeHtmlText(item.url)}" ADD_DATE="${addDate}">${title}</A>${note}`;
    }).join('\n');

    return [
      `    <DT><H3 ADD_DATE="0">${escapeHtmlText(folderName)}</H3>`,
      '    <DL><p>',
      links,
      '    </DL><p>',
    ].join('\n');
  }).join('\n');

  return [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    rows,
    '</DL><p>',
  ].filter(Boolean).join('\n');
}

/**
 * 持久化收藏列表到 store 和 localStorage
 * @param items - 收藏列表
 */
export function persistFavorites(items: UrlFavoriteItem[]): void {
  try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items)); } catch { /* noop */ }
  window.api.storeWrite(STORE_KEY, items).catch(() => {});
}
