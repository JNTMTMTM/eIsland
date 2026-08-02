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
 * @file announcementVideoDefaults.ts
 * @description B站视频嵌入组件默认配置
 * @author 鸡哥
 */

/** B站播放器 iframe 基础地址 */
export const BILIBILI_PLAYER_URL = 'https://player.bilibili.com/player.html';

/** AnnouncementVideo 组件默认属性 */
export const VIDEO_DEFAULTS = {
  PAGE: 1,
  AUTOPLAY: false,
  SHOW_DANMAKU: false,
  START_TIME: 0,
  ASPECT_RATIO: 9 / 16,
} as const;
