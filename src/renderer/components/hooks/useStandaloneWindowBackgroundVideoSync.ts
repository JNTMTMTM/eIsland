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
 * @file useStandaloneWindowBackgroundVideoSync.ts
 * @description 独立窗口背景视频同步 Hook。
 * @author 鸡哥
 */

import { useEffect, useRef } from 'react';
import { canPlayBackgroundVideo, watchBackgroundVideo } from '../../utils/backgroundVideoPlayback';
import type { IslandBgMediaType } from '../config/dynamicIslandConfig';

interface UseStandaloneWindowBackgroundVideoSyncOptions {
  bgMedia: { type: IslandBgMediaType; previewUrl: string } | null;
  bgVideoElementRef: React.MutableRefObject<HTMLVideoElement | null>;
  bgVideoLoop: boolean;
  bgVideoVolume: number;
  bgVideoRate: number;
  bgVideoHwDecode: boolean;
}

interface StandaloneWindowBackgroundVideoSyncState {
  handleVideoLoadedMetadata: React.ReactEventHandler<HTMLVideoElement>;
  handleVideoCanPlay: React.ReactEventHandler<HTMLVideoElement>;
}

/**
 * @description 管理独立窗口背景视频循环与播放参数。
 * @param options - 独立窗口背景视频同步配置。
 * @returns 视频事件处理函数集合。
 */
export function useStandaloneWindowBackgroundVideoSync(options: UseStandaloneWindowBackgroundVideoSyncOptions): StandaloneWindowBackgroundVideoSyncState {
  const {
    bgMedia,
    bgVideoElementRef,
    bgVideoLoop,
    bgVideoVolume,
    bgVideoRate,
    bgVideoHwDecode,
  } = options;

  const bgVideoLoopRef = useRef<boolean>(bgVideoLoop);
  useEffect(() => { bgVideoLoopRef.current = bgVideoLoop; }, [bgVideoLoop]);

  useEffect(() => {
    if (bgMedia?.type !== 'video') return;
    const el = bgVideoElementRef.current;
    if (!el) return;
    el.loop = false;
    const stopWatching = watchBackgroundVideo(el, () => bgVideoLoopRef.current);
    const restart = (): void => {
      if (!bgVideoLoopRef.current || !canPlayBackgroundVideo(el)) return;
      try { el.currentTime = 0; } catch { /* ignore */ }
      el.play().catch(() => {});
    };
    const onEnded = (): void => { restart(); };
    const onTimeUpdate = (): void => {
      if (!bgVideoLoopRef.current || !canPlayBackgroundVideo(el)) return;
      const duration = el.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (duration - el.currentTime <= 0.12) restart();
    };
    el.addEventListener('ended', onEnded);
    el.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      stopWatching();
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [bgMedia?.previewUrl, bgMedia?.type, bgVideoHwDecode, bgVideoElementRef]);

  useEffect(() => {
    if (!bgVideoLoop) return;
    const el = bgVideoElementRef.current;
    if (!el) return;
    if (el.ended && canPlayBackgroundVideo(el)) {
      try { el.currentTime = 0; } catch { /* ignore */ }
      el.play().catch(() => {});
    }
  }, [bgVideoLoop, bgVideoElementRef]);

  useEffect(() => {
    const el = bgVideoElementRef.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, bgVideoVolume));
    el.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
  }, [bgVideoVolume, bgVideoRate, bgVideoElementRef]);

  const handleVideoLoadedMetadata: React.ReactEventHandler<HTMLVideoElement> = (event) => {
    event.currentTarget.loop = false;
    event.currentTarget.volume = Math.max(0, Math.min(1, bgVideoVolume));
    event.currentTarget.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
  };

  const handleVideoCanPlay: React.ReactEventHandler<HTMLVideoElement> = (event) => {
    event.currentTarget.loop = false;
    event.currentTarget.volume = Math.max(0, Math.min(1, bgVideoVolume));
    event.currentTarget.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
    if (canPlayBackgroundVideo(event.currentTarget)) event.currentTarget.play().catch(() => {});
  };

  return {
    handleVideoLoadedMetadata,
    handleVideoCanPlay,
  };
}
