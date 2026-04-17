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
 * @file netease.ts
 * @description 网易云音乐逐字歌词(YRC)拉取 — 搜索歌曲 → v1 歌词接口取 `yrc.lyric` → 前缀式音节 + 绝对偏移解析
 * @author 鸡哥
 */

import { cleanArtist, cleanTitle } from '../../helpers';
import { requestJsonWithLog } from '../../request';
import { parseSyncedLines } from '../parsers';
import type { KaraokeLine } from '../types';

const NETEASE_HEADERS = {
  Referer: 'https://music.163.com',
  'User-Agent': 'Mozilla/5.0',
  'Content-Type': 'application/x-www-form-urlencoded',
};

/**
 * 根据关键字搜索网易云并拉取 YRC 逐字歌词
 * @param queryTitle - 搜索标题
 * @param queryArtist - 搜索艺术家
 * @returns 逐字歌词行; 搜索失败或无 YRC 时返回 null
 */
async function searchKaraokeNetease(queryTitle: string, queryArtist: string): Promise<KaraokeLine[] | null> {
  const query = `${queryTitle} ${queryArtist}`.trim();
  try {
    const searchJson = await requestJsonWithLog<Record<string, unknown>>(
      'https://music.163.com/api/search/get/web',
      {
        method: 'POST',
        headers: NETEASE_HEADERS,
        body: `s=${encodeURIComponent(query)}&type=1&limit=20&offset=0`,
      },
    );
    if (!searchJson) return null;

    const result = searchJson.result as Record<string, unknown> | undefined;
    const songs = result?.songs as unknown[] | undefined;
    if (!songs || songs.length === 0) return null;

    const first = songs[0] as Record<string, unknown>;
    const id = typeof first.id === 'number' ? String(first.id) : String(first.id ?? '');
    if (!id) return null;

    const lrcJson = await requestJsonWithLog<Record<string, unknown>>(
      'https://interface3.music.163.com/api/song/lyric/v1',
      {
        method: 'POST',
        headers: NETEASE_HEADERS,
        body: `id=${id}&lv=-1&kv=-1&tv=-1&rv=-1&yv=-1&ytv=-1&yrv=-1`,
      },
    );
    if (!lrcJson) return null;

    const yrc = (lrcJson.yrc as { lyric?: string } | undefined)?.lyric;
    if (!yrc) return null;

    const lines = parseSyncedLines(yrc, 'prefix', 'absolute');
    const withSyllables = lines.filter((l) => l.syllables.length > 0);
    return withSyllables.length > 0 ? withSyllables : null;
  } catch {
    return null;
  }
}

/**
 * 网易云逐字歌词对外入口 — 原词失败则用 cleanTitle/cleanArtist 再试一次
 * @param title - 原始歌名
 * @param artist - 原始艺术家
 * @returns 逐字歌词行, 无 YRC 时返回 null
 */
export async function fetchKaraokeFromNetease(title: string, artist: string): Promise<KaraokeLine[] | null> {
  const raw = await searchKaraokeNetease(title, artist);
  if (raw) return raw;

  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  if (cleanedTitle !== title || cleanedArtist !== artist) {
    return searchKaraokeNetease(cleanedTitle, cleanedArtist);
  }
  return null;
}
