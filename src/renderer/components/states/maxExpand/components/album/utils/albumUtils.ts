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
 * @file albumUtils.ts
 * @description 相册模块纯工具函数（格式化、EXIF 解析、排序、持久化等）。
 * @author 鸡哥
 */

import {
  DEFAULT_COLUMNS,
  IMAGE_EXTS,
  LOCAL_STORAGE_KEY,
  MAX_COLUMNS,
  MIN_COLUMNS,
  STORE_KEY,
  SUPPORTED_EXTS,
  VIDEO_EXTS,
} from '../config/albumConfig';
import type { AlbumExifData, AlbumItem, AlbumMediaType, AlbumMeta, AlbumSortMode } from '../types/albumTypes';

/** 时长格式化为 H:MM:SS 或 M:SS */
export function formatDuration(seconds: number | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '-';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 根据扩展名判断媒体类型 */
export function getMediaTypeByExt(ext: string): AlbumMediaType | null {
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  return null;
}

/** 根据扩展名返回视频 MIME 类型 */
export function getVideoMimeByExt(ext: string): string {
  if (ext === 'mp4' || ext === 'm4v') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'mov') return 'video/quicktime';
  return 'video/mp4';
}

/** 安全释放 blob URL */
export function revokeBlobUrl(url: string | undefined): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/** 根据扩展名猜测视频编码 */
export function guessVideoCodecByExt(ext: string): string {
  if (ext === 'mp4' || ext === 'm4v' || ext === 'mov') return 'H.264/H.265 (container-based)';
  if (ext === 'webm') return 'VP8/VP9/AV1 (container-based)';
  return '-';
}

/** 标准化数据，过滤非法项 */
export function sanitizeAlbumItems(data: unknown): AlbumItem[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const result: AlbumItem[] = [];
  data.forEach((entry) => {
    const row = entry as Partial<AlbumItem> | null;
    if (!row || typeof row.path !== 'string') return;
    const path = row.path.trim();
    if (!path) return;
    const lowerPath = path.toLowerCase();
    if (seen.has(lowerPath)) return;
    seen.add(lowerPath);
    const dotIdx = path.lastIndexOf('.');
    const ext = (dotIdx >= 0 ? path.slice(dotIdx + 1) : '').toLowerCase();
    if (ext && !SUPPORTED_EXTS.includes(ext)) return;
    const mediaType = row.mediaType === 'image' || row.mediaType === 'video'
      ? row.mediaType
      : getMediaTypeByExt(ext);
    if (!mediaType) return;
    const sepIdx = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
    const fallbackName = sepIdx >= 0 ? path.slice(sepIdx + 1) : path;
    const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : fallbackName;
    const addedAt = typeof row.addedAt === 'number' && Number.isFinite(row.addedAt) ? row.addedAt : Date.now();
    const id = typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : addedAt;
    result.push({ id, path, name, ext, mediaType, addedAt });
  });
  return result;
}

/** 写入持久化（store + localStorage 兜底） */
export async function persistAlbumItems(items: AlbumItem[]): Promise<void> {
  try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items)); } catch { /* noop */ }
  await window.api.storeWrite(STORE_KEY, items).catch(() => { });
}

/** 文件大小格式化为可读字符串 */
export function formatBytes(bytes: number | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** 时间戳格式化为本地时间字符串 */
export function formatTimestamp(ts: number | undefined): string {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return '-';
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return '-';
  }
}

/** 时间戳格式化为日期分组标签 */
export function formatDateGroup(ts: number, locale: string): string {
  if (!Number.isFinite(ts) || ts <= 0) return '-';
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(ts));
  } catch {
    return '-';
  }
}

/** 获取文件所在的父文件夹路径 */
export function getParentFolder(path: string): string {
  const normalized = path.trim();
  const sepIdx = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'));
  if (sepIdx <= 0) return '-';
  return normalized.slice(0, sepIdx);
}

/** 从完整路径中提取文件夹名 */
export function getFolderName(folderPath: string): string {
  if (!folderPath || folderPath === '-') return '-';
  const sepIdx = Math.max(folderPath.lastIndexOf('\\'), folderPath.lastIndexOf('/'));
  return sepIdx >= 0 ? folderPath.slice(sepIdx + 1) || folderPath : folderPath;
}

