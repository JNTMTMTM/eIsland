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
 * @file useDynamicIslandCoordinator.ts
 * @description 灵动岛主协调 Hook，整合状态、订阅与渲染数据。
 * @author 鸡哥
 */

import type { IIslandStore } from '../../store/types';
import { useDynamicIslandShell } from './useDynamicIslandShell';
import { useIslandDominantColor } from './useIslandDominantColor';
import { useIslandTimeStrings } from './useIslandTimeStrings';
import { useIslandHoverInteraction } from './useIslandHoverInteraction';
import { useIslandNowPlayingSync } from './useIslandNowPlayingSync';
import { useIslandNotificationSubscriptions } from './useIslandNotificationSubscriptions';
import { useIslandSettingsSync } from './useIslandSettingsSync';
import { useIslandStartupAnnouncements } from './useIslandStartupAnnouncements';
import { useIslandTimerAndAlarm } from './useIslandTimerAndAlarm';
import { useIslandBreakReminder } from './useIslandBreakReminder';
import { useIslandBackgroundVideoSync } from './useIslandBackgroundVideoSync';
import { useIslandStateBridges } from './useIslandStateBridges';
import { useIslandBackgroundMediaController } from './useIslandBackgroundMediaController';
import { useIslandEscapeNavigation } from './useIslandEscapeNavigation';
import { useIslandShellPresentation } from './useIslandShellPresentation';
import { useIslandRuntimeRefs } from './useIslandRuntimeRefs';
import { useIslandDrag } from './useIslandDrag';
import { useIslandAutoDim } from './useIslandAutoDim';
import { useClaudeCliSessionStatus } from './useClaudeCliSessionStatus';

interface UseDynamicIslandCoordinatorOptions {
  store: IIslandStore;
  t: (key: string, options?: Record<string, unknown>) => string;
  language: string | undefined;
}

interface DynamicIslandCoordinatorState {
  shellClassName: string;
  shellStyle: React.CSSProperties | undefined;
  handleIslandClick: () => void;
  timeStr: string;
  dayStr: string;
  fullTimeStr: string;
  lunarStr: string;
  bgMedia: { type: 'image' | 'video'; previewUrl: string } | null;
  bgVideoElementRef: React.MutableRefObject<HTMLVideoElement | null>;
  bgVideoHwDecode: boolean;
  bgVideoMuted: boolean;
  bgVideoVolume: number;
  bgVideoFit: 'cover' | 'contain';
  handleVideoLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  handleVideoCanPlay: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
}

/**
 * @description 协调灵动岛运行时逻辑并返回渲染所需状态。
 * @param options - 协调器初始化参数。
 * @returns 灵动岛渲染所需的聚合状态。
 */
