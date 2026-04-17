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
 * @file types.ts
 * @description 逐字歌词（Karaoke）模块公共类型定义 — 对齐 lyricify-lyrics-provider-rs 的 LineInfo/TextInfo 结构
 * @author 鸡哥
 */

/** 单个音节（逐字单元）信息 */
export interface KaraokeSyllable {
  /** 相对于行首的起始偏移（毫秒） */
  start_offset_ms: number;
  /** 音节持续时长（毫秒） */
  duration_ms: number;
  /** 音节文本（可能为单字、单词或连续的若干字符） */
  text: string;
}

/** 逐字歌词行（含音节数组） */
export interface KaraokeLine {
  /** 行起始绝对时间（毫秒） */
  time_ms: number;
  /** 行持续时长（毫秒），0 表示未知 */
  duration_ms: number;
  /** 行整体文本（各音节拼接） */
  text: string;
  /** 音节数组；数组为空时该行只有行级时间戳、退化为普通同步行 */
  syllables: KaraokeSyllable[];
}
