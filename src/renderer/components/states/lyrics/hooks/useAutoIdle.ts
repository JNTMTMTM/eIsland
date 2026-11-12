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

/**
 * 音乐停止时自动切回 idle 状态；没有歌词时歌词状态以前奏样式展示歌名，不切回。
 * @param isMusicPlaying - 是否正在播放音乐。
 * @param setIdle - 切回 idle 的回调。
 */
export function useAutoIdle(isMusicPlaying: boolean, setIdle: () => void): void {
  useEffect(() => {
    if (!isMusicPlaying) setIdle();
  }, [isMusicPlaying, setIdle]);
}
