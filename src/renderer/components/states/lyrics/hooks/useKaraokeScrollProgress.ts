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
 * @file useKaraokeScrollProgress.ts
 * @description 逐字扫光模式下超长歌词句的横向滚动进度 Hook
 * @author 鸡哥
 */

import type { SyncedLyricLine } from '../../../../store/types';

/**
 * 计算逐字扫光下歌词句的横向滚动进度（0~1）。
 * @description 仅在启用逐字且当前行存在音节时生效；未启用时返回 undefined，回退为往返滚动。
 * @param karaokeEnabled - 逐字扫光是否启用。
 * @param currentLine - 当前歌词行数据。
 * @param hasSyllables - 当前行是否包含音节。
 * @param isIntro - 是否处于前奏阶段。
 * @param currentPositionMs - 当前播放位置（毫秒）。
 * @returns 平滑后的滚动进度，无需滚动时返回 undefined。
 */
export function useKaraokeScrollProgress(
  karaokeEnabled: boolean,
  currentLine: SyncedLyricLine | null,
  hasSyllables: boolean,
  isIntro: boolean,
  currentPositionMs: number,
): number | undefined {
  if (!karaokeEnabled || !hasSyllables || !currentLine || isIntro) return undefined;

  const karaokeLineDurationMs = currentLine.syllables?.reduce(
    (duration, syllable) => Math.max(duration, syllable.start_offset_ms + syllable.duration_ms),
    0,
  ) ?? 0;
  if (karaokeLineDurationMs <= 0) return undefined;

  const karaokeLinearScrollProgress = Math.min(
    1,
    Math.max(0, (currentPositionMs - currentLine.time_ms) / (karaokeLineDurationMs * 0.85)),
  );
  // 平滑变速避免线性跟随在行首、行尾产生突兀位移。
  return karaokeLinearScrollProgress ** 2 * (3 - 2 * karaokeLinearScrollProgress);
}
