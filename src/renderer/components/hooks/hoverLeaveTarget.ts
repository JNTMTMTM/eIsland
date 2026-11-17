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
 * @file hoverLeaveTarget.ts
 * @description 离开 hover 或展开页时的目标状态判定，鼠标移出与 Escape 返回共用。
 * @author 鸡哥
 */

import useIslandStore from '../../store/isLandStore';
import { isSongTitleMode } from '../../store/lyricsDisplayStore';
import { isCurrentLyricIdenticalToTranslation } from '../states/lyrics/utils/isCurrentLyricIdenticalToTranslation';

/** 离开后的目标状态 */
export type HoverLeaveTarget = 'idle' | 'lyrics' | 'lyricsTranslation';

type IslandStoreState = ReturnType<typeof useIslandStore.getState>;

/**
 * 判定离开 hover 或展开页后应进入的状态
 * @param store - 当前灵动岛 store 快照
 * @param leavingHover - 是否从 hover 本身离开；只有此时才沿用进入 hover 前的歌词页
 * @returns 播放中或暂停前停留在歌词页时返回歌词状态，否则返回 idle
 */
export function resolveHoverLeaveTarget(store: IslandStoreState, leavingHover: boolean): HoverLeaveTarget {
  // 只显示歌名或未获取到歌词时以前奏样式展示歌名；有歌词（或加载中）时才考虑翻译歌词。
  const hasLyricLine = !isSongTitleMode() && ((store.syncedLyrics?.length ?? 0) > 0 || store.lyricsLoading);
  // 暂停时仅当媒体会话仍在且进入 hover 前停留在歌词页才回到歌词页，会话结束后直接回到 idle。
  const resumeLyrics = store.isPlaying || (leavingHover && store.hoverReturnLyrics && store.isMusicPlaying);
  if (!resumeLyrics || store.timerData.state !== 'idle' || !(hasLyricLine || Boolean(store.mediaInfo.title))) {
    return 'idle';
  }
  const hasTranslation = hasLyricLine && store.translationLyrics?.status === 'available'
    && Boolean(store.translationLyrics.lines && store.translationLyrics.lines.length > 0);
  // 原文与翻译完全一致时回退到普通歌词。
  if (!hasTranslation || isCurrentLyricIdenticalToTranslation(store.syncedLyrics, store.translationLyrics, store.currentPositionMs)) {
    return 'lyrics';
  }
  return 'lyricsTranslation';
}

/**
 * 按当前 store 判定 Escape 从 hover 返回后的目标状态
 * @returns 目标状态
 */
export function resolveEscapeLeaveTarget(): HoverLeaveTarget {
  return resolveHoverLeaveTarget(useIslandStore.getState(), true);
}
