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
 * @description 汽水音乐歌词拉取 — 搜索歌曲 → 歌曲详情含歌词 → KRC 格式解析
 * @author 鸡哥
 */

import type { LyricLine } from './types';
import { cleanArtist, cleanTitle, parseKrc } from './helpers';
import { requestJsonWithLog } from './request';

async function searchSodaMusic(queryTitle: string, queryArtist: string): Promise<LyricLine[] | null> {
  const query = `${queryTitle} ${queryArtist}`;
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
      const matchedItem = items.find((item) => {
        const it = item as Record<string, unknown>;
        const entity = it.entity as Record<string, unknown> | undefined;
        const track = entity?.track as Record<string, unknown> | undefined;
        return Boolean(track?.id);
      }) as Record<string, unknown> | undefined;
      if (!matchedItem) return null;
      const entity = matchedItem.entity as Record<string, unknown> | undefined;
      const track = entity?.track as Record<string, unknown> | undefined;
      return track?.id ? String(track.id) : null;
    }, null);

    if (!trackId) return null;

    const detailUrl =
      `https://api.qishui.com/luna/pc/track_v2?track_id=${encodeURIComponent(trackId)}&media_type=track&queue_type=`;

    const detailJson = await requestJsonWithLog<Record<string, unknown>>(detailUrl);
    if (!detailJson) return null;

    const lyricInfo = detailJson.lyric as Record<string, unknown> | undefined;
    const content = typeof lyricInfo?.content === 'string' ? lyricInfo.content : null;
    if (!content) return null;

    const lines = parseKrc(content);
    return lines.length > 0 ? lines : null;
  } catch {
    return null;
  }
}

export async function fetchLyricsFromSodaMusic(title: string, artist: string): Promise<LyricLine[] | null> {
  const raw = await searchSodaMusic(title, artist);
  if (raw) return raw;

  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  if (cleanedTitle !== title || cleanedArtist !== artist) {
    return searchSodaMusic(cleanedTitle, cleanedArtist);
  }
  return null;
}
