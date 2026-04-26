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
 * @file AlbumTab.tsx
 * @description 最大展开模式相册页：支持本地图片导入、总览（每行列数可调）、
 *   单图放大查看、元数据侧栏与基础 EXIF 解析、清空与排序，预留资源管理器
 *   定位与另存为入口。
 * @author 鸡哥
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, ReactElement, WheelEvent } from 'react';
import { useTranslation } from 'react-i18next';

/** 持久化键（store） */
const STORE_KEY = 'photo-album-items';
/** 持久化键（localStorage 兜底） */
const LOCAL_STORAGE_KEY = 'eIsland_photo_album_items';
/** 总览每行列数持久化键 */
const COLUMNS_STORE_KEY = 'photo-album-columns';
/** 总览排序模式持久化键 */
const SORT_STORE_KEY = 'photo-album-sort';
/** 支持的图片扩展名（小写、不含点） */
const SUPPORTED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
/** 总览每行最少列数 */
const MIN_COLUMNS = 3;
/** 总览每行最大列数 */
const MAX_COLUMNS = 8;
/** 默认每行列数 */
const DEFAULT_COLUMNS = 5;
/** 单图视图缩放范围（最小 / 最大） */
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 6;
/** 单图滚轮缩放步长 */
const ZOOM_STEP = 0.15;

/** 相册条目排序模式 */
export type AlbumSortMode = 'addedDesc' | 'addedAsc' | 'nameAsc' | 'nameDesc';

/** 相册条目（持久化结构） */
export interface AlbumItem {
  /** 唯一 ID（一般取首次添加时的时间戳） */
  id: number;
  /** 文件绝对路径 */
  path: string;
  /** 文件名（含扩展名） */
  name: string;
  /** 小写扩展名（不含点） */
  ext: string;
  /** 添加到相册的时间戳（ms） */
  addedAt: number;
}

/** 相册条目运行时元数据（不持久化） */
interface AlbumMeta {
  /** data URL，用于 <img> 显示 */
  dataUrl?: string;
  /** 图片像素宽度 */
  width?: number;
  /** 图片像素高度 */
  height?: number;
  /** 估算的文件大小（字节） */
  sizeBytes?: number;
  /** 是否正在加载 */
  loading?: boolean;
  /** 加载是否失败 */
  loadFailed?: boolean;
  /** 简易 EXIF 信息（仅 JPEG 尝试解析） */
  exif?: AlbumExifInfo;
}

/** 简易 EXIF 信息 */
interface AlbumExifInfo {
  /** 厂商，如 Canon */
  make?: string;
  /** 机型，如 EOS R5 */
  model?: string;
  /** 拍摄时间，原始字符串（YYYY:MM:DD HH:MM:SS） */
  dateTimeOriginal?: string;
  /** 曝光时间，文本，如 1/250s */
  exposureTime?: string;
  /** 光圈值，如 2.8 */
  fNumber?: number;
  /** 感光度，如 100 */
  iso?: number;
  /** 焦距（mm） */
  focalLength?: number;
}

/** 标准化数据，过滤非法项 */
function sanitizeAlbumItems(data: unknown): AlbumItem[] {
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
    const sepIdx = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
    const fallbackName = sepIdx >= 0 ? path.slice(sepIdx + 1) : path;
    const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : fallbackName;
    const addedAt = typeof row.addedAt === 'number' && Number.isFinite(row.addedAt) ? row.addedAt : Date.now();
    const id = typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : addedAt;
    result.push({ id, path, name, ext, addedAt });
  });
  return result;
}

/** 写入持久化（store + localStorage 兜底） */
function persistAlbumItems(items: AlbumItem[]): void {
  try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items)); } catch { /* noop */ }
  window.api.storeWrite(STORE_KEY, items).catch(() => {});
}

/** 文件大小格式化为可读字符串 */
function formatBytes(bytes: number | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** 时间戳格式化为本地时间字符串 */
function formatTimestamp(ts: number | undefined): string {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return '-';
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return '-';
  }
}

