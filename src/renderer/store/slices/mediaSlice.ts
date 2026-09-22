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
 * @file mediaSlice.ts
 * @description 媒体/音乐相关逻辑
 * @author 鸡哥
 */

import type { StateCreator } from 'zustand';
import type { MediaInfo, MediaSlice, LrcMode } from '../types';
import { emptyMediaInfo } from '../constants/defaults';

function sameMediaInfo(left: MediaInfo, right: MediaInfo): boolean {
  return left.title === right.title && left.artist === right.artist
    && left.album === right.album && left.duration_ms === right.duration_ms;
}

/**
 * 创建媒体状态切片，保持未变化元数据的引用，避免进度推送触发整页重渲染。
 * @param set - Zustand 状态更新函数。
 * @returns 媒体状态及其更新方法。
 */
export const createMediaSlice: StateCreator<
  MediaSlice,
  [],
  [],
  MediaSlice
> = (set) => ({
  isMusicPlaying: false,
  isPlaying: false,
  lrcMode: 'lrc' as LrcMode,
  currentDurationMs: 0,
  currentPositionMs: 0,
  currentLyricText: null,
  mediaInfo: emptyMediaInfo,
  nearbyLyrics: [],
  coverImage: null,
  dominantColor: [0, 0, 0] as [number, number, number],
  syncedLyrics: null,
  translationLyrics: null,
  lyricsLoading: false,

  updateLrcData: (data) => set((state) => {
    if (data === null) {
      return {
        isMusicPlaying: false,
        isPlaying: false,
        currentLyricText: null,
        nearbyLyrics: [],
        translationLyrics: null,
      };
    }
    return {
      isMusicPlaying: true,
      currentLyricText: data.text,
      currentPositionMs: data.position_ms ?? state.currentPositionMs,
      currentDurationMs: data.duration_ms ?? state.currentDurationMs,
      mediaInfo: {
        title: data.title || state.mediaInfo.title,
        artist: data.artist || state.mediaInfo.artist,
        album: state.mediaInfo.album,
        duration_ms: data.duration_ms ?? state.mediaInfo.duration_ms,
      },
      nearbyLyrics: data.nearby_lyrics ?? [],
    };
  }),

  onMediaChanged: (data) => set((state) => ({
    isMusicPlaying: true,
    mediaInfo: {
      title: data.title,
      artist: data.artist,
      album: '',
      duration_ms: data.duration_ms ?? 0,
    },
    currentLyricText: null,
    nearbyLyrics: [],
    translationLyrics: null,
    currentDurationMs: data.duration_ms ?? 0,
    currentPositionMs: 0,
    coverImage: Object.prototype.hasOwnProperty.call(data, 'thumbnail')
      ? data.thumbnail ?? null
      : state.coverImage,
  })),

  setPlaybackState: (isPlaying) => set((state) => state.isPlaying === isPlaying ? state : { isPlaying }),

  setLrcMode: (mode) => set({ lrcMode: mode }),

  updateProgress: (positionMs) => set((state) => state.currentPositionMs === positionMs ? state : { currentPositionMs: positionMs }),

  setCoverImage: (cover) => set({ coverImage: cover }),
  setDominantColor: (color) => set({ dominantColor: color }),
  setSyncedLyrics: (lyrics) => set({ syncedLyrics: lyrics, lyricsLoading: false }),
  setTranslationLyrics: (translation) => set({ translationLyrics: translation }),
  setLyricsLoading: (loading) => set({ lyricsLoading: loading }),

  handleNowPlayingUpdate: (info) => {
    if (!info || !info.title) {
      set({
        isMusicPlaying: false,
        isPlaying: false,
        currentLyricText: null,
        nearbyLyrics: [],
        mediaInfo: emptyMediaInfo,
        currentDurationMs: 0,
        currentPositionMs: 0,
        coverImage: null,
        translationLyrics: null,
      });
      return;
    }

    set((state) => {
      const mediaInfo = {
        title: info.title,
        artist: info.artist,
        album: info.album || '',
        duration_ms: info.duration_ms,
      };
      const coverImage = Object.prototype.hasOwnProperty.call(info, 'thumbnail')
        ? info.thumbnail ?? null : state.coverImage;
      if (state.isMusicPlaying && state.isPlaying === info.isPlaying
        && sameMediaInfo(state.mediaInfo, mediaInfo)
        && state.currentDurationMs === info.duration_ms && state.currentPositionMs === info.position_ms
        && state.coverImage === coverImage && state.currentLyricText === null && state.nearbyLyrics.length === 0) {
        return state;
      }
      return {
        coverImage,
        isMusicPlaying: true,
        isPlaying: info.isPlaying,
        mediaInfo: sameMediaInfo(state.mediaInfo, mediaInfo) ? state.mediaInfo : mediaInfo,
        currentDurationMs: info.duration_ms,
        currentPositionMs: info.position_ms,
        currentLyricText: null,
        nearbyLyrics: state.nearbyLyrics.length === 0 ? state.nearbyLyrics : [],
      };
    });
  },
});
