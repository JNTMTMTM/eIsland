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
 * @file player-icon.ts
 * @description 播放器图标路径枚举
 * @author 鸡哥
 */

export const PlayerIcon = {
  SODAMUSIC: '../svg/player/sodamusic.svg',
  QQMUSIC: '../svg/player/qqmusic.svg',
  NETEASE: '../svg/player/netease.svg',
  KUGOU: '../svg/player/kugou.svg',
  APPLE_MUSIC: '../svg/player/applemusic.svg',
  SPOTIFY: '../svg/player/spotify.svg',
} as const;

export type PlayerIconKey = keyof typeof PlayerIcon;