/** 估算 data URL 中 base64 部分对应的字节数 */
function estimateBytesFromDataUrl(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) return 0;
  const base64 = dataUrl.slice(commaIdx + 1);
  // 每 4 个 base64 字符对应 3 字节，padding 修正
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/**
 * 解析 JPEG 文件中的简易 EXIF 信息
 * @description 仅支持 JPEG，定位 APP1 段并解析 IFD0 / ExifIFD 中的常见字段。
 *   非 JPEG 或解析失败时返回 undefined。
 * @param buf - 文件二进制数据
 * @returns 解析得到的 EXIF 信息，缺失字段以 undefined 表示
 */
function parseJpegExif(buf: Uint8Array): AlbumExifInfo | undefined {
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
function parseExifTiff(buf: Uint8Array, tiffStart: number): AlbumExifInfo | undefined {
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
  const exif: AlbumExifInfo = {};
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
  exif: AlbumExifInfo,
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
function sortAlbumItems(items: AlbumItem[], mode: AlbumSortMode): AlbumItem[] {
  const next = [...items];
  if (mode === 'addedDesc') {
    next.sort((a, b) => b.addedAt - a.addedAt);
  } else if (mode === 'addedAsc') {
    next.sort((a, b) => a.addedAt - b.addedAt);
  } else if (mode === 'nameAsc') {
    next.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    next.sort((a, b) => b.name.localeCompare(a.name));
  }
  return next;
}

/** 校验列数取值并钳制在合法范围 */
function clampColumns(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : DEFAULT_COLUMNS;
  return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, n));
}

/**
 * 相册页主组件
 * @description 提供总览、单图放大、元数据侧栏与基础 EXIF 解析等能力。
 */
