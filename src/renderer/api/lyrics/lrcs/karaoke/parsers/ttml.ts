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
 * @see https://github.com/cXp1r/lyricify-lyrics-provider-rs
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

/**
 * 从片段中查找 `attr="value"` 的值。
 * @param fragment - 当前标签的属性片段。
 * @param attr - 属性名或兼容的时间属性后缀。
 * @returns 属性值，缺失或不完整时返回 null。
 */
function findAttr(fragment: string, attr: string): string | null {
  const marker = `${attr}="`;
  const start = fragment.indexOf(marker);
  if (start === -1) return null;
  const valueStart = start + marker.length;
  const valueEnd = fragment.indexOf('"', valueStart);
  if (valueEnd === -1) return null;
  return fragment.substring(valueStart, valueEnd);
}

/**
 * 解码文本中的 XML 实体；先拆标签再解码，避免将歌词中的小于号误当作标签。
 * @param text - 尚未解码的 XML 文本节点。
 * @returns 仅解码一层后的原始歌词，非法字符引用保持原样。
 */
function decodeXmlText(text: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'' };
  return text.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g, (entity: string, name: string) => {
    if (!name.startsWith('#')) return entities[name];
    const hexadecimal = name.startsWith('#x');
    const point = Number.parseInt(name.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    if (point <= 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) return entity;
    return String.fromCodePoint(point);
  });
}

/* ── 逐字模式（syllable: `<p>` + `<span>`）──────────────────────────── */

/**
 * 解析单个 `<p>...</p>` 为一行逐字歌词
 * `<p>` 属性: `in="start" nd="end"` 行级时间
 * `<span>` 子元素: `in="start" nd="end"` 音节时间
 * @param pBlock - 包含行级时间和歌词内容的完整段落。
 * @returns 保留全部文本的歌词行，行时间不完整时返回 null。
 */
function parseSyllableLine(pBlock: string): KaraokeLine | null {
  // 提取行级时间
  const openingEnd = pBlock.indexOf('>');
  const lineAttrs = pBlock.slice(0, openingEnd);
  const lineStartStr = findAttr(lineAttrs, 'in');
  const lineEndStr = findAttr(lineAttrs, 'nd');
  if (!lineStartStr || !lineEndStr) return null;

  const lineStart = parseTimeMs(lineStartStr);
  const lineEnd = parseTimeMs(lineEndStr);
  const lineDur = Math.max(0, lineEnd - lineStart);

  // 文本节点都参与显示；未定时标点附着相邻音节，不为它们捏造时间戳。
  const syllables: KaraokeSyllable[] = [];
  const timings: (Omit<KaraokeSyllable, 'text'> | null)[] = [];
  let lastTiming: Omit<KaraokeSyllable, 'text'> | null = null;
  let leadingText = '';
  let fullText = '';
  const content = pBlock.slice(openingEnd + 1, pBlock.lastIndexOf('</p>'));
  const tokenRe = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|(<\/?span\b[^>]*>)|<[^>]*>|([^<]+)/g;
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(content)) !== null) {
    const [, cdata, span, nodeText] = m;
    if (span) {
      if (span.startsWith('</')) {
        timings.pop();
      } else if (!/\/\s*>$/.test(span)) {
        const start = findAttr(span, 'in');
        const end = findAttr(span, 'nd');
        timings.push(start && end ? {
          start_offset_ms: Math.max(0, parseTimeMs(start) - lineStart),
          duration_ms: Math.max(0, parseTimeMs(end) - parseTimeMs(start)),
        } : timings.at(-1) ?? null);
      }
      continue;
    }
    const text = cdata ?? decodeXmlText(nodeText ?? '');
    if (!text) continue;
    fullText += text;
    const timing = timings.at(-1) ?? null;
    const previous = syllables.at(-1);
    if (timing && (timing !== lastTiming || !previous)) {
      syllables.push({ ...timing, text: leadingText + text });
      leadingText = '';
      lastTiming = timing;
    } else if (previous) {
      previous.text += text;
    } else {
      leadingText += text;
    }
  }

  return {
    syllables,
    time_ms: lineStart,
    duration_ms: lineDur,
    text: fullText,
  };
}

/**
 * 按段落解析 TTML，保留有完整行时间的逐字行和纯文本行。
 * @param ttml - TTML XML 文本。
 * @returns 按开始时间排列的歌词行。
 */
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

/**
 * 解析无 `<span>` 的 TTML 为行级歌词（无逐字）。
 * @param ttml - TTML XML 文本。
 * @returns 保留符号和实体文本的行级歌词。
 */
function parseWordLevel(ttml: string): KaraokeLine[] {
  if (/<p\b/.test(ttml)) {
    return parseSyllables(ttml)
      .map((line) => ({ ...line, text: line.text.trim() }))
      .filter((line) => line.text.length > 0);
  }
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
    const t = decodeXmlText(m[1]).trim();
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
