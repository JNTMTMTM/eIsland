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
 * @file songConstants.ts
 * @description 歌曲页的骨架占位与手动浏览配置，保持页面原有交互参数。
 * @author 鸡哥
 */

/** 加载占位采用稳定键，避免重复创建骨架行。 */
export const SONG_SKELETON_ROWS = ['first', 'second', 'current', 'fourth', 'last'];

/** 手动浏览结束后恢复歌词跟随的等待时间。 */
export const SONG_LYRICS_BROWSE_DELAY_MS = 4000;

/** 音量滑动合并写入的等待时间。 */
export const SONG_VOLUME_UPDATE_DELAY_MS = 80;

/** 页面显示期间同步系统外部音量调节的间隔。 */
export const SONG_VOLUME_POLL_MS = 2000;

/** 音量读写的最长等待时间，超时视为失败，释放在途状态以继续后续轮询与写入。 */
export const SONG_VOLUME_REQUEST_TIMEOUT_MS = 1500;

/** 需要暂缓自动跟随的键盘浏览操作。 */
export const SONG_LYRICS_BROWSE_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Tab'];
