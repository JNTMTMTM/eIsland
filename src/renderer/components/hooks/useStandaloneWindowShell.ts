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
 * @file useStandaloneWindowShell.ts
 * @description 独立窗口壳层状态管理 Hook。
 * @author 鸡哥
 */

import { useCallback, useRef, useState } from 'react';
import usePageActivity from './usePageActivity';
import type { IslandBgMediaConfig, IslandBgMediaType } from '../config/dynamicIslandConfig';
import {
  ACTIVE_TAB_STORE_KEY,
  type WindowTab,
} from '../config/standaloneWindowConfig';
import { useStandaloneWindowTabSync } from './useStandaloneWindowTabSync';
import { useStandaloneWindowBackgroundSettingsSync } from './useStandaloneWindowBackgroundSettingsSync';
import { useStandaloneWindowBackgroundVideoSync } from './useStandaloneWindowBackgroundVideoSync';

interface StandaloneWindowShellState {
  activeTab: WindowTab;
  switchTab: (tab: WindowTab) => void;
  bgMedia: { type: IslandBgMediaType; previewUrl: string } | null;
  bgVideoFit: 'cover' | 'contain';
  bgVideoMuted: boolean;
  bgVideoLoop: boolean;
  bgVideoVolume: number;
  bgVideoRate: number;
  bgVideoHwDecode: boolean;
  bgVideoElementRef: React.MutableRefObject<HTMLVideoElement | null>;
  bgImageOpacity: number;
  bgImageBlur: number;
  standaloneMacControls: boolean;
  handleVideoLoadedMetadata: React.ReactEventHandler<HTMLVideoElement>;
  handleVideoCanPlay: React.ReactEventHandler<HTMLVideoElement>;
}

/**
 * @description 管理独立窗口标签、背景与控制区状态。
 * @returns 独立窗口壳层状态与操作函数。
 */
export function useStandaloneWindowShell(): StandaloneWindowShellState {
  usePageActivity();
  const [activeTab, setActiveTab] = useState<WindowTab>('todo');
  const [bgMedia, setBgMedia] = useState<{ type: IslandBgMediaType; previewUrl: string } | null>(null);
  const [bgVideoFit, setBgVideoFit] = useState<'cover' | 'contain'>('cover');
  const [bgVideoMuted, setBgVideoMuted] = useState<boolean>(true);
  const [bgVideoLoop, setBgVideoLoop] = useState<boolean>(true);
  const [bgVideoVolume, setBgVideoVolume] = useState<number>(0.6);
  const [bgVideoRate, setBgVideoRate] = useState<number>(1);
  const [bgVideoHwDecode, setBgVideoHwDecode] = useState<boolean>(true);
  const bgVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const [bgImageOpacity, setBgImageOpacity] = useState<number>(30);
  const [bgImageBlur, setBgImageBlur] = useState<number>(0);
  const [standaloneMacControls, setStandaloneMacControls] = useState<boolean>(false);

  const applyBgMedia = useCallback((media: IslandBgMediaConfig | null, previewUrl: string | null): void => {
    if (!media || !previewUrl) {
      setBgMedia(null);
      return;
    }
    setBgMedia({ type: media.type, previewUrl });
  }, []);

  const applyBgOpacity = useCallback((opacityValue: unknown): void => {
    const safe = typeof opacityValue === 'number' && Number.isFinite(opacityValue)
      ? Math.max(0, Math.min(100, Math.round(opacityValue)))
      : 30;
    setBgImageOpacity(safe);
  }, []);

  const applyBgBlur = useCallback((blurValue: unknown): void => {
    const safe = typeof blurValue === 'number' && Number.isFinite(blurValue)
      ? Math.max(0, Math.min(20, Math.round(blurValue)))
      : 0;
    setBgImageBlur(safe);
  }, []);

  useStandaloneWindowTabSync({
    setActiveTab,
  });

  useStandaloneWindowBackgroundSettingsSync({
    setBgVideoFit,
    setBgVideoMuted,
    setBgVideoLoop,
    setBgVideoVolume,
    setBgVideoRate,
    setBgVideoHwDecode,
    setStandaloneMacControls,
    applyBgMedia,
    applyBgOpacity,
    applyBgBlur,
  });

  const {
    handleVideoLoadedMetadata,
    handleVideoCanPlay,
  } = useStandaloneWindowBackgroundVideoSync({
    bgMedia,
    bgVideoElementRef,
    bgVideoLoop,
    bgVideoVolume,
    bgVideoRate,
    bgVideoHwDecode,
  });

  const switchTab = (tab: WindowTab): void => {
    setActiveTab(tab);
    window.api.storeWrite(ACTIVE_TAB_STORE_KEY, tab).catch(() => {});
  };

  return {
    activeTab,
    switchTab,
    bgMedia,
    bgVideoFit,
    bgVideoMuted,
    bgVideoLoop,
    bgVideoVolume,
    bgVideoRate,
    bgVideoHwDecode,
    bgVideoElementRef,
    bgImageOpacity,
    bgImageBlur,
    standaloneMacControls,
    handleVideoLoadedMetadata,
    handleVideoCanPlay,
  };
}
