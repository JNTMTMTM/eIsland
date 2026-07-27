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
 * @file useAlbumItems.ts
 * @description 相册条目管理 hook — 初始化加载、CRUD、持久化、媒体元数据与 EXIF 加载、文件导入。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AlbumItem, AlbumMeta, UseAlbumItemsReturn } from '../types/albumTypes';
import {
  COLUMNS_STORE_KEY,
  GROUP_MODE_STORE_KEY,
  LOCAL_STORAGE_KEY,
  MEDIA_LOAD_CONCURRENCY,
  MEDIA_LOAD_DELAY_MS,
  SORT_STORE_KEY,
  STORE_KEY,
  SUPPORTED_EXTS,
} from '../config/albumConfig';
import type { AlbumGroupMode, AlbumSortMode } from '../types/albumTypes';
import {
  clampColumns,
  estimateBytesFromDataUrl,
  getMediaTypeByExt,
  getVideoMimeByExt,
  guessVideoCodecByExt,
  parseJpegExif,
  persistAlbumItems,
  revokeBlobUrl,
  sanitizeAlbumItems,
} from '../utils/albumUtils';

/** 相册条目管理 hook */
export function useAlbumItems(): UseAlbumItemsReturn {
  const { t } = useTranslation();
  const [items, setItems] = useState<AlbumItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mediaLoadReady, setMediaLoadReady] = useState(false);
  const [metaCache, setMetaCache] = useState<Record<number, AlbumMeta>>({});
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [initColumns, setInitColumns] = useState<number>(5);
  const [initSortMode, setInitSortMode] = useState<AlbumSortMode>('addedDesc');
  const [initGroupMode, setInitGroupMode] = useState<AlbumGroupMode>('none');
  const metaCacheRef = useRef<Record<number, AlbumMeta>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const gridVideoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const metaLoadingRef = useRef<Set<number>>(new Set());
  const fullImageLoadingRef = useRef<Set<number>>(new Set());
  const requestedFullImageIdRef = useRef<number | null>(null);
  const exifLoadingRef = useRef<Set<number>>(new Set());
  const mediaQueueRef = useRef<AlbumItem[]>([]);
  const mediaQueuedIdsRef = useRef<Set<number>>(new Set());
  const mediaActiveCountRef = useRef(0);
  const drainMediaQueueRef = useRef<() => void>(() => {});

  /** 初次加载持久化数据 */
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      window.api.storeRead(STORE_KEY).catch(() => null),
      window.api.storeRead(COLUMNS_STORE_KEY).catch(() => null),
      window.api.storeRead(SORT_STORE_KEY).catch(() => null),
      window.api.storeRead(GROUP_MODE_STORE_KEY).catch(() => null),
    ]).then(([rawItems, rawColumns, rawSort, rawGroupMode]) => {
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
      setInitColumns(clampColumns(rawColumns));
      if (rawSort === 'addedDesc' || rawSort === 'addedAsc' || rawSort === 'nameAsc' || rawSort === 'nameDesc' || rawSort === 'durationDesc' || rawSort === 'durationAsc') {
        setInitSortMode(rawSort);
      }
      if (rawGroupMode === 'none' || rawGroupMode === 'folder' || rawGroupMode === 'date') {
        setInitGroupMode(rawGroupMode);
      }
      setLoaded(true);
    }).catch(() => {
      if (cancelled) return;
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  /** 延迟触发媒体加载，避免从 Expand 切到 MaxExpand 时动画被 IO/解码阻塞 */
  useEffect(() => {
    const timer = window.setTimeout(() => setMediaLoadReady(true), MEDIA_LOAD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  /** 持久化条目变更 */
  useEffect(() => {
    if (!loaded) return;
    persistAlbumItems(items);
  }, [items, loaded]);

  /** 状态信息自动消失 */
  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    metaCacheRef.current = metaCache;
  }, [metaCache]);

  useEffect(() => {
    return () => {
      Object.values(metaCacheRef.current).forEach((meta) => revokeBlobUrl(meta.videoUrl));
    };
  }, []);

  /** 主动加载媒体元数据（图像/视频），完成后自动驱动队列 */
  const loadItemMeta = useCallback((item: AlbumItem): void => {
    if (metaLoadingRef.current.has(item.id)) return;
    metaLoadingRef.current.add(item.id);
    setMetaCache((prev) => ({ ...prev, [item.id]: { ...prev[item.id], loading: true } }));
    if (item.mediaType === 'video') {
      window.api.readLocalFileAsBuffer(item.path).then((buf) => {
        if (!buf) throw new Error('video buffer read failed');
        const mime = getVideoMimeByExt(item.ext);
        const arrayBuffer = new ArrayBuffer(buf.byteLength);
        new Uint8Array(arrayBuffer).set(buf);
        const blobUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: mime }));
        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.muted = true;
        probe.playsInline = true;
        probe.onloadedmetadata = () => {
          setMetaCache((prev) => {
            const previousVideoUrl = prev[item.id]?.videoUrl;
            if (previousVideoUrl && previousVideoUrl !== blobUrl) {
              revokeBlobUrl(previousVideoUrl);
            }
            return {
              ...prev,
              [item.id]: {
                ...prev[item.id],
                videoUrl: blobUrl,
                width: probe.videoWidth,
                height: probe.videoHeight,
                durationSec: Number.isFinite(probe.duration) ? probe.duration : 0,
                sizeBytes: buf.byteLength,
                videoCodec: guessVideoCodecByExt(item.ext),
                loading: false,
                loadFailed: false,
              },
            };
          });
        };
        probe.onerror = () => {
          revokeBlobUrl(blobUrl);
          setMetaCache((prev) => ({
            ...prev,
            [item.id]: { ...prev[item.id], loading: false, loadFailed: true },
          }));
        };
        probe.src = blobUrl;
      }).catch(() => {
        setMetaCache((prev) => ({
          ...prev,
          [item.id]: { ...prev[item.id], loading: false, loadFailed: true },
        }));
      }).finally(() => {
        metaLoadingRef.current.delete(item.id);
        mediaActiveCountRef.current = Math.max(0, mediaActiveCountRef.current - 1);
        drainMediaQueueRef.current();
      });
      return;
    }
    window.api.loadAlbumThumbnail(item.path).then((thumbnailUrl) => {
      if (!thumbnailUrl) {
        setMetaCache((prev) => ({ ...prev, [item.id]: { ...prev[item.id], loading: false, loadFailed: true } }));
        return;
      }
      setMetaCache((prev) => ({
        ...prev,
        [item.id]: {
          ...prev[item.id],
          thumbnailUrl,
          loading: false,
          loadFailed: false,
        },
      }));
    }).catch(() => {
      setMetaCache((prev) => ({ ...prev, [item.id]: { ...prev[item.id], loading: false, loadFailed: true } }));
    }).finally(() => {
      metaLoadingRef.current.delete(item.id);
      mediaActiveCountRef.current = Math.max(0, mediaActiveCountRef.current - 1);
      drainMediaQueueRef.current();
    });
  }, []);

  /** 仅为当前查看项加载原图，并释放上一张原图字符串 */
  const loadFullImage = useCallback((item: AlbumItem): void => {
    if (item.mediaType !== 'image') return;
    requestedFullImageIdRef.current = item.id;
    if (metaCacheRef.current[item.id]?.dataUrl || fullImageLoadingRef.current.has(item.id)) return;
    fullImageLoadingRef.current.add(item.id);
    setMetaCache((prev) => ({
      ...prev,
      [item.id]: { ...prev[item.id], loading: true, loadFailed: false },
    }));
    window.api.loadWallpaperFile(item.path).then((dataUrl) => {
      if (!dataUrl || requestedFullImageIdRef.current !== item.id) return;
      const sizeBytes = estimateBytesFromDataUrl(dataUrl);
      const probe = new Image();
      const commit = (width?: number, height?: number): void => {
        if (requestedFullImageIdRef.current !== item.id) return;
        setMetaCache((prev) => {
          const next = Object.fromEntries(
            Object.entries(prev).map(([id, meta]) => [id, id === String(item.id) ? meta : { ...meta, dataUrl: undefined }]),
          ) as Record<number, AlbumMeta>;
          next[item.id] = {
            ...next[item.id],
            dataUrl,
            sizeBytes,
            width,
            height,
            loading: false,
            loadFailed: false,
          };
          return next;
        });
      };
      probe.onload = () => commit(probe.naturalWidth, probe.naturalHeight);
      probe.onerror = () => commit();
      probe.src = dataUrl;
    }).catch(() => {
      if (requestedFullImageIdRef.current !== item.id) return;
      setMetaCache((prev) => ({
        ...prev,
        [item.id]: { ...prev[item.id], loading: false, loadFailed: true },
      }));
    }).finally(() => {
      fullImageLoadingRef.current.delete(item.id);
    });
  }, []);

  /** 从队列中取出下一个待加载项并执行（受并发上限控制） */
  const drainMediaQueue = useCallback((): void => {
    while (mediaActiveCountRef.current < MEDIA_LOAD_CONCURRENCY && mediaQueueRef.current.length > 0) {
      const next = mediaQueueRef.current.shift();
      if (!next) break;
      mediaQueuedIdsRef.current.delete(next.id);
      mediaActiveCountRef.current += 1;
      loadItemMeta(next);
    }
  }, [loadItemMeta]);

  /** 保持 ref 始终指向最新的 drainMediaQueue */
  useEffect(() => {
    drainMediaQueueRef.current = drainMediaQueue;
  }, [drainMediaQueue]);

  /** 缩略图按需入队加载（受并发上限控制，不依赖 metaCache 避免反复触发） */
  useEffect(() => {
    if (!loaded || !mediaLoadReady || items.length === 0) return;
    const pending: AlbumItem[] = [];
    items.forEach((item) => {
      if (metaLoadingRef.current.has(item.id) || mediaQueuedIdsRef.current.has(item.id)) return;
      const meta = metaCache[item.id];
      const hasPreview = item.mediaType === 'video' ? Boolean(meta?.videoUrl) : Boolean(meta?.thumbnailUrl);
      if (!meta || (!hasPreview && !meta.loading && !meta.loadFailed)) {
        pending.push(item);
      }
    });
    if (pending.length === 0) return;
    pending.forEach((item) => mediaQueuedIdsRef.current.add(item.id));
    mediaQueueRef.current.push(...pending);
    drainMediaQueue();
  }, [items, loaded, mediaLoadReady, drainMediaQueue]);

  /** 异步加载 JPEG 的 EXIF 信息（仅在单图视图时触发） */
  const loadExifIfNeeded = useCallback((item: AlbumItem): void => {
    if (item.mediaType !== 'image') return;
    if (item.ext !== 'jpg' && item.ext !== 'jpeg') return;
    if (exifLoadingRef.current.has(item.id)) return;
    if (metaCache[item.id]?.exif) return;
    exifLoadingRef.current.add(item.id);
    window.api.readLocalFileAsBuffer(item.path).then((buf) => {
      if (!buf) return;
      const exif = parseJpegExif(buf);
      if (exif) {
        setMetaCache((prev) => ({ ...prev, [item.id]: { ...prev[item.id], exif } }));
      }
    }).catch(() => { }).finally(() => {
      exifLoadingRef.current.delete(item.id);
    });
  }, [metaCache]);

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
      const mediaType = getMediaTypeByExt(ext);
      if (!mediaType) return;
      const sepIdx = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
      const name = sepIdx >= 0 ? path.slice(sepIdx + 1) : path;
      const addedAt = Date.now() + additions.length;
      additions.push({ id: addedAt, path, name, ext, mediaType, addedAt });
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

  /** 删除单个条目 */
  const handleRemove = useCallback((id: number): void => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setMetaCache((prev) => {
      const next = { ...prev };
      revokeBlobUrl(next[id]?.videoUrl);
      delete next[id];
      return next;
    });
  }, []);

  /** 批量删除选中条目 */
  const handleRemoveSelected = useCallback((ids: Set<number>): void => {
    if (ids.size === 0) return;
    const idsToRemove = new Set(ids);
    setItems((prev) => prev.filter((item) => !idsToRemove.has(item.id)));
    setMetaCache((prev) => {
      const next = { ...prev };
      idsToRemove.forEach((id) => {
        revokeBlobUrl(next[id]?.videoUrl);
        delete next[id];
      });
      return next;
    });
    setStatusMessage(t('albumTab.status.removedSelected', { count: idsToRemove.size }));
  }, [t]);

  /** 缩略图视频 hover 播放 */
  const handleThumbMouseEnter = useCallback((item: AlbumItem): void => {
    if (item.mediaType !== 'video') return;
    const el = gridVideoRefs.current[item.id];
    if (!el) return;
    el.play().catch(() => {});
  }, []);

  /** 缩略图视频 hover 离开 */
  const handleThumbMouseLeave = useCallback((item: AlbumItem): void => {
    if (item.mediaType !== 'video') return;
    const el = gridVideoRefs.current[item.id];
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  }, []);

  /** 文件选择后处理并重置 input */
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    handleAddFiles(event.target.files);
    event.target.value = '';
  }, [handleAddFiles]);

  /** 触发文件选择器 */
  const handlePickFiles = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  return {
    items,
    setItems,
    loaded,
    mediaLoadReady,
    metaCache,
    statusMessage,
    setStatusMessage,
    fileInputRef,
    gridVideoRefs,
    initColumns,
    initSortMode,
    initGroupMode,
    loadExifIfNeeded,
    loadFullImage,
    handleAddFiles,
    handleRemove,
    handleRemoveSelected,
    handleThumbMouseEnter,
    handleThumbMouseLeave,
    handleFileInputChange,
    handlePickFiles,
  };
}
