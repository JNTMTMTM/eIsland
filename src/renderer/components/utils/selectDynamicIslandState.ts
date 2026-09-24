/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file selectDynamicIslandState.ts
 * @description 主窗口所需状态选择器，隔离播放进度与聊天流式更新。
 * @author 鸡哥
 */

import type { IIslandStore } from '../../store/types';

/**
 * 选取主窗口及其协调器使用的状态；高频进度由歌词组件单独订阅。
 * @param store - 当前完整应用状态。
 * @returns 用于浅比较的主窗口状态。
 */
export default function selectDynamicIslandState(store: IIslandStore) {
  return {
    state: store.state,
    weather: store.weather,
    timerData: store.timerData,
    notification: store.notification,
    pomodoroRunning: store.pomodoroRunning,
    pomodoroRemaining: store.pomodoroRemaining,
    setHover: store.setHover,
    setIdle: store.setIdle,
    setExpanded: store.setExpanded,
    setCli: store.setCli,
    setLyrics: store.setLyrics,
    setLyricsTranslation: store.setLyricsTranslation,
    setHoverTab: store.setHoverTab,
    setAnnouncement: store.setAnnouncement,
    setAgentVoiceInput: store.setAgentVoiceInput,
    setTimerData: store.setTimerData,
    setNotification: store.setNotification,
    handleNowPlayingUpdate: store.handleNowPlayingUpdate,
    updateProgress: store.updateProgress,
    coverImage: store.coverImage,
    isMusicPlaying: store.isMusicPlaying,
    isPlaying: store.isPlaying,
    dominantColor: store.dominantColor,
    setDominantColor: store.setDominantColor,
    setSyncedLyrics: store.setSyncedLyrics,
    setTranslationLyrics: store.setTranslationLyrics,
    setLyricsLoading: store.setLyricsLoading,
    syncedLyrics: store.syncedLyrics,
    lyricsLoading: store.lyricsLoading,
    translationLyrics: store.translationLyrics,
    springAnimation: store.springAnimation,
    animationSpeed: store.animationSpeed,
    shapeMode: store.shapeMode,
  };
}