export function AlbumTab(): ReactElement {
  const { t } = useTranslation();
  const [items, setItems] = useState<AlbumItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [columns, setColumns] = useState<number>(DEFAULT_COLUMNS);
  const [sortMode, setSortMode] = useState<AlbumSortMode>('addedDesc');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragOverPage, setDragOverPage] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [metaCache, setMetaCache] = useState<Record<number, AlbumMeta>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const metaLoadingRef = useRef<Set<number>>(new Set());
  const exifLoadingRef = useRef<Set<number>>(new Set());
  const panStartRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  /** 初次加载持久化数据 */
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      window.api.storeRead(STORE_KEY).catch(() => null),
      window.api.storeRead(COLUMNS_STORE_KEY).catch(() => null),
      window.api.storeRead(SORT_STORE_KEY).catch(() => null),
    ]).then(([rawItems, rawColumns, rawSort]) => {
      if (cancelled) return;
      let parsed: AlbumItem[] = [];
      if (Array.isArray(rawItems) && rawItems.length > 0) {
        parsed = sanitizeAlbumItems(rawItems);
      } else {
        try {
          const local = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (local) parsed = sanitizeAlbumItems(JSON.parse(local) as unknown);
        } catch { /* noop */ }
      }
      setItems(parsed);
      setColumns(clampColumns(rawColumns));
      if (rawSort === 'addedDesc' || rawSort === 'addedAsc' || rawSort === 'nameAsc' || rawSort === 'nameDesc') {
        setSortMode(rawSort);
      }
      setLoaded(true);
    }).catch(() => {
      if (cancelled) return;
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  /** 持久化条目变更 */
  useEffect(() => {
    if (!loaded) return;
    persistAlbumItems(items);
  }, [items, loaded]);

  /** 持久化列数 */
  useEffect(() => {
    if (!loaded) return;
    window.api.storeWrite(COLUMNS_STORE_KEY, columns).catch(() => {});
  }, [columns, loaded]);

  /** 持久化排序模式 */
  useEffect(() => {
    if (!loaded) return;
    window.api.storeWrite(SORT_STORE_KEY, sortMode).catch(() => {});
  }, [sortMode, loaded]);

  /** 状态信息自动消失 */
  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  /** 主动加载图片元数据（dataUrl + 尺寸 + 大小） */
  const loadItemMeta = useCallback((item: AlbumItem): void => {
    if (metaLoadingRef.current.has(item.id)) return;
    metaLoadingRef.current.add(item.id);
    setMetaCache((prev) => ({ ...prev, [item.id]: { ...prev[item.id], loading: true } }));
    window.api.loadWallpaperFile(item.path).then((dataUrl) => {
      if (!dataUrl) {
        setMetaCache((prev) => ({ ...prev, [item.id]: { ...prev[item.id], loading: false, loadFailed: true } }));
        return;
      }
      const sizeBytes = estimateBytesFromDataUrl(dataUrl);
      const probe = new Image();
      probe.onload = () => {
        setMetaCache((prev) => ({
          ...prev,
          [item.id]: {
            ...prev[item.id],
            dataUrl,
            sizeBytes,
            width: probe.naturalWidth,
            height: probe.naturalHeight,
            loading: false,
            loadFailed: false,
          },
        }));
      };
      probe.onerror = () => {
        setMetaCache((prev) => ({
          ...prev,
          [item.id]: {
            ...prev[item.id],
            dataUrl,
            sizeBytes,
            loading: false,
            loadFailed: false,
          },
        }));
      };
      probe.src = dataUrl;
    }).catch(() => {
      setMetaCache((prev) => ({ ...prev, [item.id]: { ...prev[item.id], loading: false, loadFailed: true } }));
    }).finally(() => {
      metaLoadingRef.current.delete(item.id);
    });
  }, []);

  /** 异步加载 JPEG 的 EXIF 信息（仅在单图视图时触发） */
  const loadExifIfNeeded = useCallback((item: AlbumItem): void => {
    if (item.ext !== 'jpg' && item.ext !== 'jpeg') return;
    if (exifLoadingRef.current.has(item.id)) return;
    if (metaCache[item.id]?.exif) return;
    exifLoadingRef.current.add(item.id);
    window.api.readLocalFileAsBuffer(item.path).then((buf) => {
      if (!buf) return;
      const exif = parseJpegExif(buf);
      if (exif) {
        setMetaCache((prev) => ({
          ...prev,
          [item.id]: { ...prev[item.id], exif },
        }));
      }
    }).catch(() => {}).finally(() => {
      exifLoadingRef.current.delete(item.id);
    });
  }, [metaCache]);

  /** 已排序的条目列表 */
  const sortedItems = useMemo(() => sortAlbumItems(items, sortMode), [items, sortMode]);

  /** 缩略图为可见时按需加载 dataUrl */
  useEffect(() => {
    if (!loaded || items.length === 0) return;
    items.forEach((item) => {
      const meta = metaCache[item.id];
      if (!meta || (!meta.dataUrl && !meta.loading && !meta.loadFailed)) {
        loadItemMeta(item);
      }
    });
  }, [items, metaCache, loaded, loadItemMeta]);

  /** 进入单图视图时加载对应 EXIF */
  useEffect(() => {
    if (activeId === null) return;
    const target = items.find((it) => it.id === activeId);
    if (target) loadExifIfNeeded(target);
  }, [activeId, items, loadExifIfNeeded]);

  /** 单图视图的快捷键：ESC 退出，方向键切换 */
  useEffect(() => {
    if (activeId === null) return;
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setActiveId(null);
        return;
      }
      if (event.key === 'ArrowLeft') {
        navigateInViewer(-1);
      } else if (event.key === 'ArrowRight') {
        navigateInViewer(1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // navigateInViewer 不是依赖（在闭包中读取最新值通过 ref 不必要）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, sortedItems]);

  /**
   * 在单图视图按方向切换图片
   * @param delta - 步进方向（-1 上一张，1 下一张）
   */
  function navigateInViewer(delta: number): void {
    if (activeId === null || sortedItems.length === 0) return;
    const idx = sortedItems.findIndex((it) => it.id === activeId);
    if (idx < 0) return;
    const nextIdx = (idx + delta + sortedItems.length) % sortedItems.length;
    setActiveId(sortedItems[nextIdx].id);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  /** 处理选择 / 拖拽进入的 File 列表 */
  const handleAddFiles = useCallback((files: FileList | File[] | null): void => {
    if (!files) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    const additions: AlbumItem[] = [];
    list.forEach((file) => {
      const path = window.api?.getPathForFile?.(file) || '';
      if (!path) return;
      const dotIdx = path.lastIndexOf('.');
      const ext = (dotIdx >= 0 ? path.slice(dotIdx + 1) : '').toLowerCase();
      if (!ext || !SUPPORTED_EXTS.includes(ext)) return;
      const sepIdx = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
      const name = sepIdx >= 0 ? path.slice(sepIdx + 1) : path;
      const addedAt = Date.now() + additions.length;
      additions.push({ id: addedAt, path, name, ext, addedAt });
    });
    if (additions.length === 0) {
      setStatusMessage(t('albumTab.status.unsupportedOnly'));
      return;
    }
    setItems((prev) => {
      const existing = new Set(prev.map((it) => it.path.toLowerCase()));
      const filtered = additions.filter((it) => !existing.has(it.path.toLowerCase()));
      if (filtered.length === 0) {
        setStatusMessage(t('albumTab.status.allDuplicated'));
        return prev;
      }
      setStatusMessage(t('albumTab.status.added', { count: filtered.length }));
      return [...filtered, ...prev];
    });
  }, [t]);

  /** 选择按钮触发的 input change 处理 */
  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    handleAddFiles(event.target.files);
    event.target.value = '';
  };

  /** 触发隐藏的 file input */
  const handlePickFiles = (): void => {
    fileInputRef.current?.click();
  };

  /** 拖拽进入提示 */
  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    if (!dragOverPage) setDragOverPage(true);
  };

  /** 拖拽离开 */
  const handleDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    if (event.currentTarget === event.target) {
      setDragOverPage(false);
    }
  };

  /** 拖拽放下，导入图片 */
  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragOverPage(false);
    const files = event.dataTransfer?.files;
    if (files) handleAddFiles(files);
  };

  /** 调整每行列数（限制范围） */
  const handleColumnsChange = (delta: number): void => {
    setColumns((prev) => clampColumns(prev + delta));
  };

  /** 切换排序模式 */
  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const value = event.target.value;
    if (value === 'addedDesc' || value === 'addedAsc' || value === 'nameAsc' || value === 'nameDesc') {
      setSortMode(value);
    }
  };

  /** 二次确认清空 */
  const handleClear = (): void => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      window.setTimeout(() => setConfirmingClear(false), 2600);
      return;
    }
    setItems([]);
    setMetaCache({});
    setActiveId(null);
    setConfirmingClear(false);
    setStatusMessage(t('albumTab.status.cleared'));
  };

  /** 删除单个条目 */
  const handleRemove = (id: number): void => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setMetaCache((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeId === id) setActiveId(null);
  };

  /** 单图视图：滚轮缩放 */
  const handleViewerWheel = (event: WheelEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    event.preventDefault();
    setZoom((prev) => {
      const next = event.deltaY > 0 ? prev - ZOOM_STEP : prev + ZOOM_STEP;
      return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(next.toFixed(3))));
    });
  };

  /** 单图视图：开始拖动 */
  const handleViewerMouseDown = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (zoom <= 1) return;
    setIsPanning(true);
    panStartRef.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y };
  };

  /** 单图视图：拖动中 */
  const handleViewerMouseMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!isPanning || !panStartRef.current) return;
    const dx = event.clientX - panStartRef.current.x;
    const dy = event.clientY - panStartRef.current.y;
    setPan({ x: panStartRef.current.px + dx, y: panStartRef.current.py + dy });
  };

  /** 单图视图：拖动结束 */
  const handleViewerMouseUp = (): void => {
    setIsPanning(false);
    panStartRef.current = null;
  };

  /** 单图视图：缩放按钮 */
  const handleZoom = (delta: number): void => {
    setZoom((prev) => {
      const next = prev + delta;
      return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(next.toFixed(3))));
    });
  };

  /** 单图视图：重置缩放与位置 */
  const handleResetZoom = (): void => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  /** 单图视图：1:1 显示 */
  const handleOriginalZoom = (): void => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setStatusMessage(t('albumTab.status.zoomReset'));
  };

  /** 在系统资源管理器中定位当前图片 */
  const handleOpenInExplorer = (item: AlbumItem): void => {
    window.api.openInExplorer(item.path).then((ok) => {
      if (!ok) {
        setStatusMessage(t('albumTab.status.openInExplorerFailed', { name: item.name }));
      }
    }).catch(() => {
      setStatusMessage(t('albumTab.status.openInExplorerFailed', { name: item.name }));
    });
  };

  /** Phase 2 占位：另存为 */
  const handleSaveAs = (item: AlbumItem): void => {
    setStatusMessage(t('albumTab.status.saveAsComing', { name: item.name }));
  };

  /** 进入单图视图 */
  const handleOpenItem = (item: AlbumItem): void => {
    setActiveId(item.id);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const totalCount = items.length;
  const activeItem = useMemo(
    () => (activeId === null ? null : items.find((it) => it.id === activeId) ?? null),
    [activeId, items],
  );
  const activeMeta = activeItem ? metaCache[activeItem.id] : undefined;

  const sortOptions = useMemo<Array<{ value: AlbumSortMode; label: string }>>(() => ([
    { value: 'addedDesc', label: t('albumTab.sort.addedDesc') },
    { value: 'addedAsc', label: t('albumTab.sort.addedAsc') },
    { value: 'nameAsc', label: t('albumTab.sort.nameAsc') },
    { value: 'nameDesc', label: t('albumTab.sort.nameDesc') },
  ]), [t]);

  return (
    <div
      className={`album-tab${dragOverPage ? ' album-tab--drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 头部：标题 / 计数 / 操作 */}
      <div className="album-header">
        <div className="album-header-main">
          <span className="album-title">{t('albumTab.title')}</span>
          <span className="album-count">
            {t('albumTab.count', { count: totalCount })}
          </span>
        </div>
        <div className="album-header-actions">
          <label className="album-sort">
            <span className="album-sort-label">{t('albumTab.sort.label')}</span>
            <select
              className="album-sort-select"
              value={sortMode}
              onChange={handleSortChange}
              aria-label={t('albumTab.sort.label')}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <div className="album-columns" aria-label={t('albumTab.columns.aria')}>
            <button
              className="album-icon-btn"
              type="button"
              onClick={() => handleColumnsChange(-1)}
              disabled={columns <= MIN_COLUMNS}
              title={t('albumTab.columns.smaller')}
              aria-label={t('albumTab.columns.smaller')}
            >
              −
            </button>
            <span className="album-columns-value">{columns}</span>
            <button
              className="album-icon-btn"
              type="button"
              onClick={() => handleColumnsChange(1)}
              disabled={columns >= MAX_COLUMNS}
              title={t('albumTab.columns.larger')}
              aria-label={t('albumTab.columns.larger')}
            >
              +
            </button>
          </div>
          <button
            className="album-primary-btn"
            type="button"
            onClick={handlePickFiles}
            title={t('albumTab.actions.add')}
          >
            {t('albumTab.actions.add')}
          </button>
          <button
            className={`album-danger-btn${confirmingClear ? ' album-danger-btn--confirm' : ''}`}
            type="button"
            onClick={handleClear}
            disabled={totalCount === 0}
            title={t('albumTab.actions.clear')}
          >
            {confirmingClear ? t('albumTab.actions.clearConfirm') : t('albumTab.actions.clear')}
          </button>
        </div>
      </div>

      {/* 状态消息 */}
      {statusMessage ? <div className="album-status">{statusMessage}</div> : null}

      {/* 隐藏的文件选择 input */}
      <input
        ref={fileInputRef}
        className="album-file-input"
        type="file"
        accept={SUPPORTED_EXTS.map((e) => `.${e}`).join(',')}
        multiple
        onChange={handleFileInputChange}
      />

      {/* 主内容区域：总览 or 单图 */}
      {activeId === null ? (
        <div
          className="album-overview"
          style={{ ['--album-columns' as string]: String(columns) } as React.CSSProperties}
        >
          {totalCount === 0 ? (
            <div className="album-empty">
              <div className="album-empty-title">{t('albumTab.empty.title')}</div>
              <div className="album-empty-desc">{t('albumTab.empty.desc')}</div>
              <button className="album-primary-btn" type="button" onClick={handlePickFiles}>
                {t('albumTab.actions.add')}
              </button>
            </div>
          ) : (
            <div className="album-grid" onWheelCapture={(event) => event.stopPropagation()}>
              {sortedItems.map((item) => {
                const meta = metaCache[item.id];
                return (
                  <div key={item.id} className="album-grid-item">
                    <button
                      className="album-thumb"
                      type="button"
                      onClick={() => handleOpenItem(item)}
                      title={item.name}
                    >
                      {meta?.dataUrl ? (
                        <img className="album-thumb-img" src={meta.dataUrl} alt={item.name} loading="lazy" />
                      ) : meta?.loadFailed ? (
                        <span className="album-thumb-fallback">{t('albumTab.thumb.failed')}</span>
                      ) : (
                        <span className="album-thumb-fallback">{t('albumTab.thumb.loading')}</span>
                      )}
                    </button>
                    <div className="album-grid-meta">
                      <span className="album-grid-name" title={item.name}>{item.name}</span>
                      <button
                        className="album-grid-remove"
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        title={t('albumTab.actions.remove')}
                        aria-label={t('albumTab.actions.removeAria', { name: item.name })}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        activeItem ? (
          <div className="album-viewer">
            {/* 顶部工具栏 */}
            <div className="album-viewer-toolbar">
              <button
                className="album-icon-btn"
                type="button"
                onClick={() => setActiveId(null)}
                title={t('albumTab.viewer.back')}
              >
                ←
              </button>
              <button
                className="album-icon-btn"
                type="button"
                onClick={() => navigateInViewer(-1)}
                disabled={sortedItems.length <= 1}
                title={t('albumTab.viewer.prev')}
              >
                ‹
              </button>
              <button
                className="album-icon-btn"
                type="button"
                onClick={() => navigateInViewer(1)}
                disabled={sortedItems.length <= 1}
                title={t('albumTab.viewer.next')}
              >
                ›
              </button>
              <span className="album-viewer-name" title={activeItem.path}>{activeItem.name}</span>
              <div className="album-viewer-zoom-group">
                <button
                  className="album-icon-btn"
                  type="button"
                  onClick={() => handleZoom(-ZOOM_STEP)}
                  disabled={zoom <= ZOOM_MIN + 0.001}
                  title={t('albumTab.viewer.zoomOut')}
                >
                  −
                </button>
                <span className="album-viewer-zoom-value">{Math.round(zoom * 100)}%</span>
                <button
                  className="album-icon-btn"
                  type="button"
                  onClick={() => handleZoom(ZOOM_STEP)}
                  disabled={zoom >= ZOOM_MAX - 0.001}
                  title={t('albumTab.viewer.zoomIn')}
                >
                  +
                </button>
                <button
                  className="album-text-btn"
                  type="button"
                  onClick={handleOriginalZoom}
                  title={t('albumTab.viewer.zoomOne')}
                >
                  1:1
                </button>
                <button
                  className="album-text-btn"
                  type="button"
                  onClick={handleResetZoom}
                  title={t('albumTab.viewer.zoomFit')}
                >
                  {t('albumTab.viewer.fit')}
                </button>
              </div>
              <div className="album-viewer-actions">
                <button
                  className="album-text-btn"
                  type="button"
                  onClick={() => handleOpenInExplorer(activeItem)}
                  title={t('albumTab.viewer.openInExplorer')}
                >
                  {t('albumTab.viewer.openInExplorer')}
                </button>
                <button
                  className="album-text-btn"
                  type="button"
                  onClick={() => handleSaveAs(activeItem)}
                  title={t('albumTab.viewer.saveAs')}
                >
                  {t('albumTab.viewer.saveAs')}
                </button>
              </div>
            </div>

            {/* 主图 + 元数据侧栏 */}
            <div className="album-viewer-body">
              <div
                className={`album-viewer-canvas${zoom > 1 ? ' album-viewer-canvas--pannable' : ''}${isPanning ? ' album-viewer-canvas--panning' : ''}`}
                onWheel={handleViewerWheel}
                onMouseDown={handleViewerMouseDown}
                onMouseMove={handleViewerMouseMove}
                onMouseUp={handleViewerMouseUp}
                onMouseLeave={handleViewerMouseUp}
                onDoubleClick={handleResetZoom}
              >
                {activeMeta?.dataUrl ? (
                  <img
                    className="album-viewer-image"
                    src={activeMeta.dataUrl}
                    alt={activeItem.name}
                    draggable={false}
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    }}
                  />
                ) : activeMeta?.loadFailed ? (
                  <span className="album-viewer-fallback">{t('albumTab.viewer.failed')}</span>
                ) : (
                  <span className="album-viewer-fallback">{t('albumTab.viewer.loading')}</span>
                )}
              </div>
              <aside className="album-meta-panel">
                <div className="album-meta-title">{t('albumTab.meta.title')}</div>
                <ul className="album-meta-list">
                  <li className="album-meta-row">
                    <span className="album-meta-label">{t('albumTab.meta.name')}</span>
                    <span className="album-meta-value" title={activeItem.name}>{activeItem.name}</span>
                  </li>
                  <li className="album-meta-row">
                    <span className="album-meta-label">{t('albumTab.meta.format')}</span>
                    <span className="album-meta-value">{activeItem.ext.toUpperCase() || '-'}</span>
                  </li>
                  <li className="album-meta-row">
                    <span className="album-meta-label">{t('albumTab.meta.resolution')}</span>
                    <span className="album-meta-value">
                      {activeMeta?.width && activeMeta?.height
                        ? `${activeMeta.width} × ${activeMeta.height}`
                        : '-'}
                    </span>
                  </li>
                  <li className="album-meta-row">
                    <span className="album-meta-label">{t('albumTab.meta.size')}</span>
                    <span className="album-meta-value">{formatBytes(activeMeta?.sizeBytes)}</span>
                  </li>
                  <li className="album-meta-row">
                    <span className="album-meta-label">{t('albumTab.meta.addedAt')}</span>
                    <span className="album-meta-value">{formatTimestamp(activeItem.addedAt)}</span>
                  </li>
                  <li className="album-meta-row album-meta-row--path">
                    <span className="album-meta-label">{t('albumTab.meta.path')}</span>
                    <span className="album-meta-value album-meta-path" title={activeItem.path}>{activeItem.path}</span>
                  </li>
                </ul>

                {activeMeta?.exif ? (
                  <>
                    <div className="album-meta-title album-meta-title--sub">{t('albumTab.meta.exifTitle')}</div>
                    <ul className="album-meta-list">
                      {activeMeta.exif.make ? (
                        <li className="album-meta-row">
                          <span className="album-meta-label">{t('albumTab.meta.make')}</span>
                          <span className="album-meta-value">{activeMeta.exif.make}</span>
                        </li>
                      ) : null}
                      {activeMeta.exif.model ? (
                        <li className="album-meta-row">
                          <span className="album-meta-label">{t('albumTab.meta.model')}</span>
                          <span className="album-meta-value">{activeMeta.exif.model}</span>
                        </li>
                      ) : null}
                      {activeMeta.exif.dateTimeOriginal ? (
                        <li className="album-meta-row">
                          <span className="album-meta-label">{t('albumTab.meta.dateTimeOriginal')}</span>
                          <span className="album-meta-value">{activeMeta.exif.dateTimeOriginal}</span>
                        </li>
                      ) : null}
                      {activeMeta.exif.exposureTime ? (
                        <li className="album-meta-row">
                          <span className="album-meta-label">{t('albumTab.meta.exposure')}</span>
                          <span className="album-meta-value">{activeMeta.exif.exposureTime}</span>
                        </li>
                      ) : null}
                      {activeMeta.exif.fNumber ? (
                        <li className="album-meta-row">
                          <span className="album-meta-label">{t('albumTab.meta.fNumber')}</span>
                          <span className="album-meta-value">f/{activeMeta.exif.fNumber}</span>
                        </li>
                      ) : null}
                      {activeMeta.exif.iso ? (
                        <li className="album-meta-row">
                          <span className="album-meta-label">{t('albumTab.meta.iso')}</span>
                          <span className="album-meta-value">ISO {activeMeta.exif.iso}</span>
                        </li>
                      ) : null}
                      {activeMeta.exif.focalLength ? (
                        <li className="album-meta-row">
                          <span className="album-meta-label">{t('albumTab.meta.focalLength')}</span>
                          <span className="album-meta-value">{activeMeta.exif.focalLength} mm</span>
                        </li>
                      ) : null}
                    </ul>
                  </>
                ) : (activeItem.ext === 'jpg' || activeItem.ext === 'jpeg') ? (
                  <div className="album-meta-empty">{t('albumTab.meta.exifEmpty')}</div>
                ) : null}
              </aside>
            </div>
          </div>
        ) : null
      )}

      {/* 拖拽蒙层提示 */}
      {dragOverPage ? (
        <div className="album-drop-mask" aria-hidden="true">
          <span className="album-drop-mask-text">{t('albumTab.dropHint')}</span>
        </div>
      ) : null}
    </div>
  );
}
