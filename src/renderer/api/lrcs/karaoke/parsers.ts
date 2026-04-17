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
 * @file parsers.ts
 * @description 逐字歌词解析器 — 对应 lyricify-lyrics-provider-rs 中 parsers/mod.rs 的 IParsers::parse
 *              支持 YRC/QRC/KRC 共用的 `[行首,持续]音节(s,d)text` 与 `[行首,持续]<s,d>text` 两类文法
 * @author 鸡哥
 */

import type { KaraokeLine, KaraokeSyllable } from './types';

/** 行级头: `[start_ms,duration_ms]text_payload` */
const LINE_RE = /\[(\d+),(\d+)\]([^\[\n]+)/g;

/** LRC 行级头: `[mm:ss.xx]text` 或 `[mm:ss:xx]text` */
const LRC_LINE_RE = /\[(\d+):(\d+)[.:](\d+)\]([^\[\n]+)/g;

/** 后缀式音节: `text(s,d)` 或 `text<s,d>`,第三字段可选 (QRC/KRC 用) */
const SUFFIX_RE = /(?<t>[^\n)>\]]+)[(<](?<s>\d+),(?<d>\d+)(?:,[^)>]+)?[)>]/g;

/** 前缀式音节: `(s,d)text` 或 `<s,d>text`(YRC/汽水用) */
const PREFIX_RE = /[(<](?<s>\d+),(?<d>\d+)(?:,[^)>]+)?[)>](?<t>[^\n(<]+)/g;

/** 音节时间戳位置 */
export type SyllableMode = 'prefix' | 'suffix';

/** 音节时间戳含义: absolute=绝对毫秒(需减行首),relative=已是行内偏移 */
export type OffsetKind = 'absolute' | 'relative';

/**
 * 解析同步逐字歌词文本为歌词行数组
 * @param lyrics - 解密/明文后的同步歌词文本
 * @param mode - `prefix` 音节时间戳在文本前(YRC/汽水); `suffix` 时间戳在文本后(QRC/KRC)
 * @param offsetKind - `absolute` 音节时间戳为绝对毫秒; `relative` 已是行内偏移
 * @returns 解析后的逐字歌词行数组, 已按时间排序
 */
export function parseSyncedLines(
  lyrics: string,
  mode: SyllableMode,
  offsetKind: OffsetKind,
): KaraokeLine[] {
  const out: KaraokeLine[] = [];
  const syllableRe = mode === 'prefix' ? PREFIX_RE : SUFFIX_RE;

  for (const lineMatch of lyrics.matchAll(LINE_RE)) {
    const lineStart = parseInt(lineMatch[1], 10);
    const lineDur = parseInt(lineMatch[2], 10);
    const segment = lineMatch[3];

    const syllables: KaraokeSyllable[] = [];
    let fullText = '';
    for (const sm of segment.matchAll(syllableRe)) {
      const s = parseInt(sm.groups!.s, 10);
      const d = parseInt(sm.groups!.d, 10);
      const t = sm.groups!.t;
      fullText += t;
      syllables.push({
        start_offset_ms: offsetKind === 'absolute' ? Math.max(0, s - lineStart) : s,
        duration_ms: d,
        text: t,
      });
    }

    out.push({
      time_ms: lineStart,
      duration_ms: lineDur,
      text: fullText || segment.trim(),
      syllables,
    });
  }
  out.sort((a, b) => a.time_ms - b.time_ms);
  return out;
}

/**
 * 解析 LRC 逐行歌词(回退使用) — 与逐字结构兼容,但 `syllables` 为空
 * @param lyrics - LRC 格式歌词文本
 * @returns 歌词行数组, 每行 `syllables` 为空数组
 */
export function parseLRCAsKaraoke(lyrics: string): KaraokeLine[] {
  const out: KaraokeLine[] = [];
  for (const caps of lyrics.matchAll(LRC_LINE_RE)) {
    const mm = parseInt(caps[1], 10);
    const ss = parseInt(caps[2], 10);
    const xx = parseInt(caps[3], 10);
    const text = caps[4].trim();
    if (!text) continue;
    out.push({
      time_ms: mm * 60000 + ss * 1000 + xx * 10,
      duration_ms: 0,
      text,
      syllables: [],
    });
  }
  out.sort((a, b) => a.time_ms - b.time_ms);
  return out;
}
