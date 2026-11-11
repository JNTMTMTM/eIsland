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
 * @file useAutoIdle.ts
 * @description 音乐停止或无歌词时自动回到 idle 状态
 * @author 鸡哥
 */

import { useEffect } from 'react';
import type { SyncedLyricLine } from '../../../../store/types';

/**
 * 当音乐停止或歌词为空时，自动切回 idle 状态；只显示歌名时不因缺少歌词而切回。
 * @param isMusicPlaying - 是否正在播放音乐。
 * @param lyricsLoading - 歌词是否加载中。
 * @param syncedLyrics - 同步歌词数据。
 * @param setIdle - 切回 idle 的回调。
 * @param songTitleMode - 是否只显示歌名。
 */
export function useAutoIdle(
  isMusicPlaying: boolean,
  lyricsLoading: boolean,
  syncedLyrics: SyncedLyricLine[] | null,
  setIdle: () => void,
  songTitleMode = false,
): void {
  useEffect(() => {
    if (!isMusicPlaying) {
      setIdle();
      return;
    }
    if (!songTitleMode && !lyricsLoading && (!syncedLyrics || syncedLyrics.length === 0)) {
      setIdle();
    }
  }, [isMusicPlaying, lyricsLoading, syncedLyrics, setIdle, songTitleMode]);
}