export function useDynamicIslandCoordinator(options: UseDynamicIslandCoordinatorOptions): DynamicIslandCoordinatorState {
  const { store, t, language } = options;
  const {
    state,
    setHover,
    setIdle,
    setExpanded,
    setCli,
    setLyrics,
    setLyricsTranslation,
    setHoverTab,
    setAnnouncement,
    setAgentVoiceInput,
    timerData,
    setTimerData,
    setNotification,
    handleNowPlayingUpdate,
    updateProgress,
    coverImage,
    isMusicPlaying,
    isPlaying,
    dominantColor,
    setDominantColor,
    setSyncedLyrics,
    setTranslationLyrics,
    setLyricsLoading,
    syncedLyrics,
    lyricsLoading,
    translationLyrics,
    currentPositionMs,
    springAnimation,
    animationSpeed,
    shapeMode,
  } = store;

  const {
    initRef,
    isHoveringRef,
    enterTimerRef,
    leaveTimerRef,
    setNotificationRef,
    expandLeaveIdleRef,
    maxExpandLeaveIdleRef,
    idleClickExpandRef,
    pendingAnnouncementAfterGuideRef,
    pendingAnnouncementAppVersionRef,
    startupAutoCheckHandledRef,
    autoDimEnabledRef,
    autoDimDelayRef,
  } = useIslandRuntimeRefs({
    setNotification,
  });

  const { hasActiveSessionRef: hasActiveCliSessionRef } = useClaudeCliSessionStatus();

  const {
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
  } = useIslandBackgroundMediaController();

  const {
    morphing,
    fromState,
    showGlow,
    marqueeRhythmEnabled,
    marqueeBeatPulse,
    handleIslandClick,
  } = useDynamicIslandShell({
    state,
    animationSpeed,
    isMusicPlaying,
    coverImage,
    isPlaying,
    setHover,
    setExpanded,
    setCli,
    setHoverTab,
    hasActiveCliSessionRef,
    idleClickExpandRef,
    isHoveringRef,
    forceClickToHover: shapeMode === 'pill',
  });

  useIslandNowPlayingSync({
    handleNowPlayingUpdate,
    updateProgress,
    setSyncedLyrics,
    setTranslationLyrics,
    setLyricsLoading,
  });

  useIslandDominantColor({
    coverImage,
    setDominantColor,
  });

  const {
    timeStr,
    dayStr,
    fullTimeStr,
    lunarStr,
  } = useIslandTimeStrings({
    t,
    language,
  });

  useIslandTimerAndAlarm({
    language,
    timerData,
    setTimerData,
    setNotificationRef,
    t,
  });

  useIslandBreakReminder({
    language,
    setNotificationRef,
    t,
  });

  useIslandSettingsSync({
    language,
    initRef,
    setNotificationRef,
    applyBgMedia,
    expandLeaveIdleRef,
    maxExpandLeaveIdleRef,
    idleClickExpandRef,
    bgOpacityRef,
    bgBlurRef,
    setBgVideoFit,
    setBgVideoMuted,
    setBgVideoLoop,
    setBgVideoVolume,
    setBgVideoRate,
    setBgVideoHwDecode,
    autoDimEnabledRef,
    autoDimDelayRef,
  });

  useIslandAutoDim({
    autoDimEnabledRef,
    autoDimDelayRef,
  });

  useIslandStateBridges({
    state,
    timerState: timerData?.state ?? 'idle',
    isPlaying,
    syncedLyrics,
    lyricsLoading,
    translationLyrics,
    currentPositionMs,
    setLyrics,
    setLyricsTranslation,
    setAgentVoiceInput,
    setIdle,
  });

  useIslandEscapeNavigation({
    state,
    setIdle,
    setHover,
    setExpanded,
  });

  useIslandStartupAnnouncements({
    language,
    state,
    setAnnouncement,
    startupAutoCheckHandledRef,
    pendingAnnouncementAfterGuideRef,
    pendingAnnouncementAppVersionRef,
    setNotificationRef,
    t,
  });

  useIslandBackgroundVideoSync({
    bgMedia,
    bgVideoElementRef,
    bgVideoVolume,
    bgVideoRate,
    bgVideoLoop,
    bgVideoHwDecode,
  });

  useIslandNotificationSubscriptions({
    language,
    t,
    setNotificationRef,
  });

  useIslandHoverInteraction({
    state,
    setHover,
    setIdle,
    setLyrics,
    setLyricsTranslation,
    setHoverTab,
    isHoveringRef,
    idleClickExpandRef,
    expandLeaveIdleRef,
    maxExpandLeaveIdleRef,
    enterTimerRef,
    leaveTimerRef,
    forceClickToHover: shapeMode === 'pill',
  });

  const {
    shellClassName,
    shellStyle,
  } = useIslandShellPresentation({
    state,
    morphing,
    fromState,
    showGlow,
    marqueeRhythmEnabled,
    marqueeBeatPulse,
    springAnimation,
    animationSpeed,
    shapeMode,
    dominantColor,
  });

  const { wrapClick } = useIslandDrag({ shapeMode, state });

  return {
    shellClassName,
    shellStyle,
    handleIslandClick: wrapClick(handleIslandClick),
    timeStr,
    dayStr,
    fullTimeStr,
    lunarStr,
    bgMedia,
    bgVideoElementRef,
    bgVideoHwDecode,
    bgVideoMuted,
    bgVideoVolume,
    bgVideoFit,
    handleVideoLoadedMetadata,
    handleVideoCanPlay,
  };
}
