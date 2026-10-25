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
 * @file useSongData.ts
 * @description 集中订阅播放状态、构造双语歌词并派生当前行和跳转状态。
 * @author 鸡哥
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useIslandStore from '../../../../../../store/slices';
import { usePendingSeek } from '../../../../../hooks/usePendingSeek';
import { findCurrentIndex } from '../../../../lyrics/utils/findCurrentIndex';
import { useLyricsSettings } from '../../../../lyrics/hooks/useLyricsSettings';
import buildSongLyricBlocks from '../utils/buildSongLyricBlocks';
import type { SongData } from '../types/songTypes';

/**
 * 保留原有订阅与派生计算，避免展示组件重复读取播放时间线。
 * @returns 歌曲数据、当前歌词与跳转句柄。
 */
export default function useSongData(): SongData {
  const { karaokeEnabled } = useLyricsSettings();
  const { mediaInfo, coverImage, dominantColor, isMusicPlaying, isPlaying, syncedLyrics, translationLyrics, lyricsLoading, currentPositionMs, currentDurationMs } = useIslandStore(useShallow((store) => ({
    mediaInfo: store.mediaInfo,
    coverImage: store.coverImage,
    dominantColor: store.dominantColor,
    isMusicPlaying: store.isMusicPlaying,
    isPlaying: store.isPlaying,
    syncedLyrics: store.syncedLyrics,
    translationLyrics: store.translationLyrics,
    lyricsLoading: store.lyricsLoading,
    currentPositionMs: store.currentPositionMs,
    currentDurationMs: store.currentDurationMs,
  })));
  // 同名同歌手的不同专辑视为另一首，避免沿用上一首未确认的跳转与拖动预览。
  const trackKey = `${mediaInfo.title}\n${mediaInfo.artist}\n${mediaInfo.album}`;
  const { pendingSeek, commitSeek } = usePendingSeek(trackKey);
  const blocks = useMemo(() => buildSongLyricBlocks(syncedLyrics, translationLyrics), [syncedLyrics, translationLyrics]);
  const positionMs = pendingSeek?.targetMs ?? currentPositionMs;
  const currentIndex = findCurrentIndex(blocks, positionMs);
  const canSeek = isMusicPlaying && Number.isFinite(currentDurationMs) && currentDurationMs > 0;
  const hasLyrics = isMusicPlaying && !lyricsLoading && blocks.length > 0;
  const showSkeleton = isMusicPlaying && lyricsLoading;
  return { mediaInfo, coverImage, dominantColor, isMusicPlaying, isPlaying, syncedLyrics, lyricsLoading, currentDurationMs, trackKey, blocks, positionMs, currentIndex, karaokeEnabled, canSeek, hasLyrics, showSkeleton, commitSeek };
}
