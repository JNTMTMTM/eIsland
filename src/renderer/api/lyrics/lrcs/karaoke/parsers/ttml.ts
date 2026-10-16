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
 * @file ttml.ts
 * @description Apple Music TTML 逐字歌词解析器 — 移植自 Lyrix parsers/applemusic.rs
 *              解析 TTML XML 中 `<p>` + `<span>` 结构提取逐字音节
 *              时间格式: `HH:MM:SS` 或 `MM:SS`，秒支持任意小数精度
 * @author 鸡哥
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

import type { KaraokeLine, KaraokeSyllable } from '../types';

/* ── 时间解析 ──────────────────────────────────────────────────────── */

/**
 * 解析音节级时钟标签，按秒的小数精度换算毫秒，避免将毫秒误读为百分秒。
 * @param tag - MM:SS 或 HH:MM:SS 格式，可带小数秒
 * @returns 对应毫秒数，不支持的格式返回 0
 */
function parseTimeMs(tag: string): number {
  const parts = tag.trim().split(':');
  if (parts.length !== 2 && parts.length !== 3) return 0;
  const seconds = parts.reduce((total, part) => total * 60 + Number(part), 0);
  return Math.round(seconds * 1000);
}

/* ── 属性提取辅助 ──────────────────────────────────────────────────── */

/** 从片段中查找 `attr="value"` 的值 */
function findAttr(fragment: string, attr: string): string | null {
  const marker = `${attr}="`;
  const start = fragment.indexOf(marker);
  if (start === -1) return null;
  const valueStart = start + marker.length;
  const valueEnd = fragment.indexOf('"', valueStart);
  if (valueEnd === -1) return null;
  return fragment.substring(valueStart, valueEnd);
}

/* ── 逐字模式（syllable: `<p>` + `<span>`）──────────────────────────── */

/**
 * 解析单个 `<p>...</p>` 为一行逐字歌词
 * `<p>` 属性: `in="start" nd="end"` 行级时间
 * `<span>` 子元素: `in="start" nd="end"` 音节时间
 */
function parseSyllableLine(pBlock: string): KaraokeLine | null {
  // 提取行级时间
  const lineStartStr = findAttr(pBlock, 'in');
  const lineEndStr = findAttr(pBlock, 'nd');
  if (!lineStartStr || !lineEndStr) return null;

  const lineStart = parseTimeMs(lineStartStr);
  const lineEnd = parseTimeMs(lineEndStr);
  const lineDur = Math.max(0, lineEnd - lineStart);

  // 遍历所有 <span> 标签
  const syllables: KaraokeSyllable[] = [];
  let fullText = '';
  const spanRe = /<span\b([^>]*)>([^<]*)<\/span>/g;
  let m: RegExpExecArray | null;

  while ((m = spanRe.exec(pBlock)) !== null) {
    const attrs = m[1];
    const text = m[2];
    if (!text) continue;

    const sStartStr = findAttr(attrs, 'in');
    const sEndStr = findAttr(attrs, 'nd');
    if (!sStartStr || !sEndStr) continue;

    const sStart = parseTimeMs(sStartStr);
    const sEnd = parseTimeMs(sEndStr);
    const offset = Math.max(0, sStart - lineStart);
    const dur = Math.max(0, sEnd - sStart);

    fullText += text;
    syllables.push({
      start_offset_ms: offset,
      duration_ms: dur,
      text,
    });
  }

  return {
    time_ms: lineStart,
    duration_ms: lineDur,
    text: fullText,
    syllables,
  };
}

/** 解析包含 `<span>` 的 TTML 为逐字歌词行 */
function parseSyllables(ttml: string): KaraokeLine[] {
  const lines: KaraokeLine[] = [];
  const pRe = /<p\b[^>]*>[\s\S]*?<\/p>/g;
  let m: RegExpExecArray | null;

  while ((m = pRe.exec(ttml)) !== null) {
    const line = parseSyllableLine(m[0]);
    if (line) lines.push(line);
  }

  lines.sort((a, b) => a.time_ms - b.time_ms);
  return lines;
}

/* ── 行级模式（word: `<div>` with `="..."` pairs）───────────────────── */

/** 解析无 `<span>` 的 TTML 为行级歌词（无逐字） */
function parseWordLevel(ttml: string): KaraokeLine[] {
  const lines: KaraokeLine[] = [];

  // 定位到第一个 <div 之后
  const divIdx = ttml.indexOf('<div');
  if (divIdx === -1) return lines;
  const body = ttml.substring(divIdx);

  // 匹配 `="HH:MM:SS.cs"` 属性值对
  const attrRe = /=("(\d{1,2}:\d{2}:\d{2}\.\d{2})")/g;
  let m: RegExpExecArray | null;
  const times: number[] = [];

  while ((m = attrRe.exec(body)) !== null) {
    times.push(parseTimeMs(m[2]));
  }

  // 提取文本内容（`>text<` 之间的非标签文本）
  const textRe = />([^<]+)</g;
  const texts: string[] = [];
  while ((m = textRe.exec(body)) !== null) {
    const t = m[1].trim();
    if (t) texts.push(t);
  }

  // 时间戳成对出现: [start0, end0, start1, end1, ...]
  const count = Math.min(Math.floor(times.length / 2), texts.length);
  for (let i = 0; i < count; i++) {
    const st = times[i * 2];
    const et = times[i * 2 + 1];
    lines.push({
      time_ms: st,
      duration_ms: Math.max(0, et - st),
      text: texts[i],
      syllables: [],
    });
  }

  lines.sort((a, b) => a.time_ms - b.time_ms);
  return lines;
}

/* ── 对外入口 ──────────────────────────────────────────────────────── */

/**
 * 解析 Apple Music TTML 歌词
 * - 有 `<span>` 标签: 逐字模式（syllable）
 * - 无 `<span>` 标签: 行级模式（word）
 * @param ttml - TTML XML 文本
 * @returns 逐字歌词行数组
 */
export function parseTTML(ttml: string): KaraokeLine[] {
  if (!ttml) return [];
  const hasSpan = ttml.includes('<span');
  return hasSpan ? parseSyllables(ttml) : parseWordLevel(ttml);
}
