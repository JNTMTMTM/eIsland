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
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

import type { KaraokeLine, KaraokeSyllable } from './types';

/** 仅完整数字行头或换行分隔歌词，正文中的普通方括号不截断文本。 */
const LINE_RE = /\[(\d+),(\d+)\]([^\r\n]*?)(?=\[\d+,\d+\]|[\r\n]|$)/g;

/** LRC 行级头: `[mm:ss.xx]text` 或 `[mm:ss:xx]text` */
const LRC_LINE_RE = /\[(\d+):(\d+)[.:](\d+)\]([^\r\n]*?)(?=\[\d+:\d+[.:]\d+\]|[\r\n]|$)/g;

/** 只识别成对闭合的数字时间标签；其余括号和符号均属于歌词原文。 */
const SYLLABLE_RE = /\((\d+),(\d+)(?:,\d+)?\)|<(\d+),(\d+)(?:,\d+)?>/g;

/** 音节时间戳位置; `auto` 表示按 prefix / suffix 的文本覆盖长度选择布局 */
export type SyllableMode = 'prefix' | 'suffix' | 'auto';

/** 音节时间戳含义: absolute=绝对毫秒(需减行首),relative=已是行内偏移 */
export type OffsetKind = 'absolute' | 'relative';

/**
 * 使用已扫描的行头和音节标签构建一行歌词。
 * @param lineMatch - 行头和正文的匹配结果。
 * @param tokens - 正文中按出现顺序排列的音节标签。
 * @param mode - `prefix` 音节时间戳在文本前; `suffix` 时间戳在文本后
 * @param offsetKind - 时间戳含义
 * @returns 保留首尾无时间文本的歌词行。
 */
function buildLine(
  lineMatch: RegExpExecArray,
  tokens: RegExpExecArray[],
  mode: 'prefix' | 'suffix',
  offsetKind: OffsetKind,
): KaraokeLine {
  const lineStart = parseInt(lineMatch[1], 10);
  const lineDur = parseInt(lineMatch[2], 10);
  const [, , , segment] = lineMatch;
  const syllables: KaraokeSyllable[] = tokens.map((token, index) => {
    const previous = tokens[index - 1];
    const next = tokens[index + 1];
    const tokenEnd = token.index + token[0].length;
    let text = mode === 'prefix'
      ? segment.slice(tokenEnd, next?.index ?? segment.length)
      : segment.slice(previous ? previous.index + previous[0].length : 0, token.index);
    if (mode === 'prefix' && index === 0) text = segment.slice(0, token.index) + text;
    if (mode === 'suffix' && !next) text += segment.slice(tokenEnd);
    const s = parseInt(token[1] ?? token[3], 10);
    const d = parseInt(token[2] ?? token[4], 10);
    return {
      text,
      start_offset_ms: offsetKind === 'absolute' ? Math.max(0, s - lineStart) : s,
      duration_ms: d,
    };
  }).filter((syllable) => syllable.text.length > 0);

  return {
    syllables,
    time_ms: lineStart,
    duration_ms: lineDur,
    text: tokens.length > 0 ? syllables.map((syllable) => syllable.text).join('') : segment.trim(),
  };
}

/**
 * 解析同步逐字歌词文本为歌词行数组
 *
 * `mode='auto'` 共用一次标签扫描，按「附加无时间首尾文本前覆盖长度」选择布局，
 * 只构建并排序选中的结果；覆盖长度相同仍优先 suffix。这是为了兼容
 * 同一来源(如酷狗)在不同歌曲/版本中交替出现 `text<s,d>` 与 `<s,d>text`
 * 两种布局, 避免误用 suffix 时末字被挤到无匹配尾段而丢失。
 *
 * @param lyrics - 解密/明文后的同步歌词文本
 * @param mode - `prefix` / `suffix` / `auto`
 * @param offsetKind - `absolute` 音节时间戳为绝对毫秒; `relative` 已是行内偏移
 * @returns 解析后的逐字歌词行数组, 已按时间排序
 */
export function parseSyncedLines(
  lyrics: string,
  mode: SyllableMode,
  offsetKind: OffsetKind,
): KaraokeLine[] {
  const lines: KaraokeLine[] = [];
  const pending: Array<{ lineMatch: RegExpExecArray; tokens: RegExpExecArray[] }> = [];
  let coverageDifference = 0;

  Array.from(lyrics.matchAll(LINE_RE)).forEach((lineMatch) => {
    const [, , , segment] = lineMatch;
    if (!segment) return;
    const tokens = Array.from(segment.matchAll(SYLLABLE_RE));
    if (mode !== 'auto') {
      lines.push(buildLine(lineMatch, tokens, mode, offsetKind));
      return;
    }

    const [first] = tokens;
    const last = tokens[tokens.length - 1];
    if (first && last) {
      // 两种布局的内部文本覆盖相同，差值只取决于首尾文本；索引保持 UTF-16 计分。
      coverageDifference += segment.length - last.index - last[0].length - first.index;
    }
    pending.push({ lineMatch, tokens });
  });

  if (mode === 'auto') {
    const selectedMode = coverageDifference > 0 ? 'prefix' : 'suffix';
    pending.forEach(({ lineMatch, tokens }) => {
      lines.push(buildLine(lineMatch, tokens, selectedMode, offsetKind));
    });
  }
  return lines.sort((a, b) => a.time_ms - b.time_ms);
}

/**
 * 解析 LRC 逐行歌词(回退使用) — 与逐字结构兼容,但 `syllables` 为空
 * @param lyrics - LRC 格式歌词文本
 * @returns 歌词行数组, 每行 `syllables` 为空数组
 */
export function parseLRCAsKaraoke(lyrics: string): KaraokeLine[] {
  const out: KaraokeLine[] = [];
  Array.from(lyrics.matchAll(LRC_LINE_RE)).forEach((caps) => {
    const mm = parseInt(caps[1], 10);
    const ss = parseInt(caps[2], 10);
    const xx = parseInt(caps[3], 10);
    const text = caps[4].trim();
    if (!text) return;
    out.push({
      time_ms: mm * 60000 + ss * 1000 + xx * 10,
      duration_ms: 0,
      text,
      syllables: [],
    });
  });
  out.sort((a, b) => a.time_ms - b.time_ms);
  return out;
}
