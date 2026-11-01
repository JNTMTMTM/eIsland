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
 * @file whitelistOptions.ts
 * @description 引导播放器白名单选择步骤配置
 * @author 鸡哥
 */

import { PlayerIcon } from '../../../../../utils/SvgIcon/player-icon';

/** 白名单选项条目 */
export interface WhitelistOption {
  /** 进程名或标识 */
  value: string;
  /** 显示名称 i18n key */
  labelKey: string;
  /** 图标路径 */
  icon: string;
  /** 是否默认选中 */
  defaultSelected: boolean;
}

/** 默认白名单选项 */
export const WHITELIST_OPTIONS: WhitelistOption[] = [
  { value: 'QQMusic.exe', labelKey: 'guide.whitelist.qqmusic', icon: PlayerIcon.QQMUSIC, defaultSelected: true },
  { value: 'cloudmusic.exe', labelKey: 'guide.whitelist.netease', icon: PlayerIcon.NETEASE, defaultSelected: true },
  { value: '汽水音乐', labelKey: 'guide.whitelist.sodamusic', icon: PlayerIcon.SODAMUSIC, defaultSelected: true },
  { value: 'kugou', labelKey: 'guide.whitelist.kugou', icon: PlayerIcon.KUGOU, defaultSelected: true },
  { value: 'AppleMusic.exe', labelKey: 'guide.whitelist.applemusic', icon: PlayerIcon.APPLE_MUSIC, defaultSelected: false },
  { value: 'Spotify.exe', labelKey: 'guide.whitelist.spotify', icon: PlayerIcon.SPOTIFY, defaultSelected: false },
  { value: 'com.github.th-ch.youtube-music', labelKey: 'guide.whitelist.ytmusic', icon: PlayerIcon.YOUTUBE_MUSIC, defaultSelected: false },
  { value: '_crx_cinhimbnkkghhklpknlkffjgod', labelKey: 'guide.whitelist.ytmusicPwa', icon: PlayerIcon.YOUTUBE_MUSIC, defaultSelected: false },
];
