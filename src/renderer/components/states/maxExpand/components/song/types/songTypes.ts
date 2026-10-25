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
 * @file songTypes.ts
 * @description 歌曲模块独立的共享类型，定义数据、滚动句柄与展示组件属性。
 * @author 鸡哥
 */

import type { KeyboardEvent, MouseEvent, RefObject } from 'react';
import type { MediaInfo, SyncedLyricLine } from '../../../../../../store/types';

/** 同一时间戳对应的完整原文、逐字信息与翻译。 */
export interface SongLyricBlock extends SyncedLyricLine {
  translation: string;
}

/** 歌曲页订阅和派生的数据，界面文案由展示组件负责翻译。 */
export interface SongData {
  mediaInfo: MediaInfo;
  coverImage: string | null;
  dominantColor: [number, number, number];
  isMusicPlaying: boolean;
  isPlaying: boolean;
  syncedLyrics: SyncedLyricLine[] | null;
  lyricsLoading: boolean;
  currentDurationMs: number;
  trackKey: string;
  blocks: SongLyricBlock[];
  positionMs: number;
  currentIndex: number;
  karaokeEnabled: boolean;
  canSeek: boolean;
  hasLyrics: boolean;
  showSkeleton: boolean;
  commitSeek: (targetMs: number) => void;
}

/** 滚动和跳转只依赖当前歌曲及歌词时间线。 */
export interface SongLyricsScrollOptions {
  trackKey: string;
  syncedLyrics: SyncedLyricLine[] | null;
  currentIndex: number;
  blocks: SongLyricBlock[];
  hasLyrics: boolean;
  canSeek: boolean;
  currentDurationMs: number;
  commitSeek: (targetMs: number) => void;
}

/** 用于判断是否需要清空上一首滚动位置的上下文。 */
export interface SongScrollContext {
  trackKey: string;
  lyrics: SyncedLyricLine[] | null;
  visible: boolean;
}

/** 歌词滚动 Hook 暴露的原生容器与事件句柄。 */
export interface SongLyricsScrollResult {
  lyricsRef: RefObject<HTMLDivElement | null>;
  handleBrowse: () => void;
  handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  handleSeek: (event: MouseEvent<HTMLButtonElement>) => void;
}

/** 播放源控制句柄，按钮保持同步事件回调。 */
export interface SongMediaControls {
  handlePrev: () => void;
  handlePlayPause: () => void;
  handleNext: () => void;
}

/** 封面与歌曲信息只接收展示所需数据和播放控制。 */
export interface SongArtworkProps {
  song: Pick<SongData, 'mediaInfo' | 'coverImage' | 'trackKey' | 'isMusicPlaying' | 'isPlaying'>;
  controls: SongMediaControls;
}

/** 歌词面板接收派生状态和滚动句柄，不订阅播放器。 */
export interface SongLyricsPanelProps {
  song: Pick<SongData, 'blocks' | 'currentIndex' | 'karaokeEnabled' | 'positionMs' | 'canSeek' | 'hasLyrics' | 'showSkeleton' | 'isMusicPlaying'>;
  scroll: Pick<SongLyricsScrollResult, 'lyricsRef' | 'handleBrowse' | 'handleSeek'>;
}
