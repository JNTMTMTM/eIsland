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
 * @description Expanded 歌曲 Tab 的歌词切片、子组件入参与 hook 返回值类型。
 * @author 鸡哥
 */

import type { ReactNode, RefObject } from 'react';
import type { IIslandStore, SyncedLyricLine, SyncedLyricSyllable } from '../../../../../../store/types';

/** 翻译函数 */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

/** RGB 主题色 */
export type RgbColor = [number, number, number];

/** 歌词窗口中的一行，空行用于在首尾补齐高度 */
export interface LyricSliceLine {
  text: string;
  isCurrent: boolean;
  key: string;
}

/** 频谱波形单层参数，振幅以画布高度的比例表示 */
export interface WaveLayer {
  ampRatio: number;
  freq: number;
  phase: number;
  speed: number;
  alpha: number;
}

/** MarqueeLyricText 组件入参 */
export interface MarqueeLyricTextProps {
  children: ReactNode;
}

/** KaraokeSyllableLine 组件入参 */
export interface KaraokeSyllableLineProps {
  syllables: SyncedLyricSyllable[];
  lineStartMs: number;
  posMs: number;
}

/** WaveCanvas 组件入参 */
export interface WaveCanvasProps {
  color: RgbColor;
  playing: boolean;
}

/** useMarqueeOverflow hook 返回值类型 */
export interface UseMarqueeOverflowReturn {
  outerRef: RefObject<HTMLDivElement | null>;
  innerRef: RefObject<HTMLSpanElement | null>;
  overflow: number;
}

/** useSongTab hook 返回值类型 */
export interface UseSongTabReturn {
  isMusicPlaying: boolean;
  isPlaying: boolean;
  mediaInfo: IIslandStore['mediaInfo'];
  syncedLyrics: SyncedLyricLine[] | null;
  lyricsLoading: boolean;
  coverImage: IIslandStore['coverImage'];
  dominantColor: RgbColor;
  weather: IIslandStore['weather'];
  countdown: IIslandStore['countdown'];
  currentPositionMs: number;
  now: Date;
  karaokeEnabled: boolean;
  timerRunning: boolean;
  timerMM: string;
  timerSS: string;
  dayName: string;
  hasLyrics: boolean | null;
  isIntro: boolean | null;
  lines: LyricSliceLine[];
  currentLine: SyncedLyricLine | null;
  hasSyllables: boolean;
  handlePlayPause: () => void;
  handlePrev: () => void;
  handleNext: () => void;
}
