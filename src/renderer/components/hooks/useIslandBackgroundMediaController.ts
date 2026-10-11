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
 * @file useIslandBackgroundMediaController.ts
 * @description 灵动岛背景媒体控制 Hook。
 * @author 鸡哥
 */

import { useCallback, useRef, useState } from 'react';
import { canPlayBackgroundVideo } from '../../utils/backgroundVideoPlayback';
import type { IslandBgMediaConfig, IslandBgMediaType } from '../config/dynamicIslandConfig';

interface IslandBackgroundMediaControllerState {
  bgOpacityRef: React.MutableRefObject<number>;
  bgBlurRef: React.MutableRefObject<number>;
  bgVideoFit: 'cover' | 'contain';
  bgVideoMuted: boolean;
  bgVideoLoop: boolean;
  bgVideoVolume: number;
  bgVideoRate: number;
  bgVideoHwDecode: boolean;
  bgVideoElementRef: React.MutableRefObject<HTMLVideoElement | null>;
  bgMedia: { type: IslandBgMediaType; previewUrl: string } | null;
  setBgVideoFit: React.Dispatch<React.SetStateAction<'cover' | 'contain'>>;
  setBgVideoMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setBgVideoLoop: React.Dispatch<React.SetStateAction<boolean>>;
  setBgVideoVolume: React.Dispatch<React.SetStateAction<number>>;
  setBgVideoRate: React.Dispatch<React.SetStateAction<number>>;
  setBgVideoHwDecode: React.Dispatch<React.SetStateAction<boolean>>;
  applyBgMedia: (media: IslandBgMediaConfig | null, previewUrl: string | null) => void;
  handleVideoLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  handleVideoCanPlay: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
}

/**
 * @description 管理灵动岛背景媒体状态与视频行为。
 * @returns 背景媒体控制状态与操作方法。
 */
export function useIslandBackgroundMediaController(): IslandBackgroundMediaControllerState {
  const bgOpacityRef = useRef<number>(30);
  const bgBlurRef = useRef<number>(0);
  const [bgVideoFit, setBgVideoFit] = useState<'cover' | 'contain'>('cover');
  const [bgVideoMuted, setBgVideoMuted] = useState<boolean>(true);
  const [bgVideoLoop, setBgVideoLoop] = useState<boolean>(true);
  const [bgVideoVolume, setBgVideoVolume] = useState<number>(0.6);
  const [bgVideoRate, setBgVideoRate] = useState<number>(1);
  const [bgVideoHwDecode, setBgVideoHwDecode] = useState<boolean>(true);
  const bgVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const [bgMedia, setBgMedia] = useState<{ type: IslandBgMediaType; previewUrl: string } | null>(null);

  const applyBgMedia = useCallback((media: IslandBgMediaConfig | null, previewUrl: string | null): void => {
    const el = document.getElementById('island-bg-layer');
    if (!el) return;

    const applyLayerVisibility = (): void => {
      el.style.opacity = String(Math.max(0, Math.min(100, bgOpacityRef.current)) / 100);
      const safeBlur = Math.max(0, Math.min(20, Math.round(bgBlurRef.current)));
      el.style.filter = safeBlur > 0 ? `blur(${safeBlur}px)` : 'none';
    };

    if (media?.type === 'image' && previewUrl) {
      el.style.backgroundImage = `url(${previewUrl})`;
      applyLayerVisibility();
      setBgMedia(null);
      return;
    }

    el.style.backgroundImage = '';
    if (media?.type === 'video' && previewUrl) {
      applyLayerVisibility();
      setBgMedia({ type: 'video', previewUrl });
      return;
    }

    el.style.opacity = '0';
    el.style.filter = 'none';
    setBgMedia(null);
  }, []);

  const handleVideoLoadedMetadata = useCallback((event: React.SyntheticEvent<HTMLVideoElement>): void => {
    event.currentTarget.loop = false;
    event.currentTarget.volume = Math.max(0, Math.min(1, bgVideoVolume));
    event.currentTarget.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
  }, [bgVideoVolume, bgVideoRate]);

  const handleVideoCanPlay = useCallback((event: React.SyntheticEvent<HTMLVideoElement>): void => {
    event.currentTarget.loop = false;
    event.currentTarget.volume = Math.max(0, Math.min(1, bgVideoVolume));
    event.currentTarget.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
    if (bgOpacityRef.current > 0 && canPlayBackgroundVideo(event.currentTarget)) event.currentTarget.play().catch(() => {});
  }, [bgVideoVolume, bgVideoRate]);

  return {
    bgOpacityRef,
    bgBlurRef,
    bgVideoFit,
    bgVideoMuted,
    bgVideoLoop,
    bgVideoVolume,
    bgVideoRate,
    bgVideoHwDecode,
    bgVideoElementRef,
    bgMedia,
    setBgVideoFit,
    setBgVideoMuted,
    setBgVideoLoop,
    setBgVideoVolume,
    setBgVideoRate,
    setBgVideoHwDecode,
    applyBgMedia,
    handleVideoLoadedMetadata,
    handleVideoCanPlay,
  };
}
