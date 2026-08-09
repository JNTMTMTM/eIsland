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
 * @file lyricsConstants.ts
 * @description 歌词与音乐光效组件共享常量
 * @author 鸡哥
 */

/** 音乐外发光效果的持久化存储键 */
export const MUSIC_OUTER_GLOW_EFFECT_STORE_KEY = 'music-outer-glow-effect-enabled';

/** 跑马灯模式持久化存储键 */
export const MUSIC_MARQUEE_MODE_STORE_KEY = 'music-marquee-mode';

/** 跑马灯工作模式 */
export type MusicMarqueeMode = 'normal' | 'rhythm' | 'amplitude';

/** 判断值是否为合法的跑马灯模式 */
export function isMusicMarqueeMode(value: unknown): value is MusicMarqueeMode {
  return value === 'normal' || value === 'rhythm' || value === 'amplitude';
}
