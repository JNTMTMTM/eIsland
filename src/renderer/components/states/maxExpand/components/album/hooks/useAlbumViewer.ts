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
 * @file useAlbumViewer.ts
 * @description 单图/视频查看器 hook — 缩放平移、视频播放控制、键盘导航。
 * @author 鸡哥
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, WheelEvent } from 'react';
import type { AlbumItem, AlbumMeta, UseAlbumViewerReturn } from '../types/albumTypes';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../config/albumConfig';

/** 单图/视频查看器 hook */
export function useAlbumViewer(
  items: AlbumItem[],
  filteredItems: AlbumItem[],
  metaCache: Record<number, AlbumMeta>,
  /** 进入单图视图时按需加载 EXIF（由 useAlbumItems 提供） */
  loadExifIfNeeded: (item: AlbumItem) => void,
  /** 进入单图视图时按需加载原图（由 useAlbumItems 提供） */
  loadFullImage: (item: AlbumItem) => void,
): UseAlbumViewerReturn {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [viewerSlideDir, setViewerSlideDir] = useState<'prev' | 'next'>('next');
  const [videoPlaying, setVideoPlaying] = useState<boolean>(true);
  const [videoMuted, setVideoMuted] = useState<boolean>(true);
  const [videoVolume, setVideoVolume] = useState<number>(0.6);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoControlsCollapsed, setVideoControlsCollapsed] = useState<boolean>(false);
  const viewerVideoRef = useRef<HTMLVideoElement | null>(null);
  const panStartRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  /** 派生值 */
  const activeItem = useMemo(
    () => (activeId === null ? null : items.find((it) => it.id === activeId) ?? null),
    [activeId, items],
  );
  const activeMeta = activeItem ? metaCache[activeItem.id] : undefined;
  const activeIsVideo = activeItem?.mediaType === 'video';
  const activeVideoUrl = activeItem && activeIsVideo
    ? (activeMeta?.videoUrl || null)
    : null;

  /** 切换 activeId 时重置视频状态 */
  useEffect(() => {
    if (activeId === null) return;
    const target = items.find((it) => it.id === activeId);
    if (!target || target.mediaType !== 'video') return;
    setVideoPlaying(true);
    setVideoMuted(true);
    setVideoVolume(0.6);
    setVideoCurrentTime(0);
    setVideoDuration(0);
    setVideoControlsCollapsed(false);
  }, [activeId, items]);

  /** 进入单图视图时按需加载原图与 EXIF */
  useEffect(() => {
    if (activeId === null) return;
    const target = items.find((it) => it.id === activeId);
    if (!target) return;
    loadFullImage(target);
    loadExifIfNeeded(target);
  }, [activeId, items, loadExifIfNeeded, loadFullImage]);

  /** 同步 video muted */
  useEffect(() => {
    const el = viewerVideoRef.current;
    if (!el) return;
    el.muted = videoMuted;
  }, [videoMuted]);

  /** 同步 video volume */
  useEffect(() => {
    const el = viewerVideoRef.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, videoVolume));
  }, [videoVolume]);

  /**
   * 在单图视图按方向切换图片
   * @param delta - 步进方向（-1 上一张，1 下一张）
   */
  const navigateInViewer = useCallback((delta: number): void => {
    if (activeId === null || filteredItems.length === 0) return;
    const idx = filteredItems.findIndex((it) => it.id === activeId);
    if (idx < 0) return;
    const nextIdx = (idx + delta + filteredItems.length) % filteredItems.length;
    setViewerSlideDir(delta < 0 ? 'prev' : 'next');
    setActiveId(filteredItems[nextIdx].id);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [activeId, filteredItems]);

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
  }, [activeId, navigateInViewer]);

  /** 进入单图视图 */
  const handleOpenItem = (item: AlbumItem): void => {
    setViewerSlideDir('next');
    setActiveId(item.id);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  /** 单图视图：滚轮缩放 */
  const handleViewerWheel = (event: WheelEvent<HTMLDivElement>): void => {
    if (!activeItem || activeItem.mediaType !== 'image') return;
    event.stopPropagation();
    event.preventDefault();
    setZoom((prev) => {
      const next = event.deltaY > 0 ? prev - ZOOM_STEP : prev + ZOOM_STEP;
      return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(next.toFixed(3))));
    });
  };

  /** 单图视图：开始拖动 */
  const handleViewerMouseDown = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!activeItem || activeItem.mediaType !== 'image') return;
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

  const handleVideoLoadedMetadata = (): void => {
    const el = viewerVideoRef.current;
    if (!el) return;
    setVideoDuration(Number.isFinite(el.duration) ? el.duration : 0);
    setVideoCurrentTime(Number.isFinite(el.currentTime) ? el.currentTime : 0);
    el.muted = videoMuted;
    el.volume = Math.max(0, Math.min(1, videoVolume));
    el.play().then(() => {
      setVideoPlaying(true);
    }).catch(() => {
      setVideoPlaying(false);
    });
  };

  const handleVideoTimeUpdate = (): void => {
    const el = viewerVideoRef.current;
    if (!el) return;
    setVideoCurrentTime(Number.isFinite(el.currentTime) ? el.currentTime : 0);
  };

  const handleToggleVideoPlay = (): void => {
    const el = viewerVideoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => {
        setVideoPlaying(true);
      }).catch(() => {
        setVideoPlaying(false);
      });
      return;
    }
    el.pause();
    setVideoPlaying(false);
  };

  const handleVideoSeek = (event: ChangeEvent<HTMLInputElement>): void => {
    const el = viewerVideoRef.current;
    if (!el) return;
    const next = Number(event.target.value);
    if (!Number.isFinite(next)) return;
    el.currentTime = next;
    setVideoCurrentTime(next);
  };

  const handleToggleVideoMute = (): void => {
    setVideoMuted((prev) => !prev);
  };

  const handleVideoVolumeChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const next = Number(event.target.value);
    if (!Number.isFinite(next)) return;
    const safe = Math.max(0, Math.min(1, next));
    setVideoVolume(safe);
    if (safe > 0 && videoMuted) {
      setVideoMuted(false);
    }
  };

  const handleToggleVideoControls = (): void => {
    setVideoControlsCollapsed((prev) => !prev);
  };

  /** 视频播放结束 */
  const handleVideoEnded = (): void => {
    setVideoPlaying(false);
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

  return {
    activeId,
    setActiveId,
    zoom,
    setZoom,
    pan,
    setPan,
    isPanning,
    viewerSlideDir,
    videoPlaying,
    videoMuted,
    videoVolume,
    videoCurrentTime,
    videoDuration,
    videoControlsCollapsed,
    viewerVideoRef,
    activeItem,
    activeMeta,
    activeIsVideo,
    activeVideoUrl,
    navigateInViewer,
    handleOpenItem,
    handleViewerWheel,
    handleViewerMouseDown,
    handleViewerMouseMove,
    handleViewerMouseUp,
    handleVideoLoadedMetadata,
    handleVideoTimeUpdate,
    handleToggleVideoPlay,
    handleVideoSeek,
    handleToggleVideoMute,
    handleVideoVolumeChange,
    handleToggleVideoControls,
    handleZoom,
    handleResetZoom,
    handleVideoEnded,
  };
}
