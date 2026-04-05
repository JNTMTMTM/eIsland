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
import type { MediaSlice, LrcMode } from '../types';
import { emptyMediaInfo } from '../constants/defaults';

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
  lyricsLoading: false,

  updateLrcData: (data) => set((state) => {
    if (data === null) {
      return {
        isMusicPlaying: false,
        isPlaying: false,
        currentLyricText: null,
        nearbyLyrics: [],
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
      nearbyLyrics: data.nearby_o3ics ?? [],
    };
  }),

  onMediaChanged: (data) => set({
    isMusicPlaying: true,
    mediaInfo: {
      title: data.title,
      artist: data.artist,
      album: '',
      duration_ms: data.duration_ms ?? 0,
    },
    currentLyricText: null,
    nearbyLyrics: [],
    currentDurationMs: data.duration_ms ?? 0,
    currentPositionMs: 0,
    coverImage: data.thumbnail ?? null,
  }),

  setPlaybackState: (isPlaying) => set({ isPlaying }),

  setLrcMode: (mode) => set({ lrcMode: mode }),

  updateProgress: (position_ms) => set({ currentPositionMs: position_ms }),

  setCoverImage: (cover) => set({ coverImage: cover }),
  setDominantColor: (color) => set({ dominantColor: color }),
  setSyncedLyrics: (lyrics) => set({ syncedLyrics: lyrics, lyricsLoading: false }),
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
      });
      return;
    }

    set({
      isMusicPlaying: true,
      isPlaying: info.isPlaying,
      mediaInfo: {
        title: info.title,
        artist: info.artist,
        album: info.album || '',
        duration_ms: info.duration_ms,
      },
      currentDurationMs: info.duration_ms,
      currentPositionMs: info.position_ms,
      coverImage: info.thumbnail,
      currentLyricText: null,
      nearbyLyrics: [],
    });
  },
});