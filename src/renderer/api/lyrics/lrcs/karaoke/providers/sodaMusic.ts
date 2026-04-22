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
 * @file sodaMusic.ts
 * @description 汽水音乐逐字歌词拉取 — 搜歌 → 详情接口 `lyric.content` 已是明文 KRC 风格(无需解密) → 前缀式音节 + 相对偏移解析
 * @author 鸡哥
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

import { cleanArtist, cleanTitle } from '../../helpers';
import { requestJsonWithLog } from '../../request';
import { parseSyncedLines } from '../parsers';
import type { KaraokeLine } from '../types';

/**
 * 从汽水音乐搜索并获取逐字歌词
 * @param queryTitle - 搜索标题
 * @param queryArtist - 搜索艺术家
 * @returns 逐字歌词行; 无逐字内容或解析失败时返回 null
 */
async function searchKaraokeSodaMusic(queryTitle: string, queryArtist: string): Promise<KaraokeLine[] | null> {
  const query = `${queryTitle} ${queryArtist}`.trim();
  try {
    const searchUrl =
      `https://api.qishui.com/luna/pc/search/track?aid=386088&app_name=&region=&geo_region=&os_region=&sim_region=&device_id=&cdid=&iid=&version_name=&version_code=&channel=&build_mode=&network_carrier=&ac=&tz_name=&resolution=&device_platform=&device_type=&os_version=&fp=&q=${encodeURIComponent(query)}&cursor=&search_id=&search_method=input&debug_params=&from_search_id=&search_scene=`;

    const searchJson = await requestJsonWithLog<Record<string, unknown>>(searchUrl);
    if (!searchJson) return null;

    const resultGroups = searchJson.result_groups as unknown[] | undefined;
    if (!resultGroups || resultGroups.length === 0) return null;

    const trackId = resultGroups.reduce<string | null>((acc, group) => {
      if (acc) return acc;
      const g = group as Record<string, unknown>;
      const items = g.data as unknown[] | undefined;
      if (!items) return null;
      const matched = items.find((item) => {
        const entity = (item as Record<string, unknown>).entity as Record<string, unknown> | undefined;
        const track = entity?.track as Record<string, unknown> | undefined;
        return Boolean(track?.id);
      }) as Record<string, unknown> | undefined;
      if (!matched) return null;
      const entity = matched.entity as Record<string, unknown> | undefined;
      const track = entity?.track as Record<string, unknown> | undefined;
      return track?.id ? String(track.id) : null;
    }, null);
    if (!trackId) return null;

    const detailJson = await requestJsonWithLog<Record<string, unknown>>(
      `https://api.qishui.com/luna/pc/track_v2?track_id=${encodeURIComponent(trackId)}&media_type=track&queue_type=`,
    );
    if (!detailJson) return null;

    const lyricInfo = detailJson.lyric as Record<string, unknown> | undefined;
    const content = typeof lyricInfo?.content === 'string' ? lyricInfo.content : null;
    if (!content) return null;

    const lines = parseSyncedLines(content, 'prefix', 'relative');
    const withSyllables = lines.filter((l) => l.syllables.length > 0);
    return withSyllables.length > 0 ? withSyllables : null;
  } catch {
    return null;
  }
}

/**
 * 汽水音乐逐字歌词对外入口 — 原词失败则用 cleanTitle/cleanArtist 重试
 * @param title - 原始歌名
 * @param artist - 原始艺术家
 * @returns 逐字歌词行, 无逐字内容时返回 null
 */
export async function fetchKaraokeFromSodaMusic(title: string, artist: string): Promise<KaraokeLine[] | null> {
  const raw = await searchKaraokeSodaMusic(title, artist);
  if (raw) return raw;

  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  if (cleanedTitle !== title || cleanedArtist !== artist) {
    return searchKaraokeSodaMusic(cleanedTitle, cleanedArtist);
  }
  return null;
}
