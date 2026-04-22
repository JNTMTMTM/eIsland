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
 * @file lrcParser.ts
 * @description 歌词解析工具集 — LRC/YRC/KRC 格式解析、标题/艺术家清洗、同步歌词提取
 * @author 鸡哥
 */

import type { LyricLine } from '../api/lyrics/lrcs/normal/types';

const META_PREFIXES = [
  '作词', '作曲', '编曲', '制作', '混音', '母带', '录音',
  'Lyrics by', 'Composed by', 'Produced by', 'Arranged by',
];

/**
 * 解析 LRC 时间标签为毫秒数
 * @param tag - 时间标签字符串，如 "01:23.45"
 * @returns 毫秒数，解析失败返回 null
 */
export function parseLrcTime(tag: string): number | null {
  const parts = tag.split(':');
  if (parts.length !== 2) return null;

  const min = parseInt(parts[0], 10);
  if (isNaN(min)) return null;

  const secParts = parts[1].split('.');
  if (!secParts.length) return null;

  const sec = parseInt(secParts[0], 10);
  if (isNaN(sec)) return null;

  let ms = 0;
  if (secParts.length > 1) {
    const frac = secParts[1].slice(0, 3);
    const val = parseInt(frac, 10);
    if (isNaN(val)) return null;
    ms = frac.length === 1 ? val * 100 : frac.length === 2 ? val * 10 : val;
  }

  return min * 60000 + sec * 1000 + ms;
}

/**
 * 解析同步 LRC 歌词文本为歌词行数组
 * @param lrc - LRC 格式歌词文本
 * @returns 按时间排序的歌词行数组
 */
export function parseSyncedLrc(lrc: string): LyricLine[] {
  return lrc
    .split('\n')
    .reduce<LyricLine[]>((acc, raw) => {
      const trimmed = raw.trim();
      if (!trimmed.startsWith('[')) return acc;
      const endIndex = trimmed.indexOf(']');
      if (endIndex === -1) return acc;
      const tag = trimmed.slice(1, endIndex);
      const text = trimmed.slice(endIndex + 1).trim();
      const timeMs = parseLrcTime(tag);
      if (timeMs !== null && text && !META_PREFIXES.some((prefix) => text.startsWith(prefix))) {
        acc.push({ time_ms: timeMs, text });
      }
      return acc;
    }, [])
    .sort((a, b) => a.time_ms - b.time_ms);
}

/**
 * 解析网易云 YRC 逐字歌词格式
 * 格式: [start_ms,duration_ms] 后跟 (word_start,word_dur,0)字 ...
 * 退化为逐行：取每行的起始时间 + 拼接所有字级文本
 */
export function parseYrc(yrc: string): LyricLine[] {
  const wordTagRe = /\(\d+,\d+,\d+\)/g;

  return yrc
    .split('\n')
    .reduce<LyricLine[]>((acc, raw) => {
      const trimmed = raw.trim();
      if (!trimmed.startsWith('[')) return acc;
      const closeIdx = trimmed.indexOf(']');
      if (closeIdx === -1) return acc;

      const inner = trimmed.slice(1, closeIdx);
      const commaIdx = inner.indexOf(',');
      if (commaIdx === -1) return acc;

      const startMs = parseInt(inner.slice(0, commaIdx), 10);
      if (isNaN(startMs)) return acc;

      const textRaw = trimmed.slice(closeIdx + 1);
      const text = textRaw.replace(wordTagRe, '').trim();
      if (text && !META_PREFIXES.some((prefix) => text.startsWith(prefix))) {
        acc.push({ time_ms: startMs, text });
      }
      return acc;
    }, [])
    .sort((a, b) => a.time_ms - b.time_ms);
}

/**
 * 解析汽水音乐 KRC 格式歌词
 * 格式: [start_ms,duration_ms]<word_offset,word_dur,0>字...
 * 同时兼容标准 LRC 格式，自动检测
 */