/** 估算 data URL 中 base64 部分对应的字节数 */
export function estimateBytesFromDataUrl(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) return 0;
  const base64 = dataUrl.slice(commaIdx + 1);
  // 每 4 个 base64 字符对应 3 字节，padding 修正
  const paddingMatch = base64.match(/=+$/);
  const padding = Math.min(2, paddingMatch?.[0].length ?? 0);
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/**
 * 解析 JPEG 文件中的简易 EXIF 信息
 * @description 仅支持 JPEG，定位 APP1 段并解析 IFD0 / ExifIFD 中的常见字段。
 *   非 JPEG 或解析失败时返回 undefined。
 * @param buf - 文件二进制数据
 * @returns 解析得到的 EXIF 信息，缺失字段以 undefined 表示
 */
export function parseJpegExif(buf: Uint8Array): AlbumExifData | undefined {
  if (buf.length < 4) return undefined;
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) return undefined;
  let offset = 2;
  while (offset + 4 < buf.length) {
    if (buf[offset] !== 0xFF) return undefined;
    const marker = buf[offset + 1];
    const segLen = (buf[offset + 2] << 8) | buf[offset + 3];
    if (segLen < 2) return undefined;
    if (marker === 0xE1) {
      const start = offset + 4;
      // 校验 "Exif\0\0"
      if (start + 6 > buf.length) return undefined;
      if (buf[start] !== 0x45 || buf[start + 1] !== 0x78 || buf[start + 2] !== 0x69 || buf[start + 3] !== 0x66
        || buf[start + 4] !== 0 || buf[start + 5] !== 0) {
        return undefined;
      }
      return parseExifTiff(buf, start + 6);
    }
    offset += 2 + segLen;
  }
  return undefined;
}

/** 解析 TIFF 段（EXIF 内部结构） */
function parseExifTiff(buf: Uint8Array, tiffStart: number): AlbumExifData | undefined {
  if (tiffStart + 8 > buf.length) return undefined;
  const b0 = buf[tiffStart];
  const b1 = buf[tiffStart + 1];
  let little: boolean;
  if (b0 === 0x49 && b1 === 0x49) {
    little = true;
  } else if (b0 === 0x4D && b1 === 0x4D) {
    little = false;
  } else {
    return undefined;
  }
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const magic = view.getUint16(tiffStart + 2, little);
  if (magic !== 0x002A) return undefined;
  const ifd0Offset = view.getUint32(tiffStart + 4, little);
  const exif: AlbumExifData = {};
  const exifIfdOffset = readIfdEntries(view, buf, tiffStart, tiffStart + ifd0Offset, little, exif, true);
  if (exifIfdOffset > 0) {
    readIfdEntries(view, buf, tiffStart, tiffStart + exifIfdOffset, little, exif, false);
  }
  if (!exif.make && !exif.model && !exif.dateTimeOriginal && !exif.exposureTime
    && exif.fNumber === undefined && exif.iso === undefined && exif.focalLength === undefined) {
    return undefined;
  }
  return exif;
}

/**
 * 读取 IFD 条目并写入 EXIF 结果
 * @returns 若 isIfd0 且包含 ExifIFD 指针，返回相对 TIFF 起点的偏移；否则 0
 */
