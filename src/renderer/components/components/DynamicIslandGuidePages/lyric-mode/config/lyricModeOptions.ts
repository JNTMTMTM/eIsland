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
 * @file lyricModeOptions.ts
 * @description 引导歌词模式设置步骤配置
 * @author 鸡哥
 */

/** 歌词模式选项条目 */
export interface LyricModeOption {
  /** 模式值：true = 逐字模式, false = 普通模式 */
  value: boolean;
  /** 显示名称 i18n key */
  labelKey: string;
  /** 描述 i18n key */
  descKey: string;
}

/** 歌词模式选项列表 */
export const LYRIC_MODE_OPTIONS: LyricModeOption[] = [
  { value: false, labelKey: 'guide.lyricMode.normal', descKey: 'guide.lyricMode.normalDesc' },
  { value: true, labelKey: 'guide.lyricMode.karaoke', descKey: 'guide.lyricMode.karaokeDesc' },
];