export function parseKrc(content: string): LyricLine[] {
  const isKrc = content.split('\n').some((l) => {
    const t = l.trim();
    if (!t.startsWith('[')) return false;
    const inner = t.slice(1);
    const comma = inner.indexOf(',');
    const close = inner.indexOf(']');
    if (comma === -1 || close === -1 || comma >= close) return false;
    return (
      inner.slice(0, comma).split('').every((ch) => ch >= '0' && ch <= '9') &&
      inner.slice(comma + 1, close).split('').every((ch) => ch >= '0' && ch <= '9')
    );
  });

  if (!isKrc) {
    return parseSyncedLrc(content);
  }

  const wordTagRe = /<\d+,\d+,\d+>/g;

  return content
    .split('\n')
    .reduce<LyricLine[]>((acc, raw) => {
      const trimmed = raw.trim();
      if (!trimmed || !trimmed.startsWith('[')) return acc;

      const closeIdx = trimmed.indexOf(']');
      if (closeIdx === -1) return acc;

      const inner = trimmed.slice(1, closeIdx);
      const commaIdx = inner.indexOf(',');
      if (commaIdx === -1) return acc;

      const startPart = inner.slice(0, commaIdx);
      const durPart = inner.slice(commaIdx + 1);

      if (
        !startPart.split('').every((ch) => ch >= '0' && ch <= '9') ||
        !durPart.split('').every((ch) => ch >= '0' && ch <= '9')
      ) {
        return acc;
      }

      const startMs = parseInt(startPart, 10);
      if (isNaN(startMs)) return acc;

      const textRaw = trimmed.slice(closeIdx + 1);
      const text = textRaw.replace(wordTagRe, '').trim();
      if (text && !META_PREFIXES.some((prefix) => text.startsWith(prefix))) {
        acc.push({ time_ms: startMs, text });
      }
      return acc;
    }, [])
    .sort((a, b) => a.time_ms - b.time_ms);
}

function normalize(s: string): string {
  return s
    .replace(/[\uff01-\uff5e]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripBrackets(s: string): string {
  return s
    .replace(/[\(（\[【〔{＜<《][^)）\]】〕}＞>》]*[)）\]】〕}＞>》]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 清洗歌曲标题：去除括号内容、feat 后缀、版本标记等
 * @param title - 原始标题
 * @returns 清洗后的标题
 */
export function cleanTitle(title: string): string {
  let result = normalize(title);
  result = stripBrackets(result);
  result = result.replace(/\s*(?:feat\.?|ft\.?|prod\.?|with)\s+.*/i, '');
  result = result.replace(/\s*-\s+.*$/i, '');
  result = result.replace(/\s*(?:remix|remaster(?:ed)?|live|acoustic|instrumental|demo|radio\s*edit|explicit|clean|deluxe|bonus\s*track|original\s*mix)\s*$/i, '');
  result = result.replace(/[.\-_~·]+$/, '').trim();
  return result || normalize(title);
}

/**
 * 清洗艺术家名称：去除括号内容、feat 后缀，仅保留第一位艺术家
 * @param artist - 原始艺术家名称
 * @returns 清洗后的艺术家名称
 */
export function cleanArtist(artist: string): string {
  let result = normalize(artist);
  result = stripBrackets(result);
  result = result.replace(/\s*(?:feat\.?|ft\.?|prod\.?|with)\s+.*/i, '');
  const parts = result.split(/[/,;&×·、]|\s+x\s+/i);
  result = (parts[0] || '').trim();
  result = result.replace(/^["'""'']+|["'""'']+$/g, '');
  return result || normalize(artist);
}

/**
 * 从 JSON 数组中提取首个有效的同步歌词
 * @param json - 包含 syncedLyrics 字段的对象数组
 * @returns 解析后的歌词行数组，无匹配时返回 null
 */
export function extractSyncedFromArray(json: unknown[]): LyricLine[] | null {
  const match = json
    .map((item) => (item && typeof item === 'object'
      ? (item as Record<string, unknown>).syncedLyrics
      : null))
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((synced) => parseSyncedLrc(synced))
    .find((lines) => lines.length > 0);
  return match ?? null;
}

/**
 * 从 JSON 对象中提取同步歌词
 * @param json - 包含 syncedLyrics 字段的对象
 * @returns 解析后的歌词行数组，无匹配时返回 null
 */
export function extractSyncedFromObject(json: Record<string, unknown>): LyricLine[] | null {
  const synced = typeof json.syncedLyrics === 'string' ? json.syncedLyrics : null;
  if (!synced || synced.length === 0) return null;
  const lines = parseSyncedLrc(synced);
  return lines.length > 0 ? lines : null;
}