function readIfdEntries(
  view: DataView,
  buf: Uint8Array,
  tiffStart: number,
  ifdStart: number,
  little: boolean,
  exif: AlbumExifData,
  isIfd0: boolean,
): number {
  if (ifdStart + 2 > buf.length) return 0;
  const count = view.getUint16(ifdStart, little);
  let exifIfdOffset = 0;
  for (let i = 0; i < count; i += 1) {
    const entryStart = ifdStart + 2 + i * 12;
    if (entryStart + 12 > buf.length) break;
    const tag = view.getUint16(entryStart, little);
    const type = view.getUint16(entryStart + 2, little);
    const numComponents = view.getUint32(entryStart + 4, little);
    const valueOrOffset = view.getUint32(entryStart + 8, little);
    if (isIfd0 && tag === 0x8769) {
      exifIfdOffset = valueOrOffset;
      continue;
    }
    const componentSize = exifTypeSize(type);
    const dataLen = componentSize * numComponents;
    const dataOffset = dataLen <= 4 ? entryStart + 8 : tiffStart + valueOrOffset;
    if (dataOffset < 0 || dataOffset + dataLen > buf.length) continue;
    if (isIfd0) {
      if (tag === 0x010F) exif.make = readAscii(buf, dataOffset, numComponents);
      else if (tag === 0x0110) exif.model = readAscii(buf, dataOffset, numComponents);
    } else {
      if (tag === 0x9003) {
        exif.dateTimeOriginal = readAscii(buf, dataOffset, numComponents);
      } else if (tag === 0x829A && type === 5 && numComponents >= 1) {
        const num = view.getUint32(dataOffset, little);
        const den = view.getUint32(dataOffset + 4, little);
        exif.exposureTime = formatExposureTime(num, den);
      } else if (tag === 0x829D && type === 5 && numComponents >= 1) {
        const num = view.getUint32(dataOffset, little);
        const den = view.getUint32(dataOffset + 4, little);
        if (den !== 0) exif.fNumber = Number((num / den).toFixed(2));
      } else if (tag === 0x8827) {
        if (type === 3) exif.iso = view.getUint16(dataOffset, little);
        else if (type === 4) exif.iso = view.getUint32(dataOffset, little);
      } else if (tag === 0x920A && type === 5 && numComponents >= 1) {
        const num = view.getUint32(dataOffset, little);
        const den = view.getUint32(dataOffset + 4, little);
        if (den !== 0) exif.focalLength = Number((num / den).toFixed(1));
      }
    }
  }
  return exifIfdOffset;
}

/** 返回 EXIF 类型对应的字节大小 */
function exifTypeSize(type: number): number {
  switch (type) {
    case 1: case 2: case 6: case 7: return 1;
    case 3: case 8: return 2;
    case 4: case 9: case 11: return 4;
    case 5: case 10: case 12: return 8;
    default: return 1;
  }
}

/** 从二进制读取 ASCII 字符串（去掉末尾 \0） */
function readAscii(buf: Uint8Array, offset: number, length: number): string {
  let end = offset + length;
  if (end > buf.length) end = buf.length;
  let actualEnd = end;
  while (actualEnd > offset && buf[actualEnd - 1] === 0) actualEnd -= 1;
  let s = '';
  for (let i = offset; i < actualEnd; i += 1) {
    s += String.fromCharCode(buf[i]);
  }
  return s.trim();
}

/** 把分子/分母格式的曝光时间转成易读字符串 */
function formatExposureTime(num: number, den: number): string {
  if (den === 0) return '-';
  if (num >= den) {
    const seconds = num / den;
    return `${Number(seconds.toFixed(1))}s`;
  }
  return `1/${Math.round(den / Math.max(1, num))}s`;
}

/** 排序后的相册条目列表 */
export function sortAlbumItems(items: AlbumItem[], mode: AlbumSortMode, metaCache: Record<number, AlbumMeta>): AlbumItem[] {
  const next = [...items];
  if (mode === 'addedDesc') {
    next.sort((a, b) => b.addedAt - a.addedAt);
  } else if (mode === 'addedAsc') {
    next.sort((a, b) => a.addedAt - b.addedAt);
  } else if (mode === 'nameAsc') {
    next.sort((a, b) => a.name.localeCompare(b.name));
  } else if (mode === 'durationDesc') {
    next.sort((a, b) => (metaCache[b.id]?.durationSec ?? -1) - (metaCache[a.id]?.durationSec ?? -1));
  } else if (mode === 'durationAsc') {
    next.sort((a, b) => (metaCache[a.id]?.durationSec ?? Number.MAX_SAFE_INTEGER) - (metaCache[b.id]?.durationSec ?? Number.MAX_SAFE_INTEGER));
  } else {
    next.sort((a, b) => b.name.localeCompare(a.name));
  }
  return next;
}

/** 校验列数取值并钳制在合法范围 */
export function clampColumns(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : DEFAULT_COLUMNS;
  return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, n));
}
