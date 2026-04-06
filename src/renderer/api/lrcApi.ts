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
 * @file lrcApi.ts
 * @description 歌词获取接口模块
 * @reference Python-island/dynamic-island/src-tauri/src/lrc.rs
 * @author 鸡哥
 */

export interface LyricLine {
  time_ms: number;
  text: string;
}

const META_PREFIXES = [
  '作词', '作曲', '编曲', '制作', '混音', '母带', '录音',
  'Lyrics by', 'Composed by', 'Produced by', 'Arranged by'
];

/**
 * 解析同步歌词时间戳 [mm:ss.xx] 或 [mm:ss.xxx]
 */
function parseLrcTime(tag: string): number | null {
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
    const frac = secParts[1];
    const val = parseInt(frac, 10);
    if (isNaN(val)) return null;
    ms = frac.length === 2 ? val * 10 : val;
  }

  return min * 60000 + sec * 1000 + ms;
}

/**
 * 解析同步歌词字符串
 */
function parseSyncedLrc(lrc: string): LyricLine[] {
  return lrc.split('\n')
    .reduce<LyricLine[]>((acc, raw) => {
      const trimmed = raw.trim();
      if (!trimmed.startsWith('[')) return acc;
      const endIndex = trimmed.indexOf(']');
      if (endIndex === -1) return acc;
      const tag = trimmed.slice(1, endIndex);
      const text = trimmed.slice(endIndex + 1).trim();
      const timeMs = parseLrcTime(tag);
      if (timeMs !== null && text && !META_PREFIXES.some(p => text.startsWith(p))) {
        acc.push({ time_ms: timeMs, text });
      }
      return acc;
    }, [])
    .sort((a, b) => a.time_ms - b.time_ms);
}

/**
 * 规范化文本：全角转半角、合并空白、去除首尾空白
 */
function normalize(s: string): string {
  return s
    .replace(/[\uff01-\uff5e]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 去除所有类型的括号及其内容
 */
function stripBrackets(s: string): string {
  return s
    .replace(/[\(（\[【〔{＜<《][^)）\]】〕}＞>》]*[)）\]】〕}＞>》]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 清理歌曲标题，去除括号内容、feat 信息等干扰搜索的部分
 */
function cleanTitle(title: string): string {
  let result = normalize(title);

  // 去除所有括号及其内容
  result = stripBrackets(result);

  // 去除 feat./ft./prod./with 及其后续内容（不在括号内的情况）
  result = result.replace(/\s*(?:feat\.?|ft\.?|prod\.?|with)\s+.*/i, '');

  // 去除 " - " 后面的副标题 / remix / version 等
  result = result.replace(/\s*-\s+.*$/i, '');

  // 去除末尾常见后缀标签
  result = result.replace(/\s*(?:remix|remaster(?:ed)?|live|acoustic|instrumental|demo|radio\s*edit|explicit|clean|deluxe|bonus\s*track|original\s*mix)\s*$/i, '');

  // 去除末尾标点和多余空白
  result = result.replace(/[.\-_~·]+$/, '').trim();

  return result || normalize(title);
}

/**
 * 清理艺术家名称
 * 取主艺术家，处理多种分隔符和标签
 */
function cleanArtist(artist: string): string {
  let result = normalize(artist);

  // 去除括号内容（如"(feat. X)"）
  result = stripBrackets(result);

  // 去除 feat./ft./prod./with 及后续
  result = result.replace(/\s*(?:feat\.?|ft\.?|prod\.?|with)\s+.*/i, '');

  // 按常见分隔符拆分取第一个：/ , & ; × x · 、
  const parts = result.split(/[/,;&×·、]|\s+x\s+/i);
  result = (parts[0] || '').trim();

  // 去除首尾引号
  result = result.replace(/^["'""'']+|["'""'']+$/g, '');

  return result || normalize(artist);
}

/**
 * 从 LRCLIB API 搜索结果数组中提取第一个有 syncedLyrics 的结果
 */
function extractSyncedFromArray(json: unknown[]): LyricLine[] | null {
  const match = json
    .map(item => (item as Record<string, unknown>).syncedLyrics)
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .map(synced => parseSyncedLrc(synced))
    .find(lines => lines.length > 0);
  return match ?? null;
}

/**
 * 从单个对象中提取 syncedLyrics
 */
function extractSyncedFromObject(json: Record<string, unknown>): LyricLine[] | null {
  const synced = typeof json.syncedLyrics === 'string' ? json.syncedLyrics : null;
  if (!synced || synced.length === 0) return null;
  const lines = parseSyncedLrc(synced);
  return lines.length > 0 ? lines : null;
}

/**
 * 从 LRCLIB 获取歌词
 * @param title 歌曲标题
 * @param artist 艺术家名称
 * @returns 解析后的歌词数组，失败返回 null
 */
export async function fetchLyricsFromLrclib(
  title: string,
  artist: string
): Promise<LyricLine[] | null> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  const ua = 'DynamicIsland/1.0 (https://github.com/user/dynamic-island)';

  const headers = { 'User-Agent': ua };

  // 策略1: 使用原始标题和艺术家搜索
  const url1 = `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
  try {
    const resp = await fetch(url1, { headers });
    if (resp.ok) {
      const json = await resp.json() as unknown[];
      const lines = extractSyncedFromArray(json);
      if (lines) return lines;
    }
  } catch {
    // 继续尝试下一个策略
  }

  // 策略2: 使用清理后的标题和艺术家
  if (cleanedTitle !== title || cleanedArtist !== artist) {
    const url2 = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}`;
    try {
      const resp = await fetch(url2, { headers });
      if (resp.ok) {
        const json = await resp.json() as unknown[];
        const lines = extractSyncedFromArray(json);
        if (lines) return lines;
      }
    } catch {
      // 继续尝试下一个策略
    }
  }

  // 策略3: 自由搜索
  const query = `${cleanedTitle} ${cleanedArtist}`;
  const url3 = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
  try {
    const resp = await fetch(url3, { headers });
    if (resp.ok) {
      const json = await resp.json() as unknown[];
      const lines = extractSyncedFromArray(json);
      if (lines) return lines;
    }
  } catch {
    // 继续尝试下一个策略
  }

  // 策略4: 精确匹配
  const url4 = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}`;
  try {
    const resp = await fetch(url4, { headers });
    if (resp.ok) {
      const json = await resp.json() as Record<string, unknown>;
      const lines = extractSyncedFromObject(json);
      if (lines) return lines;
    }
  } catch {
    // 精确匹配失败
  }

  return null;
}

/**
 * 从网易云音乐获取歌词（作为 LRCLIB 的备用源）
 * @param title 歌曲标题
 * @param artist 艺术家名称
 * @returns 解析后的歌词数组，失败返回 null
 */
export async function fetchLyricsFromNetease(
  title: string,
  artist: string
): Promise<LyricLine[] | null> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  const query = `${cleanedTitle} ${cleanedArtist}`;

  try {
    // 搜索歌曲（通过主进程代理绕过 CORS）
    const searchResp = await window.api.netFetch('https://music.163.com/api/search/get', {
      method: 'POST',
      headers: {
        'Referer': 'https://music.163.com',
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `s=${encodeURIComponent(query)}&type=1&limit=5&offset=0`,
    });

    if (!searchResp.ok) return null;

    const searchJson = JSON.parse(searchResp.body) as Record<string, unknown>;
    const result = searchJson.result as Record<string, unknown> | undefined;
    const songs = result?.songs as unknown[] | undefined;

    if (!songs || songs.length === 0) return null;

    const firstSong = songs[0] as Record<string, unknown>;
    const songId = typeof firstSong.id === 'number' ? firstSong.id : parseInt(String(firstSong.id), 10);
    if (isNaN(songId)) return null;

    // 获取歌词（通过主进程代理绕过 CORS）
    const lrcResp = await window.api.netFetch(`https://music.163.com/api/song/lyric?id=${songId}&lv=1`, {
      headers: {
        'Referer': 'https://music.163.com',
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!lrcResp.ok) return null;

    const lrcJson = JSON.parse(lrcResp.body) as Record<string, unknown>;
    const lrcObj = lrcJson.lrc as Record<string, unknown> | undefined;
    const lrcStr = typeof lrcObj?.lyric === 'string' ? lrcObj.lyric : null;

    if (!lrcStr || lrcStr.length === 0) return null;

    const lines = parseSyncedLrc(lrcStr);
    return lines.length > 0 ? lines : null;
  } catch {
    return null;
  }
}

