/**
 * @file mediaSlice.ts
 * @description 媒体/音乐相关逻辑
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