/**
 * 获取歌词（自动尝试多个源）
 * @param title 歌曲标题
 * @param artist 艺术家名称
 * @returns 解析后的歌词数组，失败返回 null
 */
export async function fetchLyrics(
  title: string,
  artist: string
): Promise<LyricLine[] | null> {
  let source = 'lrclib-first';
  try {
    source = await window.api.musicLyricsSourceGet();
  } catch { /* fallback */ }

  if (source === 'lrclib-only') {
    return fetchLyricsFromLrclib(title, artist);
  }
  if (source === 'netease-only') {
    return fetchLyricsFromNetease(title, artist);
  }
  if (source === 'netease-first') {
    const neteaseResult = await fetchLyricsFromNetease(title, artist);
    if (neteaseResult) return neteaseResult;
    return fetchLyricsFromLrclib(title, artist);
  }

  // 默认 lrclib-first
  const lrclibResult = await fetchLyricsFromLrclib(title, artist);
  if (lrclibResult) return lrclibResult;
  return fetchLyricsFromNetease(title, artist);
}

/**
 * 根据播放位置获取当前歌词行
 */
export function getCurrentLyric(
  lyrics: LyricLine[],
  positionMs: number
): LyricLine | null {
  if (lyrics.length === 0) return null;

  return lyrics.reduce<LyricLine | null>(
    (acc, line) => (line.time_ms <= positionMs ? line : acc),
    null
  );
}

/**
 * 获取当前播放位置周围的歌词行（前2行、当前行、后2行）
 * @returns 包含歌词文本和是否为当前行的元组数组
 */
export function getNearbyLyrics(
  lyrics: LyricLine[],
  positionMs: number
): Array<{ text: string; isCurrent: boolean }> {
  if (lyrics.length === 0) return [];

  const currentIdx = lyrics.reduce<number | null>(
    (acc, line, i) => (line.time_ms <= positionMs ? i : acc),
    null
  );

  if (currentIdx === null) return [];

  const start = Math.max(0, currentIdx - 2);
  const end = Math.min(lyrics.length, currentIdx + 3);

  return lyrics.slice(start, end).map((line, i) => ({
    text: line.text,
    isCurrent: start + i === currentIdx,
  }));
}
